-- Create service_pricing table with proper schema
-- This table stores pricing tiers for different service types

CREATE TABLE IF NOT EXISTS service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  cost_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_weight DECIMAL(10,2) DEFAULT 0,
  max_weight DECIMAL(10,2) DEFAULT 999,
  is_active BOOLEAN DEFAULT true,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create surcharges table
CREATE TABLE IF NOT EXISTS surcharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'percentage' or 'fixed'
  value DECIMAL(10,2) NOT NULL,
  applies_to TEXT, -- 'all', 'cargo', 'shopping', etc
  is_active BOOLEAN DEFAULT true,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial service pricing data
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
ON CONFLICT (service_type) DO NOTHING;

-- Insert initial surcharges
INSERT INTO surcharges (name, type, value, applies_to, is_active)
VALUES 
  ('Fragile Items', 'fixed', 50, 'all', true),
  ('Oversized Package', 'fixed', 100, 'cargo', true),
  ('Same Day Delivery', 'percentage', 50, 'all', true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE service_pricing IS 'Pricing tiers for different shipping service types';
COMMENT ON TABLE surcharges IS 'Additional charges that can be applied to shipments';
