-- P0-4: Prevent duplicate invoices for the same shipment or order.
-- Two concurrent calls to createInvoiceFromShipment() can both pass the
-- "does invoice exist?" check and insert duplicates. These partial UNIQUE
-- indexes block that at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoice_per_shipment
  ON customer_invoices (shipment_id, invoice_type)
  WHERE shipment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoice_per_order
  ON customer_invoices (order_id, invoice_type)
  WHERE order_id IS NOT NULL;
