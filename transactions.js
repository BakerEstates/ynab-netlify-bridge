const { authorize, json, methodAllowed, normalizeBudgetId, redactError, ynabRequest } = require("./_shared");

exports.handler = async (event) => {
  const methodError = methodAllowed(event, ["GET"]);
  if (methodError) return methodError;

  const authError = authorize(event);
  if (authError) return authError;

  try {
    const params = event.queryStringParameters || {};
    const budgetId = normalizeBudgetId(params.budget_id);
    const accountId = params.account_id;
    const query = {
      since_date: params.since_date,
      type: params.type,
      last_knowledge_of_server: params.last_knowledge_of_server
    };

    const path = accountId
      ? `/budgets/${budgetId}/accounts/${accountId}/transactions`
      : `/budgets/${budgetId}/transactions`;

    const payload = await ynabRequest(path, { query });
    return json(200, payload);
  } catch (error) {
    return json(error.statusCode || 500, { error: redactError(error) });
  }
};
