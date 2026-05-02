const YNAB_BASE_URL = "https://api.ynab.com/v1";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function getHeader(event, name) {
  const wanted = name.toLowerCase();
  const headers = event.headers || {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
}

function redactError(error) {
  const message = error && error.message ? String(error.message) : "Unknown error";
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(process.env.YNAB_API_TOKEN || "__NO_TOKEN__", "[REDACTED]")
    .replace(process.env.BRIDGE_ACCESS_TOKEN || "__NO_BRIDGE_TOKEN__", "[REDACTED]");
}

function requireEnv() {
  if (!process.env.YNAB_API_TOKEN) {
    return json(500, { error: "Server is missing YNAB_API_TOKEN." });
  }
  if (!process.env.BRIDGE_ACCESS_TOKEN) {
    return json(500, { error: "Server is missing BRIDGE_ACCESS_TOKEN." });
  }
  return null;
}

function authorize(event) {
  const envError = requireEnv();
  if (envError) return envError;

  const expected = process.env.BRIDGE_ACCESS_TOKEN;
  const provided =
    getHeader(event, "x-bridge-token") ||
    getHeader(event, "authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== expected) {
    return json(401, { error: "Unauthorized." });
  }

  return null;
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function toQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

function normalizeBudgetId(value) {
  return value || "last-used";
}

async function ynabRequest(path, options = {}) {
  const method = options.method || "GET";
  const query = toQuery(options.query);
  const url = `${YNAB_BASE_URL}${path}${query}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.YNAB_API_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const detail = payload?.error?.detail || payload?.error?.name || response.statusText;
    const error = new Error(`YNAB request failed: ${response.status} ${detail}`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function methodAllowed(event, methods) {
  if (!methods.includes(event.httpMethod)) {
    return json(405, { error: `Method not allowed. Use ${methods.join(" or ")}.` });
  }
  return null;
}

function requireFields(object, fields) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null || object[field] === "");
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}.`);
  }
}

module.exports = {
  authorize,
  json,
  methodAllowed,
  normalizeBudgetId,
  parseBody,
  redactError,
  requireFields,
  ynabRequest
};
