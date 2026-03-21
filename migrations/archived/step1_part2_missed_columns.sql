-- ============================================================================
-- STEP 1 Part 2: ADD MISSED COLUMNS
-- ============================================================================

-- Add is_active column to service_pricing which caused the error
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_active column to surcharges just in case
ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Verification
SELECT 'SUCCESS: Missing is_active columns added!' as status;
