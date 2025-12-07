-- ============================================================================
-- STEP 2: POPULATE DATA (Run this AFTER step 1)
-- ============================================================================

-- Update existing rows with proper display names (if any exist)
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

-- Insert surcharges
INSERT INTO surcharges (name, type, value, applies_to, is_active)
VALUES 
  ('Fragile Items', 'fixed', 50, 'all', true),
  ('Oversized Package', 'fixed', 100, 'cargo', true),
  ('Same Day Delivery', 'percentage', 50, 'all', true)
ON CONFLICT DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_shipments_vendor_po_id ON shipments(vendor_po_id);
CREATE INDEX IF NOT EXISTS idx_shipments_vendor_id ON shipments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);

-- Add foreign keys
DO $$
BEGIN
  ALTER TABLE shipments 
  ADD CONSTRAINT fk_shipments_vendor_po 
  FOREIGN KEY (vendor_po_id) 
  REFERENCES purchase_orders(id) 
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE shipments 
  ADD CONSTRAINT fk_shipments_vendor 
  FOREIGN KEY (vendor_id) 
  REFERENCES vendors(id) 
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

SELECT 'SUCCESS: Data populated and indexes created!' as status;
