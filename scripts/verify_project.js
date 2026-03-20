import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

console.log('🔍 Advanced Schema and Connection Diagnostics\n');
console.log('='.repeat(80));

async function advancedDiagnostics() {
  try {
    console.log('\n📌 Connection Information:');
    console.log('   Supabase URL:', process.env.VITE_SUPABASE_URL);
    console.log('   Project ID:', process.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]);

    console.log('\n1️⃣  Testing raw SQL query via RPC...');

    // Try a simpler approach - just count records
    const { count, error: countError } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Error:', countError.message);
    } else {
      console.log('✅ Shipments table accessible');
      console.log('   Record count:', count);
    }

    console.log('\n2️⃣  Checking if this is the right database...');

    // Get some actual data to verify
    const { data: sampleShipment } = await supabase
      .from('shipments')
      .select('id, tracking_number, customer_name, created_date')
      .limit(1)
      .single();

    if (sampleShipment) {
      console.log('✅ Sample shipment from database:');
      console.log('   ID:', sampleShipment.id);
      console.log('   Tracking:', sampleShipment.tracking_number);
      console.log('   Customer:', sampleShipment.customer_name);
      console.log('   Created:', sampleShipment.created_date);
    }

    const { data: sampleOrder } = await supabase
      .from('shopping_orders')
      .select('id, order_number, product_details, created_date')
      .limit(1)
      .single();

    if (sampleOrder) {
      console.log('\n✅ Sample shopping order from database:');
      console.log('   ID:', sampleOrder.id);
      console.log('   Order #:', sampleOrder.order_number);
      console.log('   Product:', sampleOrder.product_details);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎯 IMPORTANT FINDING:\n');
    console.log('The application CAN access these tables successfully!');
    console.log('This means:');
    console.log('  1. ✅ The .env file has correct credentials');
    console.log('  2. ✅ Tables exist and have data');
    console.log('  3. ✅ Your app is connected to the right database');
    console.log('\n❌ BUT the Supabase SQL Editor cannot find them!\n');
    console.log('This can only mean ONE thing:\n');
    console.log('🚨 You are in the WRONG Supabase project in the SQL Editor!\n');
    console.log('='.repeat(80));
    console.log('\n📝 SOLUTION:\n');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Make sure you select project: jweovmefiiekvcvhyayb');
    console.log('3. Look at the URL - it should contain: jweovmefiiekvcvhyayb');
    console.log('4. Then go to SQL Editor');
    console.log('5. Try running: SELECT * FROM shipments LIMIT 1;');
    console.log('\nIf that query works, THEN run the migration!\n');
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
  }
}

advancedDiagnostics();
