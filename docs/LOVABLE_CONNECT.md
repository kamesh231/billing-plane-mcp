# Connecting BillingPlane MCP to Lovable

This guide explains how to use the BillingPlane MCP server from Lovable and how to deploy the MCP server (e.g. on Railway).

## Using BillingPlane MCP in Lovable

1. **Get your Server URL and Bearer token**
   - Sign in to the [BillingPlane Dashboard](https://dashboard.billingplane.com) (or your deployed dashboard).
   - Go to **Connectors**.
   - On the **Lovable** card, click **Generate OAuth**.
   - In the modal, review Free vs Paid (1 project vs Unlimited; watermark vs no watermark).
   - Click **Generate** (or **Upgrade to add more** if you're on the free plan and already have one connection).
   - After generation, you'll see:
     - **Server URL** – default is `https://billing-plane-mcp-mcp-server.up.railway.app/sse` (Railway MCP with `/sse`). Overridden by dashboard env when customer domain is set.
     - **Bearer token** – one-time display; copy it now (it won't be shown again).

2. **Add the MCP server in Lovable**
   - In Lovable: open **Settings** → **Connectors** → **New MCP server** (or equivalent).
   - Set:
     - **Server URL**: use the URL shown in the dashboard (already includes `/sse`), e.g. `https://billing-plane-mcp-mcp-server.up.railway.app/sse` or your custom domain with `/sse`. Without `/sse`, Lovable may show "Connection failed."
     - **Authorization**: Bearer token – paste the token you copied.
   - Save. The MCP will be used for billing-spin tools (e.g. configure plans, write Supabase catalog).

3. **Free plan limits**
   - Free: one MCP connection and **one project** (by Supabase project URL). If you use the connection for a second project, the MCP will return an upgrade message.
   - Paid: unlimited connections and projects, no watermark.

---

## Deploying the MCP server (Railway)

The MCP server runs over HTTP/SSE. Deploy it so Lovable can reach it (e.g. `https://mcp.billingplane.com`).

### 1. Deploy from `mcp-server/` on Railway

- **Root**: Use the `mcp-server` directory as the project root (or run Railway CLI from inside `mcp-server/`).
- **Build**: Railway will use Nixpacks (or your `railway.toml`). The repo includes `mcp-server/railway.toml` with:
  - `startCommand = "npm run build && npm run start:http"`
- **Start**: The process runs `node dist/http-server.js` (HTTP/SSE server).

### 2. Environment variables (Railway)

| Variable            | Description |
|---------------------|-------------|
| `PORT`              | Set by Railway. The HTTP server listens on this port. |
| `DASHBOARD_API_URL` | Base URL of the BillingPlane dashboard API, e.g. `https://dashboard.billingplane.com`. Used for token validation (`POST /api/connections/validate`) and project check (`POST /api/mcp/check-project`). |

Example:

- `DASHBOARD_API_URL=https://dashboard.billingplane.com`

### 3. Server URL for users

- **Default:** The dashboard shows `https://billing-plane-mcp-mcp-server.up.railway.app/sse` when users click **Generate OAuth** (no env needed). When you add a customer domain, set `NEXT_PUBLIC_MCP_SERVER_URL` in the dashboard to your MCP URL **with `/sse`** (e.g. `https://mcp.billingplane.com/sse`) so the Connectors page shows that URL instead.

### 4. Quick deploy (Railway CLI)

```bash
cd mcp-server
railway init   # if new project
railway link   # if existing project
railway add    # add variables: DASHBOARD_API_URL
railway up
```

Then set `NEXT_PUBLIC_MCP_SERVER_URL` in the dashboard app to your Railway MCP URL (base URL without `/sse` is fine for the dashboard; Lovable needs the URL with `/sse` when adding the connector).

---

## Next steps to test

After the connector is added in Lovable, you can verify it and run billing flows.

### 1. Quick check in Lovable chat

In a Lovable project, ask the AI something like:

- *"List the BillingPlane MCP tools you have access to"*, or  
- *"Set up subscription billing for this app using the BillingPlane MCP"*

If the MCP is connected, the AI can call tools such as `configure_plans`, `write_supabase_catalog`, `scan_codebase`, `insert_feature_gates`, `generate_pricing_config`. If it can’t see the tools, the connector may not be active for that project or you may need to retry with the `/sse` URL.

### 2. Test Milestone 0 (catalog in Supabase)

- In Lovable, open or create a project that uses Supabase (your app’s Supabase project).
- Ensure migrations are applied on that Supabase project (e.g. `supabase db push` from the app repo so the `billing` schema and tables exist).
- In chat, ask the AI to **write the billing catalog** to your Supabase using the BillingPlane MCP, and provide your project’s Supabase URL and service role key (or point to env). The MCP will call `write_supabase_catalog` (default schema: `billing`).
- In Supabase → Table Editor, check `billing.products`, `billing.prices`, `billing.entitlements`, `billing.product_entitlements` for new rows.

### 3. Test Milestone 1 (new user + Stripe Customer)

- Use the same app that has the billing schema and Edge Functions deployed (`ensure-stripe-customer`, `create-checkout`, `create-portal`, `stripe-webhook`).
- Sign up a **new user** in the app (Supabase Auth).
- Open a page that uses `SubscriptionProvider` (so `ensure-stripe-customer` runs).
- In Supabase → SQL Editor: `SELECT id, user_id, plan_id, status, stripe_customer_id FROM billing.subscriptions WHERE user_id = '<new-user-uuid>';` — you should see one row with `plan_id = 'free'`, `status = 'active'`, and `stripe_customer_id` set.
- In Stripe Dashboard → Customers, find the customer with the same email.
- As that user, use "Manage subscription" / "Upgrade" → Customer Portal should open (no Checkout first).

---

## Summary

| Item        | Value |
|------------|--------|
| **Server URL (Lovable)** | Default: `https://billing-plane-mcp-mcp-server.up.railway.app/sse`. Override with `NEXT_PUBLIC_MCP_SERVER_URL` when customer domain is set (must include `/sse`). |
| **Server URL (dashboard)** | Shown in Connectors modal when user clicks Generate OAuth; default is the Railway URL above. |
| **Auth**       | Bearer token from dashboard → Connectors → Generate OAuth. |
| **Dashboard env** | `NEXT_PUBLIC_MCP_SERVER_URL` (optional) = MCP URL with `/sse` when using custom domain. |
| **MCP env**   | `DASHBOARD_API_URL` = dashboard base URL for validate + check-project. |
