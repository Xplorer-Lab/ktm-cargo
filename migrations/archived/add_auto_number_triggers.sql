-- Migration: Add auto-generation triggers for tracking_number and order_number
-- Date: 2025-12-06
-- Purpose: Fix CRUD operations for shipments and shopping_orders
-- Version: 2 (with explicit schema references)

-- ============================================================================
-- IMPORTANT: Verify you're in the correct Supabase project
-- Project ID should be: jweovmefiiekvcvhyayb
-- ============================================================================

-- ============================================================================
-- PART 1: Make columns nullable (required first step)
-- ============================================================================

-- Make tracking_number nullable to allow trigger to set it
ALTER TABLE public.shipments ALTER COLUMN tracking_number DROP NOT NULL;

-- Make order_number nullable to allow trigger to set it
ALTER TABLE public.shopping_orders ALTER COLUMN order_number DROP NOT NULL;

-- ============================================================================
-- PART 2: Create sequences for auto-incrementing numbers
-- ============================================================================

-- Sequence for shipment tracking numbers
CREATE SEQUENCE IF NOT EXISTS public.tracking_seq START 1;

-- Sequence for shopping order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_seq START 1;

-- ============================================================================
-- PART 3: Create trigger functions
-- ============================================================================

-- Function to auto-generate tracking number for shipments
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if tracking_number is NULL
  IF NEW.tracking_number IS NULL THEN
    NEW.tracking_number := 'SHIP-' || 
                           TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                           LPAD(NEXTVAL('public.tracking_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate order number for shopping orders
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if order_number is NULL
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'SO-' || 
                        TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        LPAD(NEXTVAL('public.order_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Create triggers
-- ============================================================================

-- Drop existing triggers if they exist (for re-running this migration)
DROP TRIGGER IF EXISTS set_tracking_number ON public.shipments;
DROP TRIGGER IF EXISTS set_order_number ON public.shopping_orders;

-- Trigger to auto-set tracking_number on shipments
CREATE TRIGGER set_tracking_number
  BEFORE INSERT ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tracking_number();

-- Trigger to auto-set order_number on shopping_orders
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.shopping_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- ============================================================================
-- PART 5: Verification queries
-- ============================================================================

-- Run these to verify the migration worked:

-- Check if functions exist
SELECT 
  proname as function_name,
  prosrc as function_code 
FROM pg_proc 
WHERE proname IN ('generate_tracking_number', 'generate_order_number')
  AND pronamespace = 'public'::regnamespace;

-- Check if triggers exist
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname IN ('set_tracking_number', 'set_order_number');

-- Check sequences
SELECT 
  schemaname,
  sequencename,
  last_value
FROM pg_sequences
WHERE sequencename IN ('tracking_seq', 'order_seq');

-- ============================================================================
-- PART 6: Test the triggers (OPTIONAL - uncomment to test)
-- ============================================================================

-- Test 1: Create a shipment without tracking_number (should auto-generate)
/*
INSERT INTO public.shipments (
  customer_name, 
  customer_phone, 
  service_type, 
  weight_kg, 
  items_description, 
  status, 
  payment_status, 
  cost_basis, 
  price_per_kg, 
  total_amount
)
VALUES (
  'Test Customer', 
  '+66812345678', 
  'cargo_small', 
  5.0, 
  'Test items', 
  'pending', 
  'unpaid', 
  90, 
  120, 
  600
)
RETURNING id, tracking_number, created_date;
*/

-- Test 2: Create a shopping order without order_number (should auto-generate)
/*
INSERT INTO public.shopping_orders (
  product_details, 
  items_count, 
  estimated_product_cost, 
  commission_rate, 
  commission_amount, 
  total_amount, 
  status, 
  payment_status
)
VALUES (
  'Test product', 
  1, 
  1000, 
  10, 
  100, 
  1100, 
  'pending', 
  'unpaid'
)
RETURNING id, order_number, created_date;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- Generated formats:
--   - Shipment tracking: SHIP-YYYYMMDD-NNNNNN (e.g., SHIP-20251206-000001)
--   - Shopping order: SO-YYYYMMDD-NNNNNN (e.g., SO-20251206-000001)
--
-- The sequences are shared across all dates, so numbers increment continuously.
-- If you want daily reset, you'd need a more complex function that checks the date.
--
-- To manually set a tracking/order number, simply provide it in the INSERT:
--   - Frontend can still set custom values if needed
--   - Trigger only fills in NULL values

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- If you need to undo this migration:
/*
DROP TRIGGER IF EXISTS set_tracking_number ON public.shipments;
DROP TRIGGER IF EXISTS set_order_number ON public.shopping_orders;
DROP FUNCTION IF EXISTS public.generate_tracking_number();
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP SEQUENCE IF EXISTS public.tracking_seq;
DROP SEQUENCE IF EXISTS public.order_seq;
ALTER TABLE public.shipments ALTER COLUMN tracking_number SET NOT NULL;
ALTER TABLE public.shopping_orders ALTER COLUMN order_number SET NOT NULL;
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 Run the verification queries above to confirm.';
  RAISE NOTICE '🧪 Then test with: node test_triggers.js';
END $$;
