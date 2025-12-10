/**
 * Shopping Invoice Utilities
 * 
 * Helper functions for shopping order invoicing.
 * Invoices should be created manually by staff.
 */

import { createInvoiceFromShoppingOrder } from '@/components/invoices/InvoiceService';

/**
 * Create invoice from a shopping order (called manually)
 */
export async function generateShoppingOrderInvoice(order, customer) {
  return createInvoiceFromShoppingOrder(order, customer);
}

/**
 * DEPRECATED: Auto-processing removed
 * Invoices should be created manually from the Invoices page
 */
export async function processShoppingOrderInvoicing(order, customers) {
  console.warn('processShoppingOrderInvoicing is deprecated. Create invoices manually from the Invoices page.');
  return { invoice: null, skipped: true, reason: 'Auto-generation disabled' };
}

/**
 * DEPRECATED: Batch processing removed
 */
export async function batchProcessShoppingInvoices(orders, customers) {
  console.warn('batchProcessShoppingInvoices is deprecated. Create invoices manually.');
  return { processed: 0, skipped: orders.length, errors: 0, invoices: [] };
}

/**
 * Calculate profit for a shopping order
 * This is still useful for display purposes
 */
export function calculateShoppingOrderProfit(order) {
  const revenue = parseFloat(order.total_amount) || 0;
  const vendorCost = parseFloat(order.vendor_cost) || 0;
  const productCost = parseFloat(order.actual_product_cost || order.estimated_product_cost) || 0;

  // Profit = Total Amount - Vendor Cost - Product Cost
  const grossProfit = revenue - vendorCost - productCost;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    revenue,
    vendorCost,
    productCost,
    grossProfit,
    margin: margin.toFixed(1),
  };
}
