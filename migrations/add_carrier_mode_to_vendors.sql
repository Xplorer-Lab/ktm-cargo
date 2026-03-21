-- Add carrier_mode to vendors table
-- Applies to vendor_type = 'cargo_carrier' only (land or air)

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS carrier_mode TEXT
    CHECK (carrier_mode IN ('land', 'air'));

COMMENT ON COLUMN vendors.carrier_mode IS
  'Transport mode for cargo_carrier vendors: land (road) or air (freight). NULL for non-carrier vendors.';
