import { z } from 'zod';

const numberPreprocess = (val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
};

const PURCHASE_ORDER_STATUS_ENUM = [
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'partial_received',
  'received',
  'cancelled',
];

const VENDOR_TYPE_ENUM = ['supplier', 'cargo_carrier', 'packaging', 'customs_broker', 'warehouse'];

const FEEDBACK_STATUS_ENUM = [
  'pending',
  'submitted',
  'in_progress',
  'resolved',
  'reviewed',
  'archived',
  'cancelled',
];

const FEEDBACK_KIND_ENUM = ['delivery_feedback', 'support_ticket', 'nps', 'general'];
const INVOICE_TYPE_ENUM = ['shipment', 'shopping_order', 'vendor_bill', 'adjustment'];
const JOURNEY_MODE_ENUM = ['cargo_only', 'shopping_proxy', 'hybrid'];
const JOURNEY_STAGE_ENUM = [
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
  'cancelled',
];

const JOURNEY_PAYMENT_STATUS_ENUM = ['unpaid', 'partial', 'paid', 'refunded'];
const ORDER_REFERENCE_TYPE_ENUM = [
  'journey',
  'shipment',
  'shopping_order',
  'purchase_order',
  'invoice',
  'support_ticket',
  'general',
];

const normalizeEnumValue = (value, aliases = {}) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  const aliasMap = new Map(Object.entries(aliases));
  return aliasMap.get(normalized) || normalized;
};

const normalizePurchaseOrderStatus = (value) =>
  normalizeEnumValue(value, {
    pending: 'pending_approval',
    sent_to_vendor: 'sent',
    partially_received: 'partial_received',
    fully_received: 'received',
    closed: 'cancelled',
  });

const normalizeVendorType = (value) =>
  normalizeEnumValue(value, {
    cargo: 'cargo_carrier',
    supplier_cargo: 'cargo_carrier',
  });

const normalizeFeedbackStatus = (value) =>
  normalizeEnumValue(value, {
    open: 'pending',
    done: 'resolved',
  });

const normalizeFeedbackKind = (value) =>
  normalizeEnumValue(value, {
    rating: 'delivery_feedback',
  });

const normalizeInvoiceType = (value) =>
  normalizeEnumValue(value, {
    vendor_invoice: 'vendor_bill',
  });

export const vendorInviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  companyName: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_type: z.enum(['individual', 'online_shopper', 'sme_importer']).optional(),
  address_bangkok: z.string().optional(),
  address_yangon: z.string().optional(),
  notes: z.string().optional(),
  referred_by: z.string().optional(),
  referral_code: z.string().optional(),
});

export const shipmentSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional().default(''),
  service_type: z.string().min(1, 'Service type is required'),
  weight_kg: z.preprocess(
    numberPreprocess,
    z
      .number({ invalid_type_error: 'Weight must be a number' })
      .min(0.1, 'Weight must be at least 0.1')
  ),
  items_description: z.string().min(1, 'Description is required'),
  tracking_number: z.string().optional(),
  price_per_kg: z.preprocess(numberPreprocess, z.number().optional()),
  cost_basis: z.preprocess(numberPreprocess, z.number().optional()),
  total_amount: z.preprocess(numberPreprocess, z.number().optional()),
  profit: z.preprocess(numberPreprocess, z.number().optional()),
  insurance_amount: z.preprocess(numberPreprocess, z.number().optional()),
  status: z
    .enum(['pending', 'confirmed', 'picked_up', 'in_transit', 'customs', 'delivered', 'cancelled'])
    .default('pending'),
  payment_status: z.enum(['unpaid', 'partial', 'paid', 'refunded']).default('unpaid'),
  estimated_delivery: z.string().optional(),
  pickup_address: z.string().optional(),
  delivery_address: z.string().optional(),
  insurance_opted: z.boolean().optional(),
  packaging_fee: z.preprocess(numberPreprocess, z.number().optional().default(0)),
  notes: z.string().optional(),
  vendor_po_id: z.string().optional(),
  vendor_id: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_po_number: z.string().optional(),
  vendor_cost_per_kg: z.preprocess(numberPreprocess, z.number().optional()),
  vendor_total_cost: z.preprocess(numberPreprocess, z.number().optional()),
  margin_percentage: z.preprocess(numberPreprocess, z.number().optional()),
  origin: z.string().optional(),
  destination: z.string().optional(),
});

