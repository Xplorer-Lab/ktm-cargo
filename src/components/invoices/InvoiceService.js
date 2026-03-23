/**
 * Invoice Service - Real-World Invoice Management
 *
 * Customer Invoices (Accounts Receivable): We issue to customers for services
 * Vendor Bills (Accounts Payable): Vendors send to us for goods/services received
 *
 * Real-World Invoice Flow:
 * 1. Create Draft Invoice
 * 2. Review & Issue Invoice
 * 3. Send to Customer
 * 4. Customer Pays
 * 5. Record Payment & Mark Paid
 */

import { db } from '@/api/db';
import { supabase } from '@/api/supabaseClient';
import { format, addDays } from 'date-fns';

const IS_PROD =
  typeof __APP_IS_PROD__ !== 'undefined'
    ? __APP_IS_PROD__
    : typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

/**
 * Get next invoice number from the DB sequence via RPC.
 * Format: INV-YYYYMM-XXXX.
 *
 * Requires migration add_invoice_number_sequence.sql to be applied.
 * If the RPC fails, invoice creation is blocked to prevent duplicate numbers.
 *
 * @returns {Promise<string>}
 */
export async function getNextInvoiceNumber() {
  const { data, error } = await supabase.rpc('next_invoice_number');

  if (!error && data) return data;

  const hardFailMessage =
    '[InvoiceService] next_invoice_number RPC failed during invoice creation. ' +
    'Creation is blocked to prevent duplicate invoice numbers. ' +
    'Apply add_invoice_number_sequence.sql and retry.';

  if (IS_PROD) {
    console.error(hardFailMessage, error);
    import('@sentry/react').then((Sentry) => {
      Sentry.captureMessage(hardFailMessage, { level: 'error', extra: { rpcError: error } });
    });
  } else {
    console.error(hardFailMessage, error);
  }

  throw new Error('Invoice number could not be generated. Please try again.');
}

/**
 * Calculate due date based on payment terms
 */
const PAYMENT_TERMS_DAYS = {
  immediate: 0,
  net_7: 7,
  net_15: 15,
  net_30: 30,
  net_60: 60,
};

export function calculateDueDate(invoiceDate, paymentTerms = 'net_7') {
  const days = PAYMENT_TERMS_DAYS[paymentTerms] ?? 7;
  return format(addDays(new Date(invoiceDate), days), 'yyyy-MM-dd');
}

/**
 * Create a new customer invoice (Draft)
 * This should be called when you want to bill a customer
 */
export async function createCustomerInvoice(invoiceData) {
  const invoiceDate = invoiceData.invoice_date || format(new Date(), 'yyyy-MM-dd');
  const paymentTerms = invoiceData.payment_terms || 'net_7';
  // Always use DB-backed sequence for new invoices.
  const invoiceNumber = await getNextInvoiceNumber();

  const invoice = await db.customerInvoices.create({
    invoice_number: invoiceNumber,
    invoice_type: invoiceData.invoice_type || 'shipment',

    // Source reference (either shipment or shopping order)
    shipment_id: invoiceData.shipment_id || null,
    tracking_number: invoiceData.tracking_number || '',
    order_id: invoiceData.order_id || null,
    order_number: invoiceData.order_number || '',

    // Customer details
    customer_id: invoiceData.customer_id || '',
    customer_name: invoiceData.customer_name,
    customer_email: invoiceData.customer_email || '',
    customer_phone: invoiceData.customer_phone || '',
    customer_address: invoiceData.customer_address || '',

    // Dates
    invoice_date: invoiceDate,
    due_date: invoiceData.due_date || calculateDueDate(invoiceDate, paymentTerms),

    // Service details
    service_type: invoiceData.service_type || '',
    weight_kg: invoiceData.weight_kg || 0,
    price_per_kg: invoiceData.price_per_kg || 0,

    // Line items breakdown
    shipping_amount: invoiceData.shipping_amount || 0,
    insurance_amount: invoiceData.insurance_amount || 0,
    packaging_fee: invoiceData.packaging_fee || 0,
    product_cost: invoiceData.product_cost || 0,
    commission_amount: invoiceData.commission_amount || 0,

    // Totals
    subtotal: invoiceData.subtotal || 0,
    tax_rate: invoiceData.tax_rate || 0,
    tax_amount: invoiceData.tax_amount || 0,
    discount_amount: invoiceData.discount_amount || 0,
    total_amount: invoiceData.total_amount || 0,
    amount_paid: invoiceData.amount_paid || 0,
    balance_due: invoiceData.total_amount || 0,

    // Payment info
    payment_terms: paymentTerms,
    payment_method: invoiceData.payment_method || '',
    payment_date: null,

    // Status: draft -> issued -> sent -> paid -> void
    status: 'draft',

    notes: invoiceData.notes || '',
  });

  return invoice;
}

