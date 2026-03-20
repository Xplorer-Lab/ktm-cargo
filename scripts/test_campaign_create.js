import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testCampaignCreate() {
  console.log('🧪 Testing Campaign CREATE\\n');
  console.log('='.repeat(80));

  try {
    // Test 1: Simple create with minimal data
    console.log('\\n1️⃣  Testing CREATE with minimal data...');
    const minimalPayload = {
      name: 'Test Campaign ' + Date.now(),
    };

    const { data: minimal, error: minimalError } = await supabase
      .from('campaigns')
      .insert(minimalPayload)
      .select()
      .single();

    if (minimalError) {
      console.log('❌ Minimal CREATE failed:', minimalError.message);
      console.log('   Code:', minimalError.code);
      console.log('   Details:', minimalError.details);
      console.log('   Hint:', minimalError.hint);
    } else {
      console.log('✅ Minimal CREATE successful');
      console.log('   ID:', minimal.id);

      // Cleanup
      await supabase.from('campaigns').delete().eq('id', minimal.id);
    }

    // Test 2: Create with campaign_type
    console.log('\\n2️⃣  Testing CREATE with campaign_type...');
    const fullPayload = {
      name: 'Test Campaign with Type ' + Date.now(),
      campaign_type: 'promotion',
    };

    const { data: full, error: fullError } = await supabase
      .from('campaigns')
      .insert(fullPayload)
      .select()
      .single();

    if (fullError) {
      console.log('❌ Full CREATE failed:', fullError.message);
      console.log('   Code:', fullError.code);
      console.log('   Details:', fullError.details);
      console.log('   Hint:', fullError.hint);
    } else {
      console.log('✅ Full CREATE successful');
      console.log('   ID:', full.id);
      console.log('   Type:', full.campaign_type);

      // Cleanup
      await supabase.from('campaigns').delete().eq('id', full.id);
    }

    // Test 3: Check existing campaigns structure
    console.log('\\n3️⃣  Checking existing campaigns...');
    const { data: existing, error: listError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);

    if (listError) {
      console.log('❌ List failed:', listError.message);
    } else if (existing && existing.length > 0) {
      console.log('✅ Found existing campaign');
      console.log('   Columns:', Object.keys(existing[0]).join(', '));
    } else {
      console.log('⚠️  No existing campaigns found');
    }

    console.log('\\n' + '='.repeat(80));
  } catch (err) {
    console.error('\\n❌ Fatal error:', err.message);
  }
}

testCampaignCreate().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
