-- ============================================================================
-- FIX & ENFORCE: Shopping Orders & Relations
-- Purpose: Add missing vendor columns to shopping_orders THEN enforce limits
-- ============================================================================

DO $$
BEGIN

    -- 1. ADD MISSING COLUMNS (Shopping Orders)
    -- ========================================================================
    -- usage: These fields are needed before we can link to Vendors
    
    -- vendor_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_orders' AND column_name = 'vendor_id') THEN
        RAISE NOTICE 'Adding vendor_id to shopping_orders...';
        ALTER TABLE shopping_orders ADD COLUMN vendor_id UUID;
    END IF;

    -- vendor_po_id (Link to Purchase Order)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_orders' AND column_name = 'vendor_po_id') THEN
        ALTER TABLE shopping_orders ADD COLUMN vendor_po_id UUID;
    END IF;

    -- denormalized names/costs for ease of access (matching JSON scheme)
    ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS vendor_name TEXT;
    ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS vendor_po_number TEXT;
    ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS vendor_cost_per_kg DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS vendor_cost DECIMAL(10,2) DEFAULT 0;


    -- 2. APPLY CONSTRAINTS (Now that columns exist)
    -- ========================================================================

    -- Link Shopping Order -> Vendor
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shopping_orders_vendor') THEN
        RAISE NOTICE 'Linking Shopping Orders to Vendors...';
        ALTER TABLE shopping_orders 
        ADD CONSTRAINT fk_shopping_orders_vendor 
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
    END IF;

    -- Link Shopping Order -> Purchase Order (if PO table exists)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shopping_orders_po') THEN
        RAISE NOTICE 'Linking Shopping Orders to Purchase Orders...';
        ALTER TABLE shopping_orders 
        ADD CONSTRAINT fk_shopping_orders_po 
        FOREIGN KEY (vendor_po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
    END IF;

    -- Link Shopping Order -> Customer (Re-verifying)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shopping_orders_customer') THEN
        ALTER TABLE shopping_orders 
        ADD CONSTRAINT fk_shopping_orders_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;


    -- 3. INDEXES
    -- ========================================================================
    CREATE INDEX IF NOT EXISTS idx_shopping_orders_vendor_id ON shopping_orders(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_orders_vendor_po ON shopping_orders(vendor_po_id);

END $$;

-- Verification
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'shopping_orders' 
AND column_name LIKE 'vendor_%';
