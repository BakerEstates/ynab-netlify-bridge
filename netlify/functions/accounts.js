const { authorize, json, methodAllowed, normalizeBudgetId, redactError, ynabRequest } = require("./_shared");

exports.handler = async (event) => {
  const methodError = methodAllowed(event, ["GET"]);
  if (methodError) return methodError;

  const authError = authorize(event);
  if (authError) return authError;

  try {
    const budgetId = normalizeBudgetId(event.queryStringParameters?.budget_id);
    const payload = await ynabRequest(`/budgets/${budgetId}/accounts`);
    return json(200, payload);
  } catch (error) {
    return json(error.statusCode || 500, { error: redactError(error) });
  }
};
