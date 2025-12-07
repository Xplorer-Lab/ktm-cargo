import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
      });
    }
  } catch (e) {
    console.error(e);
  }
}
loadEnv();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const TABLES = [
  'profiles',
  'vendors',
  'customers',
  'inventory_items',
  'company_settings',
  'purchase_orders',
  'shipments',
  'shopping_orders',
  'invoices',
  'customer_invoices',
  'tasks',
  'expenses',
  'campaigns',
  'feedback',
  'stock_movements',
  'notifications',
  'vendor_orders',
  'vendor_payments',
  'service_pricing',
  'surcharges',
  'custom_segments',
  'scheduled_reports',
  'goods_receipts',
  'vendor_contracts',
  'approval_rules',
  'approval_history',
  'audit_logs',
  'vendor_invitations',
  'vendor_payouts',
  'notification_templates',
];

async function auditDatabase() {
  console.log('Starting Database Audit...\n');
  console.log('| Table Name | Row Count | Status |');
  console.log('|---|---|---|');

  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });

    if (error) {
      // If error is 404/relation does not exist, note it
      if (error.code === '42P01') {
        // undefined_table
        console.log(`| ${table} | - | ❌ Table Not Found |`);
      } else {
        console.log(`| ${table} | - | ❌ Error: ${error.message} |`);
      }
    } else {
      console.log(`| ${table} | ${count} | ✅ OK |`);
    }
  }

  console.log('\nAudit Complete.');
}

auditDatabase();
