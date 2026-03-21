-- ==============================================================================
-- KTM Cargo Express
-- Canonical baseline schema
--
-- This file is the clean starting point for a new database.
-- Money fields use DECIMAL, not TEXT.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- Shared helper tables
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  staff_role TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none',
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_current_period_end TIMESTAMPTZ,
  subscription_stripe_id TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'BKK-YGN Cargo',
  logo_url TEXT,
  tagline TEXT DEFAULT 'Bangkok to Yangon Cargo & Shopping Services',
  primary_color TEXT DEFAULT '#2563eb',
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  currency TEXT DEFAULT 'THB',
  default_currency TEXT DEFAULT 'THB',
  default_payment_terms TEXT DEFAULT 'net_7',
  invoice_prefix TEXT DEFAULT 'INV',
  tracking_prefix TEXT DEFAULT 'BKK',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  cost_per_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_per_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
  insurance_rate DECIMAL(5,2) DEFAULT 2.00,
  packaging_fee DECIMAL(12,2) DEFAULT 0,
  min_weight DECIMAL(12,2) DEFAULT 0,
  max_weight DECIMAL(12,2) DEFAULT 999,
  is_active BOOLEAN DEFAULT true,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.surcharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  surcharge_type TEXT NOT NULL DEFAULT 'fixed',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  applies_to TEXT,
  is_active BOOLEAN DEFAULT true,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role TEXT,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Customer / vendor directory
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  customer_type TEXT DEFAULT 'individual',
  address_bangkok TEXT,
  address_yangon TEXT,
  notes TEXT,
  referred_by TEXT,
  referral_code TEXT,
  preferred_contact TEXT DEFAULT 'phone',
  line_id TEXT,
  whatsapp TEXT,
  is_verified BOOLEAN DEFAULT false,
  registration_source TEXT DEFAULT 'web',
  auth_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT customers_customer_type_check
    CHECK (customer_type IN ('individual', 'online_shopper', 'sme_importer')),
  CONSTRAINT customers_preferred_contact_check
    CHECK (preferred_contact IN ('phone', 'email', 'line', 'whatsapp'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_referral_code
  ON public.customers(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_auth_user_id
  ON public.customers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL DEFAULT 'supplier',
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  bank_details TEXT,
  services TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  contract_start DATE,
  contract_end DATE,
  onboarding_source TEXT,
  cargo_capacity_per_month DECIMAL(12,2),
  on_time_rate DECIMAL(5,2) DEFAULT 100,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  cost_per_kg DECIMAL(12,2) DEFAULT 0,
  cost_per_kg_express DECIMAL(12,2) DEFAULT 0,
  cost_per_kg_bulk DECIMAL(12,2) DEFAULT 0,
  bulk_threshold_kg DECIMAL(12,2) DEFAULT 100,
  auth_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT vendors_vendor_type_check
    CHECK (vendor_type IN ('supplier', 'cargo_carrier', 'packaging', 'customs_broker', 'warehouse')),
  CONSTRAINT vendors_status_check
    CHECK (status IN ('active', 'inactive', 'pending'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_auth_user_id
  ON public.vendors(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- Journey spine and support artifacts
-- ------------------------------------------------------------------------------

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
  CONSTRAINT order_journeys_mode_check
    CHECK (mode IN ('cargo_only', 'shopping_proxy', 'hybrid')),
  CONSTRAINT order_journeys_stage_check
    CHECK (current_stage IN (
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
    )),
  CONSTRAINT order_journeys_payment_status_check
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  CONSTRAINT order_journeys_transport_mode_check
    CHECK (transport_mode IS NULL OR transport_mode IN ('air', 'land', 'sea', 'mixed'))
);

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
  CONSTRAINT journey_events_event_status_check
    CHECK (event_status IN ('recorded', 'pending', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  shipment_id UUID,
  shopping_order_id UUID,
  source_feedback_id UUID UNIQUE,
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
  CONSTRAINT support_tickets_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT support_tickets_status_check
    CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed', 'cancelled')),
  CONSTRAINT support_tickets_source_check
    CHECK (source IN ('portal', 'staff', 'api', 'legacy_feedback_sync'))
);

-- ------------------------------------------------------------------------------
-- Operational commerce tables
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  items JSONB DEFAULT '[]'::jsonb,
  total_weight DECIMAL(12,2) DEFAULT 0,
  total_weight_kg DECIMAL(12,2) DEFAULT 0,
  allocated_weight_kg DECIMAL(12,2) DEFAULT 0,
  remaining_weight_kg DECIMAL(12,2) DEFAULT 0,
  price_per_kg DECIMAL(12,2) DEFAULT 0,
  cost_per_kg DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  payment_terms TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  submitter_email TEXT,
  approved_by TEXT,
  approved_date DATE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT purchase_orders_status_check
    CHECK (status IN (
      'draft',
      'pending_approval',
      'approved',
      'sent',
      'partial_received',
      'received',
      'cancelled'
    )),
  CONSTRAINT purchase_orders_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  service_type TEXT NOT NULL,
  weight_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
  items_description TEXT NOT NULL,
  price_per_kg DECIMAL(12,2) DEFAULT 0,
  cost_basis DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  insurance_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  estimated_delivery DATE,
  pickup_address TEXT,
  delivery_address TEXT,
  insurance_opted BOOLEAN DEFAULT false,
  packaging_fee DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  special_instructions TEXT,
  vendor_po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  vendor_po_number TEXT,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  vendor_cost_per_kg DECIMAL(12,2) DEFAULT 0,
  vendor_cost DECIMAL(12,2) DEFAULT 0,
  vendor_total_cost DECIMAL(12,2) DEFAULT 0,
  margin_percentage DECIMAL(12,2) DEFAULT 0,
  origin TEXT DEFAULT 'Bangkok',
  destination TEXT DEFAULT 'Yangon',
  actual_delivery TIMESTAMPTZ,
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shipments_status_check
    CHECK (status IN ('pending', 'confirmed', 'picked_up', 'in_transit', 'customs', 'delivered', 'cancelled')),
  CONSTRAINT shipments_payment_status_check
    CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded'))
);

CREATE TABLE IF NOT EXISTS public.shopping_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  product_name TEXT,
  product_link TEXT,
  product_links TEXT,
  product_details TEXT,
  quantity INTEGER,
  unit_price DECIMAL(12,2),
  estimated_product_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_product_cost DECIMAL(12,2) DEFAULT 0,
  estimated_weight DECIMAL(12,2) DEFAULT 0,
  actual_weight DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  vendor_purchase_order_link TEXT,
  delivery_address TEXT,
  vendor_po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  vendor_po_number TEXT,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  vendor_cost_per_kg DECIMAL(12,2) DEFAULT 0,
  vendor_cost DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  margin_percentage DECIMAL(12,2) DEFAULT 0,
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  notes TEXT,
  special_instructions TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  invoice_type TEXT NOT NULL DEFAULT 'shipment',
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  shipping_amount DECIMAL(12,2) DEFAULT 0,
  insurance_amount DECIMAL(12,2) DEFAULT 0,
  packaging_fee DECIMAL(12,2) DEFAULT 0,
  product_cost DECIMAL(12,2) DEFAULT 0,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT customer_invoices_invoice_type_check
    CHECK (invoice_type IN ('shipment', 'shopping_order', 'vendor_bill', 'adjustment')),
  CONSTRAINT customer_invoices_status_check
    CHECK (status IN ('draft', 'sent', 'paid', 'void', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  shopping_order_id UUID REFERENCES public.shopping_orders(id) ON DELETE SET NULL,
  journey_id UUID REFERENCES public.order_journeys(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  rating INTEGER,
  service_rating INTEGER,
  delivery_rating INTEGER,
  communication_rating INTEGER,
  ticket_number TEXT,
  subject TEXT,
  message TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  comment TEXT,
  service_type TEXT,
  feedback_type TEXT,
  feedback_kind TEXT DEFAULT 'delivery_feedback',
  order_reference_type TEXT,
  order_reference_id UUID,
  would_recommend BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending',
  support_ticket_id UUID,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT feedback_status_check
    CHECK (status IN ('pending', 'submitted', 'in_progress', 'resolved', 'reviewed', 'archived', 'cancelled')),
  CONSTRAINT feedback_kind_check
    CHECK (feedback_kind IN ('delivery_feedback', 'support_ticket', 'nps', 'general')),
  CONSTRAINT feedback_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT feedback_order_reference_type_check
    CHECK (
      order_reference_type IS NULL OR order_reference_type IN (
        'journey',
        'shipment',
        'shopping_order',
        'purchase_order',
        'invoice',
        'support_ticket',
        'general'
      )
  )
);

-- Circular feedback/support-ticket link is completed in the incremental file.

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

-- ------------------------------------------------------------------------------
-- Notifications and templates
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT,
  user_email TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'unread',
  link TEXT,
  metadata JSONB,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT notifications_type_check
    CHECK (type IN ('info', 'success', 'warning', 'error')),
  CONSTRAINT notifications_status_check
    CHECK (status IN ('unread', 'read', 'dismissed'))
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  subject TEXT,
  content TEXT NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Vendor operating tables
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  order_type TEXT DEFAULT 'shipment',
  reference_id UUID,
  quality_rating INTEGER,
  on_time BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pending',
  amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT,
  vendor_order_id UUID REFERENCES public.vendor_orders(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  order_ids TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payout_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT,
  contract_number TEXT UNIQUE,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  po_number TEXT,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  receipt_number TEXT UNIQUE,
  received_date DATE NOT NULL,
  received_by TEXT NOT NULL,
  items_received TEXT,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  quality_status TEXT NOT NULL DEFAULT 'passed',
  notes TEXT,
  discrepancy_notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT goods_receipts_quality_status_check
    CHECK (quality_status IN ('passed', 'rejected', 'partial_reject'))
);

-- ------------------------------------------------------------------------------
-- Operational support tables
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  amount_threshold DECIMAL(12,2) DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.approval_rules(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  comments TEXT,
  approved_date TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_name TEXT,
  invited_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT,
  expires_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  location TEXT,
  status TEXT DEFAULT 'in_stock',
  category TEXT DEFAULT 'supplies',
  unit TEXT DEFAULT 'pieces',
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  lead_time_days INTEGER DEFAULT 7,
  supplier TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL DEFAULT 'out',
  quantity INTEGER NOT NULL,
  reference_type TEXT NOT NULL DEFAULT 'manual',
  reference_id UUID,
  stock_after INTEGER,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  target_segment TEXT,
  discount_percentage DECIMAL(5,2),
  discount_code TEXT,
  message_template TEXT,
  channel TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2) DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  phase TEXT DEFAULT 'pre_launch',
  month INTEGER,
  estimated_cost DECIMAL(12,2) DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT DEFAULT 'other',
  title TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  interaction_type TEXT DEFAULT 'note',
  direction TEXT DEFAULT 'outbound',
  outcome TEXT,
  duration_minutes INTEGER,
  sentiment TEXT DEFAULT 'neutral',
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_important BOOLEAN DEFAULT false,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  schedule TEXT DEFAULT 'none',
  schedule_day INTEGER DEFAULT 1,
  recipients TEXT,
  format TEXT DEFAULT 'csv',
  sort_by TEXT,
  sort_order TEXT DEFAULT 'desc',
  is_active BOOLEAN DEFAULT true,
  last_sent TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.custom_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  criteria TEXT,
  customer_count INTEGER DEFAULT 0,
  color TEXT DEFAULT 'blue',
  icon TEXT DEFAULT 'users',
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Baseline indexes
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customers_email_ci
  ON public.customers (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_email_ci
  ON public.vendors (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_date
  ON public.audit_logs(created_date DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id
  ON public.purchase_orders(vendor_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_journey_id
  ON public.purchase_orders(journey_id);

CREATE INDEX IF NOT EXISTS idx_shipments_status
  ON public.shipments(status);

CREATE INDEX IF NOT EXISTS idx_shipments_created_date
  ON public.shipments(created_date DESC);

CREATE INDEX IF NOT EXISTS idx_shipments_vendor_po_id
  ON public.shipments(vendor_po_id);

CREATE INDEX IF NOT EXISTS idx_shipments_vendor_id
  ON public.shipments(vendor_id);

CREATE INDEX IF NOT EXISTS idx_shipments_customer_id
  ON public.shipments(customer_id);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number
  ON public.shipments(tracking_number);

CREATE INDEX IF NOT EXISTS idx_shopping_orders_vendor_po_id
  ON public.shopping_orders(vendor_po_id);

CREATE INDEX IF NOT EXISTS idx_shopping_orders_vendor_id
  ON public.shopping_orders(vendor_id);

CREATE INDEX IF NOT EXISTS idx_shopping_orders_customer_id
  ON public.shopping_orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer_id
  ON public.customer_invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_invoices_journey_id
  ON public.customer_invoices(journey_id);

CREATE INDEX IF NOT EXISTS idx_order_journeys_customer_id
  ON public.order_journeys(customer_id);

CREATE INDEX IF NOT EXISTS idx_order_journeys_current_stage
  ON public.order_journeys(current_stage);

CREATE INDEX IF NOT EXISTS idx_order_journeys_created_date
  ON public.order_journeys(created_date DESC);

CREATE INDEX IF NOT EXISTS idx_journey_events_journey_id
  ON public.journey_events(journey_id);

CREATE INDEX IF NOT EXISTS idx_journey_events_created_date
  ON public.journey_events(created_date DESC);

CREATE INDEX IF NOT EXISTS idx_journey_events_entity
  ON public.journey_events(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id
  ON public.support_tickets(customer_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_journey_id
  ON public.support_tickets(journey_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_date
  ON public.support_tickets(created_date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email
  ON public.notifications(recipient_email);

CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_journey_id
  ON public.proof_of_delivery(journey_id);

CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_delivered_at
  ON public.proof_of_delivery(delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_feedback_kind
  ON public.feedback(feedback_kind);

CREATE INDEX IF NOT EXISTS idx_feedback_customer_email
  ON public.feedback(customer_email);

CREATE INDEX IF NOT EXISTS idx_feedback_support_ticket_id
  ON public.feedback(support_ticket_id);

CREATE INDEX IF NOT EXISTS idx_vendor_orders_vendor_id
  ON public.vendor_orders(vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id
  ON public.vendor_payments(vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor_id
  ON public.vendor_payouts(vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id
  ON public.vendor_contracts(vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_invitations_email
  ON public.vendor_invitations(email);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_purchase_order_id
  ON public.goods_receipts(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_approval_history_rule_id
  ON public.approval_history(rule_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku
  ON public.inventory_items(sku);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id
  ON public.stock_movements(item_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON public.campaigns(status);

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON public.tasks(status);

CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON public.expenses(date);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id
  ON public.customer_interactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id
  ON public.customer_notes(customer_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_is_active
  ON public.scheduled_reports(is_active);

CREATE INDEX IF NOT EXISTS idx_custom_segments_name
  ON public.custom_segments(name);
