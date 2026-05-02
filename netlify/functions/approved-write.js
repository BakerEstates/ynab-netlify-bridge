const {
  authorize,
  json,
  methodAllowed,
  normalizeBudgetId,
  parseBody,
  redactError,
  requireFields,
  ynabRequest
} = require("./_shared");

function validateCreate(transaction, index) {
  requireFields(transaction, ["account_id", "date", "amount"]);

  if (!Number.isInteger(transaction.amount)) {
    throw new Error(`Create ${index + 1}: amount must be an integer in YNAB milliunits.`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
    throw new Error(`Create ${index + 1}: date must use YYYY-MM-DD format.`);
  }

  if (!transaction.payee_id && !transaction.payee_name && !transaction.import_id) {
    throw new Error(`Create ${index + 1}: provide payee_id, payee_name, or import_id.`);
  }

  const allowedCleared = ["cleared", "uncleared", "reconciled"];
  if (transaction.cleared && !allowedCleared.includes(transaction.cleared)) {
    throw new Error(`Create ${index + 1}: cleared must be cleared, uncleared, or reconciled.`);
  }
}

function validateUpdate(update, index) {
  requireFields(update, ["id"]);

  if (update.amount !== undefined && !Number.isInteger(update.amount)) {
    throw new Error(`Update ${index + 1}: amount must be an integer in YNAB milliunits.`);
  }

  if (update.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(update.date)) {
    throw new Error(`Update ${index + 1}: date must use YYYY-MM-DD format.`);
  }

  const allowedCleared = ["cleared", "uncleared", "reconciled"];
  if (update.cleared && !allowedCleared.includes(update.cleared)) {
    throw new Error(`Update ${index + 1}: cleared must be cleared, uncleared, or reconciled.`);
  }
}

function sanitizeTransaction(transaction) {
  const allowed = [
    "id",
    "account_id",
    "date",
    "amount",
    "payee_id",
    "payee_name",
    "category_id",
    "memo",
    "cleared",
    "approved",
    "flag_color",
    "import_id",
    "subtransactions"
  ];

  return Object.fromEntries(
    Object.entries(transaction).filter(([key, value]) => allowed.includes(key) && value !== undefined)
  );
}

exports.handler = async (event) => {
  const methodError = methodAllowed(event, ["POST"]);
  if (methodError) return methodError;

  const authError = authorize(event);
  if (authError) return authError;

  try {
    const body = parseBody(event);
    const budgetId = normalizeBudgetId(body.budget_id || event.queryStringParameters?.budget_id);
    const creates = body.transactions || body.creates || [];
    const updates = body.updates || [];

    if (body.approved !== true) {
      return json(403, {
        error: "Write blocked. Request must include approved: true after Dylon approves the exact write batch."
      });
    }

    if (!body.approval_note || !String(body.approval_note).toLowerCase().includes("approve")) {
      return json(403, {
        error: "Write blocked. Include an approval_note that records Dylon's approval."
      });
    }

    if (!Array.isArray(creates)) {
      throw new Error("transactions/creates must be an array.");
    }

    if (!Array.isArray(updates)) {
      throw new Error("updates must be an array.");
    }

    if (creates.length === 0 && updates.length === 0) {
      throw new Error("Provide at least one transaction create or update.");
    }

    creates.forEach(validateCreate);
    updates.forEach(validateUpdate);

    const result = {
      ok: true,
      created_count: 0,
      updated_count: 0,
      create_response: null,
      update_responses: []
    };

    if (creates.length > 0) {
      const sanitizedCreates = creates.map(sanitizeTransaction);
      const createPayload = await ynabRequest(`/budgets/${budgetId}/transactions`, {
        method: "POST",
        body: sanitizedCreates.length === 1
          ? { transaction: sanitizedCreates[0] }
          : { transactions: sanitizedCreates }
      });
      result.created_count = sanitizedCreates.length;
      result.create_response = createPayload;
    }

    for (const update of updates) {
      const sanitizedUpdate = sanitizeTransaction(update);
      const updatePayload = await ynabRequest(`/budgets/${budgetId}/transactions/${update.id}`, {
        method: "PUT",
        body: {
          transaction: sanitizedUpdate
        }
      });
      result.updated_count += 1;
      result.update_responses.push(updatePayload);
    }

    return json(200, result);
  } catch (error) {
    return json(error.statusCode || 400, { error: redactError(error) });
  }
};
