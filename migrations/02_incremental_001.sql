-- ==============================================================================
-- KTM Cargo Express
-- Incremental layer 001
--
-- Adds RLS, helper functions, portal access, normalization triggers,
-- numbering helpers, and transactional shipment/PO RPCs on top of the
-- canonical baseline.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.ktm_touch_updated_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role TEXT;
  current_staff_role TEXT;
BEGIN
  SELECT role, staff_role
  INTO current_role, current_staff_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN current_role = 'admin' OR current_staff_role = 'managing_director';
END;
$$;

-- ------------------------------------------------------------------------------
-- Profiles hardening
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff Full Access Profiles" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Staff Full Access Profiles" ON public.profiles
  FOR ALL USING (public.is_admin_or_director());

CREATE OR REPLACE FUNCTION public.profiles_prevent_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       OLD.role IS DISTINCT FROM NEW.role
       OR OLD.staff_role IS DISTINCT FROM NEW.staff_role
     )
     AND NOT public.is_admin_or_director()
  THEN
    NEW.role := OLD.role;
    NEW.staff_role := OLD.staff_role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_self_escalation_trigger ON public.profiles;
CREATE TRIGGER profiles_prevent_self_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_prevent_self_escalation();

-- ------------------------------------------------------------------------------
-- Staff access policies
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'customers',
    'shipments',
    'shopping_orders',
    'inventory_items',
    'vendors',
    'purchase_orders',
    'customer_invoices',
    'campaigns',
    'tasks',
    'expenses',
    'notifications',
    'vendor_orders',
    'vendor_payments',
    'vendor_payouts',
    'service_pricing',
    'surcharges',
    'goods_receipts',
    'vendor_contracts',
    'approval_rules',
    'approval_history',
    'vendor_invitations',
    'notification_templates',
    'company_settings',
    'order_journeys',
    'journey_events',
    'support_tickets',
    'proof_of_delivery',
    'feedback',
    'customer_interactions',
    'customer_notes',
    'scheduled_reports',
    'custom_segments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Staff Full Access ' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin_or_director())',
        'Staff Full Access ' || t,
        t
      );
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- Portal identity helpers and policies
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.my_customer_id()
RETURNS UUID
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
RETURNS UUID
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

DROP POLICY IF EXISTS "Portal: create own customer" ON public.customers;
DROP POLICY IF EXISTS "Portal: read own customer" ON public.customers;
DROP POLICY IF EXISTS "Portal: update own customer" ON public.customers;

CREATE POLICY "Portal: create own customer" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

CREATE POLICY "Portal: read own customer" ON public.customers
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

CREATE POLICY "Portal: update own customer" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Portal: read own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Portal: create own shipments" ON public.shipments;
CREATE POLICY "Portal: read own shipments" ON public.shipments
  FOR SELECT TO authenticated
  USING (customer_id = public.my_customer_id());
CREATE POLICY "Portal: create own shipments" ON public.shipments
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.my_customer_id());

DROP POLICY IF EXISTS "Portal: read own shopping orders" ON public.shopping_orders;
DROP POLICY IF EXISTS "Portal: create own shopping orders" ON public.shopping_orders;
CREATE POLICY "Portal: read own shopping orders" ON public.shopping_orders
  FOR SELECT TO authenticated
  USING (customer_id = public.my_customer_id());
CREATE POLICY "Portal: create own shopping orders" ON public.shopping_orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.my_customer_id());

DROP POLICY IF EXISTS "Portal: read own invoices" ON public.customer_invoices;
CREATE POLICY "Portal: read own invoices" ON public.customer_invoices
  FOR SELECT TO authenticated
  USING (customer_id = public.my_customer_id());

DROP POLICY IF EXISTS "Portal: read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Portal: update own notifications" ON public.notifications;
CREATE POLICY "Portal: read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (lower(coalesce(recipient_email, user_email)) = lower(auth.jwt()->>'email'));
CREATE POLICY "Portal: update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (lower(coalesce(recipient_email, user_email)) = lower(auth.jwt()->>'email'))
  WITH CHECK (lower(coalesce(recipient_email, user_email)) = lower(auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Portal: read own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Portal: create feedback" ON public.feedback;
CREATE POLICY "Portal: create feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    (customer_id IS NOT NULL AND customer_id = public.my_customer_id())
    OR (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>'email'))
  );
