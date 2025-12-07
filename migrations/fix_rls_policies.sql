-- ==============================================================================
-- FIX RLS POLICIES FOR KTM CARGO EXPRESS
-- This script fixes "Permission Denied" errors by properly configuring Row Level Security.
-- ==============================================================================

-- 1. Helper Function to check permissions without infinite recursion
-- We use SECURITY DEFINER so this function runs with higher privileges
CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
  current_staff_role text;
BEGIN
  -- Get roles for the current user
  SELECT role, staff_role INTO current_role, current_staff_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if they are admin or managing_director
  IF current_role = 'admin' OR current_staff_role = 'managing_director' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Configure PROFILES table (The source of truth)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Users can always read/update their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins/Directors can read/write ALL profiles
CREATE POLICY "Staff Full Access Profiles" ON profiles
  FOR ALL
  USING (is_admin_or_director());

-- 3. Configure DATA TABLES (Customers, Shipments, etc)
-- We apply a standard "Staff Full Access" policy to all key business tables

DO $$
DECLARE
  tables text[] := ARRAY[
    'customers', 'shipments', 'shopping_orders', 'inventory_items', 
    'vendors', 'purchase_orders', 'customer_invoices',
    'campaigns', 'tasks', 'expenses', 'notifications',
    'vendor_orders', 'vendor_payments', 'service_pricing', 'surcharges',
    'goods_receipts', 'vendor_contracts', 'approval_rules', 'approval_history',
    'vendor_invitations', 'vendor_payouts', 'notification_templates',
    'company_settings' 
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    
    -- Check if table exists first to avoid errors
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
        -- 1. Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- 2. Drop old policies to clean up
        EXECUTE format('DROP POLICY IF EXISTS "Staff Full Access %I" ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all for authenticated" ON %I', t);
        
        -- 3. Create new Admin/Director Policy
        EXECUTE format('
          CREATE POLICY "Staff Full Access %I" ON %I
          FOR ALL
          USING (is_admin_or_director())
        ', t, t);
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping RLS setup.', t;
    END IF;
    
  END LOOP;
END $$;
