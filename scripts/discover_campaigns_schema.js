import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function discoverCampaignsSchema() {
  console.log('🔍 Discovering Campaigns Table Schema\\n');
  console.log('='.repeat(80));

  try {
    // Try creating with ONLY name
    console.log('\\n1️⃣  Testing with ONLY name...');
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ name: 'Discovery Test ' + Date.now() })
      .select()
      .single();

    if (error) {
      console.log('❌ Failed:', error.message);
      console.log('   Code:', error.code);
    } else {
      console.log('✅ SUCCESS! Created campaign');
      console.log('\\n📋 Available columns:');
      Object.keys(data).forEach((col) => {
        console.log(`   - ${col}: ${typeof data[col]} = ${JSON.stringify(data[col])}`);
      });

      // Cleanup
      await supabase.from('campaigns').delete().eq('id', data.id);
      console.log('\\n🧹 Cleaned up test record');
    }

    console.log('\\n' + '='.repeat(80));
  } catch (err) {
    console.error('\\n❌ Fatal error:', err.message);
  }
}

discoverCampaignsSchema().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
