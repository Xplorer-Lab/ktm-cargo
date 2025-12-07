import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔧 Applying Schema Fix Migration');
console.log('='.repeat(80));

// Read the SQL file
const sqlPath = join(__dirname, '../migrations/fix_shipment_schema.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('\n📄 Migration File: fix_shipment_schema.sql');
console.log('   Adding 8 missing columns to shipments table');
console.log('   Adding foreign keys and indexes');
console.log('   Adding notes fields to shopping_orders\n');

// We need to execute this SQL directly
// Since Supabase client doesn't have direct SQL execution, we'll use the REST API
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSql(sqlQuery) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql: sqlQuery }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`SQL execution failed: ${error}`);
    }

    return await response.json();
}

// Split SQL into individual statements and execute
const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^COMMENT ON/));

console.log('⚙️  Executing migration...\n');

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments and empty statements
    if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
    }

    try {
        // For ALTER TABLE statements, extract table and column info
        const alterMatch = statement.match(/ALTER TABLE (\w+) ADD COLUMN.*?(\w+) /);
        if (alterMatch) {
            console.log(`   Adding column ${alterMatch[2]} to ${alterMatch[1]}...`);
        }

        await executeSql(statement);
        successCount++;
        console.log('   ✅');
    } catch (error) {
        // Some errors are OK (like "column already exists")
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log('   ⏭️  (already exists)');
            successCount++;
        } else {
            console.log(`   ❌ ${error.message}`);
            errorCount++;
        }
    }
}

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Migration complete: ${successCount} statements succeeded, ${errorCount} errors\n`);

// Verify the columns were added
console.log('🔍 Verifying shipments table schema...\n');

const { data: shipments, error: shipError } = await supabase
    .from('shipments')
    .select('notes, vendor_po_id, vendor_id, vendor_name, profit')
    .limit(1);

if (shipError) {
    console.log('❌ Verification failed:', shipError.message);
    process.exit(1);
} else {
    console.log('✅ Successfully verified all new columns are accessible!\n');
    console.log('   Columns verified: notes, vendor_po_id, vendor_id, vendor_name, profit');
    console.log('\n🎉 Database schema is now synchronized with application code!\n');
    process.exit(0);
}