/**
 * Create invoice from a shipment
 */
export async function createInvoiceFromShipment(shipment, customer) {
  // Check if invoice already exists
  const existingInvoices = await db.customerInvoices.filter({
    shipment_id: shipment.id,
  });

  if (existingInvoices.length > 0) {
    return { invoice: existingInvoices[0], isNew: false, message: 'Invoice already exists' };
  }

  const weight = parseFloat(shipment.weight_kg) || 0;
  const pricePerKg = parseFloat(shipment.price_per_kg) || 0;
  const shippingAmount = weight * pricePerKg;
  const insuranceAmount = parseFloat(shipment.insurance_amount) || 0;
  const subtotal = shippingAmount + insuranceAmount;

  try {
    const invoice = await createCustomerInvoice({
      invoice_type: 'shipment',
      shipment_id: shipment.id,
      tracking_number: shipment.tracking_number,
      customer_id: customer?.id || shipment.customer_id,
      customer_name: shipment.customer_name,
      customer_email: customer?.email || '',
      customer_phone: shipment.customer_phone,
      customer_address: shipment.delivery_address || '',
      service_type: shipment.service_type,
      weight_kg: weight,
      price_per_kg: pricePerKg,
      shipping_amount: shippingAmount,
      insurance_amount: insuranceAmount,
      packaging_fee: 0,
      subtotal: subtotal,
      total_amount: subtotal,
      notes: `Shipment: ${shipment.tracking_number}\nItems: ${shipment.items_description || ''}`,
    });
    return { invoice, isNew: true };
  } catch (err) {
    if (
      err?.code === '23505' ||
      err?.message?.includes('unique') ||
      err?.message?.includes('duplicate')
    ) {
      const existing = await db.customerInvoices.filter({ shipment_id: shipment.id });
      if (existing.length > 0)
        return { invoice: existing[0], isNew: false, message: 'Invoice already exists' };
      throw new Error('An invoice already exists for this shipment.');
    }
    throw err;
  }
}

/**
 * Create invoice from a shopping order
 */
export async function createInvoiceFromShoppingOrder(order, customer) {
  // Check if invoice already exists
  const existingInvoices = await db.customerInvoices.filter({
    order_id: order.id,
  });

  if (existingInvoices.length > 0) {
    return { invoice: existingInvoices[0], isNew: false, message: 'Invoice already exists' };
  }

  const productCost = parseFloat(order.actual_product_cost || order.estimated_product_cost) || 0;
  const commissionAmount = parseFloat(order.commission_amount) || 0;
  const shippingCost = parseFloat(order.shipping_cost) || 0;
  const weight = parseFloat(order.actual_weight || order.estimated_weight) || 0;
  const totalAmount = productCost + commissionAmount + shippingCost;
  // Avoid hardcoded fallback: use derived rate or 0; prefer company_settings.default_shopping_price_per_kg when available
  const pricePerKg = weight > 0 ? Math.round((shippingCost / weight) * 100) / 100 : 0;

  try {
    const invoice = await createCustomerInvoice({
      invoice_type: 'shopping_order',
      order_id: order.id,
      order_number: order.order_number,
      customer_id: customer?.id || order.customer_id,
      customer_name: order.customer_name,
      customer_email: customer?.email || '',
      customer_phone: order.customer_phone || '',
      service_type: 'shopping_service',
      weight_kg: weight,
      price_per_kg: pricePerKg,
      shipping_amount: shippingCost,
      product_cost: productCost,
      commission_amount: commissionAmount,
      subtotal: totalAmount,
      total_amount: totalAmount,
      notes: `Shopping Order: ${order.order_number}\nProducts: ${order.product_details || order.product_links || ''}`,
    });
    return { invoice, isNew: true };
  } catch (err) {
    if (
      err?.code === '23505' ||
      err?.message?.includes('unique') ||
      err?.message?.includes('duplicate')
    ) {
      const existing = await db.customerInvoices.filter({ order_id: order.id });
      if (existing.length > 0)
        return { invoice: existing[0], isNew: false, message: 'Invoice already exists' };
      throw new Error('An invoice already exists for this order.');
    }
    throw err;
  }
}

/**
 * Issue an invoice (change from draft to issued)
 * This finalizes the invoice and makes it ready to send
 */
export async function issueInvoice(invoiceId) {
  const invoice = await db.customerInvoices.update(invoiceId, {
    status: 'issued',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
  });
  return invoice;
}

/**
 * Mark invoice as sent to customer
 */
export async function markInvoiceSent(invoiceId) {
  const invoice = await db.customerInvoices.update(invoiceId, {
    status: 'sent',
  });
  return invoice;
}

/**
 * Record payment and mark invoice as paid.
 * Uses an atomic DB RPC with FOR UPDATE locking to prevent race conditions.
 */
