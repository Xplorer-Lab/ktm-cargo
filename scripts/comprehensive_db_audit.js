import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔍 COMPREHENSIVE DATABASE AUDIT\n');
console.log('='.repeat(80));

// Define expected schema based on application code
const EXPECTED_SCHEMA = {
    shipments: [
        'id', 'tracking_number', 'customer_id', 'customer_name', 'customer_phone',
        'customer_email', 'pickup_address', 'delivery_address', 'weight', 'dimensions',
        'service_type', 'status', 'estimated_delivery', 'actual_delivery',
        'packaging_fee', 'insurance_opted', 'insurance_amount', 'special_instructions',
        'total_amount', 'payment_status', 'created_date', 'updated_at'
    ],
    shopping_orders: [
        'id', 'order_number', 'customer_id', 'customer_name', 'customer_phone',
        'customer_email', 'delivery_address', 'status', 'tracking_number',
        'estimated_delivery', 'items', 'total_amount', 'payment_status',
        'created_date', 'updated_at'
    ],
    customers: [
        'id', 'name', 'phone', 'email', 'address', 'customer_type',
        'payment_terms', 'notes', 'created_date', 'updated_at'
    ],
    vendors: [
        'id', 'name', 'contact_person', 'phone', 'email', 'address',
        'vendor_type', 'payment_terms', 'bank_account', 'tax_id',
        'rating', 'is_active', 'notes', 'created_date', 'updated_at'
    ],
    inventory_items: [
        'id', 'name', 'sku', 'category', 'current_stock', 'unit',
        'reorder_point', 'reorder_quantity', 'unit_cost', 'vendor_id',
        'location', 'status', 'last_restock_date', 'lead_time_days',
        'created_date', 'updated_at'
    ],
    stock_movements: [
        'id', 'item_id', 'item_name', 'movement_type', 'quantity',
        'stock_after', 'reference_type', 'reference_id', 'notes',
        'created_date'
    ],
    purchase_orders: [
        'id', 'po_number', 'vendor_id', 'vendor_name', 'order_date',
        'delivery_date', 'status', 'total_amount', 'payment_status',
        'notes', 'created_date', 'updated_at'
    ],
    vendor_payments: [
        'id', 'vendor_id', 'vendor_name', 'reference_number', 'payment_date',
        'amount', 'payment_method', 'notes', 'created_date'
    ],
    campaigns: [
        'id', 'name', 'description', 'campaign_type', 'target_segment',
        'discount_type', 'discount_percentage', 'discount_amount',
        'start_date', 'end_date', 'status', 'target_count', 'sent_count',
        'conversion_count', 'created_date', 'updated_at'
    ],
    custom_segments: [
        'id', 'name', 'description', 'criteria', 'color', 'is_active',
        'created_by', 'created_date', 'updated_at'
    ],
    notifications: [
        'id', 'type', 'title', 'message', 'reference_type', 'reference_id',
        'recipient_email', 'status', 'email_sent', 'created_date'
    ],
    notification_templates: [
        'id', 'template_type', 'subject', 'body', 'is_active',
        'created_date', 'updated_at'
    ],
    audit_logs: [
        'id', 'action', 'entity_type', 'entity_id', 'entity_reference',
        'user_email', 'user_name', 'user_role', 'details', 'previous_value',
        'new_value', 'created_date'
    ],
    service_pricing: [
        'id', 'service_type', 'display_name', 'cost_per_kg', 'price_per_kg',
        'min_weight', 'max_weight', 'is_active', 'created_date', 'updated_at'
    ],
    surcharges: [
        'id', 'name', 'type', 'value', 'applies_to', 'is_active',
        'created_date', 'updated_at'
    ],
    company_settings: [
        'id', 'company_name', 'logo_url', 'tagline', 'email', 'phone',
        'address', 'tax_id', 'bank_name', 'bank_account', 'bank_account_name',
        'primary_color', 'currency', 'created_date', 'updated_at'
    ],
    expenses: [
        'id', 'title', 'category', 'amount', 'date', 'notes',
        'created_date', 'updated_at'
    ],
    scheduled_reports: [
        'id', 'name', 'report_type', 'filters', 'schedule_frequency',
        'schedule_day', 'schedule_time', 'recipients', 'is_active',
        'last_run', 'created_by', 'created_date', 'updated_at'
    ]
};

