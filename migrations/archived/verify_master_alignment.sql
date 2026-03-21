-- ============================================================================
-- VERIFICATION: MASTER SCHEMA ALIGNMENT
-- Purpose: Check if all expected tables and columns exist after migration
-- ============================================================================

SELECT 
    table_name,
    STRING_AGG(column_name, ', ' ORDER BY column_name) as columns_found,
    CASE 
        WHEN table_name = 'customers' AND STRING_AGG(column_name, ' ') LIKE '%address_bangkok%' THEN '✅ PASS'
        WHEN table_name = 'campaigns' AND STRING_AGG(column_name, ' ') LIKE '%conversion_count%' THEN '✅ PASS'
        WHEN table_name = 'inventory_items' AND STRING_AGG(column_name, ' ') LIKE '%reorder_point%' THEN '✅ PASS'
        WHEN table_name = 'vendor_orders' AND STRING_AGG(column_name, ' ') LIKE '%quality_rating%' THEN '✅ PASS'
        ELSE '⚠️ CHECK'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'customers', 'customer_interactions', 'customer_notes', 'tasks', 
    'campaigns', 'inventory_items', 'stock_movements', 'feedback', 
    'vendors', 'vendor_orders', 'vendor_payments', 'expenses', 
    'scheduled_reports', 'custom_segments'
  )
GROUP BY table_name
ORDER BY table_name;
