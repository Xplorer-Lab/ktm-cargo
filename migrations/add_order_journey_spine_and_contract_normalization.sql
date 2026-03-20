-- =============================================================================
-- MIGRATION: Add Order Journey Spine + Contract Normalization (Additive)
--
-- Goals
-- 1) Add canonical workflow spine tables for scalability:
--      - order_journeys
--      - journey_events
-- 2) Keep existing operational tables compatible by adding nullable journey_id
--    links (shopping_orders, shipments, purchase_orders, customer_invoices, feedback).
-- 3) Normalize key business vocabularies with compatibility triggers:
--      - vendor_type => canonical cargo_carrier
--      - purchase_order status => canonical set
--      - invoice_type => explicit values including vendor_bill
-- 4) Split support lifecycle from delivery feedback with additive support_tickets
--    while keeping legacy feedback writes compatible.
-- 5) Add additive proof_of_delivery table linked to journey/shipment.
--
-- Compatibility notes
-- - Legacy values are normalized via BEFORE triggers; existing app payloads keep working.
-- - Existing tables are not dropped or renamed.
-- - Constraints are redefined with v2 names to avoid destructive schema churn.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared utility: touch updated_date
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ktm_touch_updated_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1) Canonical Journey Spine
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_number TEXT UNIQUE,
  mode TEXT NOT NULL DEFAULT 'cargo_only',
  current_stage TEXT NOT NULL DEFAULT 'inquiry_received',
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  source_channel TEXT DEFAULT 'manual',
  quote_currency TEXT DEFAULT 'THB',
  quoted_total DECIMAL(12,2) DEFAULT 0,
  confirmed_total DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  transport_mode TEXT,
  origin_country TEXT DEFAULT 'TH',
  destination_country TEXT DEFAULT 'MM',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  closed_date TIMESTAMPTZ,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_journeys_mode_check CHECK (mode IN ('cargo_only', 'shopping_proxy', 'hybrid')),
  CONSTRAINT order_journeys_stage_check CHECK (
    current_stage IN (
      'inquiry_received',
      'quoted',
      'confirmed',
      'payment_partial',
      'payment_confirmed',
      'thailand_fulfillment',
      'consolidated',
      'booked_with_carrier',
      'departed_thailand',
      'arrived_myanmar',
      'customs_cleared',
      'out_for_delivery',
      'delivered',
      'after_sales_open',
      'reconciled',
      'cancelled'
    )
  ),
  CONSTRAINT order_journeys_payment_status_check CHECK (
    payment_status IN ('unpaid', 'partial', 'paid', 'refunded')
  ),
  CONSTRAINT order_journeys_transport_mode_check CHECK (
    transport_mode IS NULL OR transport_mode IN ('air', 'land', 'sea', 'mixed')
  )
);

