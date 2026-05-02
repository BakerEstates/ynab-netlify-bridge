const { authorize, json, methodAllowed, parseBody, redactError, requireFields } = require("./_shared");

function validateCreate(transaction, index) {
  requireFields(transaction, ["account_id", "date", "amount"]);

  if (!Number.isInteger(transaction.amount)) {
    throw new Error(`Create ${index + 1}: amount must be an integer in YNAB milliunits.`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
    throw new Error(`Create ${index + 1}: date must use YYYY-MM-DD format.`);
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

exports.handler = async (event) => {
  const methodError = methodAllowed(event, ["POST"]);
  if (methodError) return methodError;

  const authError = authorize(event);
  if (authError) return authError;

  try {
    const body = parseBody(event);
    const creates = body.transactions || body.creates || [];
    const updates = body.updates || [];

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

    return json(200, {
      ok: true,
      dry_run: true,
      create_count: creates.length,
      update_count: updates.length,
      creates,
      updates,
      message: "Preview passed. No YNAB write was performed."
    });
  } catch (error) {
    return json(400, { error: redactError(error) });
  }
};