export const shoppingOrderSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  product_name: z.string().optional(),
  product_link: z.string().optional(),
  product_links: z.string().optional(),
  product_details: z.string().min(1, 'Product details required').optional(),
  quantity: z.preprocess(numberPreprocess, z.number().int().min(1).optional()),
  unit_price: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  estimated_product_cost: z.preprocess(numberPreprocess, z.number().min(0)),
  actual_product_cost: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  estimated_weight: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  actual_weight: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  commission_rate: z.preprocess(numberPreprocess, z.number().min(0).max(100)),
  commission_amount: z.preprocess(numberPreprocess, z.number().min(0)),
  shipping_cost: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  total_amount: z.preprocess(numberPreprocess, z.number().min(0)),
  status: z.string().optional().default('pending'),
  payment_status: z.string().optional().default('unpaid'),
  order_number: z.string().optional(),
  vendor_purchase_order_link: z.string().optional(),
  delivery_address: z.string().optional(),
  vendor_po_id: z.string().optional(),
  vendor_po_number: z.string().optional(),
  vendor_id: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_cost_per_kg: z.preprocess(numberPreprocess, z.number().optional()),
  vendor_cost: z.preprocess(numberPreprocess, z.number().optional()),
  profit: z.preprocess(numberPreprocess, z.number().optional()),
  margin_percentage: z.preprocess(numberPreprocess, z.number().optional()),
  journey_id: z.string().optional(),
  notes: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.preprocess(normalizeVendorType, z.enum(VENDOR_TYPE_ENUM)).default('supplier'),
  contact_name: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  bank_details: z.string().optional(),
  services: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  onboarding_source: z.string().optional(),
  cargo_capacity_per_month: z.preprocess(numberPreprocess, z.number().optional()),
});

export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  campaign_type: z
    .enum(['discount', 'referral', 'promotion', 'announcement', 'loyalty'])
    .optional()
    .nullable(),

  // Optional fields for frontend use (not in database currently)
  description: z.string().optional(),
  target_segment: z.string().optional(),
  discount_percentage: z.preprocess(numberPreprocess, z.number().min(0).max(100).optional()),
  discount_code: z.string().optional(),
  message_template: z.string().optional(),
  channel: z.enum(['all', 'email', 'line', 'facebook', 'sms']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  // Note: 'status' and 'sent_count' fields don't exist in database
  // status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  // sent_count: z.preprocess(numberPreprocess, z.number().min(0).optional()),
});

// Purchase Order Schema
export const purchaseOrderSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  po_number: z.string().optional(),
  order_date: z.string().min(1, 'Order date is required'),
  expected_delivery: z.string().optional(),
  items: z.string().optional(),
  total_weight: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  total_weight_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  price_per_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  cost_per_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  total_amount: z.preprocess(numberPreprocess, z.number().min(0)),
  allocated_weight_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  remaining_weight_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  journey_id: z.string().optional(),
  payment_terms: z.string().optional(),
  status: z
    .preprocess(normalizePurchaseOrderStatus, z.enum(PURCHASE_ORDER_STATUS_ENUM))
    .default('draft'),
  approval_status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  notes: z.string().optional(),
  submitter_email: z.string().optional(),
  approved_by: z.string().optional(),
  approved_date: z.string().optional(),
});

// Customer Support Schema
export const customerSupportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const validateEmail = (email) => {
  return z.string().email().safeParse(email).success;
};

export const validatePhone = (phone) => {
  // Basic phone validation - can be enhanced
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone?.replace(/\s/g, ''));
};

export const validateUrl = (url) => {
  return z.string().url().safeParse(url).success;
};

// Goods Receipt Schema
export const goodsReceiptSchema = z.object({
  receipt_number: z.string().optional(),
  po_id: z.string().optional(),
  po_number: z.string().optional(),
  vendor_id: z.string().optional(),
  vendor_name: z.string().optional(),
  received_date: z.string().min(1, 'Received date is required'),
  received_by: z.string().min(1, 'Received by is required'),
  items_received: z.string().optional(),
  total_value: z.preprocess(numberPreprocess, z.number().min(0)),
  quality_status: z.enum(['passed', 'rejected', 'partial_reject']).default('passed'),
  notes: z.string().optional(),
  discrepancy_notes: z.string().optional(),
});

// Report Schema
export const reportSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  report_type: z.string().min(1, 'Report type is required'),
  schedule: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  schedule_day: z.number().int().min(1).max(31).default(1),
  recipients: z.string().optional(), // We can add custom email list validation if needed
  format: z.enum(['csv', 'pdf']).default('csv'),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  is_active: z.boolean().default(true),
});

// ============================================
// NEW SCHEMAS FOR PHASE 2 VALIDATION
// ============================================

