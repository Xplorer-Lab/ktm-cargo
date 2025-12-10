-- ==============================================================================
-- CREATE COMPANY SETTINGS TABLE
-- This table stores company branding, contact info, and business settings
-- ==============================================================================

-- Create the company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Branding
  company_name TEXT NOT NULL DEFAULT 'BKK-YGN Cargo',
  logo_url TEXT,
  tagline TEXT DEFAULT 'Bangkok to Yangon Cargo & Shopping Services',
  primary_color TEXT DEFAULT '#2563eb',
  
  -- Contact Info
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  
  -- Bank Details
  bank_name TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  
  -- Business Settings
  currency TEXT DEFAULT 'THB',
  default_payment_terms TEXT DEFAULT 'net_7',
  invoice_prefix TEXT DEFAULT 'INV',
  tracking_prefix TEXT DEFAULT 'BKK',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read
CREATE POLICY "Authenticated users can read company settings" ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for admins to manage
CREATE POLICY "Admins can manage company settings" ON company_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.staff_role = 'managing_director')
    )
  );

-- Insert default record if none exists
INSERT INTO company_settings (company_name, tagline, email, phone)
SELECT 
  'BKK-YGN Cargo',
  'Bangkok to Yangon Cargo & Shopping Services',
  'contact@company.com',
  '+66 XX XXX XXXX'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Update trigger
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_settings_updated_at ON company_settings;
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Company settings table created successfully with default values';
END $$;
