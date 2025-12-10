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
import { format, addDays } from 'date-fns';

// Invoice number sequences (in production, this should be database-managed)
let invoiceSequence = 0;

/**
 * Generate sequential invoice number
 * Format: INV-YYYYMM-XXXX
 */
export function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  invoiceSequence++;
  const seq = String(invoiceSequence).padStart(4, '0');
  return `INV-${year}${month}-${seq}`;
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
  const days = PAYMENT_TERMS_DAYS[paymentTerms] || 7;
  return format(addDays(new Date(invoiceDate), days), 'yyyy-MM-dd');
}

/**
 * Create a new customer invoice (Draft)
 * This should be called when you want to bill a customer
 */
export async function createCustomerInvoice(invoiceData) {
  const invoiceDate = invoiceData.invoice_date || format(new Date(), 'yyyy-MM-dd');
  const paymentTerms = invoiceData.payment_terms || 'net_7';
  
  const invoice = await db.customerInvoices.create({
    invoice_number: invoiceData.invoice_number || generateInvoiceNumber(),
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
  const packagingFee = parseFloat(shipment.packaging_fee) || 0;
  const subtotal = shippingAmount + insuranceAmount + packagingFee;

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
    packaging_fee: packagingFee,
    subtotal: subtotal,
    total_amount: subtotal,
    notes: `Shipment: ${shipment.tracking_number}\nItems: ${shipment.items_description || ''}`,
  });

  return { invoice, isNew: true };
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
  const totalAmount = parseFloat(order.total_amount) || (productCost + commissionAmount + shippingCost);

  const invoice = await createCustomerInvoice({
    invoice_type: 'shopping_order',
    order_id: order.id,
    order_number: order.order_number,
    customer_id: customer?.id || order.customer_id,
    customer_name: order.customer_name,
    customer_email: customer?.email || '',
    customer_phone: order.customer_phone || '',
    service_type: 'shopping_service',
    weight_kg: order.actual_weight || order.estimated_weight || 0,
    price_per_kg: 110,
    shipping_amount: shippingCost,
    product_cost: productCost,
    commission_amount: commissionAmount,
    subtotal: totalAmount,
    total_amount: totalAmount,
    notes: `Shopping Order: ${order.order_number}\nProducts: ${order.product_details || order.product_links || ''}`,
  });

  return { invoice, isNew: true };
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
 * Record payment and mark invoice as paid
 */
export async function recordPayment(invoiceId, paymentDetails = {}) {
  const invoice = await db.customerInvoices.update(invoiceId, {
    status: 'paid',
    payment_date: paymentDetails.payment_date || format(new Date(), 'yyyy-MM-dd'),
    payment_method: paymentDetails.payment_method || 'bank_transfer',
    payment_reference: paymentDetails.reference || '',
  });
  return invoice;
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
