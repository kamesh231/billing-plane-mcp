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
     - **Server URL** – e.g. `https://mcp.billingplane.com` or your Railway MCP URL.
     - **Bearer token** – one-time display; copy it now (it won't be shown again).

2. **Add the MCP server in Lovable**
   - In Lovable: open **Settings** → **Connectors** → **New MCP server** (or equivalent).
   - Set:
     - **Server URL**: the Server URL from the dashboard (e.g. `https://mcp.billingplane.com`).
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

- After deploy, your MCP endpoint will be something like:
  - Railway default: `https://<your-app>.up.railway.app`
  - Or a custom domain: `https://mcp.billingplane.com`
- Set this URL in the **dashboard** as `NEXT_PUBLIC_MCP_SERVER_URL` so that when users click **Generate OAuth**, the dashboard shows the correct Server URL and token.

### 4. Quick deploy (Railway CLI)

```bash
cd mcp-server
railway init   # if new project
railway link   # if existing project
railway add    # add variables: DASHBOARD_API_URL
railway up
```

Then set `NEXT_PUBLIC_MCP_SERVER_URL` in the dashboard app to your Railway MCP URL.

---

## Summary

| Item        | Value |
|------------|--------|
| **Server URL** | Your deployed MCP base URL (e.g. `https://mcp.billingplane.com`). |
| **Auth**       | Bearer token from dashboard → Connectors → Generate OAuth. |
| **Dashboard env** | `NEXT_PUBLIC_MCP_SERVER_URL` = same Server URL (so generated credentials show the right URL). |
| **MCP env**   | `DASHBOARD_API_URL` = dashboard base URL for validate + check-project. |
