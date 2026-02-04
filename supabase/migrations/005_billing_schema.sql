-- Lovable Subscription Foundation
-- Migration 005: Billing schema (billing.* tables + new-user trigger)
--
-- Moves billing tables into a dedicated schema `billing` while preserving
-- the existing structure and RLS policies from public.* (001, 002).
-- New users get a free subscription row in billing.subscriptions.

-- ============================================================================
-- 1. SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS billing;

-- Grant usage on schema to common roles (Supabase)
GRANT USAGE ON SCHEMA billing TO authenticated;
GRANT USAGE ON SCHEMA billing TO anon;
GRANT USAGE ON SCHEMA billing TO service_role;

-- ============================================================================
-- 2. SUBSCRIPTIONS (billing.subscriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing.subscriptions (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_id ON billing.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_stripe_customer ON billing.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_stripe_subscription ON billing.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status ON billing.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_plan_id ON billing.subscriptions(plan_id);

-- Comments
COMMENT ON TABLE billing.subscriptions IS 'User subscription data synced from Stripe (billing schema)';
COMMENT ON COLUMN billing.subscriptions.user_id IS 'References auth.users - one subscription per user';
COMMENT ON COLUMN billing.subscriptions.plan_id IS 'Plan identifier: free, pro, enterprise';
COMMENT ON COLUMN billing.subscriptions.status IS 'Subscription status: active, trialing, past_due, canceled, paused';
COMMENT ON COLUMN billing.subscriptions.feature_limits IS 'JSON object with feature-specific limits';

-- Reuse update_updated_at() from 001 (defined in public)
CREATE TRIGGER set_updated_at_billing_subscriptions
  BEFORE UPDATE ON billing.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS and policies (mirror public.subscriptions)
ALTER TABLE billing.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own subscription
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'subscriptions'
      AND policyname = 'Users can view own subscription (billing)'
  ) THEN
    CREATE POLICY "Users can view own subscription (billing)"
      ON billing.subscriptions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Policy: service_role has full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'subscriptions'
      AND policyname = 'Service role has full access (billing)'
  ) THEN
    CREATE POLICY "Service role has full access (billing)"
      ON billing.subscriptions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

-- ============================================================================
-- 3. PRODUCTS, PRICES, ENTITLEMENTS, PRODUCT_ENTITLEMENTS, SUBSCRIPTION_ITEMS
--    (mirror 002_* but under billing schema)
-- ============================================================================

-- PRODUCTS
CREATE TABLE IF NOT EXISTS billing.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_product_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE billing.products IS 'Stripe-aligned: what you sell (Free, Pro, Enterprise, add-ons) in billing schema.';
COMMENT ON COLUMN billing.products.stripe_product_id IS 'Stripe Product ID; null for Free tier';
COMMENT ON COLUMN billing.products.name IS 'Display name (e.g. Pro, Enterprise)';

CREATE INDEX IF NOT EXISTS idx_billing_products_stripe_product_id ON billing.products(stripe_product_id);

-- PRICES
CREATE TABLE IF NOT EXISTS billing.prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES billing.products(id) ON DELETE CASCADE,
  stripe_price_id TEXT UNIQUE NOT NULL,
  interval TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'inr',
  unit_name TEXT,
  trial_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE billing.prices IS 'Stripe-aligned: how you charge (e.g. Pro Monthly, Pro Yearly, metered).';
COMMENT ON COLUMN billing.prices.interval IS 'month, year, or metered';
COMMENT ON COLUMN billing.prices.amount IS 'Smallest currency unit (e.g. paise); null for metered';
COMMENT ON COLUMN billing.prices.unit_name IS 'For metered prices (e.g. per 1k calls)';

CREATE INDEX IF NOT EXISTS idx_billing_prices_product_id ON billing.prices(product_id);
CREATE INDEX IF NOT EXISTS idx_billing_prices_stripe_price_id ON billing.prices(stripe_price_id);

-- ENTITLEMENTS
CREATE TABLE IF NOT EXISTS billing.entitlements (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE billing.entitlements IS 'Gating dimensions (e.g. storage, analytics) in billing schema.';
COMMENT ON COLUMN billing.entitlements.default_unit IS 'Display unit for limits (e.g. GB, count)';

-- PRODUCT_ENTITLEMENTS
CREATE TABLE IF NOT EXISTS billing.product_entitlements (
  product_id UUID NOT NULL REFERENCES billing.products(id) ON DELETE CASCADE,
  entitlement_slug TEXT NOT NULL REFERENCES billing.entitlements(slug) ON DELETE CASCADE,
  limit_value NUMERIC,
  limit_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, entitlement_slug)
);

