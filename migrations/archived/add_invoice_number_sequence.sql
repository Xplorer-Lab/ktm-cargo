-- ==============================================================================
-- DB-BACKED INVOICE NUMBER SEQUENCE (SECURITY & SAAS AUDIT)
-- Invoice numbers must be unique and stable across restarts; avoid in-memory reset
-- and concurrent collisions. Format: INV-YYYYMM-XXXX
-- ==============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('invoice_number_seq')::text, 4, '0');
$$;

-- Grant execute to authenticated users (and anon if needed for edge functions)
GRANT EXECUTE ON FUNCTION next_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_invoice_number() TO service_role;
