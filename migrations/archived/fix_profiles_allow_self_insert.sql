-- ==============================================================================
-- ALLOW USERS TO INSERT THEIR OWN PROFILE (SECURITY & SAAS AUDIT)
-- New users must be able to create their profile row when auth.me() self-heals
-- or when onboarding. RLS had removed INSERT; this restores it for own id only.
-- Requires: fix_rls_policies.sql (profiles RLS enabled)
-- ==============================================================================

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
