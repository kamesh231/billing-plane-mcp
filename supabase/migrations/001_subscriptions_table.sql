-- Lovable Subscription Foundation
-- Migration 001: Subscriptions Table with RLS

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign key to Supabase auth
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Subscription state
  plan_id TEXT NOT NULL DEFAULT 'free',
  -- Values: 'free', 'pro', 'enterprise'

  status TEXT NOT NULL DEFAULT 'active',
  -- Values: 'active', 'trialing', 'past_due', 'canceled', 'paused'

  -- Feature entitlements
  seats_limit INTEGER DEFAULT 1,
  feature_limits JSONB DEFAULT '{}'::jsonb,
  -- Example: {"api_calls_per_month": 10000, "storage_gb": 50}

  -- Stripe metadata
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- Add comments for documentation
COMMENT ON TABLE public.subscriptions IS 'User subscription data synced from Stripe';
COMMENT ON COLUMN public.subscriptions.user_id IS 'References auth.users - one subscription per user';
COMMENT ON COLUMN public.subscriptions.plan_id IS 'Plan identifier: free, pro, enterprise';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status: active, trialing, past_due, canceled, paused';
COMMENT ON COLUMN public.subscriptions.feature_limits IS 'JSON object with feature-specific limits';

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Set updated_at on every update
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Function: Auto-create subscription for new users
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create subscription when user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_subscription_for_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Service role has full access (for Edge Functions)
CREATE POLICY "Service role has full access"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 3: Prevent direct writes from authenticated users
-- (Users can only read, Edge Functions write via service_role)
-- This is implicitly handled by not having an INSERT/UPDATE/DELETE policy for authenticated role
