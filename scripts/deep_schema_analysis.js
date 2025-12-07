import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔍 DEEP DATABASE SCHEMA ANALYSIS');
console.log('='.repeat(80));

// Step 1: Get actual database schema
console.log('\n📊 Step 1: Extracting ACTUAL database schemas...\n');

const tables = [
    'shipments', 'shopping_orders', 'customers', 'vendors',
    'inventory_items', 'stock_movements', 'purchase_orders',
    'vendor_payments', 'campaigns', 'custom_segments',
    'notifications', 'notification_templates', 'audit_logs',
    'service_pricing', 'surcharges', 'company_settings',
    'expenses', 'scheduled_reports'
];

const actualSchemas = {};

for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (!error && data) {
        actualSchemas[table] = data.length > 0 ? Object.keys(data[0]) : [];
    } else {
        actualSchemas[table] = [];
    }

    console.log(`✅ ${table}: ${actualSchemas[table].length} columns`);
}

// Step 2: Extract expected schemas from application code
console.log('\n\n📝 Step 2: Extracting EXPECTED schemas from application code...\n');

const expectedSchemas = {};

// Scan form components for field definitions
const scanDirectory = (dir, pattern) => {
    const files = [];
    try {
        const items = readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = join(dir, item.name);
            if (item.isDirectory()) {
                files.push(...scanDirectory(fullPath, pattern));
            } else if (item.name.match(pattern)) {
                files.push(fullPath);
            }
        }
    } catch (e) {
        // Directory doesn't exist
    }
    return files;
};

const formFiles = scanDirectory(join(__dirname, '../src/components'), /Form\.jsx$/);
const pageFiles = scanDirectory(join(__dirname, '../src/pages'), /\.jsx$/);

// Extract field definitions from forms
const extractFieldsFromCode = (content, tableName) => {
    const fields = new Set();

    // Pattern 1: useState({ field: value, ... })
    const statePattern = /useState\s*\(\s*\{([^}]+)\}/g;
    let match;
    while ((match = statePattern.exec(content)) !== null) {
        const stateObj = match[1];
        const fieldMatches = stateObj.matchAll(/(\w+)\s*:/g);
        for (const fm of fieldMatches) {
            fields.add(fm[1]);
        }
    }

    // Pattern 2: name="fieldname" in form inputs
    const namePattern = /name=["'](\w+)["']/g;
    while ((match = namePattern.exec(content)) !== null) {
        fields.add(match[1]);
    }

    // Pattern 3: form.fieldname or data.fieldname
    const dotPattern = /(?:form|data|values)\.(\w+)/g;
    while ((match = dotPattern.exec(content)) !== null) {
        fields.add(match[1]);
    }

    return Array.from(fields);
};

// Scan shipment form
const shipmentFormPath = join(__dirname, '../src/components/shipments/ShipmentForm.jsx');
try {
    const content = readFileSync(shipmentFormPath, 'utf-8');
    expectedSchemas.shipments = extractFieldsFromCode(content, 'shipments');
    console.log(`✅ shipments (from ShipmentForm): ${expectedSchemas.shipments.length} fields`);
} catch (e) {
    console.log('⚠️  Could not read ShipmentForm.jsx');
}

// Scan schemas.js
const schemasPath = join(__dirname, '../src/lib/schemas.js');
try {
    const content = readFileSync(schemasPath, 'utf-8');

    // Extract shipment schema
    const shipmentSchemaMatch = content.match(/export const shipmentSchema = z\.object\(\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\)/s);
    if (shipmentSchemaMatch) {
        const schemaFields = shipmentSchemaMatch[1].matchAll(/(\w+)\s*:/g);
        const fields = [];
        for (const fm of schemaFields) {
            fields.push(fm[1]);
        }
        console.log(`✅ shipments (from schemas.js): ${fields.length} fields - ${fields.join(', ')}`);
        if (!expectedSchemas.shipments) {
            expectedSchemas.shipments = fields;
        }
    }
} catch (e) {
    console.log('⚠️  Could not read schemas.js');
}

// Step 3: Compare and identify mismatches
console.log('\n\n🔍 Step 3: Comparing ACTUAL vs EXPECTED schemas...\n');

const mismatches = {};

for (const table of tables) {
    const actual = new Set(actualSchemas[table] || []);
    const expected = new Set(expectedSchemas[table] || []);

    const missing = [...expected].filter(f => !actual.has(f));
    const extra = [...actual].filter(f => !expected.has(f) && !['id', 'created_at', 'updated_at', 'created_date'].includes(f));

    if (missing.length > 0 || extra.length > 0) {
        mismatches[table] = { missing, extra, actual: [...actual], expected: [...expected] };
    }
}

console.log('📋 SCHEMA MISMATCHES:\n');

for (const [table, info] of Object.entries(mismatches)) {
    console.log(`\n❗ ${table.toUpperCase()}`);
    if (info.missing.length > 0) {
        console.log(`   ❌ MISSING (in DB): ${info.missing.join(', ')}`);
    }
    if (info.extra.length > 0) {
        console.log(`   ℹ️  EXTRA (in DB): ${info.extra.join(', ')}`);
    }
}

// Generate fix script
console.log('\n\n' + '='.repeat(80));
console.log('📝 GENERATING FIX SCRIPT');
console.log('='.repeat(80));

let fixSQL = `-- Auto-generated schema fix script
-- Generated: ${new Date().toISOString()}
-- 
-- This script adds missing columns found in application code
-- Review carefully before applying!

`;

for (const [table, info] of Object.entries(mismatches)) {
    if (info.missing.length > 0) {
        fixSQL += `\n-- Fix ${table}\n`;
        for (const column of info.missing) {
            // Infer data type from column name
            let dataType = 'TEXT';
            if (column.includes('date') || column.includes('time')) dataType = 'TIMESTAMP';
            if (column.includes('amount') || column.includes('price') || column.includes('cost') || column.includes('fee')) dataType = 'DECIMAL(10,2)';
            if (column.includes('count') || column.includes('quantity') || column.includes('stock')) dataType = 'INTEGER';
            if (column.includes('is_') || column.includes('_opted') || column.includes('_active')) dataType = 'BOOLEAN DEFAULT false';
            if (column === 'notes' || column === 'description' || column === 'message' || column === 'instructions') dataType = 'TEXT';

            fixSQL += `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${dataType};\n`;
        }
    }
}

fixSQL += `\n-- End of auto-generated script\n`;

console.log('\n' + fixSQL);

// Save to file
import { writeFileSync } from 'fs';
writeFileSync(join(__dirname, '../migrations/auto_fix_schema_mismatches.sql'), fixSQL);
console.log('\n💾 Fix script saved to: migrations/auto_fix_schema_mismatches.sql');

process.exit(Object.keys(mismatches).length > 0 ? 1 : 0);
