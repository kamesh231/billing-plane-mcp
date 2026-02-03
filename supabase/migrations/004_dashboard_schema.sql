-- BillingPlane dashboard schema (Clerk users, MCP connections, project usage)
-- Run with: supabase db push (or apply in your dashboard DB)

CREATE TABLE IF NOT EXISTS public.dashboard_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  polar_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dashboard_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.dashboard_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Lovable',
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_connections_user_id ON public.dashboard_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_connections_token_hash ON public.dashboard_connections(token_hash);

CREATE TABLE IF NOT EXISTS public.dashboard_mcp_project_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.dashboard_users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_mcp_project_usage_user_id ON public.dashboard_mcp_project_usage(user_id);

COMMENT ON TABLE public.dashboard_users IS 'BillingPlane users (Clerk); plan free|paid';
COMMENT ON TABLE public.dashboard_connections IS 'MCP connections (Bearer tokens) per user';
COMMENT ON TABLE public.dashboard_mcp_project_usage IS 'First project per free user (project_id from supabase_url)';
