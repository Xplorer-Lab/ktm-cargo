-- ============================================================================
-- SCHEMA DISCOVERY QUERY
-- Run this FIRST in Supabase SQL Editor to find where your tables actually are
-- ============================================================================

-- Query 1: Find all schemas in this database
SELECT 
  schema_name,
  schema_owner
FROM information_schema.schemata
ORDER BY schema_name;

-- Query 2: Find tables named 'shipments' in ANY schema
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name IN ('shipments', 'shopping_orders')
ORDER BY table_schema, table_name;

-- Query 3: Check current schema search path
SHOW search_path;

-- Query 4: List all tables in public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run each query above in Supabase SQL Editor
-- 2. Look at Query 2 results - it will show which schema has shipments table
-- 3. If shipments is NOT in 'public', note which schema it's in
-- 4. Come back and tell me what schema name you see
-- ============================================================================
