/**
 * Vendor Bill/Invoice Service
 *
 * This manages vendor invoices (bills) - invoices WE RECEIVE from vendors
 * for goods and services purchased. This is Accounts Payable.
 *
 * NOT to be confused with Customer Invoices which are invoices WE ISSUE.
 *
 * Real-World Flow:
 * 1. Create Purchase Order (PO)
 * 2. Receive Goods (Goods Receipt / GR)
 * 3. Receive Vendor Invoice/Bill
 * 4. Match Invoice to PO and GR (3-way matching)
 * 5. Approve for Payment
 * 6. Pay Vendor
 */

import { db } from '@/api/db';
import { addDays, format } from 'date-fns';

const PAYMENT_TERMS_DAYS = {
  immediate: 0,
  net_15: 15,
  net_30: 30,
  net_60: 60,
};

/**
 * Generate vendor bill reference number
 */
function generateBillNumber() {
  const date = new Date();
  const prefix = 'BILL';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
}

/**
 * Calculate due date based on payment terms
 */
function calculateDueDate(billDate, paymentTerms) {
  const days = PAYMENT_TERMS_DAYS[paymentTerms] || 30;
  return format(addDays(new Date(billDate), days), 'yyyy-MM-dd');
}

/**
 * Record a vendor bill/invoice received
 * This should be entered manually when you receive an invoice from a vendor
 */
export async function recordVendorBill(billData) {
  const billDate = billData.bill_date || format(new Date(), 'yyyy-MM-dd');
  const paymentTerms = billData.payment_terms || 'net_30';

  const bill = await db.customerInvoices.create({
    invoice_number: billData.vendor_invoice_number || generateBillNumber(),
    invoice_type: 'vendor_bill',

    // Link to PO and Receipt
    po_id: billData.po_id,
    po_number: billData.po_number,
    receipt_id: billData.receipt_id,
    receipt_number: billData.receipt_number,

    // Vendor details
    vendor_id: billData.vendor_id,
    vendor_name: billData.vendor_name,

    // Dates
    invoice_date: billDate,
    due_date: billData.due_date || calculateDueDate(billDate, paymentTerms),

    // Amount details
    items: billData.items || '[]',
    subtotal: billData.subtotal || 0,
    tax_rate: billData.tax_rate || 0,
    tax_amount: billData.tax_amount || 0,
    shipping_cost: billData.shipping_cost || 0,
    total_amount: billData.total_amount || 0,

    // Payment info
    payment_terms: paymentTerms,
    status: 'pending',

    notes: billData.notes || '',
  });

  return bill;
}

/**
 * DEPRECATED: Auto-generation from receipt removed
 * Vendor bills should be recorded manually when received
 */
export async function generateInvoiceFromReceipt(purchaseOrder, goodsReceipt, vendor) {
  const receiptItems = Array.isArray(goodsReceipt?.items_received)
    ? goodsReceipt.items_received
    : (() => {
        try {
          return JSON.parse(goodsReceipt?.items_received || '[]');
        } catch {
          return [];
        }
      })();

  const totalAmount = Number(goodsReceipt?.total_value || purchaseOrder?.total_amount || 0);

  const invoice = await recordVendorBill({
    po_id: purchaseOrder?.id,
    po_number: purchaseOrder?.po_number,
    receipt_id: goodsReceipt?.id,
    receipt_number: goodsReceipt?.receipt_number,
    vendor_id: vendor?.id || purchaseOrder?.vendor_id,
    vendor_name: vendor?.name || purchaseOrder?.vendor_name,
    bill_date: goodsReceipt?.received_date || format(new Date(), 'yyyy-MM-dd'),
    payment_terms: vendor?.payment_terms || 'net_30',
    items: receiptItems,
    subtotal: totalAmount,
    total_amount: totalAmount,
    notes: `Auto-created from goods receipt ${goodsReceipt?.receipt_number || ''}`.trim(),
  });

  return { status: 'created', invoice };
}

/**
 * Mark vendor bill as paid
 */
export async function markInvoicePaid(invoiceId, paymentDetails = {}) {
  const invoice = await db.customerInvoices.update(invoiceId, {
    status: 'paid',
    payment_date: paymentDetails.payment_date || format(new Date(), 'yyyy-MM-dd'),
    payment_method: paymentDetails.payment_method || 'bank_transfer',
    payment_reference: paymentDetails.reference || '',
  });
  return invoice;
}

/**
 * Approve vendor bill for payment
 */
export async function approveForPayment(invoiceId, approverEmail) {
  const invoice = await db.customerInvoices.update(invoiceId, {
    status: 'approved',
    approved_by: approverEmail,
    approved_date: format(new Date(), 'yyyy-MM-dd'),
  });
  return invoice;
}

/**
 * Check for overdue vendor bills
 */
export async function checkOverdueInvoices() {
  const pendingInvoices = await db.customerInvoices.filter({
    status: 'pending',
    invoice_type: 'vendor_bill',
  });
  const today = new Date();
  const overdue = [];

  for (const invoice of pendingInvoices) {
    if (invoice.due_date && new Date(invoice.due_date) < today) {
      await db.customerInvoices.update(invoice.id, { status: 'overdue' });
      overdue.push(invoice);
    }
  }

  return overdue;
}

/**
 * Get vendor bill summary
 */
export function getVendorBillSummary(bills) {
  const summary = {
    total: bills.length,
    pending: 0,
    approved: 0,
    paid: 0,
    overdue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
  };

  const today = new Date();

  bills.forEach((bill) => {
    const amount = bill.total_amount || 0;
    const isOverdue = bill.due_date && new Date(bill.due_date) < today && bill.status !== 'paid';

    switch (bill.status) {
      case 'pending':
        summary.pending++;
        summary.pendingAmount += amount;
        if (isOverdue) {
          summary.overdue++;
          summary.overdueAmount += amount;
        }
        break;
      case 'approved':
        summary.approved++;
        summary.pendingAmount += amount;
        break;
      case 'paid':
        summary.paid++;
        break;
    }
  });

  return summary;
}