// Feedback Schema
export const feedbackSchema = z.object({
  shipment_id: z.string().optional(),
  shopping_order_id: z.string().optional(),
  journey_id: z.string().optional(),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  rating: z
    .preprocess(numberPreprocess, z.number().int().min(1, 'Overall rating is required').max(5))
    .optional(),
  service_rating: z.number().int().min(1).max(5).optional(),
  delivery_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  ticket_number: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  comment: z.string().optional(),
  service_type: z.string().optional(),
  feedback_type: z.string().optional(), // legacy field used by existing support flow
  feedback_kind: z.preprocess(normalizeFeedbackKind, z.enum(FEEDBACK_KIND_ENUM)).optional(),
  order_reference_type: z.enum(ORDER_REFERENCE_TYPE_ENUM).optional(),
  order_reference_id: z.string().optional(),
  would_recommend: z.boolean().default(true),
  status: z.preprocess(normalizeFeedbackStatus, z.enum(FEEDBACK_STATUS_ENUM)).default('pending'),
});

// Audit Log Schema
export const auditLogSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  action: z.string().min(1, 'Action is required'),
  entity_type: z.string().min(1, 'Entity type is required'),
  entity_id: z.string().optional(),
  changes: z.string().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

// Notification Schema
export const notificationSchema = z.object({
  user_id: z.string().optional(),
  user_email: z.string().email('Invalid email').optional(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  status: z.enum(['unread', 'read', 'dismissed']).default('unread'),
  link: z.string().optional(),
  metadata: z.string().optional(), // JSON string
});

// Approval Schema (for workflow approvals)
export const approvalSchema = z.object({
  entity_type: z.enum(['purchase_order', 'shipment', 'payment', 'vendor', 'contract']),
  entity_id: z.string().min(1, 'Entity ID is required'),
  approver_email: z.string().email('Invalid email address'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  comments: z.string().optional(),
  approved_date: z.string().optional(),
});

// Payment Schema
export const paymentSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor ID is required'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  po_id: z.string().optional(),
  po_number: z.string().optional(),
  amount: z.preprocess(numberPreprocess, z.number().min(0.01, 'Amount must be greater than 0')),
  payment_method: z
    .enum(['bank_transfer', 'cheque', 'cash', 'mobile_payment'])
    .default('bank_transfer'),
  payment_date: z.string().min(1, 'Payment date is required'),
  due_date: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

export const orderJourneySchema = z.object({
  journey_number: z.string().optional(),
  mode: z.enum(JOURNEY_MODE_ENUM).default('cargo_only'),
  current_stage: z.enum(JOURNEY_STAGE_ENUM).default('inquiry_received'),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  source_channel: z.string().optional(),
  quote_currency: z.string().optional().default('THB'),
  quoted_total: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  confirmed_total: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  payment_status: z.enum(JOURNEY_PAYMENT_STATUS_ENUM).default('unpaid'),
  transport_mode: z.enum(['air', 'land', 'sea', 'mixed']).optional(),
  origin_country: z.string().optional(),
  destination_country: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const journeyEventSchema = z.object({
  journey_id: z.string().min(1, 'Journey ID is required'),
  event_type: z.string().min(1, 'Event type is required'),
  stage_from: z.enum(JOURNEY_STAGE_ENUM).optional(),
  stage_to: z.enum(JOURNEY_STAGE_ENUM).optional(),
  entity_type: z
    .enum([
      'shopping_order',
      'shipment',
      'purchase_order',
      'customer_invoice',
      'feedback',
      'vendor_order',
      'manual',
    ])
    .optional(),
  entity_id: z.string().optional(),
  event_status: z.enum(['recorded', 'pending', 'completed', 'cancelled']).default('recorded'),
  payload: z.any().optional(),
  note: z.string().optional(),
  created_by: z.string().optional(),
});

export const supportTicketSchema = z.object({
  ticket_number: z.string().optional(),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  journey_id: z.string().optional(),
  shipment_id: z.string().optional(),
  shopping_order_id: z.string().optional(),
  source_feedback_id: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'resolved', 'closed', 'cancelled']).default('pending'),
  source: z.enum(['portal', 'staff', 'api', 'legacy_feedback_sync']).default('portal'),
  resolution_note: z.string().optional(),
});

export const proofOfDeliverySchema = z.object({
  journey_id: z.string().optional(),
  shipment_id: z.string().optional(),
  receiver_name: z.string().optional(),
  receiver_phone: z.string().optional(),
  delivery_address: z.string().optional(),
  delivered_at: z.string().optional(),
  photo_url: z.string().optional(),
  signature_url: z.string().optional(),
  notes: z.string().optional(),
  recorded_by: z.string().optional(),
});

export const normalizeInvoiceTypeValue = normalizeInvoiceType;
export const canonicalInvoiceTypes = INVOICE_TYPE_ENUM;
