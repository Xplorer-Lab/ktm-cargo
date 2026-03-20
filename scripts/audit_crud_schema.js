import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
  'customers',
  'shipments',
  'shopping_orders',
  'vendors',
  'tasks',
  'inventory_items',
  'customer_invoices',
  'purchase_orders',
  'vendor_orders',
  'vendor_payments',
  'goods_receipts',
  'vendor_contracts',
  'approval_history',
  'approval_rules',
  'campaigns',
  'feedback',
  'notifications',
  'stock_movements',
  'expenses',
  'service_pricing',
  'surcharges',
  'custom_segments',
  'scheduled_reports',
];

async function auditSchemas() {
  console.log('🔍 Starting CRUD Schema Audit...\n');
  const results = {};
  const issues = [];

  for (const table of TABLES) {
    try {
      // Get a sample record to inspect columns
      const { data, error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        results[table] = {
          status: '❌ ERROR',
          error: error.message,
          code: error.code,
        };
        issues.push(`${table}: ${error.message}`);
      } else {
        const columns = data && data[0] ? Object.keys(data[0]) : [];
        const hasCreatedAt = columns.includes('created_at');
        const hasCreatedDate = columns.includes('created_date');
        const hasId = columns.includes('id');

        // Check for common issues
        const warnings = [];
        if (!hasId) warnings.push('No id column');
        if (hasCreatedAt && hasCreatedDate) warnings.push('Both created_at and created_date exist');
        if (!hasCreatedAt && !hasCreatedDate) warnings.push('No timestamp column');

        results[table] = {
          status: data !== null ? '✅ OK' : '⚠️  EMPTY',
          columns: columns,
          timestamp: hasCreatedAt ? 'created_at' : hasCreatedDate ? 'created_date' : 'none',
          warnings: warnings.length > 0 ? warnings : null,
          recordCount: data?.length || 0,
        };

        if (warnings.length > 0) {
          issues.push(`${table}: ${warnings.join(', ')}`);
        }
      }
    } catch (err) {
      results[table] = {
        status: '❌ EXCEPTION',
        error: err.message,
      };
      issues.push(`${table}: ${err.message}`);
    }
  }

  // Print summary
  console.log('📊 CRUD SCHEMA AUDIT RESULTS\n');
  console.log('='.repeat(80));

  for (const [table, result] of Object.entries(results)) {
    console.log(`\n${result.status} ${table.toUpperCase()}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else {
      console.log(`   Columns (${result.columns?.length || 0}): ${result.columns?.join(', ')}`);
      console.log(`   Timestamp: ${result.timestamp}`);
      if (result.warnings) {
        console.log(`   ⚠️  Warnings: ${result.warnings.join(', ')}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));

  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:\n');
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  } else {
    console.log('\n✅ No schema issues found!');
  }

  console.log('\n✅ Audit complete!\n');
}

auditSchemas().catch((err) => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
