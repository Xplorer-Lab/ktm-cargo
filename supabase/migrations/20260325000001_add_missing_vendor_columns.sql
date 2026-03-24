-- Add missing columns to vendors table
-- These fields exist in the frontend vendorSchema but were absent from
-- the DB, causing every vendor INSERT to fail with HTTP 400.

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS address      TEXT,
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN NOT NULL DEFAULT false;
