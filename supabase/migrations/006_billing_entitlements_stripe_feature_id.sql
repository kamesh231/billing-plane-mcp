-- Lovable Subscription Foundation
-- Migration 006: Add stripe_feature_id to billing.entitlements (Option C sync)
-- Part of PHASED_BILLING_PLAN Milestone 2 (Option C Features).

ALTER TABLE billing.entitlements
  ADD COLUMN IF NOT EXISTS stripe_feature_id TEXT UNIQUE;

COMMENT ON COLUMN billing.entitlements.stripe_feature_id IS 'Stripe Feature ID (feat_xxx) for Option C sync; null if not synced.';

CREATE INDEX IF NOT EXISTS idx_billing_entitlements_stripe_feature_id
  ON billing.entitlements(stripe_feature_id)
  WHERE stripe_feature_id IS NOT NULL;
