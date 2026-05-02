# Setup Checklist

Use this checklist once to get the YNAB bridge online.

## What you will create

A small private Netlify site with secure functions that can talk to YNAB.

After setup, your normal Friday process should be:

1. Download Chase CSV.
2. Screenshot or type pending Chase transactions.
3. Open the Perplexity Space.
4. Upload Chase CSV and pending screenshots.
5. Provide current Chase balance.
6. Let the assistant pull YNAB through the bridge.

## Step 1: Create the GitHub repo

Create a new private GitHub repo.

Suggested name:

```text
ynab-netlify-bridge
```

Upload all files from this folder to that repo.

Do not upload a real `.env` file.

## Step 2: Create the YNAB token

In YNAB:

1. Go to Account Settings.
2. Go to Developer Settings.
3. Create a Personal Access Token.
4. Copy it once.

Do not paste the token into Perplexity chat or Space files.

## Step 3: Create the bridge access token

Create a long random secret.

Example format:

```text
bridge_live_long_random_text_here
```

This is the password the assistant will use to call the bridge.

Do not put this in public files.

## Step 4: Connect repo to Netlify

In Netlify:

1. Add new site.
2. Import from GitHub.
3. Select the private `ynab-netlify-bridge` repo.
4. Deploy.

Netlify should detect:

```text
netlify.toml
```

## Step 5: Add environment variables in Netlify

In Netlify site settings, add:

```text
YNAB_API_TOKEN=your_ynab_token
BRIDGE_ACCESS_TOKEN=your_bridge_access_token
```

Then redeploy the site.

## Step 6: Test health endpoint

Your function base will look like:

```text
https://YOUR-SITE.netlify.app/.netlify/functions
```

Test:

```text
GET https://YOUR-SITE.netlify.app/.netlify/functions/health
```

Required header:

```text
x-bridge-token: YOUR_BRIDGE_ACCESS_TOKEN
```

If it works, the response should include:

```json
{
  "ok": true,
  "service": "ynab-netlify-bridge"
}
```

## Step 7: Save bridge details privately

Save these somewhere secure:

```text
Bridge base URL:
https://YOUR-SITE.netlify.app/.netlify/functions

Bridge access token:
YOUR_BRIDGE_ACCESS_TOKEN
```

Do not save the YNAB API token in the Space.

## Step 8: Use in Perplexity

When starting reconciliation, provide:

```text
Use my YNAB API bridge.
Bridge base URL: [paste URL]
I will provide the bridge access token only when needed.
```

Do not provide the YNAB API token.

## Important

The bridge access token is less sensitive than the YNAB token, but still private.

Anyone with the bridge URL and bridge access token can call the bridge, so keep both private.

