import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('🔍 Checking Actual Database Schema...\n');

  const tables = ['shipments', 'campaigns', 'company_settings'];

  for (const table of tables) {
    console.log(`\n📊 ${table.toUpperCase()} Table Schema:\n`);

    // Try to get a sample record to see actual columns
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
    } else if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`✅ Columns found (${columns.length}):`);
      columns.forEach((col, idx) => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`   ${idx + 1}. ${col} (${type}${value === null ? ', null' : ''})`);
      });
    } else {
      console.log(`⚠️  Table exists but is empty - cannot determine schema`);
    }
  }

  console.log('\n✅ Schema check complete!\n');
}

checkSchema().catch(console.error);
