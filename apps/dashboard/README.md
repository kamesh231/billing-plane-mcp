# BillingPlane Dashboard

Next.js (App Router) dashboard for BillingPlane: Clerk auth, Connectors (Lovable – Generate OAuth), Profile, Subscription (Polar).

## Setup

1. Install: `npm install`
2. Env: Create `.env.local` with:
   - **Clerk** (from [dashboard.clerk.com](https://dashboard.clerk.com)): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - **Supabase** (dashboard DB): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - **MCP** (optional): `NEXT_PUBLIC_MCP_SERVER_URL` – default is `https://billing-plane-mcp-mcp-server.up.railway.app/sse`; override when customer domain is set (e.g. `https://mcp.billingplane.com/sse`).
   - **Polar**: `NEXT_PUBLIC_POLAR_CHECKOUT_URL` (Upgrade link), `NEXT_PUBLIC_POLAR_PORTAL_URL` (Manage Subscription), `POLAR_WEBHOOK_SECRET` (for webhook signature verification)
3. DB: Run `supabase db push` from repo root to apply migrations (including `004_dashboard_schema.sql`).
4. Run: `npm run dev` – app at http://localhost:3000

## Routes

- `/` – Home
- `/connectors` – Lovable card, Generate OAuth modal
- `/profile` – Profile, Subscription (Manage Subscription → Polar)
- `/sign-in`, `/sign-up` – Clerk

## MCP Server URL and deployment

- **Default:** When users click **Generate OAuth** on Connectors, the Server URL shown is `https://billing-plane-mcp-mcp-server.up.railway.app/sse` (Railway MCP with `/sse` for Lovable). Override by setting `NEXT_PUBLIC_MCP_SERVER_URL` (e.g. when customer domain is implemented: `https://mcp.billingplane.com/sse`).
- Deploy the MCP server (e.g. on Railway) and configure Lovable: see **docs/LOVABLE_CONNECT.md** for step-by-step instructions and Railway env vars (`DASHBOARD_API_URL`, `PORT`).
