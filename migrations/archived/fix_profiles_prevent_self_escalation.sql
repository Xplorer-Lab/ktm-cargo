-- ==============================================================================
-- PREVENT PROFILE SELF-ESCALATION (SEC-PROFILE)
-- Users must not be able to set their own role or staff_role to admin/director.
-- Only existing admin or managing_director can change these columns.
-- Requires: fix_rls_policies.sql (is_admin_or_director())
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.profiles_prevent_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    (OLD.role IS DISTINCT FROM NEW.role) OR
    (OLD.staff_role IS DISTINCT FROM NEW.staff_role)
  )) THEN
    IF NOT public.is_admin_or_director() THEN
      NEW.role := OLD.role;
      NEW.staff_role := OLD.staff_role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_prevent_self_escalation_trigger ON profiles;
CREATE TRIGGER profiles_prevent_self_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.profiles_prevent_self_escalation();
