-- ============================================================================
-- MIGRATION: FINAL GAP FILL
-- Purpose: Add "Base Columns" that might be missing if tables already existed
--          (e.g. tasks, campaigns, feedback might have existed as empty skeletons)
-- ============================================================================

DO $$
BEGIN

    -- 1. CAMPAIGNS (Likely missing dates/status)
    -- ============================================================================
    -- Expected: id, name, created_at (3) + added(7) = 10.
    -- Missing: status, start_date, end_date
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date DATE;

    -- 2. TASKS (Likely missing priority/dates)
    -- ============================================================================
    -- Expected: id, title, created_at (3) + added(3) = 6.
    -- Missing: status, priority, due_date
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;

    -- 3. FEEDBACK (Likely missing standard fields)
    -- ============================================================================
    -- Expected: id, customer_id, rating, comment, created_at (5) + added(6) = 11.
    -- User has 11. This actually looks CORRECT! (5+6=11). 
    -- But let's double check 'status' isn't missing if needed.
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';


    -- 4. STOCK MOVEMENTS (Likely missing notes?)
    -- ============================================================================
    -- User has 10.
    -- Created: id, item_id, quantity, created_at (4)
    -- Added: movement_type, reference_type, reference_id, stock_after (4)
    -- Total 8? user has 10.
    -- Maybe 'item_name', 'notes' were there?
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS notes TEXT;
    
END $$;

-- Final Verification for these specific tables
SELECT 
    table_name, 
    column_name 
FROM information_schema.columns 
WHERE table_name IN ('campaigns', 'tasks') 
ORDER BY table_name, column_name;