COMMENT ON TABLE billing.product_entitlements IS 'Per-product access and limit for an entitlement (billing schema).';
COMMENT ON COLUMN billing.product_entitlements.limit_value IS 'Numeric limit; null = unlimited';
COMMENT ON COLUMN billing.product_entitlements.limit_unit IS 'Optional unit override (e.g. GB)';

CREATE INDEX IF NOT EXISTS idx_billing_product_entitlements_product_id ON billing.product_entitlements(product_id);
CREATE INDEX IF NOT EXISTS idx_billing_product_entitlements_entitlement_slug ON billing.product_entitlements(entitlement_slug);

-- SUBSCRIPTION_ITEMS
CREATE TABLE IF NOT EXISTS billing.subscription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
  price_id UUID NOT NULL REFERENCES billing.prices(id) ON DELETE CASCADE,
  stripe_subscription_item_id TEXT UNIQUE NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, stripe_subscription_item_id)
);

COMMENT ON TABLE billing.subscription_items IS 'One row per Stripe subscription item (billing schema).';
COMMENT ON COLUMN billing.subscription_items.quantity IS 'For per-seat or quantity-based; null for metered';

CREATE INDEX IF NOT EXISTS idx_billing_subscription_items_subscription_id ON billing.subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscription_items_price_id ON billing.subscription_items(price_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscription_items_stripe_id ON billing.subscription_items(stripe_subscription_item_id);

-- updated_at triggers for billing tables
CREATE TRIGGER set_updated_at_billing_products
  BEFORE UPDATE ON billing.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_billing_prices
  BEFORE UPDATE ON billing.prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_billing_entitlements
  BEFORE UPDATE ON billing.entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_billing_product_entitlements
  BEFORE UPDATE ON billing.product_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_billing_subscription_items
  BEFORE UPDATE ON billing.subscription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS on catalog tables
ALTER TABLE billing.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.product_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscription_items ENABLE ROW LEVEL SECURITY;

-- Catalog: authenticated can read; service_role full
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'products'
      AND policyname = 'Authenticated can read products (billing)'
  ) THEN
    CREATE POLICY "Authenticated can read products (billing)"
      ON billing.products FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'products'
      AND policyname = 'Service role full access products (billing)'
  ) THEN
    CREATE POLICY "Service role full access products (billing)"
      ON billing.products FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'prices'
      AND policyname = 'Authenticated can read prices (billing)'
  ) THEN
    CREATE POLICY "Authenticated can read prices (billing)"
      ON billing.prices FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'prices'
      AND policyname = 'Service role full access prices (billing)'
  ) THEN
    CREATE POLICY "Service role full access prices (billing)"
      ON billing.prices FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'entitlements'
      AND policyname = 'Authenticated can read entitlements (billing)'
  ) THEN
    CREATE POLICY "Authenticated can read entitlements (billing)"
      ON billing.entitlements FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'entitlements'
      AND policyname = 'Service role full access entitlements (billing)'
  ) THEN
    CREATE POLICY "Service role full access entitlements (billing)"
      ON billing.entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'product_entitlements'
      AND policyname = 'Authenticated can read product_entitlements (billing)'
  ) THEN
    CREATE POLICY "Authenticated can read product_entitlements (billing)"
      ON billing.product_entitlements FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'product_entitlements'
      AND policyname = 'Service role full access product_entitlements (billing)'
  ) THEN
    CREATE POLICY "Service role full access product_entitlements (billing)"
      ON billing.product_entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- subscription_items: users can read their own via subscription_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'subscription_items'
      AND policyname = 'Users can view own subscription items (billing)'
  ) THEN
    CREATE POLICY "Users can view own subscription items (billing)"
      ON billing.subscription_items FOR SELECT TO authenticated
      USING (
        subscription_id IN (
          SELECT id FROM billing.subscriptions WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'billing'
      AND tablename = 'subscription_items'
      AND policyname = 'Service role full access subscription_items (billing)'
  ) THEN
    CREATE POLICY "Service role full access subscription_items (billing)"
      ON billing.subscription_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ============================================================================
-- 4. SUBSCRIPTIONS: add product_id (primary product; optional until populated)
-- ============================================================================

ALTER TABLE billing.subscriptions
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES billing.products(id) ON DELETE SET NULL;

COMMENT ON COLUMN billing.subscriptions.product_id IS 'Primary product (e.g. Free/Pro/Enterprise) in billing schema.';

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_product_id ON billing.subscriptions(product_id);

-- ============================================================================
-- 5. NEW USER TRIGGER: auth.users -> billing.subscriptions
-- ============================================================================

-- Drop old trigger that inserted into public.subscriptions (if it exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Function: Auto-create billing subscription for new users
CREATE OR REPLACE FUNCTION billing_create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO billing.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create billing subscription when user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION billing_create_subscription_for_new_user();

