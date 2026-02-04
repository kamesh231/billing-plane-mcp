-- Lovable Subscription Foundation
-- Migration 002: Products, Prices, Entitlements, and Limits
-- Template for boilerplate users. Populate via user input (e.g. configure flow); no seed data.
--
-- After creating a Free product from user input, you can optionally update the new-user trigger
-- to set subscriptions.product_id: e.g. (SELECT id FROM products WHERE name = 'Free' LIMIT 1).

-- =============================================================================
-- 1. PRODUCTS (Stripe Product = what you sell)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.products IS 'Stripe-aligned: what you sell (e.g. Free, Pro, Enterprise, Extra Seat, API Usage). Populate from user input.';
COMMENT ON COLUMN public.products.stripe_product_id IS 'Stripe Product ID; null for Free tier';
COMMENT ON COLUMN public.products.name IS 'Display name (e.g. Pro, Enterprise)';

CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON public.products(stripe_product_id);

-- =============================================================================
-- 2. PRICES (Stripe Price = how you charge for a product)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stripe_price_id TEXT UNIQUE NOT NULL,
  interval TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'inr',
  unit_name TEXT,
  trial_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.prices IS 'Stripe-aligned: how you charge (e.g. Pro Monthly ₹999, Pro Yearly ₹9999, Extra Seat/month, API Usage metered). One product has many prices.';
COMMENT ON COLUMN public.prices.interval IS 'month, year, or metered';
COMMENT ON COLUMN public.prices.amount IS 'Smallest currency unit (e.g. paise); null for metered';
COMMENT ON COLUMN public.prices.unit_name IS 'For metered prices (e.g. per 1k calls)';

CREATE INDEX IF NOT EXISTS idx_prices_product_id ON public.prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_stripe_price_id ON public.prices(stripe_price_id);

-- =============================================================================
-- 3. ENTITLEMENTS (features / gating dimensions; not Stripe objects)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.entitlements (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.entitlements IS 'Gating dimensions (e.g. storage, crm_deals, analytics). Not in Stripe; map to products via product_entitlements.';
COMMENT ON COLUMN public.entitlements.default_unit IS 'Display unit for limits (e.g. GB, count)';

-- =============================================================================
-- 4. PRODUCT_ENTITLEMENTS (per-product access + optional limit)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_entitlements (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  entitlement_slug TEXT NOT NULL REFERENCES public.entitlements(slug) ON DELETE CASCADE,
  limit_value NUMERIC,
  limit_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, entitlement_slug)
);

COMMENT ON TABLE public.product_entitlements IS 'Per-product access and limit for an entitlement (e.g. Free+storage 15 GB, Pro+storage 200 GB, Pro+crm_deals 10000). limit_value null = unlimited.';
COMMENT ON COLUMN public.product_entitlements.limit_value IS 'Numeric limit (e.g. 15, 200, 10000); null = unlimited';
COMMENT ON COLUMN public.product_entitlements.limit_unit IS 'Optional unit override (e.g. GB)';

CREATE INDEX IF NOT EXISTS idx_product_entitlements_product_id ON public.product_entitlements(product_id);
CREATE INDEX IF NOT EXISTS idx_product_entitlements_entitlement_slug ON public.product_entitlements(entitlement_slug);

-- =============================================================================
-- 5. SUBSCRIPTION_ITEMS (one row per Stripe subscription item; multi-price subscriptions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  price_id UUID NOT NULL REFERENCES public.prices(id) ON DELETE CASCADE,
  stripe_subscription_item_id TEXT UNIQUE NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, stripe_subscription_item_id)
);

COMMENT ON TABLE public.subscription_items IS 'One row per Stripe subscription item (e.g. Pro Monthly + Extra Seat x3 + API Usage metered). Synced from Stripe webhook.';
COMMENT ON COLUMN public.subscription_items.quantity IS 'For per-seat or quantity-based; null for metered';

CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON public.subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_price_id ON public.subscription_items(price_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_stripe_id ON public.subscription_items(stripe_subscription_item_id);

-- =============================================================================
-- 6. SUBSCRIPTIONS: add product_id (primary product; optional until populated from user input)
-- =============================================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.subscriptions.product_id IS 'Primary product (e.g. Free/Pro/Enterprise). Set from subscription items or webhook. Null until products exist.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON public.subscriptions(product_id);

-- =============================================================================
-- 7. Triggers: updated_at for new tables
-- =============================================================================
CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_prices
  BEFORE UPDATE ON public.prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_entitlements
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_product_entitlements
  BEFORE UPDATE ON public.product_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_subscription_items
  BEFORE UPDATE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 8. RLS: products, prices, entitlements, product_entitlements (read for authenticated)
-- =============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

-- Catalog: authenticated can read (for pricing UI, gates); service_role full
CREATE POLICY "Authenticated can read products"
  ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access products"
  ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read prices"
  ON public.prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access prices"
  ON public.prices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read entitlements"
  ON public.entitlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access entitlements"
  ON public.entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read product_entitlements"
  ON public.product_entitlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access product_entitlements"
  ON public.product_entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- subscription_items: users can read their own (via subscription_id)
CREATE POLICY "Users can view own subscription items"
  ON public.subscription_items FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Service role full access subscription_items"
  ON public.subscription_items FOR ALL TO service_role USING (true) WITH CHECK (true);
