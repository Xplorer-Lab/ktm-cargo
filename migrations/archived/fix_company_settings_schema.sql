-- ==============================================================================
-- FIX COMPANY SETTINGS SCHEMA
-- Add missing columns to the existing company_settings table
-- ==============================================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Branding columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'company_name') THEN
    ALTER TABLE company_settings ADD COLUMN company_name TEXT DEFAULT 'BKK-YGN Cargo';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'logo_url') THEN
    ALTER TABLE company_settings ADD COLUMN logo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'tagline') THEN
    ALTER TABLE company_settings ADD COLUMN tagline TEXT DEFAULT 'Bangkok to Yangon Cargo & Shopping Services';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'primary_color') THEN
    ALTER TABLE company_settings ADD COLUMN primary_color TEXT DEFAULT '#2563eb';
  END IF;

  -- Contact columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'email') THEN
    ALTER TABLE company_settings ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'phone') THEN
    ALTER TABLE company_settings ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'address') THEN
    ALTER TABLE company_settings ADD COLUMN address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'tax_id') THEN
    ALTER TABLE company_settings ADD COLUMN tax_id TEXT;
  END IF;

  -- Bank details columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'bank_name') THEN
    ALTER TABLE company_settings ADD COLUMN bank_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'bank_account') THEN
    ALTER TABLE company_settings ADD COLUMN bank_account TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'bank_account_name') THEN
    ALTER TABLE company_settings ADD COLUMN bank_account_name TEXT;
  END IF;

  -- Business settings columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'currency') THEN
    ALTER TABLE company_settings ADD COLUMN currency TEXT DEFAULT 'THB';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'default_payment_terms') THEN
    ALTER TABLE company_settings ADD COLUMN default_payment_terms TEXT DEFAULT 'net_7';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'invoice_prefix') THEN
    ALTER TABLE company_settings ADD COLUMN invoice_prefix TEXT DEFAULT 'INV';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'tracking_prefix') THEN
    ALTER TABLE company_settings ADD COLUMN tracking_prefix TEXT DEFAULT 'BKK';
  END IF;

  -- Timestamp columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'created_at') THEN
    ALTER TABLE company_settings ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'updated_at') THEN
    ALTER TABLE company_settings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  RAISE NOTICE 'All missing columns have been added to company_settings table';
END $$;

-- Check if there's at least one record, if not insert default
INSERT INTO company_settings (company_name, tagline)
SELECT 'BKK-YGN Cargo', 'Bangkok to Yangon Cargo & Shopping Services'
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);

-- Update the existing record with default values if columns are null
UPDATE company_settings
SET 
  company_name = COALESCE(company_name, 'BKK-YGN Cargo'),
  tagline = COALESCE(tagline, 'Bangkok to Yangon Cargo & Shopping Services'),
  primary_color = COALESCE(primary_color, '#2563eb'),
  currency = COALESCE(currency, 'THB')
WHERE company_name IS NULL OR tagline IS NULL;

-- Show current schema
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'company_settings'
ORDER BY ordinal_position;
