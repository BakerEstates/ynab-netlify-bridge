# YNAB Netlify Bridge

Minimal private Netlify Functions bridge for Dylon Baker’s YNAB reconciliation assistant.

## What this does

This bridge lets the assistant pull YNAB data without storing the YNAB token in Perplexity Space files.

It supports:

- Budgets.
- Accounts.
- Categories.
- Payees.
- Transactions.
- Transaction preview.
- Approval-gated transaction creates and updates.

It does not support:

- Automatic writes.
- Deleting transactions.
- Storing Chase credentials.
- Storing the YNAB token in the repo.

## Required environment variables

Set these in Netlify:

```text
YNAB_API_TOKEN=your_ynab_personal_access_token
BRIDGE_ACCESS_TOKEN=a_long_random_secret
```

Do not commit real values to GitHub.

## Deploy on Netlify

1. Create a private GitHub repo.
2. Add these files to the repo.
3. Create a new Netlify site from the repo.
4. In Netlify, go to Site configuration → Environment variables.
5. Add `YNAB_API_TOKEN`.
6. Add `BRIDGE_ACCESS_TOKEN`.
7. Deploy.

## Endpoint base

After deploy, your function base will look like:

```text
https://YOUR-SITE.netlify.app/.netlify/functions
```

## Authentication

Every endpoint requires one of these headers:

```text
x-bridge-token: YOUR_BRIDGE_ACCESS_TOKEN
```

or:

```text
Authorization: Bearer YOUR_BRIDGE_ACCESS_TOKEN
```

## Endpoints

### Health

```text
GET /.netlify/functions/health
```

### Budgets

```text
GET /.netlify/functions/budgets
```

### Accounts

```text
GET /.netlify/functions/accounts?budget_id=last-used
```

If `budget_id` is omitted, the bridge uses `last-used`.

### Categories

```text
GET /.netlify/functions/categories?budget_id=last-used
```

### Payees

```text
GET /.netlify/functions/payees?budget_id=last-used
```

### Transactions

```text
GET /.netlify/functions/transactions?budget_id=last-used&account_id=ACCOUNT_ID&since_date=2026-05-01
```

`account_id` is optional. If omitted, the endpoint returns transactions for the whole budget.

### Transaction preview

This validates transaction creates and updates without writing to YNAB.

```text
POST /.netlify/functions/transaction-preview
```

Body:

```json
{
  "creates": [
    {
      "account_id": "ACCOUNT_ID",
      "date": "2026-05-02",
      "amount": -12500,
      "payee_name": "Example Payee",
      "category_id": "CATEGORY_ID",
      "memo": "Pending Chase transaction manually entered; match when imported",
      "cleared": "uncleared",
      "approved": false
    }
  ],
  "updates": [
    {
      "id": "TRANSACTION_ID",
      "category_id": "CATEGORY_ID",
      "memo": "Updated after approval"
    }
  ]
}
```

YNAB amounts use milliunits:

- `$12.50` outflow = `-12500`
- `$100.00` inflow = `100000`

### Approved write

This writes approved transaction creates and updates to YNAB.

```text
POST /.netlify/functions/approved-write
```

Body:

```json
{
  "budget_id": "last-used",
  "approved": true,
  "approval_note": "Dylon approved rows 1-3 in chat on 2026-05-02.",
  "creates": [
    {
      "account_id": "ACCOUNT_ID",
      "date": "2026-05-02",
      "amount": -12500,
      "payee_name": "Example Payee",
      "category_id": "CATEGORY_ID",
      "memo": "Pending Chase transaction manually entered; match when imported",
      "cleared": "uncleared",
      "approved": false
    }
  ],
  "updates": [
    {
      "id": "TRANSACTION_ID",
      "category_id": "CATEGORY_ID",
      "memo": "Updated after approval"
    }
  ]
}
```

The endpoint refuses to write unless:

- `approved` is `true`.
- `approval_note` includes approval context.
- Each transaction has required fields.

## Friday workflow

1. Dylon uploads Chase CSV.
2. Dylon provides current Chase balance.
3. Dylon uploads pending transaction screenshots or typed pending list.
4. Assistant pulls YNAB through this bridge.
5. Assistant matches, categorizes, and asks about unclear transactions.
6. Assistant shows a proposed write batch.
7. Dylon approves.
8. Assistant calls approved-write.
9. Assistant pulls YNAB again and verifies balance to the penny.

## Safety rules

- Never put `YNAB_API_TOKEN` in Space files or chat.
- Never put `BRIDGE_ACCESS_TOKEN` in public files.
- Do not enable delete behavior in version one.
- Do not write without approval.
- Stop if any YNAB write fails.
- Re-pull YNAB after writing.
