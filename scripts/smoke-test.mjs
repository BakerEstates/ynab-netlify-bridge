import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

process.env.YNAB_API_TOKEN = "dummy_ynab_token";
process.env.BRIDGE_ACCESS_TOKEN = "dummy_bridge_token";

const { handler: health } = require("../netlify/functions/health.js");
const { handler: preview } = require("../netlify/functions/transaction-preview.js");
const { handler: approvedWrite } = require("../netlify/functions/approved-write.js");

function event({ method = "GET", token, body, queryStringParameters } = {}) {
  return {
    httpMethod: method,
    headers: token ? { "x-bridge-token": token } : {},
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: queryStringParameters || {}
  };
}

const unauthorized = await health(event({ token: "wrong" }));
assert.equal(unauthorized.statusCode, 401);

const okHealth = await health(event({ token: "dummy_bridge_token" }));
assert.equal(okHealth.statusCode, 200);

const okPreview = await preview(
  event({
    method: "POST",
    token: "dummy_bridge_token",
    body: {
      creates: [
        {
          account_id: "account-id",
          date: "2026-05-02",
          amount: -12500,
          payee_name: "Example Payee",
          category_id: "category-id",
          cleared: "uncleared"
        }
      ],
      updates: [
        {
          id: "transaction-id",
          category_id: "category-id",
          memo: "Updated after approval"
        }
      ]
    }
  })
);
assert.equal(okPreview.statusCode, 200);
assert.equal(JSON.parse(okPreview.body).dry_run, true);
assert.equal(JSON.parse(okPreview.body).create_count, 1);
assert.equal(JSON.parse(okPreview.body).update_count, 1);

const blockedWrite = await approvedWrite(
  event({
    method: "POST",
    token: "dummy_bridge_token",
    body: {
      budget_id: "last-used",
      approved: false,
      approval_note: "",
      creates: [
        {
          account_id: "account-id",
          date: "2026-05-02",
          amount: -12500,
          payee_name: "Example Payee"
        }
      ]
    }
  })
);
assert.equal(blockedWrite.statusCode, 403);

console.log("Smoke tests passed.");
