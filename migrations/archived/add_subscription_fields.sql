-- ==============================================================================
-- ADD SUBSCRIPTION FIELDS TO PROFILES (P2 — Monetization)
-- Stores Stripe customer ID and subscription state so the app can enforce tiers.
-- Requires: profiles table exists.
-- ==============================================================================

-- Stripe customer ID (one per user)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Subscription state (written by Stripe webhook)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';
-- Possible values: none, trialing, active, past_due, canceled, unpaid

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';
-- Possible values: free, pro, enterprise

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_stripe_id text;
-- Stripe Subscription ID (sub_…) for lookup

-- Index for quick webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- RLS: users can read their own subscription fields (already covered by
-- existing "Users can read own profile" policy from fix_rls_policies.sql).
-- Only the service_role (webhook Edge Function) can write subscription fields.
