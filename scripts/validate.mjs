import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "netlify.toml",
  "package.json",
  ".env.example",
  "public/index.html",
  "netlify/functions/_shared.js",
  "netlify/functions/health.js",
  "netlify/functions/budgets.js",
  "netlify/functions/accounts.js",
  "netlify/functions/categories.js",
  "netlify/functions/payees.js",
  "netlify/functions/transactions.js",
  "netlify/functions/transaction-preview.js",
  "netlify/functions/approved-write.js",
  "README.md"
];

let failed = false;

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
}

const shared = fs.readFileSync(path.join(root, "netlify/functions/_shared.js"), "utf8");
if (!shared.includes("BRIDGE_ACCESS_TOKEN")) {
  console.error("Shared helper must require BRIDGE_ACCESS_TOKEN.");
  failed = true;
}
if (!shared.includes("YNAB_API_TOKEN")) {
  console.error("Shared helper must require YNAB_API_TOKEN.");
  failed = true;
}

const approvedWrite = fs.readFileSync(path.join(root, "netlify/functions/approved-write.js"), "utf8");
if (!approvedWrite.includes("approved !== true")) {
  console.error("Approved write endpoint must block writes without approved: true.");
  failed = true;
}
if (!approvedWrite.includes("method: \"PUT\"")) {
  console.error("Approved write endpoint should support approved transaction updates.");
  failed = true;
}
if (approvedWrite.toLowerCase().includes("delete")) {
  console.error("Approved write endpoint should not include delete behavior in version one.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("Validation passed.");
