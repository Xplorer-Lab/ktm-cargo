import { z } from 'zod';

const numberPreprocess = (val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
};

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
  customer_phone: z.string().min(1, 'Phone number is required'),
  service_type: z.string().min(1, 'Service type is required'),
  weight_kg: z.preprocess(numberPreprocess, z.number({ invalid_type_error: "Weight must be a number" }).min(0.1, 'Weight must be at least 0.1')),
  items_description: z.string().min(1, 'Description is required'),
  tracking_number: z.string().optional(),
  price_per_kg: z.preprocess(numberPreprocess, z.number().optional()),
  cost_basis: z.preprocess(numberPreprocess, z.number().optional()),
  total_amount: z.preprocess(numberPreprocess, z.number().optional()),
  profit: z.preprocess(numberPreprocess, z.number().optional()),
  insurance_amount: z.preprocess(numberPreprocess, z.number().optional()),
  status: z.string().optional().default('pending'),
  payment_status: z.string().optional().default('unpaid'),
  estimated_delivery: z.string().optional(),
  pickup_address: z.string().optional(),
  delivery_address: z.string().optional(),
  insurance_opted: z.boolean().optional(),
  packaging_fee: z.preprocess(numberPreprocess, z.number().optional().default(0)),
  notes: z.string().optional(),
  vendor_po_id: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_po_number: z.string().optional(),
  vendor_cost_per_kg: z.preprocess(numberPreprocess, z.number().optional()),
  vendor_total_cost: z.preprocess(numberPreprocess, z.number().optional()),
  origin: z.string().optional(),
  destination: z.string().optional(),
});

export const shoppingOrderSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Customer phone is required'),
  product_links: z.string().optional(),
  product_details: z.string().min(1, 'Product details are required'),
  estimated_product_cost: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  actual_product_cost: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  estimated_weight: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  actual_weight: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  commission_rate: z.preprocess(numberPreprocess, z.number().min(0).default(10)),
  commission_amount: z.preprocess(numberPreprocess, z.number().optional()),
  shipping_cost: z.preprocess(numberPreprocess, z.number().optional()),
  total_amount: z.preprocess(numberPreprocess, z.number().optional()),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'purchasing', 'purchased', 'received', 'shipping', 'delivered', 'cancelled']).default('pending'),
  payment_status: z.enum(['unpaid', 'deposit_paid', 'paid']).default('unpaid'),

  // Vendor allocation
  vendor_po_id: z.string().optional(),
  vendor_po_number: z.string().optional(),
  vendor_id: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_cost_per_kg: z.preprocess(numberPreprocess, z.number().optional()),
  vendor_cost: z.preprocess(numberPreprocess, z.number().optional()),
});

export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.string().min(1, 'Vendor type is required'),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  cost_per_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  cost_per_kg_bulk: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  monthly_capacity_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  is_preferred: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  campaign_type: z.enum(['discount', 'referral', 'promotion', 'announcement', 'loyalty']).optional(),
  target_segment: z.string().optional(),
  discount_percentage: z.preprocess(numberPreprocess, z.number().min(0).max(100).optional()),
  discount_code: z.string().optional(),
  message_template: z.string().optional(),
  channel: z.enum(['all', 'email', 'line', 'facebook', 'sms']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  sent_count: z.preprocess(numberPreprocess, z.number().min(0).optional()),
});

