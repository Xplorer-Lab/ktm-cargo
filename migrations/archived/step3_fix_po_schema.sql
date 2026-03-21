-- ============================================================================
-- STEP 3: FIX PURCHASE ORDERS SCHEMA (Run this now)
-- ============================================================================

-- Add missing columns to purchase_orders table referenced in Shipment logic
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS allocated_weight_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_weight_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS remaining_weight_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cost_per_kg DECIMAL(10,2) DEFAULT 0;

-- Verification
SELECT 'SUCCESS: Purchase Order columns added!' as status;
