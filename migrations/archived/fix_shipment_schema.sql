-- Schema Fix Migration: Add Missing Shipment Columns
-- Generated: 2025-12-07
-- Purpose: Fix schema cache errors by adding missing columns referenced in ShipmentForm.jsx

-- ============================================================================
-- SHIPMENTS TABLE - Add Missing Columns
-- ============================================================================

-- Add notes field (line 76, 470 in ShipmentForm.jsx)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add special_instructions field (referenced in schema)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Add vendor purchase order linkage fields (lines 77-81)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_po_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_po_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_cost_per_kg DECIMAL(10,2) DEFAULT 0;

-- Add calculated profit field (line 222)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) DEFAULT 0;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key for vendor_po_id (if purchase_orders table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    ALTER TABLE shipments 
    ADD CONSTRAINT fk_shipments_vendor_po 
    FOREIGN KEY (vendor_po_id) 
    REFERENCES purchase_orders(id) 
    ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add foreign key for vendor_id (if vendors table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors') THEN
    ALTER TABLE shipments 
    ADD CONSTRAINT fk_shipments_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for vendor PO lookups
CREATE INDEX IF NOT EXISTS idx_shipments_vendor_po_id ON shipments(vendor_po_id);

-- Index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_shipments_vendor_id ON shipments(vendor_id);

-- Index for customer lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);

-- Index for tracking number searches
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);

-- ============================================================================
-- SHOPPING ORDERS - Add Missing Fields
-- ============================================================================

ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN shipments.notes IS 'General notes about the shipment';
COMMENT ON COLUMN shipments.special_instructions IS 'Special handling instructions for the shipment';
COMMENT ON COLUMN shipments.vendor_po_id IS 'Reference to the vendor purchase order this shipment is linked to';
COMMENT ON COLUMN shipments.vendor_po_number IS 'Vendor PO number for quick reference';
COMMENT ON COLUMN shipments.vendor_id IS 'Vendor providing the shipping service';
COMMENT ON COLUMN shipments.vendor_name IS 'Vendor name for quick reference';
COMMENT ON COLUMN shipments.vendor_cost_per_kg IS 'Cost per kg charged by the vendor';
COMMENT ON COLUMN shipments.profit IS 'Calculated profit margin for this shipment';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all columns were added successfully
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col TEXT;
BEGIN
  -- Check for each expected column
  FOR col IN 
    SELECT unnest(ARRAY['notes', 'special_instructions', 'vendor_po_id', 'vendor_po_number', 
                        'vendor_id', 'vendor_name', 'vendor_cost_per_kg', 'profit'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'shipments' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING 'Missing columns in shipments table: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'All required columns exist in shipments table ✓';
  END IF;
END $$;

-- End of migration
