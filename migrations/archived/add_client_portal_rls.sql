-- ==============================================================================
-- CLIENT + VENDOR PORTAL RLS POLICIES (P0 CRITICAL)
--
-- Purpose:
--   Add explicit self-access policies for authenticated portal users.
--   Staff "full access" policies from fix_rls_policies.sql remain in place.
--
-- Depends on:
--   1) fix_rls_policies.sql
--   2) fix_profiles_allow_self_insert.sql
--
-- Notes:
--   - This migration is idempotent (safe to re-run).
--   - Prefers auth_user_id matching for ownership; email fallback remains
--     for backward compatibility during transition/backfill.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helpers: resolve current portal identities by auth email
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_customer_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.id
  FROM public.customers c
  WHERE c.auth_user_id = auth.uid()
     OR (c.auth_user_id IS NULL AND lower(c.email) = lower(auth.jwt()->>'email'))
  ORDER BY (c.auth_user_id = auth.uid()) DESC, c.id DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_vendor_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT v.id
  FROM public.vendors v
  WHERE v.auth_user_id = auth.uid()
     OR (v.auth_user_id IS NULL AND lower(v.email) = lower(auth.jwt()->>'email'))
  ORDER BY (v.auth_user_id = auth.uid()) DESC, v.id DESC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 2) CUSTOMER PORTAL POLICIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Portal: create own customer" ON customers;
DROP POLICY IF EXISTS "Portal: read own customer" ON customers;
DROP POLICY IF EXISTS "Portal: update own customer" ON customers;

CREATE POLICY "Portal: create own customer" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

CREATE POLICY "Portal: read own customer" ON customers
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

CREATE POLICY "Portal: update own customer" ON customers
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Portal: read own shipments" ON shipments;
DROP POLICY IF EXISTS "Portal: create own shipments" ON shipments;

CREATE POLICY "Portal: read own shipments" ON shipments
  FOR SELECT TO authenticated
  USING (customer_id = my_customer_id());

CREATE POLICY "Portal: create own shipments" ON shipments
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = my_customer_id());

DROP POLICY IF EXISTS "Portal: read own shopping orders" ON shopping_orders;
DROP POLICY IF EXISTS "Portal: create own shopping orders" ON shopping_orders;

CREATE POLICY "Portal: read own shopping orders" ON shopping_orders
  FOR SELECT TO authenticated
  USING (customer_id = my_customer_id());

CREATE POLICY "Portal: create own shopping orders" ON shopping_orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = my_customer_id());

DROP POLICY IF EXISTS "Portal: read own invoices" ON customer_invoices;

CREATE POLICY "Portal: read own invoices" ON customer_invoices
  FOR SELECT TO authenticated
  USING (customer_id = my_customer_id());

DROP POLICY IF EXISTS "Portal: read own notifications" ON notifications;
DROP POLICY IF EXISTS "Portal: update own notifications" ON notifications;

CREATE POLICY "Portal: read own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (lower(recipient_email) = lower(auth.jwt()->>'email'));

CREATE POLICY "Portal: update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (lower(recipient_email) = lower(auth.jwt()->>'email'))
  WITH CHECK (lower(recipient_email) = lower(auth.jwt()->>'email'));

-- Feedback table may be absent in older environments
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'feedback'
  ) THEN
    EXECUTE 'ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Portal: create feedback" ON feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Portal: read own feedback" ON feedback';

    EXECUTE $sql$
      CREATE POLICY "Portal: create feedback" ON feedback
      FOR INSERT TO authenticated
      WITH CHECK (
        (customer_id IS NOT NULL AND customer_id = my_customer_id())
        OR
        (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>'email'))
      )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "Portal: read own feedback" ON feedback
      FOR SELECT TO authenticated
      USING (
        (customer_id IS NOT NULL AND customer_id = my_customer_id())
        OR
        (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>'email'))
      )
    $sql$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) VENDOR PORTAL POLICIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Portal: read own vendor profile" ON vendors;
DROP POLICY IF EXISTS "Portal: update own vendor profile" ON vendors;

CREATE POLICY "Portal: read own vendor profile" ON vendors
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

CREATE POLICY "Portal: update own vendor profile" ON vendors
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Portal: read own purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Portal: update own purchase orders" ON purchase_orders;

CREATE POLICY "Portal: read own purchase orders" ON purchase_orders
  FOR SELECT TO authenticated
  USING (vendor_id = my_vendor_id());

CREATE POLICY "Portal: update own purchase orders" ON purchase_orders
  FOR UPDATE TO authenticated
  USING (vendor_id = my_vendor_id())
  WITH CHECK (vendor_id = my_vendor_id());

DROP POLICY IF EXISTS "Portal: read own vendor orders" ON vendor_orders;

CREATE POLICY "Portal: read own vendor orders" ON vendor_orders
  FOR SELECT TO authenticated
  USING (vendor_id = my_vendor_id());

DROP POLICY IF EXISTS "Portal: read own vendor payments" ON vendor_payments;

CREATE POLICY "Portal: read own vendor payments" ON vendor_payments
  FOR SELECT TO authenticated
  USING (vendor_id = my_vendor_id());

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'vendor_payouts'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Portal: read own vendor payouts" ON vendor_payouts';
    EXECUTE $sql$
      CREATE POLICY "Portal: read own vendor payouts" ON vendor_payouts
      FOR SELECT TO authenticated
      USING (vendor_id = my_vendor_id())
    $sql$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Shared read-only settings needed by portal UIs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Portal: read company settings" ON company_settings;

CREATE POLICY "Portal: read company settings" ON company_settings
  FOR SELECT TO authenticated
  USING (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'service_pricing'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Portal: read service pricing" ON service_pricing';
    EXECUTE $sql$
      CREATE POLICY "Portal: read service pricing" ON service_pricing
      FOR SELECT TO authenticated
      USING (true)
    $sql$;
  END IF;
END $$;

-- ==============================================================================
-- End state:
--   - Customers can create/read/update their own customer row
--   - Customers can create/read their own shipments/shopping orders
--   - Customers can read their own invoices/notifications/feedback
--   - Vendors can read/update own vendor profile
--   - Vendors can read/update own purchase orders and read own payments/orders
-- ==============================================================================