CREATE POLICY "Portal: read own feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (
    (customer_id IS NOT NULL AND customer_id = public.my_customer_id())
    OR (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Portal: read own vendor profile" ON public.vendors;
DROP POLICY IF EXISTS "Portal: update own vendor profile" ON public.vendors;
CREATE POLICY "Portal: read own vendor profile" ON public.vendors
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );
CREATE POLICY "Portal: update own vendor profile" ON public.vendors
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Portal: read own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Portal: update own purchase orders" ON public.purchase_orders;
CREATE POLICY "Portal: read own purchase orders" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (vendor_id = public.my_vendor_id());
CREATE POLICY "Portal: update own purchase orders" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (vendor_id = public.my_vendor_id())
  WITH CHECK (vendor_id = public.my_vendor_id());

DROP POLICY IF EXISTS "Portal: read own vendor orders" ON public.vendor_orders;
CREATE POLICY "Portal: read own vendor orders" ON public.vendor_orders
  FOR SELECT TO authenticated
  USING (vendor_id = public.my_vendor_id());

DROP POLICY IF EXISTS "Portal: read own vendor payments" ON public.vendor_payments;
CREATE POLICY "Portal: read own vendor payments" ON public.vendor_payments
  FOR SELECT TO authenticated
  USING (vendor_id = public.my_vendor_id());

DROP POLICY IF EXISTS "Portal: read own vendor payouts" ON public.vendor_payouts;
CREATE POLICY "Portal: read own vendor payouts" ON public.vendor_payouts
  FOR SELECT TO authenticated
  USING (vendor_id = public.my_vendor_id());

DROP POLICY IF EXISTS "Portal: read company settings" ON public.company_settings;
CREATE POLICY "Portal: read company settings" ON public.company_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Portal: read service pricing" ON public.service_pricing;
CREATE POLICY "Portal: read service pricing" ON public.service_pricing
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Portal: read own journeys" ON public.order_journeys;
CREATE POLICY "Portal: read own journeys" ON public.order_journeys
  FOR SELECT TO authenticated
  USING (customer_id = public.my_customer_id());

DROP POLICY IF EXISTS "Portal: read own journey events" ON public.journey_events;
CREATE POLICY "Portal: read own journey events" ON public.journey_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_journeys oj
      WHERE oj.id = journey_id
        AND oj.customer_id = public.my_customer_id()
    )
  );

DROP POLICY IF EXISTS "Portal: create own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Portal: read own support tickets" ON public.support_tickets;
CREATE POLICY "Portal: create own support tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    (customer_id IS NOT NULL AND customer_id = public.my_customer_id())
    OR (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>'email'))
  );
CREATE POLICY "Portal: read own support tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    (customer_id IS NOT NULL AND customer_id = public.my_customer_id())
    OR (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Portal: read own POD" ON public.proof_of_delivery;
CREATE POLICY "Portal: read own POD" ON public.proof_of_delivery
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_journeys oj
      WHERE oj.id = journey_id
        AND oj.customer_id = public.my_customer_id()
    )
  );

-- ------------------------------------------------------------------------------
-- Auth-linked identity backfill
-- ------------------------------------------------------------------------------

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS auth_user_id UUID;

UPDATE public.customers c
SET auth_user_id = p.id
FROM public.profiles p
WHERE c.auth_user_id IS NULL
  AND c.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(c.email) = lower(p.email);

UPDATE public.vendors v
SET auth_user_id = p.id
FROM public.profiles p
WHERE v.auth_user_id IS NULL
  AND v.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(v.email) = lower(p.email);

-- ------------------------------------------------------------------------------
-- Numbering helpers and triggers
-- ------------------------------------------------------------------------------

ALTER TABLE public.shipments ALTER COLUMN tracking_number DROP NOT NULL;
ALTER TABLE public.shopping_orders ALTER COLUMN order_number DROP NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
$$;

CREATE SEQUENCE IF NOT EXISTS public.tracking_seq;
CREATE SEQUENCE IF NOT EXISTS public.order_seq;
CREATE SEQUENCE IF NOT EXISTS public.order_journey_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq;

CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_number IS NULL THEN
    NEW.tracking_number := 'SHIP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.tracking_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'SO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_generate_journey_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.order_journey_number_seq');
  RETURN 'JRN-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq_val::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_generate_support_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.support_ticket_number_seq');
  RETURN 'TKT-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq_val::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_set_order_journey_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.journey_number IS NULL OR trim(NEW.journey_number) = '' THEN
    NEW.journey_number := public.ktm_generate_journey_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_set_support_ticket_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR trim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := public.ktm_generate_support_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tracking_number ON public.shipments;
CREATE TRIGGER set_tracking_number
  BEFORE INSERT ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tracking_number();

DROP TRIGGER IF EXISTS set_order_number ON public.shopping_orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.shopping_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

DROP TRIGGER IF EXISTS set_order_journey_defaults ON public.order_journeys;
CREATE TRIGGER set_order_journey_defaults
  BEFORE INSERT ON public.order_journeys
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_set_order_journey_defaults();

DROP TRIGGER IF EXISTS set_support_ticket_defaults ON public.support_tickets;
CREATE TRIGGER set_support_ticket_defaults
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_set_support_ticket_defaults();

DROP TRIGGER IF EXISTS touch_order_journeys_updated_date ON public.order_journeys;
CREATE TRIGGER touch_order_journeys_updated_date
  BEFORE UPDATE ON public.order_journeys
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_touch_updated_date();

DROP TRIGGER IF EXISTS touch_support_tickets_updated_date ON public.support_tickets;
CREATE TRIGGER touch_support_tickets_updated_date
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_touch_updated_date();

DROP TRIGGER IF EXISTS touch_proof_of_delivery_updated_date ON public.proof_of_delivery;
CREATE TRIGGER touch_proof_of_delivery_updated_date
  BEFORE UPDATE ON public.proof_of_delivery
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_touch_updated_date();

ALTER TABLE public.shipments ALTER COLUMN tracking_number SET NOT NULL;
ALTER TABLE public.shopping_orders ALTER COLUMN order_number SET NOT NULL;

