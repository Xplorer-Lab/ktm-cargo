-- ============================================================================
-- MIGRATION: MASTER SCHEMA ALIGNMENT
-- Purpose: Align ALL 20 entities with bas44_data_scheme_json
-- Entities Covered: CRM, Marketing, Inventory, Feedback, Task, Vendors
-- ============================================================================

DO $$
BEGIN

    -- 1. CUSTOMERS (Extended Profile)
    -- ============================================================================
    -- Base table should exist, adding extended fields
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_bangkok TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_yangon TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'phone';
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS line_id TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS registration_source TEXT DEFAULT 'web';
        -- Ensure contact enum valid
        ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_preferred_contact;
        ALTER TABLE customers ADD CONSTRAINT check_preferred_contact CHECK (preferred_contact IN ('phone', 'email', 'line', 'whatsapp'));
    END IF;

    -- 2. CUSTOMER INTERACTIONS (Table + Columns)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS customer_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        interaction_type TEXT DEFAULT 'note',
        direction TEXT DEFAULT 'outbound',
        outcome TEXT,
        duration_minutes INTEGER,
        sentiment TEXT DEFAULT 'neutral',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    -- Add columns if table existed but was incomplete
    ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound';
    ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS outcome TEXT;
    ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
    ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral';
    
    -- 3. CUSTOMER NOTES (Table + Columns)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS customer_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        is_important BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
    ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

    -- 4. TASKS (Operations)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'pre_launch';
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS month INTEGER;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT 0;
    
    -- 5. CAMPAIGNS (Marketing)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'promotion';
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_segment TEXT DEFAULT 'all';
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS message_template TEXT;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'all';
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS conversion_count INTEGER DEFAULT 0;

    -- 6. INVENTORY ITEMS (Stock)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        current_stock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'in_stock',
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku TEXT;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'supplies';
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pieces';
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 50;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier TEXT;

    -- 7. STOCK MOVEMENTS (History)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_type TEXT DEFAULT 'out';
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_type TEXT DEFAULT 'manual';
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_id UUID;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS stock_after INTEGER;

    -- 8. FEEDBACK (Quality Control)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        rating INTEGER,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS service_rating INTEGER;
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS delivery_rating INTEGER;
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS communication_rating INTEGER;
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS ticket_number TEXT;
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feedback_type TEXT DEFAULT 'rating';
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS shipment_id UUID; -- Weak link or FK?
    
    -- 9. VENDORS (Extended)
    -- ============================================================================
    -- Base table exists, adding extended business fields
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_type TEXT DEFAULT 'supplier';
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contract_start DATE;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contract_end DATE;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'net_30';
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS on_time_rate DECIMAL(5,2) DEFAULT 100;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
    ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0;
    
    -- 10. VENDOR ORDERS (Non-Shipment Orders)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS vendor_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
        amount DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE vendor_orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'shipment';
    ALTER TABLE vendor_orders ADD COLUMN IF NOT EXISTS reference_id UUID;
    ALTER TABLE vendor_orders ADD COLUMN IF NOT EXISTS quality_rating INTEGER;
    ALTER TABLE vendor_orders ADD COLUMN IF NOT EXISTS on_time BOOLEAN;

    -- 11. VENDOR PAYMENTS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS vendor_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
        total_amount DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS reference_number TEXT;
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';
    ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS order_ids TEXT; -- Comma separated as per JSON

    -- 12. EXPENSES (Financials)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category TEXT DEFAULT 'other',
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
    
    -- 13. SCHEDULED REPORTS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS scheduled_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        report_type TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS schedule TEXT DEFAULT 'none';
    ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS recipients TEXT;
    ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'csv';
    ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS last_sent TIMESTAMP;

    -- 14. CUSTOM SEGMENTS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS custom_segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        criteria TEXT, -- JSON string
        customer_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE custom_segments ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue';
    ALTER TABLE custom_segments ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'users';

END $$;

-- Verification
SELECT 
    table_name, 
    COUNT(column_name) as column_count 
FROM information_schema.columns 
WHERE table_schema = 'public' 
GROUP BY table_name 
ORDER BY table_name;
