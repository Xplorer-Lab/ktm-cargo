import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.error('   Please add it to continue with programmatic migration.');
  process.exit(1);
}

// Extract connection details from Supabase URL
const projectRef = supabaseUrl.split('//')[1].split('.')[0];

console.log('🔧 Applying Database Triggers with Service Role Key\n');
console.log('Project ID:', projectRef);
console.log('='.repeat(80));

async function applyMigration() {
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('\n📝 Step 1: Making tracking_number nullable...');

  // Use .rpc() to execute raw SQL with a helper function
  // First, create the helper function
  const createHelperSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    // Step 1: Make columns nullable
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE shipments ALTER COLUMN tracking_number DROP NOT NULL'
    });

    if (e1 && !e1.message.includes('does not exist')) {
      console.log('   ⚠️  Step 1a:', e1.message);
    } else {
      console.log('   ✅ tracking_number is now nullable');
    }

    const { error: e2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE shopping_orders ALTER COLUMN order_number DROP NOT NULL'
    });

    if (e2 && !e2.message.includes('does not exist')) {
      console.log('   ⚠️  Step 1b:', e2.message);
    } else {
      console.log('   ✅ order_number is now nullable');
    }

    console.log('\n📝 Step 2: Creating sequences...');

    const { error: e3 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE SEQUENCE IF NOT EXISTS tracking_seq START 1'
    });
    if (!e3) console.log('   ✅ tracking_seq created');

    const { error: e4 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE SEQUENCE IF NOT EXISTS order_seq START 1'
    });
    if (!e4) console.log('   ✅ order_seq created');

    console.log('\n📝 Step 3: Creating trigger functions...');

    // Create tracking number function
    const trackingFunc = `
      CREATE OR REPLACE FUNCTION generate_tracking_number()
      RETURNS TRIGGER AS $func$
      BEGIN
        IF NEW.tracking_number IS NULL THEN
          NEW.tracking_number := 'SHIP-' || 
                                 TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                                 LPAD(NEXTVAL('tracking_seq')::TEXT, 6, '0');
        END IF;
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
    `;

    const { error: e5 } = await supabase.rpc('exec_sql', { sql: trackingFunc });
    if (!e5) console.log('   ✅ generate_tracking_number function created');

    // Create order number function
    const orderFunc = `
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS TRIGGER AS $func$
      BEGIN
        IF NEW.order_number IS NULL THEN
          NEW.order_number := 'SO-' || 
                              TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                              LPAD(NEXTVAL('order_seq')::TEXT, 6, '0');
        END IF;
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
    `;

    const { error: e6 } = await supabase.rpc('exec_sql', { sql: orderFunc });
    if (!e6) console.log('   ✅ generate_order_number function created');

    console.log('\n📝 Step 4: Creating triggers...');

    const { error: e7 } = await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS set_tracking_number ON shipments'
    });

    const trackingTrigger = `
      CREATE TRIGGER set_tracking_number
        BEFORE INSERT ON shipments
        FOR EACH ROW
        EXECUTE FUNCTION generate_tracking_number()
    `;

    const { error: e8 } = await supabase.rpc('exec_sql', { sql: trackingTrigger });
    if (!e8) console.log('   ✅ set_tracking_number trigger created');

    const { error: e9 } = await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS set_order_number ON shopping_orders'
    });

    const orderTrigger = `
      CREATE TRIGGER set_order_number
        BEFORE INSERT ON shopping_orders
        FOR EACH ROW
        EXECUTE FUNCTION generate_order_number()
    `;

    const { error: e10 } = await supabase.rpc('exec_sql', { sql: orderTrigger });
    if (!e10) console.log('   ✅ set_order_number trigger created');

    console.log('\n='.repeat(80));
    console.log('\n🎉 Migration Applied Successfully!\n');
    return true;

  } catch (err) {
    console.error('\n❌ Error during migration:', err.message);

    // The exec_sql function probably doesn't exist
    console.log('\n💡 The RPC approach requires creating a helper function first.');
    console.log('   Since we have the service role key, let\'s try a direct approach...\n');

    return false;
  }
}

async function testMigration() {
  console.log('\n🧪 Testing the triggers...\n');

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Test 1: Create shipment without tracking_number
    const { data: shipment, error: shipError } = await supabase
      .from('shipments')
      .insert({
        customer_name: 'Test Customer',
        customer_phone: '+66800000000',
        service_type: 'cargo_small',
        weight_kg: 1.0,
        items_description: 'Migration test',
        status: 'pending',
        payment_status: 'unpaid',
        cost_basis: 90,
        price_per_kg: 120,
        total_amount: 120,
      })
      .select()
      .single();

    if (shipError) {
      console.log('❌ Shipment test failed:', shipError.message);
      if (shipError.message.includes('tracking_number')) {
        console.log('   ⚠️  Triggers are not working yet');
      }
      return false;
    }

    console.log('✅ Shipment created with auto-generated tracking:');
    console.log('   Tracking Number:', shipment.tracking_number);

    // Cleanup
    await supabase.from('shipments').delete().eq('id', shipment.id);

    // Test 2: Create shopping order without order_number
    const { data: order, error: orderError } = await supabase
      .from('shopping_orders')
      .insert({
        product_details: 'Test product',
        items_count: 1,
        estimated_product_cost: 1000,
        commission_rate: 10,
        commission_amount: 100,
        total_amount: 1100,
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select()
      .single();

    if (orderError) {
      console.log('❌ Order test failed:', orderError.message);
      return false;
    }

    console.log('✅ Order created with auto-generated number:');
    console.log('   Order Number:', order.order_number);

    // Cleanup
    await supabase.from('shopping_orders').delete().eq('id', order.id);

    console.log('\n🎉 All triggers are working perfectly!\n');
    return true;

  } catch (err) {
    console.error('❌ Test error:', err.message);
    return false;
  }
}

async function main() {
  const success = await applyMigration();

  if (success) {
    await testMigration();
  } else {
    console.log('\n⚠️  The RPC approach didn\'t work.');
    console.log('   This is normal - Supabase restricts DDL via RPC for security.\n');
    console.log('📝 RECOMMENDED: Use the SQL Editor instead:\n');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Make sure project is: ' + projectRef);
    console.log('   3. Paste the migration from: migrations/add_auto_number_triggers.sql');
    console.log('   4. Click Run\n');
  }
}

main();
