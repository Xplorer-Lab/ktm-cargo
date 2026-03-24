-- Add 'both' to carrier_mode CHECK constraint on vendors table
-- Allows cargo carriers to support both land and air transport

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS vendors_carrier_mode_check;

ALTER TABLE vendors
  ADD CONSTRAINT vendors_carrier_mode_check
    CHECK (carrier_mode IN ('land', 'air', 'both'));

COMMENT ON COLUMN vendors.carrier_mode IS
  'Transport mode for cargo_carrier vendors: land, air, or both. NULL for non-carrier vendors.';