// Purchase Order Schema
export const purchaseOrderSchema = z.object({
  po_number: z.string().optional(),
  vendor_id: z.string().min(1, 'Vendor is required'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  total_weight_kg: z.preprocess(numberPreprocess, z.number().min(0.1, 'Weight must be at least 0.1kg')),
  allocated_weight_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  remaining_weight_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  cost_per_kg: z.preprocess(numberPreprocess, z.number().min(0)),
  total_amount: z.preprocess(numberPreprocess, z.number().min(0)),
  status: z.enum(['draft', 'pending_approval', 'approved', 'sent', 'partial_received', 'received', 'cancelled']).default('draft'),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
});

// Invoice Schema
export const invoiceSchema = z.object({
  invoice_number: z.string().optional(),
  vendor_id: z.string().optional(),
  vendor_name: z.string().optional(),
  po_number: z.string().optional(),
  po_id: z.string().optional(),
  total_amount: z.preprocess(numberPreprocess, z.number().min(0)),
  tax_amount: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  due_date: z.string().optional(),
  paid_date: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

// Customer Invoice Schema
export const customerInvoiceSchema = z.object({
  invoice_number: z.string().optional(),
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'Customer name is required'),
  shipment_id: z.string().optional(),
  total_amount: z.preprocess(numberPreprocess, z.number().min(0)),
  tax_amount: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  due_date: z.string().optional(),
  paid_date: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

// Task Schema
export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  due_date: z.string().optional(),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().optional(),
});

// Feedback Schema
export const feedbackSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  shipment_id: z.string().optional(),
  rating: z.preprocess(numberPreprocess, z.number().min(1).max(5).optional()),
  comment: z.string().optional(),
  category: z.enum(['service', 'delivery', 'packaging', 'pricing', 'other']).optional(),
  status: z.enum(['pending', 'reviewed', 'resolved']).default('pending'),
});

// Notification Schema
export const notificationSchema = z.object({
  user_id: z.string().optional(),
  user_email: z.string().email().optional(),
  title: z.string().min(1, 'Notification title is required'),
  message: z.string().min(1, 'Notification message is required'),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  status: z.enum(['unread', 'read', 'dismissed']).default('unread'),
  action_url: z.string().optional(),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().optional(),
});

// Inventory Item Schema
export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  current_stock: z.preprocess(numberPreprocess, z.number().min(0).default(0)),
  reorder_point: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  unit: z.string().default('pcs'),
  cost_per_unit: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  category: z.string().optional(),
});

// Stock Movement Schema
export const stockMovementSchema = z.object({
  inventory_item_id: z.string().min(1, 'Inventory item is required'),
  movement_type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.preprocess(numberPreprocess, z.number().min(0.01)),
  reason: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

// Company Settings Schema
export const companySettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  logo_url: z.string().url().optional().or(z.literal('')),
  tagline: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_account_name: z.string().optional(),
  primary_color: z.string().optional(),
  currency: z.string().default('THB'),
});

// Vendor Contract Schema
export const vendorContractSchema = z.object({
  contract_number: z.string().optional(),
  vendor_id: z.string().min(1, 'Vendor is required'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  agreed_rate_per_kg: z.preprocess(numberPreprocess, z.number().min(0)),
  volume_commitment_kg: z.preprocess(numberPreprocess, z.number().min(0).optional()),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['draft', 'active', 'expired', 'cancelled']).default('draft'),
  document_url: z.string().url().optional().or(z.literal('')),
  sla_on_time_target: z.preprocess(numberPreprocess, z.number().min(0).max(100).optional()),
  sla_quality_target: z.preprocess(numberPreprocess, z.number().min(0).max(100).optional()),
  total_value: z.preprocess(numberPreprocess, z.number().min(0).optional()),
});

// Approval Rule Schema
export const approvalRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  rule_type: z.enum(['amount', 'weight', 'vendor', 'category']),
  condition: z.string().min(1, 'Condition is required'),
  threshold_value: z.preprocess(numberPreprocess, z.number().optional()),
  approver_role: z.string().optional(),
  auto_approve: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

// Audit Log Schema (read-only, but for validation)
export const auditLogSchema = z.object({
  action: z.string().min(1),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  entity_reference: z.string().optional(),
  user_email: z.string().email().optional(),
  user_name: z.string().optional(),
  user_role: z.string().optional(),
  details: z.string().optional(),
  previous_value: z.string().optional(),
  new_value: z.string().optional(),
});

// Common validation helpers
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
