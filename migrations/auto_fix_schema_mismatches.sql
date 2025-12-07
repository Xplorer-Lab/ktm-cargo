-- Auto-generated schema fix script
-- Generated: 2025-12-07T07:03:36.619Z
-- 
-- This script adds missing columns found in application code
-- Review carefully before applying!


-- Fix shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendorCost TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance TEXT;

-- End of auto-generated script
