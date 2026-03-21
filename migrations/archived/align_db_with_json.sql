-- ============================================================================
-- MIGRATION: ALIGN DB WITH JSON SCHEME (FIXED & SAFER)
-- Purpose: Sync Database with Frontend requirements (bas44_data_scheme_json)
-- fix: Handles cases where target columns (amount, surcharge_type) already exist
-- ============================================================================

-- 1. SURCHARGES: Safe Rename/Migrate columns
-- ============================================================================
DO $$
BEGIN
    -- A. Handle 'type' -> 'surcharge_type'
    -- ------------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surcharges' AND column_name = 'surcharge_type') THEN
        -- Target 'surcharge_type' ALREADY EXISTS. 
        -- Check if old 'type' also exists. If so, move data and drop old column.
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surcharges' AND column_name = 'type') THEN
            RAISE NOTICE 'Migrating data from type to surcharge_type...';
            -- Cast text to text is safe. If type was different, might need casting.
            UPDATE surcharges SET surcharge_type = "type" WHERE surcharge_type IS NULL;
            ALTER TABLE surcharges DROP COLUMN "type";
        END IF;
    ELSE
        -- Target 'surcharge_type' DOES NOT EXIST.
        -- Check if source 'type' exists. If so, simple rename.
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surcharges' AND column_name = 'type') THEN
            RAISE NOTICE 'Renaming type to surcharge_type...';
            ALTER TABLE surcharges RENAME COLUMN "type" TO surcharge_type;
        ELSE
            -- Neither exist? Create it fresh.
            RAISE NOTICE 'Creating surcharge_type column...';
            ALTER TABLE surcharges ADD COLUMN surcharge_type TEXT DEFAULT 'fixed';
        END IF;
    END IF;

    -- B. Handle 'value' -> 'amount'
    -- ------------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surcharges' AND column_name = 'amount') THEN
        -- Target 'amount' ALREADY EXISTS.
        -- Check if old 'value' also exists. If so, move data and drop old column.
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surcharges' AND column_name = 'value') THEN
            RAISE NOTICE 'Migrating data from value to amount...';
            UPDATE surcharges SET amount = "value" WHERE amount IS NULL OR amount = 0;
            ALTER TABLE surcharges DROP COLUMN "value";
        END IF;
    ELSE
        -- Target 'amount' DOES NOT EXIST.
        -- Check if source 'value' exists. If so, simple rename.
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surcharges' AND column_name = 'value') THEN
            RAISE NOTICE 'Renaming value to amount...';
            ALTER TABLE surcharges RENAME COLUMN "value" TO amount;
        ELSE
            -- Neither exist? Create it fresh.
            RAISE NOTICE 'Creating amount column...';
            ALTER TABLE surcharges ADD COLUMN amount DECIMAL(10,2) DEFAULT 0;
        END IF;
    END IF;

    -- Add generic description if missing
    ALTER TABLE surcharges ADD COLUMN IF NOT EXISTS description TEXT;
END $$;

-- 2. SERVICE_PRICING: Add missing financial configuration columns
-- ============================================================================
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS insurance_rate DECIMAL(5,2) DEFAULT 2.00;
ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS packaging_fee DECIMAL(10,2) DEFAULT 0.00;

-- 3. PURCHASE_ORDERS: Add critical JSONB structure and financials
-- ============================================================================
-- The JSON scheme defines 'items' as a generic string/JSON blob
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Add financial summary columns defined in JSON scheme
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;

-- Ensure status enums match JSON scheme requirements (check constraint)
-- We use a safe approach: drop old constraint if it exists, add new one via specific name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_status_check') THEN
        ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_status_check;
    END IF;
    
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check 
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'partial_received', 'received', 'closed', 'cancelled'));
END $$;

-- 4. SHIPMENTS: Add granular cost tracking
-- ============================================================================
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_total_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cost_basis DECIMAL(10,2) DEFAULT 0;      -- Base cost before add-ons
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2) DEFAULT 0;    -- Final price charged
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS packaging_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP;

-- 5. VENDORS: Add automated pricing factors
-- ============================================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cost_per_kg_express DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cost_per_kg_bulk DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bulk_threshold_kg DECIMAL(10,2) DEFAULT 100;

-- Verification Output
SELECT 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'surcharges' AND column_name = 'surcharge_type') as "Surcharge Fixed",
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'service_pricing' AND column_name = 'insurance_rate') as "Pricing Fixed",
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'items') as "PO Items Added"
;
