-- ============================================================================
-- STEP 1: ADD ALL MISSING COLUMNS (Run this first)
-- ============================================================================

-- Fix service_pricing table - add ALL missing columns
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS cost_per_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS min_weight DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS max_weight DECIMAL(10,2) DEFAULT 999;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS created_date TIMESTAMP DEFAULT NOW();
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Fix surcharges table - add ALL missing columns
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS value DECIMAL(10,2);
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS applies_to TEXT;
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS created_date TIMESTAMP DEFAULT NOW();
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add missing columns to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_po_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_po_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_cost_per_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) DEFAULT 0;

-- Add missing columns to shopping_orders
ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Verification
SELECT 'SUCCESS: All columns added!' as status;
