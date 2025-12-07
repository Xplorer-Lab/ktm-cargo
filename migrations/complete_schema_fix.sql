-- ============================================================================
-- COMPLETE DATABASE SCHEMA FIX (UPDATED)
-- Generated: 2025-12-07
-- Purpose: Fix all schema mismatches - handles existing tables properly
-- ============================================================================

-- PART 1: Fix existing service_pricing table (add missing columns)
-- ============================================================================

-- Add missing columns to existing service_pricing table
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS min_weight DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS max_weight DECIMAL(10,2) DEFAULT 999;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS created_date TIMESTAMP DEFAULT NOW();
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add missing columns to existing surcharges table
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS applies_to TEXT;
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS created_date TIMESTAMP DEFAULT NOW();
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- PART 2: Add missing columns to shipments table
-- ============================================================================

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_po_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_po_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_cost_per_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) DEFAULT 0;

-- PART 3: Add missing columns to shopping_orders
-- ============================================================================

ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- PART 4: Add foreign key constraints (with error handling)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_shipments_vendor_po'
  ) THEN
    ALTER TABLE shipments 
    ADD CONSTRAINT fk_shipments_vendor_po 
    FOREIGN KEY (vendor_po_id) 
    REFERENCES purchase_orders(id) 
    ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_shipments_vendor'
  ) THEN
    ALTER TABLE shipments 
    ADD CONSTRAINT fk_shipments_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- PART 5: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shipments_vendor_po_id ON shipments(vendor_po_id);
CREATE INDEX IF NOT EXISTS idx_shipments_vendor_id ON shipments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_date ON shipments(created_date DESC);

-- PART 6: Update existing service pricing data and add new rows
-- ============================================================================

-- First, update display_name for existing rows
UPDATE service_pricing 
SET display_name = CASE service_type
  WHEN 'cargo_small' THEN 'Cargo (1-5kg)'
  WHEN 'cargo_medium' THEN 'Cargo (6-15kg)'
  WHEN 'cargo_large' THEN 'Cargo (16-30kg)'
  WHEN 'shopping_small' THEN 'Shopping + Small Items'
  WHEN 'shopping_fashion' THEN 'Shopping + Fashion/Electronics'
  WHEN 'shopping_bulk' THEN 'Shopping + Bulk Order'
  WHEN 'express' THEN 'Express (1-2 days)'
  WHEN 'standard' THEN 'Standard (3-5 days)'
  ELSE service_type
END
WHERE display_name IS NULL;

-- Insert or update pricing data
INSERT INTO service_pricing (service_type, display_name, cost_per_kg, price_per_kg, min_weight, max_weight, is_active)
VALUES 
  ('cargo_small', 'Cargo (1-5kg)', 90, 120, 1, 5, true),
  ('cargo_medium', 'Cargo (6-15kg)', 75, 95, 6, 15, true),
  ('cargo_large', 'Cargo (16-30kg)', 55, 70, 16, 30, true),
  ('shopping_small', 'Shopping + Small Items', 80, 110, 1, 5, true),
  ('shopping_fashion', 'Shopping + Fashion/Electronics', 85, 115, 1, 15, true),
  ('shopping_bulk', 'Shopping + Bulk Order', 70, 90, 15, 999, true),
  ('express', 'Express (1-2 days)', 100, 150, 1, 999, true),
  ('standard', 'Standard (3-5 days)', 75, 95, 1, 999, true)
ON CONFLICT (service_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cost_per_kg = EXCLUDED.cost_per_kg,
  price_per_kg = EXCLUDED.price_per_kg,
  min_weight = EXCLUDED.min_weight,
  max_weight = EXCLUDED.max_weight;

-- PART 7: Seed surcharges data
-- ============================================================================

INSERT INTO surcharges (name, type, value, applies_to, is_active)
VALUES 
  ('Fragile Items', 'fixed', 50, 'all', true),
  ('Oversized Package', 'fixed', 100, 'cargo', true),
  ('Same Day Delivery', 'percentage', 50, 'all', true)
ON CONFLICT DO NOTHING;

-- PART 8: Verification
-- ============================================================================

DO $$
DECLARE
  shipment_cols INTEGER;
  pricing_rows INTEGER;
  has_display_name BOOLEAN;
BEGIN
  -- Count shipments columns
  SELECT COUNT(*) INTO shipment_cols
  FROM information_schema.columns 
  WHERE table_name = 'shipments' 
  AND column_name IN ('notes', 'vendor_po_id', 'vendor_id', 'profit');
  
  -- Count pricing rows
  SELECT COUNT(*) INTO pricing_rows FROM service_pricing;
  
  -- Check if display_name exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_pricing' AND column_name = 'display_name'
  ) INTO has_display_name;
  
  RAISE NOTICE '✓ Shipments table: % new columns added', shipment_cols;
  RAISE NOTICE '✓ Service pricing: % pricing tiers loaded', pricing_rows;
  RAISE NOTICE '✓ Service pricing display_name column: %', CASE WHEN has_display_name THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '✓ Migration completed successfully!';
END $$;
