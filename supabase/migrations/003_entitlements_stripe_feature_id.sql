-- Lovable Subscription Foundation
-- Migration 003: Add stripe_feature_id to entitlements (Option C sync)
-- Part of PHASED_BILLING_PLAN Milestone 0, Phase 1.

ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS stripe_feature_id TEXT UNIQUE;

COMMENT ON COLUMN public.entitlements.stripe_feature_id IS 'Stripe Feature ID (feat_xxx) for Option C sync; null if not synced.';

CREATE INDEX IF NOT EXISTS idx_entitlements_stripe_feature_id ON public.entitlements(stripe_feature_id)
  WHERE stripe_feature_id IS NOT NULL;
