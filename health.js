const { authorize, json, methodAllowed } = require("./_shared");

exports.handler = async (event) => {
  const methodError = methodAllowed(event, ["GET"]);
  if (methodError) return methodError;

  const authError = authorize(event);
  if (authError) return authError;

  return json(200, {
    ok: true,
    service: "ynab-netlify-bridge",
    timestamp: new Date().toISOString()
  });
};