CREATE INDEX IF NOT EXISTS idx_order_journeys_customer_id ON public.order_journeys(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_journeys_current_stage ON public.order_journeys(current_stage);
CREATE INDEX IF NOT EXISTS idx_order_journeys_created_date ON public.order_journeys(created_date DESC);

CREATE SEQUENCE IF NOT EXISTS public.order_journey_number_seq START 1;

CREATE OR REPLACE FUNCTION public.ktm_generate_journey_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.order_journey_number_seq');
  RETURN 'JRN-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_set_order_journey_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.journey_number IS NULL OR TRIM(NEW.journey_number) = '' THEN
    NEW.journey_number := public.ktm_generate_journey_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_journey_defaults ON public.order_journeys;
CREATE TRIGGER set_order_journey_defaults
BEFORE INSERT ON public.order_journeys
FOR EACH ROW
EXECUTE FUNCTION public.ktm_set_order_journey_defaults();

DROP TRIGGER IF EXISTS touch_order_journeys_updated_date ON public.order_journeys;
CREATE TRIGGER touch_order_journeys_updated_date
BEFORE UPDATE ON public.order_journeys
FOR EACH ROW
EXECUTE FUNCTION public.ktm_touch_updated_date();

CREATE TABLE IF NOT EXISTS public.journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.order_journeys(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stage_from TEXT,
  stage_to TEXT,
  entity_type TEXT,
  entity_id UUID,
  event_status TEXT NOT NULL DEFAULT 'recorded',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journey_events_stage_from_check CHECK (
    stage_from IS NULL OR stage_from IN (
      'inquiry_received',
      'quoted',
      'confirmed',
      'payment_partial',
      'payment_confirmed',
      'thailand_fulfillment',
      'consolidated',
      'booked_with_carrier',
      'departed_thailand',
      'arrived_myanmar',
      'customs_cleared',
      'out_for_delivery',
      'delivered',
      'after_sales_open',
      'reconciled',
      'cancelled'
    )
  ),
  CONSTRAINT journey_events_stage_to_check CHECK (
    stage_to IS NULL OR stage_to IN (
      'inquiry_received',
      'quoted',
      'confirmed',
      'payment_partial',
      'payment_confirmed',
      'thailand_fulfillment',
      'consolidated',
      'booked_with_carrier',
      'departed_thailand',
      'arrived_myanmar',
      'customs_cleared',
      'out_for_delivery',
      'delivered',
      'after_sales_open',
      'reconciled',
      'cancelled'
    )
  ),
  CONSTRAINT journey_events_entity_type_check CHECK (
    entity_type IS NULL OR entity_type IN (
      'shopping_order',
      'shipment',
      'purchase_order',
      'customer_invoice',
      'feedback',
      'vendor_order',
      'manual'
    )
  ),
  CONSTRAINT journey_events_status_check CHECK (
    event_status IN ('recorded', 'pending', 'completed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_journey_events_journey_id ON public.journey_events(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_created_date ON public.journey_events(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_journey_events_entity ON public.journey_events(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 2) Additive journey links to existing operational tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.shopping_orders ADD COLUMN IF NOT EXISTS journey_id UUID;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS journey_id UUID;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS journey_id UUID;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS journey_id UUID;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS journey_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shopping_orders_journey') THEN
    ALTER TABLE public.shopping_orders
      ADD CONSTRAINT fk_shopping_orders_journey
      FOREIGN KEY (journey_id) REFERENCES public.order_journeys(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_journey') THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT fk_shipments_journey
      FOREIGN KEY (journey_id) REFERENCES public.order_journeys(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_orders_journey') THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT fk_purchase_orders_journey
      FOREIGN KEY (journey_id) REFERENCES public.order_journeys(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_invoices_journey') THEN
    ALTER TABLE public.customer_invoices
      ADD CONSTRAINT fk_customer_invoices_journey
      FOREIGN KEY (journey_id) REFERENCES public.order_journeys(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_feedback_journey') THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT fk_feedback_journey
      FOREIGN KEY (journey_id) REFERENCES public.order_journeys(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shopping_orders_journey_id ON public.shopping_orders(journey_id);
CREATE INDEX IF NOT EXISTS idx_shipments_journey_id ON public.shipments(journey_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_journey_id ON public.purchase_orders(journey_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_journey_id ON public.customer_invoices(journey_id);
CREATE INDEX IF NOT EXISTS idx_feedback_journey_id ON public.feedback(journey_id);

-- -----------------------------------------------------------------------------
-- 3) Contract normalization: purchase order statuses
-- Canonical set:
--   draft, pending_approval, approved, sent, partial_received, received, cancelled
-- Compatibility aliases:
--   pending -> pending_approval
--   sent_to_vendor -> sent
--   partially_received -> partial_received
--   fully_received -> received
--   closed -> cancelled
-- -----------------------------------------------------------------------------
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

UPDATE public.purchase_orders
SET status = public.ktm_normalize_po_status(status)
WHERE status IS NOT NULL;

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'purchase_orders'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~* '\mstatus\M'
      AND pg_get_constraintdef(c.oid) ~* '\mstatus\M\s+IN\s*\('
  LOOP
    EXECUTE format('ALTER TABLE public.purchase_orders DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check_v2;
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_status_check_v2
  CHECK (status IN (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'partial_received',
    'received',
    'cancelled'
  ));

-- -----------------------------------------------------------------------------
-- 4) Contract normalization: vendor types
-- Canonical: supplier, cargo_carrier, packaging, customs_broker, warehouse
-- Compatibility aliases: cargo, supplier_cargo -> cargo_carrier
-- -----------------------------------------------------------------------------
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

UPDATE public.vendors
SET vendor_type = public.ktm_normalize_vendor_type(vendor_type)
WHERE vendor_type IS NOT NULL;

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'vendors'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%vendor_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.vendors DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_vendor_type_check_v2;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_vendor_type_check_v2
  CHECK (vendor_type IN (
    'supplier',
    'cargo_carrier',
    'packaging',
    'customs_broker',
    'warehouse'
  ));

-- -----------------------------------------------------------------------------
-- 5) Contract normalization: invoice type
-- Explicitly allow vendor_bill while keeping existing customer invoice flow.
-- -----------------------------------------------------------------------------
ALTER TABLE public.customer_invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'shipment';

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

UPDATE public.customer_invoices
SET invoice_type = public.ktm_normalize_invoice_type(invoice_type)
WHERE invoice_type IS NULL OR invoice_type <> public.ktm_normalize_invoice_type(invoice_type);

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'customer_invoices'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%invoice_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.customer_invoices DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.customer_invoices
  DROP CONSTRAINT IF EXISTS customer_invoices_invoice_type_check_v2;
ALTER TABLE public.customer_invoices
  ADD CONSTRAINT customer_invoices_invoice_type_check_v2
  CHECK (invoice_type IN ('shipment', 'shopping_order', 'vendor_bill', 'adjustment'));

-- -----------------------------------------------------------------------------
-- 6) Split support from delivery feedback (additive bridge)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  shopping_order_id UUID REFERENCES public.shopping_orders(id) ON DELETE SET NULL,
  source_feedback_id UUID UNIQUE REFERENCES public.feedback(id) ON DELETE SET NULL,
  category TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'portal',
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_tickets_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT support_tickets_status_check CHECK (
    status IN ('pending', 'in_progress', 'resolved', 'closed', 'cancelled')
  ),
  CONSTRAINT support_tickets_source_check CHECK (
    source IN ('portal', 'staff', 'api', 'legacy_feedback_sync')
  )
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_journey_id ON public.support_tickets(journey_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_date ON public.support_tickets(created_date DESC);

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.ktm_generate_support_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.support_ticket_number_seq');
  RETURN 'TKT-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.ktm_set_support_ticket_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR TRIM(NEW.ticket_number) = '' THEN
    NEW.ticket_number := public.ktm_generate_support_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_support_ticket_defaults ON public.support_tickets;
CREATE TRIGGER set_support_ticket_defaults
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.ktm_set_support_ticket_defaults();

DROP TRIGGER IF EXISTS touch_support_tickets_updated_date ON public.support_tickets;
CREATE TRIGGER touch_support_tickets_updated_date
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.ktm_touch_updated_date();

-- Feedback contract extensions (kept additive for compatibility)
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS shopping_order_id UUID;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS feedback_kind TEXT DEFAULT 'delivery_feedback';
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS order_reference_type TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS order_reference_id UUID;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal';
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS support_ticket_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_feedback_shopping_order') THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT fk_feedback_shopping_order
      FOREIGN KEY (shopping_order_id) REFERENCES public.shopping_orders(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_feedback_support_ticket') THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT fk_feedback_support_ticket
      FOREIGN KEY (support_ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;
  END IF;
END $$;

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

UPDATE public.feedback
SET
  status = public.ktm_normalize_feedback_status(status),
  feedback_kind = public.ktm_normalize_feedback_kind(feedback_kind, feedback_type, shipment_id IS NOT NULL);

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'feedback'
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%status%'
        OR pg_get_constraintdef(c.oid) ILIKE '%feedback_kind%'
        OR pg_get_constraintdef(c.oid) ILIKE '%order_reference_type%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.feedback DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_status_check_v2;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_status_check_v2
  CHECK (status IN (
    'pending',
    'submitted',
    'in_progress',
    'resolved',
    'reviewed',
    'archived',
    'cancelled'
  ));

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_kind_check_v2;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_kind_check_v2
  CHECK (feedback_kind IN ('delivery_feedback', 'support_ticket', 'nps', 'general'));

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_order_reference_type_check_v2;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_order_reference_type_check_v2
  CHECK (
    order_reference_type IS NULL
    OR order_reference_type IN (
      'journey',
      'shipment',
      'shopping_order',
      'purchase_order',
      'invoice',
      'support_ticket',
      'general'
    )
  );

CREATE INDEX IF NOT EXISTS idx_feedback_feedback_kind ON public.feedback(feedback_kind);
CREATE INDEX IF NOT EXISTS idx_feedback_customer_email ON public.feedback(customer_email);
CREATE INDEX IF NOT EXISTS idx_feedback_support_ticket_id ON public.feedback(support_ticket_id);

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

-- Backfill support tickets from legacy feedback rows
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

-- -----------------------------------------------------------------------------
-- 7) Additive proof-of-delivery artifact table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proof_of_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  receiver_name TEXT,
  receiver_phone TEXT,
  delivery_address TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  photo_url TEXT,
  signature_url TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proof_of_delivery_shipment_unique UNIQUE (shipment_id)
);

CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_journey_id ON public.proof_of_delivery(journey_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_delivered_at ON public.proof_of_delivery(delivered_at DESC);

DROP TRIGGER IF EXISTS touch_proof_of_delivery_updated_date ON public.proof_of_delivery;
CREATE TRIGGER touch_proof_of_delivery_updated_date
BEFORE UPDATE ON public.proof_of_delivery
FOR EACH ROW
EXECUTE FUNCTION public.ktm_touch_updated_date();

-- -----------------------------------------------------------------------------
-- 8) RLS for newly introduced tables (if helper functions exist)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  guarded_tables TEXT[] := ARRAY['order_journeys', 'journey_events', 'support_tickets', 'proof_of_delivery'];
BEGIN
  IF to_regprocedure('public.is_admin_or_director()') IS NOT NULL THEN
    FOREACH t IN ARRAY guarded_tables LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Staff Full Access ' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin_or_director())',
        'Staff Full Access ' || t,
        t
      );
    END LOOP;
  END IF;

  IF to_regprocedure('public.my_customer_id()') IS NOT NULL THEN
    -- Customer can read own journeys
    EXECUTE 'DROP POLICY IF EXISTS "Portal: read own journeys" ON public.order_journeys';
    EXECUTE '
      CREATE POLICY "Portal: read own journeys" ON public.order_journeys
      FOR SELECT TO authenticated
      USING (customer_id = public.my_customer_id())
    ';

    -- Customer can read journey events for own journeys
    EXECUTE 'DROP POLICY IF EXISTS "Portal: read own journey events" ON public.journey_events';
    EXECUTE '
      CREATE POLICY "Portal: read own journey events" ON public.journey_events
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.order_journeys oj
          WHERE oj.id = journey_id
            AND oj.customer_id = public.my_customer_id()
        )
      )
    ';

    -- Customer can create/read own support tickets
    EXECUTE 'DROP POLICY IF EXISTS "Portal: create own support tickets" ON public.support_tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Portal: read own support tickets" ON public.support_tickets';
    EXECUTE '
      CREATE POLICY "Portal: create own support tickets" ON public.support_tickets
      FOR INSERT TO authenticated
      WITH CHECK (
        (customer_id IS NOT NULL AND customer_id = public.my_customer_id())
        OR (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>''email''))
      )
    ';
    EXECUTE '
      CREATE POLICY "Portal: read own support tickets" ON public.support_tickets
      FOR SELECT TO authenticated
      USING (
        (customer_id IS NOT NULL AND customer_id = public.my_customer_id())
        OR (customer_email IS NOT NULL AND lower(customer_email) = lower(auth.jwt()->>''email''))
      )
    ';

    -- Customer can read own POD rows through journey ownership
    EXECUTE 'DROP POLICY IF EXISTS "Portal: read own POD" ON public.proof_of_delivery';
    EXECUTE '
      CREATE POLICY "Portal: read own POD" ON public.proof_of_delivery
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.order_journeys oj
          WHERE oj.id = journey_id
            AND oj.customer_id = public.my_customer_id()
        )
      )
    ';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Verification snapshot
-- -----------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_journeys') AS order_journeys_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journey_events') AS journey_events_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') AS support_tickets_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proof_of_delivery') AS proof_of_delivery_table,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'journey_id') AS shipments_journey_link,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'feedback_kind') AS feedback_kind_column;
