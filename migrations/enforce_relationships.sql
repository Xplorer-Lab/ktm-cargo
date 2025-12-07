-- ============================================================================
-- MIGRATION: ENFORCE REAL-WORLD RELATIONSHIPS (SELF-HEALING)
-- Purpose: Add strict Foreign Key constraints and Cascade rules
-- Fix: Automatically adds missing columns (like shopping_orders.vendor_id) before linking
-- ============================================================================

DO $$
BEGIN

    -- 0. PRE-FLIGHT CHECK: CREATE MISSING COLUMNS
    -- ============================================================================
    -- We cannot link 'vendor_id' if it doesn't exist.
    
    -- Shopping Orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_orders' AND column_name = 'vendor_id') THEN
        RAISE NOTICE 'Auto-fixing: Adding vendor_id to shopping_orders';
        ALTER TABLE shopping_orders ADD COLUMN vendor_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_orders' AND column_name = 'vendor_po_id') THEN
        RAISE NOTICE 'Auto-fixing: Adding vendor_po_id to shopping_orders';
        ALTER TABLE shopping_orders ADD COLUMN vendor_po_id UUID;
    END IF;

    -- 1. SHIPMENTS CONNECTIONS
    -- ============================================================================
    -- Link Shipment -> Customer (Critical: Shipment must belong to someone)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_customer') THEN
        ALTER TABLE shipments 
        ADD CONSTRAINT fk_shipments_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;

    -- Link Shipment -> Vendor (Operational: Who is moving it?)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_vendor') THEN
        ALTER TABLE shipments 
        ADD CONSTRAINT fk_shipments_vendor 
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
    END IF;

    -- Link Shipment -> Vendor PO (Financial Traceability)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_vendor_po') THEN
        ALTER TABLE shipments 
        ADD CONSTRAINT fk_shipments_vendor_po 
        FOREIGN KEY (vendor_po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
    END IF;


    -- 2. PURCHASE ORDERS (PO) CONNECTIONS
    -- ============================================================================
    -- Link PO -> Vendor (Critical: You can't buy from 'nobody')
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_orders_vendor') THEN
        ALTER TABLE purchase_orders 
        ADD CONSTRAINT fk_purchase_orders_vendor 
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT;
    END IF;


    -- 3. SHOPPING ORDERS CONNECTIONS
    -- ============================================================================
    -- Link Shopping Order -> Customer
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shopping_orders_customer') THEN
        ALTER TABLE shopping_orders 
        ADD CONSTRAINT fk_shopping_orders_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;

    -- Link Shopping Order -> Vendor (Where we bought it from)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shopping_orders_vendor') THEN
        ALTER TABLE shopping_orders 
        ADD CONSTRAINT fk_shopping_orders_vendor 
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
    END IF;
    
    -- Link Shopping Order -> Purchase Order
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shopping_orders_po') THEN
        ALTER TABLE shopping_orders 
        ADD CONSTRAINT fk_shopping_orders_po 
        FOREIGN KEY (vendor_po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
    END IF;

    -- 4. FINANCIAL CONNECTIONS (Invoices & Payments)
    -- ============================================================================
    -- Link Invoice -> Customer
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_invoices') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_customer') THEN
             ALTER TABLE customer_invoices 
             ADD CONSTRAINT fk_invoices_customer 
             FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- Link Vendor Payment -> Vendor
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_payments') THEN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendor_payments_vendor') THEN
             ALTER TABLE vendor_payments 
             ADD CONSTRAINT fk_vendor_payments_vendor 
             FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT;
         END IF;
    END IF;


    -- 5. PERFORMANCE INDEXES (Real-world speed matters)
    -- ============================================================================
    
    -- Shipments
    CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_vendor_id ON shipments(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_vendor_po_id ON shipments(vendor_po_id);
    
    -- Purchase Orders
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
    
    -- Shopping Orders
    CREATE INDEX IF NOT EXISTS idx_shopping_orders_customer_id ON shopping_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_orders_vendor_id ON shopping_orders(vendor_id);
    
    -- Financials
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_invoices') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON customer_invoices(customer_id);
    END IF;

END $$;

-- Verification
SELECT 
    conname as constraint_name, 
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table 
FROM pg_constraint 
WHERE contype = 'f' 
AND conrelid::regclass::text IN ('shipments', 'purchase_orders', 'shopping_orders', 'vendor_payments');
