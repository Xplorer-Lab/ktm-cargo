-- Add missing insurance_opted column to shipments table
-- This column was referenced in the application code but missing from the database schema

ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS insurance_opted BOOLEAN DEFAULT false;

COMMENT ON COLUMN shipments.insurance_opted IS 'Whether the customer opted for insurance coverage (3% of shipment value)';
