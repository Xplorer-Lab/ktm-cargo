-- ==============================================================================
-- KTM Cargo Express
-- Seed data for the canonical baseline
-- ==============================================================================

INSERT INTO public.company_settings (
  company_name,
  tagline,
  email,
  phone,
  address,
  currency,
  default_currency,
  default_payment_terms,
  invoice_prefix,
  tracking_prefix
)
SELECT
  'BKK-YGN Cargo',
  'Bangkok to Yangon Cargo & Shopping Services',
  'contact@company.com',
  '+66 XX XXX XXXX',
  NULL,
  'THB',
  'THB',
  'net_7',
  'INV',
  'BKK'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

INSERT INTO public.service_pricing (
  service_type,
  display_name,
  cost_per_kg,
  price_per_kg,
  insurance_rate,
  packaging_fee,
  min_weight,
  max_weight,
  is_active
)
VALUES
  ('cargo_small', 'Cargo (1-5kg)', 90, 120, 2.00, 0, 1, 5, true),
  ('cargo_medium', 'Cargo (6-15kg)', 75, 95, 2.00, 0, 6, 15, true),
  ('cargo_large', 'Cargo (16-30kg)', 55, 70, 2.00, 0, 16, 30, true),
  ('shopping_small', 'Shopping + Small Items', 80, 110, 2.00, 0, 1, 5, true),
  ('shopping_fashion', 'Shopping + Fashion/Electronics', 85, 115, 2.00, 0, 1, 15, true),
  ('shopping_bulk', 'Shopping + Bulk Order', 70, 90, 2.00, 0, 15, 999, true),
  ('express', 'Express (1-2 days)', 100, 150, 2.00, 0, 1, 999, true),
  ('standard', 'Standard (3-5 days)', 75, 95, 2.00, 0, 1, 999, true)
ON CONFLICT (service_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cost_per_kg = EXCLUDED.cost_per_kg,
  price_per_kg = EXCLUDED.price_per_kg,
  insurance_rate = EXCLUDED.insurance_rate,
  packaging_fee = EXCLUDED.packaging_fee,
  min_weight = EXCLUDED.min_weight,
  max_weight = EXCLUDED.max_weight,
  is_active = EXCLUDED.is_active;

INSERT INTO public.surcharges (
  name,
  surcharge_type,
  amount,
  description,
  applies_to,
  is_active
)
SELECT v.*
FROM (
  VALUES
    ('Fragile Items', 'fixed', 50::DECIMAL(12,2), 'Extra packaging for fragile goods', 'all', true),
    ('Oversized Package', 'fixed', 100::DECIMAL(12,2), 'Oversized cargo surcharge', 'cargo', true),
    ('Same Day Delivery', 'percentage', 50::DECIMAL(12,2), 'Urgent delivery premium', 'all', true)
) AS v(name, surcharge_type, amount, description, applies_to, is_active)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.surcharges s
  WHERE s.name = v.name
    AND s.surcharge_type = v.surcharge_type
    AND s.amount = v.amount
    AND COALESCE(s.applies_to, '') = COALESCE(v.applies_to, '')
);
