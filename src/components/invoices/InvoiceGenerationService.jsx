/**
 * Invoice Generation Utilities
 *
 * These are helper functions for creating invoices from shipments and orders.
 * Invoices should be created manually by staff, not auto-generated.
 */

import { createInvoiceFromShipment } from './InvoiceService';

/**
 * Create invoice from a shipment (called manually)
 * This replaces the old auto-generation logic
 */
export async function generateCustomerInvoice(shipment, customer) {
  return createInvoiceFromShipment(shipment, customer);
}

/**
 * Create vendor payout record
 * This is now a separate concern from invoicing
 */
/** @deprecated Use vendor payment management instead. */
export async function generateVendorPayout(_shipment, _invoice, _vendorOrder, _vendor) {
  return null;
}

/**
 * DEPRECATED: Auto-processing removed
 * Invoices should be created manually through the Invoices page
 */
export async function processShipmentForInvoicing(shipment, customers, vendorOrders, vendors) {
  console.warn(
    'processShipmentForInvoicing is deprecated. Create invoices manually from the Invoices page.'
  );
  return { invoice: null, payout: null, skipped: true };
}