export async function recordPayment(invoiceId, paymentDetails = {}) {
  const { data, error } = await supabase.rpc('record_payment_atomic', {
    p_invoice_id: invoiceId,
    p_amount: Number(paymentDetails.amount),
    p_payment_date: paymentDetails.payment_date ?? format(new Date(), 'yyyy-MM-dd'),
    p_payment_method: paymentDetails.payment_method ?? 'bank_transfer',
    p_payment_reference: paymentDetails.reference ?? null, // field is `reference` not `payment_reference`
  });

  if (error || !data?.success) {
    throw new Error(data?.error ?? error?.message ?? 'Payment failed');
  }

  return data; // { status, amount_paid, balance_due }
}

/**
 * Void an invoice (cancel it)
 */
export async function voidInvoice(invoiceId, reason = '') {
  const invoice = await db.customerInvoices.update(invoiceId, {
    status: 'void',
    notes: reason ? `VOIDED: ${reason}` : 'VOIDED',
  });
  return invoice;
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(invoices) {
  const stats = {
    total: invoices.length,
    draft: 0,
    issued: 0,
    sent: 0,
    paid: 0,
    partially_paid: 0,
    overdue: 0,
    void: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
  };

  const today = new Date();

  invoices.forEach((inv) => {
    const amount = inv.total_amount || 0;
    stats.totalAmount += amount;

    switch (inv.status) {
      case 'draft':
        stats.draft++;
        break;
      case 'issued':
        stats.issued++;
        stats.pendingAmount += amount;
        // Check if overdue
        if (inv.due_date && new Date(inv.due_date) < today) {
          stats.overdue++;
          stats.overdueAmount += amount;
        }
        break;
      case 'sent':
        stats.sent++;
        stats.pendingAmount += amount;
        if (inv.due_date && new Date(inv.due_date) < today) {
          stats.overdue++;
          stats.overdueAmount += amount;
        }
        break;
      case 'partially_paid':
        stats.partially_paid++;
        stats.paidAmount += inv.amount_paid || 0;
        stats.pendingAmount += inv.balance_due || amount - (inv.amount_paid || 0);
        if (inv.due_date && new Date(inv.due_date) < today) {
          stats.overdue++;
          stats.overdueAmount += inv.balance_due || amount - (inv.amount_paid || 0);
        }
        break;
      case 'paid':
        stats.paid++;
        stats.paidAmount += amount;
        break;
      case 'void':
        stats.void++;
        break;
    }
  });

  return stats;
}

/**
 * Process a refund on an invoice.
 *
 * Supports partial and full refunds.
 *  - Partial refund: reduces amount_paid and increases balance_due; status → 'partially_paid'
 *  - Full refund: zeroes amount_paid and balance_due; status → 'refunded'
 *
 * @param {string} invoiceId   - UUID of the invoice to refund
 * @param {number} refundAmount - amount to refund (must be > 0 and ≤ amount_paid)
 * @param {string} [reason=''] - optional reason for audit trail
 * @returns {Object} updated invoice row
 * @throws {Error} if refund amount is invalid
 */
export async function processRefund(invoiceId, refundAmount, reason = '') {
  if (!refundAmount || refundAmount <= 0) {
    throw new Error('Refund amount must be greater than zero');
  }

  const invoice = await db.customerInvoices.get(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const currentPaid = invoice.amount_paid || 0;
  if (refundAmount > currentPaid) {
    throw new Error(`Refund amount (${refundAmount}) exceeds amount already paid (${currentPaid})`);
  }

  const newAmountPaid = Math.max(0, currentPaid - refundAmount);
  const isFullRefund = newAmountPaid === 0;
  const newBalanceDue = isFullRefund ? 0 : (invoice.total_amount || 0) - newAmountPaid;
  const newStatus = isFullRefund ? 'refunded' : 'partially_paid';

  const refundNote = reason
    ? `REFUND (${refundAmount}): ${reason}`
    : `REFUND (${refundAmount}) on ${new Date().toISOString().slice(0, 10)}`;

  const existingNotes = invoice.notes ? `${invoice.notes}\n` : '';

  const updated = await db.customerInvoices.update(invoiceId, {
    amount_paid: newAmountPaid,
    balance_due: newBalanceDue,
    status: newStatus,
    notes: `${existingNotes}${refundNote}`,
  });

  return updated;
}

/**
 * Check for overdue invoices and return them
 */
export async function getOverdueInvoices() {
  const allInvoices = await db.customerInvoices.list();
  const today = new Date();

  return allInvoices.filter((inv) => {
    if (inv.status === 'paid' || inv.status === 'void' || inv.status === 'draft') {
      return false;
    }
    return inv.due_date && new Date(inv.due_date) < today;
  });
}
