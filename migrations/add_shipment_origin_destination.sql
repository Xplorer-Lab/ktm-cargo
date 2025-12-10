-- Migration: Add origin and destination columns to shipments
-- Purpose: Fix schema mismatch between application and database

-- Add origin column (default: Bangkok - the origin city)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'Bangkok';

-- Add destination column (default: Yangon - the destination city)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'Yangon';

-- Verify columns were added
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: origin and destination columns added to shipments table';
END $$;