-- ------------------------------------------------------------------------------
-- Contract normalization and support sync
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ktm_normalize_po_status(input_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(input_status, '')))
    WHEN '' THEN NULL
    WHEN 'pending' THEN 'pending_approval'
    WHEN 'sent_to_vendor' THEN 'sent'
    WHEN 'partially_received' THEN 'partial_received'
    WHEN 'fully_received' THEN 'received'
    WHEN 'closed' THEN 'cancelled'
    ELSE lower(trim(input_status))
  END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_apply_po_status_normalization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status = public.ktm_normalize_po_status(NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_purchase_order_status ON public.purchase_orders;
CREATE TRIGGER normalize_purchase_order_status
  BEFORE INSERT OR UPDATE OF status ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_apply_po_status_normalization();

CREATE OR REPLACE FUNCTION public.ktm_normalize_vendor_type(input_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(input_type, '')))
    WHEN '' THEN NULL
    WHEN 'cargo' THEN 'cargo_carrier'
    WHEN 'supplier_cargo' THEN 'cargo_carrier'
    ELSE lower(trim(input_type))
  END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_apply_vendor_type_normalization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.vendor_type = public.ktm_normalize_vendor_type(NEW.vendor_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_vendor_type ON public.vendors;
CREATE TRIGGER normalize_vendor_type
  BEFORE INSERT OR UPDATE OF vendor_type ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_apply_vendor_type_normalization();

CREATE OR REPLACE FUNCTION public.ktm_normalize_invoice_type(input_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(input_type, '')))
    WHEN '' THEN 'shipment'
    WHEN 'vendor_invoice' THEN 'vendor_bill'
    ELSE lower(trim(input_type))
  END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_apply_invoice_type_normalization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.invoice_type = public.ktm_normalize_invoice_type(NEW.invoice_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_invoice_type ON public.customer_invoices;
CREATE TRIGGER normalize_invoice_type
  BEFORE INSERT OR UPDATE OF invoice_type ON public.customer_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_apply_invoice_type_normalization();

CREATE OR REPLACE FUNCTION public.ktm_normalize_feedback_status(input_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(input_status, '')))
    WHEN '' THEN 'pending'
    WHEN 'open' THEN 'pending'
    WHEN 'done' THEN 'resolved'
    ELSE lower(trim(input_status))
  END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_normalize_feedback_kind(
  input_kind TEXT,
  legacy_type TEXT,
  has_shipment BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  kind_value TEXT := lower(trim(coalesce(input_kind, '')));
  legacy_value TEXT := lower(trim(coalesce(legacy_type, '')));
BEGIN
  IF kind_value = '' THEN
    IF legacy_value IN ('tracking', 'delivery', 'payment', 'damage', 'other', 'support_ticket') THEN
      RETURN 'support_ticket';
    ELSIF has_shipment THEN
      RETURN 'delivery_feedback';
    ELSE
      RETURN 'general';
    END IF;
  END IF;

  IF kind_value = 'rating' THEN
    RETURN 'delivery_feedback';
  END IF;

  RETURN kind_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_apply_feedback_normalization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := public.ktm_normalize_feedback_status(NEW.status);
  NEW.feedback_kind := public.ktm_normalize_feedback_kind(
    NEW.feedback_kind,
    NEW.feedback_type,
    NEW.shipment_id IS NOT NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_feedback_contract ON public.feedback;
CREATE TRIGGER normalize_feedback_contract
  BEFORE INSERT OR UPDATE OF status, feedback_kind, feedback_type, shipment_id
  ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_apply_feedback_normalization();

CREATE OR REPLACE FUNCTION public.ktm_sync_support_ticket_from_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  mapped_status TEXT;
BEGIN
  IF NEW.feedback_kind <> 'support_ticket' THEN
    RETURN NEW;
  END IF;

  mapped_status := CASE NEW.status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'archived' THEN 'closed'
    ELSE 'pending'
  END;

  INSERT INTO public.support_tickets (
    customer_id,
    customer_name,
    customer_email,
    journey_id,
    shipment_id,
    shopping_order_id,
    source_feedback_id,
    category,
    subject,
    message,
    priority,
    status,
    source,
    resolution_note
  )
  VALUES (
    NEW.customer_id,
    NEW.customer_name,
    NEW.customer_email,
    NEW.journey_id,
    NEW.shipment_id,
    NEW.shopping_order_id,
    NEW.id,
    COALESCE(NEW.category, NEW.feedback_type),
    COALESCE(NEW.subject, 'Support Request'),
    COALESCE(NEW.message, NEW.comment, ''),
    CASE WHEN NEW.priority IN ('low', 'medium', 'high', 'urgent') THEN NEW.priority ELSE 'medium' END,
    mapped_status,
    'legacy_feedback_sync',
    NULL
  )
  ON CONFLICT (source_feedback_id)
  DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    customer_name = EXCLUDED.customer_name,
    customer_email = EXCLUDED.customer_email,
    journey_id = EXCLUDED.journey_id,
    shipment_id = EXCLUDED.shipment_id,
    shopping_order_id = EXCLUDED.shopping_order_id,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    message = EXCLUDED.message,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    updated_date = NOW();

  UPDATE public.feedback f
  SET support_ticket_id = st.id
  FROM public.support_tickets st
  WHERE st.source_feedback_id = NEW.id
    AND f.id = NEW.id
    AND (f.support_ticket_id IS NULL OR f.support_ticket_id <> st.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_support_ticket_from_feedback ON public.feedback;
CREATE TRIGGER sync_support_ticket_from_feedback
  AFTER INSERT OR UPDATE OF feedback_kind, status, subject, message, comment, category, priority
  ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.ktm_sync_support_ticket_from_feedback();

INSERT INTO public.support_tickets (
  customer_id,
  customer_name,
  customer_email,
  journey_id,
  shipment_id,
  shopping_order_id,
  source_feedback_id,
  category,
  subject,
  message,
  priority,
  status,
  source
)
SELECT
  f.customer_id,
  f.customer_name,
  f.customer_email,
  f.journey_id,
  f.shipment_id,
  f.shopping_order_id,
  f.id,
  COALESCE(f.category, f.feedback_type),
  COALESCE(f.subject, 'Support Request'),
  COALESCE(f.message, f.comment, ''),
  CASE WHEN f.priority IN ('low', 'medium', 'high', 'urgent') THEN f.priority ELSE 'medium' END,
  CASE f.status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'archived' THEN 'closed'
    ELSE 'pending'
  END,
  'legacy_feedback_sync'
FROM public.feedback f
WHERE f.feedback_kind = 'support_ticket'
  AND f.id IS NOT NULL
ON CONFLICT (source_feedback_id) DO NOTHING;

UPDATE public.feedback f
SET support_ticket_id = st.id
FROM public.support_tickets st
WHERE st.source_feedback_id = f.id
  AND (f.support_ticket_id IS NULL OR f.support_ticket_id <> st.id);

-- ------------------------------------------------------------------------------
-- Transactional shipment / PO RPCs
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_shipment_rpc_payload(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_payload JSONB := COALESCE(p_payload, '{}'::jsonb);
  v_uuid_field TEXT;
BEGIN
  FOREACH v_uuid_field IN ARRAY ARRAY['customer_id', 'vendor_po_id', 'vendor_id', 'journey_id']
  LOOP
    IF v_payload ? v_uuid_field AND NULLIF(BTRIM(v_payload ->> v_uuid_field), '') IS NULL THEN
      v_payload := jsonb_set(v_payload, ARRAY[v_uuid_field], 'null'::jsonb, true);
    END IF;
  END LOOP;

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_purchase_orders_for_rebalance(
  p_previous_po_id UUID DEFAULT NULL,
  p_next_po_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
  FROM public.purchase_orders
  WHERE id = ANY(array_remove(ARRAY[p_previous_po_id, p_next_po_id]::UUID[], NULL))
  ORDER BY id
  FOR UPDATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_purchase_order_allocation_delta(
  p_po_id UUID,
  p_delta NUMERIC
)
RETURNS public.purchase_orders
LANGUAGE plpgsql
AS $$
DECLARE
  v_po public.purchase_orders%ROWTYPE;
  v_total NUMERIC := 0;
  v_allocated NUMERIC := 0;
  v_next_allocated NUMERIC := 0;
  v_next_remaining NUMERIC := 0;
BEGIN
  IF p_po_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_po
  FROM public.purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked purchase order not found: %', p_po_id;
  END IF;

  v_total := GREATEST(COALESCE(v_po.total_weight_kg, 0), 0);
  v_allocated := GREATEST(COALESCE(v_po.allocated_weight_kg, 0), 0);
  v_next_allocated := GREATEST(0, v_allocated + COALESCE(p_delta, 0));

  IF v_total > 0 AND v_next_allocated > v_total THEN
    RAISE EXCEPTION 'Shipment exceeds available purchase order capacity for %',
      COALESCE(v_po.po_number, v_po.id::TEXT);
  END IF;

  v_next_remaining := CASE
    WHEN v_total > 0 THEN GREATEST(0, v_total - v_next_allocated)
    ELSE COALESCE(v_po.remaining_weight_kg, 0)
  END;

  UPDATE public.purchase_orders
  SET
    allocated_weight_kg = v_next_allocated,
    remaining_weight_kg = v_next_remaining
  WHERE id = p_po_id
  RETURNING *
  INTO v_po;

  RETURN v_po;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_shipment_with_po_rebalance(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload JSONB := public.normalize_shipment_rpc_payload(p_payload);
  v_candidate public.shipments%ROWTYPE;
  v_shipment public.shipments%ROWTYPE;
  v_next_po_id UUID;
  v_weight NUMERIC := 0;
  v_affected_pos JSONB := '[]'::jsonb;
BEGIN
  v_candidate := jsonb_populate_record(NULL::public.shipments, v_payload);
  v_next_po_id := v_candidate.vendor_po_id;
  v_weight := GREATEST(COALESCE(v_candidate.weight_kg, 0), 0);

  IF COALESCE(BTRIM(v_candidate.customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.service_type), '') = '' THEN
    RAISE EXCEPTION 'Service type is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.items_description), '') = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF v_weight <= 0 THEN
    RAISE EXCEPTION 'Shipment weight must be greater than zero';
  END IF;

  PERFORM public.lock_purchase_orders_for_rebalance(NULL, v_next_po_id);

  INSERT INTO public.shipments (
    customer_id,
    customer_name,
    customer_phone,
    service_type,
    weight_kg,
    items_description,
    tracking_number,
    price_per_kg,
    cost_basis,
    total_amount,
    profit,
    insurance_amount,
    status,
    payment_status,
    estimated_delivery,
    pickup_address,
    delivery_address,
    insurance_opted,
    packaging_fee,
    notes,
    vendor_po_id,
    vendor_id,
    vendor_name,
    vendor_po_number,
    vendor_cost_per_kg,
    vendor_total_cost,
    origin,
    destination,
    journey_id
  )
  VALUES (
    v_candidate.customer_id,
    v_candidate.customer_name,
    v_candidate.customer_phone,
    v_candidate.service_type,
    v_candidate.weight_kg,
    v_candidate.items_description,
    v_candidate.tracking_number,
    v_candidate.price_per_kg,
    v_candidate.cost_basis,
    v_candidate.total_amount,
    v_candidate.profit,
    v_candidate.insurance_amount,
    COALESCE(v_candidate.status, 'pending'),
    COALESCE(v_candidate.payment_status, 'unpaid'),
    v_candidate.estimated_delivery,
    v_candidate.pickup_address,
    v_candidate.delivery_address,
    COALESCE(v_candidate.insurance_opted, false),
    COALESCE(v_candidate.packaging_fee, 0),
    v_candidate.notes,
    v_candidate.vendor_po_id,
    v_candidate.vendor_id,
    v_candidate.vendor_name,
    v_candidate.vendor_po_number,
    v_candidate.vendor_cost_per_kg,
    v_candidate.vendor_total_cost,
    COALESCE(v_candidate.origin, 'Bangkok'),
    COALESCE(v_candidate.destination, 'Yangon'),
    v_candidate.journey_id
  )
  RETURNING *
  INTO v_shipment;

  IF v_next_po_id IS NOT NULL AND v_weight > 0 THEN
    PERFORM public.apply_purchase_order_allocation_delta(v_next_po_id, v_weight);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(po)), '[]'::jsonb)
  INTO v_affected_pos
  FROM (
    SELECT *
    FROM public.purchase_orders
    WHERE id = ANY(array_remove(ARRAY[v_next_po_id]::UUID[], NULL))
  ) po;

  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_shipment),
    'purchase_orders', v_affected_pos
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_shipment_with_po_rebalance(
  p_shipment_id UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_updates JSONB := public.normalize_shipment_rpc_payload(p_updates);
  v_existing public.shipments%ROWTYPE;
  v_candidate public.shipments%ROWTYPE;
  v_updated public.shipments%ROWTYPE;
  v_previous_po_id UUID;
  v_next_po_id UUID;
  v_previous_weight NUMERIC := 0;
  v_next_weight NUMERIC := 0;
  v_affected_pos JSONB := '[]'::jsonb;
BEGIN
  SELECT *
  INTO v_existing
  FROM public.shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found: %', p_shipment_id;
  END IF;

  v_candidate := jsonb_populate_record(v_existing, v_updates);
  v_previous_po_id := v_existing.vendor_po_id;
  v_next_po_id := v_candidate.vendor_po_id;
  v_previous_weight := GREATEST(COALESCE(v_existing.weight_kg, 0), 0);
  v_next_weight := GREATEST(COALESCE(v_candidate.weight_kg, 0), 0);

  IF COALESCE(BTRIM(v_candidate.customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.service_type), '') = '' THEN
    RAISE EXCEPTION 'Service type is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.items_description), '') = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF v_next_weight <= 0 THEN
    RAISE EXCEPTION 'Shipment weight must be greater than zero';
  END IF;

  PERFORM public.lock_purchase_orders_for_rebalance(v_previous_po_id, v_next_po_id);

  IF v_previous_po_id IS NOT NULL AND v_next_po_id IS NOT NULL AND v_previous_po_id = v_next_po_id THEN
    PERFORM public.apply_purchase_order_allocation_delta(v_previous_po_id, v_next_weight - v_previous_weight);
  ELSE
    IF v_previous_po_id IS NOT NULL AND v_previous_weight > 0 THEN
      PERFORM public.apply_purchase_order_allocation_delta(v_previous_po_id, -v_previous_weight);
    END IF;

    IF v_next_po_id IS NOT NULL AND v_next_weight > 0 THEN
      PERFORM public.apply_purchase_order_allocation_delta(v_next_po_id, v_next_weight);
    END IF;
  END IF;

  UPDATE public.shipments
  SET
    customer_id = v_candidate.customer_id,
    customer_name = v_candidate.customer_name,
    customer_phone = v_candidate.customer_phone,
    service_type = v_candidate.service_type,
    weight_kg = v_candidate.weight_kg,
    items_description = v_candidate.items_description,
    tracking_number = v_candidate.tracking_number,
    price_per_kg = v_candidate.price_per_kg,
    cost_basis = v_candidate.cost_basis,
    total_amount = v_candidate.total_amount,
    profit = v_candidate.profit,
    insurance_amount = v_candidate.insurance_amount,
    status = COALESCE(v_candidate.status, 'pending'),
    payment_status = COALESCE(v_candidate.payment_status, 'unpaid'),
    estimated_delivery = v_candidate.estimated_delivery,
    pickup_address = v_candidate.pickup_address,
    delivery_address = v_candidate.delivery_address,
    insurance_opted = COALESCE(v_candidate.insurance_opted, false),
    packaging_fee = COALESCE(v_candidate.packaging_fee, 0),
    notes = v_candidate.notes,
    vendor_po_id = v_candidate.vendor_po_id,
    vendor_id = v_candidate.vendor_id,
    vendor_name = v_candidate.vendor_name,
    vendor_po_number = v_candidate.vendor_po_number,
    vendor_cost_per_kg = v_candidate.vendor_cost_per_kg,
    vendor_total_cost = v_candidate.vendor_total_cost,
    origin = COALESCE(v_candidate.origin, 'Bangkok'),
    destination = COALESCE(v_candidate.destination, 'Yangon'),
    journey_id = v_candidate.journey_id
  WHERE id = p_shipment_id
  RETURNING *
  INTO v_updated;

  SELECT COALESCE(jsonb_agg(to_jsonb(po)), '[]'::jsonb)
  INTO v_affected_pos
  FROM (
    SELECT DISTINCT *
    FROM public.purchase_orders
    WHERE id = ANY(array_remove(ARRAY[v_previous_po_id, v_next_po_id]::UUID[], NULL))
  ) po;

  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_updated),
    'purchase_orders', v_affected_pos
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_shipment_with_po_rebalance(p_shipment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.shipments%ROWTYPE;
  v_deleted public.shipments%ROWTYPE;
  v_previous_po_id UUID;
  v_previous_weight NUMERIC := 0;
  v_affected_pos JSONB := '[]'::jsonb;
BEGIN
  SELECT *
  INTO v_existing
  FROM public.shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found: %', p_shipment_id;
  END IF;

  v_previous_po_id := v_existing.vendor_po_id;
  v_previous_weight := GREATEST(COALESCE(v_existing.weight_kg, 0), 0);

  PERFORM public.lock_purchase_orders_for_rebalance(v_previous_po_id, NULL);

  IF v_previous_po_id IS NOT NULL AND v_previous_weight > 0 THEN
    PERFORM public.apply_purchase_order_allocation_delta(v_previous_po_id, -v_previous_weight);
  END IF;

  DELETE FROM public.shipments
  WHERE id = p_shipment_id
  RETURNING *
  INTO v_deleted;

  SELECT COALESCE(jsonb_agg(to_jsonb(po)), '[]'::jsonb)
  INTO v_affected_pos
  FROM (
    SELECT *
    FROM public.purchase_orders
    WHERE id = ANY(array_remove(ARRAY[v_previous_po_id]::UUID[], NULL))
  ) po;

  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_deleted),
    'purchase_orders', v_affected_pos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_shipment_rpc_payload(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_purchase_orders_for_rebalance(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_purchase_order_allocation_delta(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_shipment_with_po_rebalance(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_shipment_with_po_rebalance(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_shipment_with_po_rebalance(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_shipment_rpc_payload(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lock_purchase_orders_for_rebalance(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_purchase_order_allocation_delta(UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_shipment_with_po_rebalance(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_shipment_with_po_rebalance(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_shipment_with_po_rebalance(UUID) TO authenticated, service_role;
