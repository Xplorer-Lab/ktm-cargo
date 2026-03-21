-- Add deposit_amount to shopping_orders table
-- KTM collects a deposit upfront, balance due on delivery

ALTER TABLE shopping_orders
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN shopping_orders.deposit_amount IS
  'Amount paid by customer as deposit. Balance due = total_amount - deposit_amount.';