// Expected foreign key relationships
const EXPECTED_RELATIONSHIPS = [
    { table: 'shipments', column: 'customer_id', references: 'customers(id)' },
    { table: 'shopping_orders', column: 'customer_id', references: 'customers(id)' },
    { table: 'inventory_items', column: 'vendor_id', references: 'vendors(id)' },
    { table: 'stock_movements', column: 'item_id', references: 'inventory_items(id)' },
    { table: 'purchase_orders', column: 'vendor_id', references: 'vendors(id)' },
    { table: 'vendor_payments', column: 'vendor_id', references: 'vendors(id)' },
];

const issues = [];
const warnings = [];
const suggestions = [];

// 1. Check if all expected tables exist
console.log('\n📋 CHECKING TABLES...\n');

for (const tableName of Object.keys(EXPECTED_SCHEMA)) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

    if (error) {
        if (error.message.includes('does not exist')) {
            issues.push(`❌ MISSING TABLE: ${tableName}`);
            console.log(`❌ Table '${tableName}' does not exist`);
        } else {
            warnings.push(`⚠️  Error accessing ${tableName}: ${error.message}`);
            console.log(`⚠️  ${tableName}: ${error.message}`);
        }
    } else {
        console.log(`✅ Table '${tableName}' exists`);
    }
}

// 2. Check columns for each table
console.log('\n\n📐 CHECKING COLUMNS...\n');

for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
    // Fetch actual data to check columns
    const { data: testData, error: testError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (testError) {
        warnings.push(`⚠️  Could not check columns for ${tableName}: ${testError.message}`);
        console.log(`⚠️  ${tableName} - ${testError.message}`);
        continue;
    }

    const actualColumns = testData && testData.length > 0 ? Object.keys(testData[0]) : [];
    const missing = expectedColumns.filter(col => !actualColumns.includes(col));
    const extra = actualColumns.filter(col => !expectedColumns.includes(col));

    if (missing.length > 0) {
        console.log(`⚠️  ${tableName} - Missing: ${missing.join(', ')}`);
        missing.forEach(col => {
            issues.push(`❌ MISSING COLUMN: ${tableName}.${col}`);
        });
    }

    if (extra.length > 0 && extra.length < 10) {
        console.log(`ℹ️  ${tableName} - Extra columns: ${extra.join(', ')}`);
    }

    if (missing.length === 0) {
        console.log(`✅ ${tableName} - All expected columns present`);
    }
}

// 3. Check RLS policies
console.log('\n\n🔒 CHECKING RLS POLICIES...\n');
console.log('ℹ️  RLS policy check skipped - requires database admin access');
suggestions.push('Manually verify RLS policies are enabled for all tables in Supabase dashboard');

// 4. Data consistency checks skipped
console.log('\n\n📊 DATA CONSISTENCY...\n');
console.log('ℹ️  Orphan record check skipped - can be run manually if needed');

// 5. Generate Report
console.log('\n\n' + '='.repeat(80));
console.log('📊 AUDIT SUMMARY');
console.log('='.repeat(80));

console.log(`\n🔴 CRITICAL ISSUES (${issues.length}):`);
if (issues.length === 0) {
    console.log('   None - Database schema matches application requirements! ✨');
} else {
    issues.forEach(issue => console.log(`   ${issue}`));
}

console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
if (warnings.length === 0) {
    console.log('   None');
} else {
    warnings.forEach(warning => console.log(`   ${warning}`));
}

console.log(`\n💡 SUGGESTIONS (${suggestions.length}):`);
if (suggestions.length === 0) {
    console.log('   None');
} else {
    suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
}

console.log('\n' + '='.repeat(80));

// Generate fix script if there are issues
if (issues.length > 0) {
    console.log('\n\n📝 GENERATING FIX SCRIPT...\n');

    let fixScript = '-- Auto-generated fix script for database schema issues\n\n';

    issues.forEach(issue => {
        if (issue.includes('MISSING COLUMN')) {
            const match = issue.match(/MISSING COLUMN: (\w+)\.(\w+)/);
            if (match) {
                const [, table, column] = match;
                fixScript += `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} TEXT;\n`;
            }
        } else if (issue.includes('MISSING TABLE')) {
            const match = issue.match(/MISSING TABLE: (\w+)/);
            if (match) {
                fixScript += `\n-- TODO: Create table ${match[1]}\n`;
                fixScript += `-- Please review the application code for the schema definition\n\n`;
            }
        }
    });

    console.log(fixScript);
    console.log('\n💾 Save this script and review before applying!\n');
}

process.exit(issues.length > 0 ? 1 : 0);
