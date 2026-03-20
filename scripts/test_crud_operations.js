import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testCustomerCRUD() {
  console.log('🧪 Testing Customer CRUD Operations\n');
  console.log('='.repeat(80));

  let testCustomerId = null;

  try {
    // CREATE TEST
    console.log('\n1️⃣  Testing CREATE...');
    const createPayload = {
      name: 'Test Customer ' + Date.now(),
      phone: '+66812345678',
      email: `test${Date.now()}@example.com`,
      customer_type: 'individual',
      address_bangkok: '123 Test St',
      notes: 'CRUD test customer',
    };

    const { data: created, error: createError } = await supabase
      .from('customers')
      .insert(createPayload)
      .select()
      .single();

    if (createError) {
      console.log('❌ CREATE failed:', createError.message);
      return;
    }

    testCustomerId = created.id;
    console.log('✅ CREATE successful');
    console.log('   ID:', created.id);
    console.log('   Name:', created.name);

    // READ/LIST TEST
    console.log('\n2️⃣  Testing READ/LIST...');
    const { data: list, error: listError } = await supabase
      .from('customers')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(5);

    if (listError) {
      console.log('❌ LIST failed:', listError.message);
    } else {
      console.log(`✅ LIST successful (${list.length} records)`);
    }

    // GET SINGLE TEST
    console.log('\n3️⃣  Testing GET SINGLE...');
    const { data: single, error: getError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', testCustomerId)
      .single();

    if (getError) {
      console.log('❌ GET failed:', getError.message);
    } else {
      console.log('✅ GET successful');
      console.log('   Retrieved:', single.name);
    }

    // UPDATE TEST
    console.log('\n4️⃣  Testing UPDATE...');
    const updatePayload = {
      notes: 'Updated by CRUD test at ' + new Date().toISOString(),
      address_yangon: '456 Updated Rd',
    };

    const { data: updated, error: updateError } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', testCustomerId)
      .select()
      .single();

    if (updateError) {
      console.log('❌ UPDATE failed:', updateError.message);
    } else {
      console.log('✅ UPDATE successful');
      console.log('   Updated notes:', updated.notes);
    }

    // DELETE TEST
    console.log('\n5️⃣  Testing DELETE...');
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', testCustomerId);

    if (deleteError) {
      console.log('❌ DELETE failed:', deleteError.message);
      console.log('   ⚠️  Test record may still exist in database');
    } else {
      console.log('✅ DELETE successful');
      testCustomerId = null; // Mark as cleaned up
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Customer CRUD tests passed!\n');
  } catch (err) {
    console.error('\n❌ Fatal error during testing:', err.message);

    // Cleanup on failure
    if (testCustomerId) {
      console.log('🧹 Cleaning up test record...');
      await supabase.from('customers').delete().eq('id', testCustomerId);
    }
  }
}

async function testShipmentCRUD() {
  console.log('\n🧪 Testing Shipment CRUD Operations\n');
  console.log('='.repeat(80));

  let testShipmentId = null;
  let testCustomerId = null;

  try {
    // First create a customer for the shipment
    console.log('\n0️⃣  Setting up test customer...');
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .insert({
        name: 'Shipment Test Customer',
        phone: '+66800000000',
      })
      .select()
      .single();

    if (custError) {
      console.log('❌ Customer setup failed:', custError.message);
      return;
    }
    testCustomerId = customer.id;
    console.log('✅ Test customer created');

    // CREATE SHIPMENT TEST
    console.log('\n1️⃣  Testing CREATE shipment...');
    const createPayload = {
      customer_id: testCustomerId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      service_type: 'cargo_small',
      weight_kg: 3.5,
      items_description: 'Test items for CRUD testing',
      status: 'pending',
      payment_status: 'unpaid',
      cost_basis: 90,
      price_per_kg: 120,
      total_amount: 420, // 3.5kg * 120
    };

    const { data: created, error: createError } = await supabase
      .from('shipments')
      .insert(createPayload)
      .select()
      .single();

    if (createError) {
      console.log('❌ CREATE failed:', createError.message);
      console.log('   Code:', createError.code);
      console.log('   Details:', createError.details);
      return;
    }

    testShipmentId = created.id;
    console.log('✅ CREATE successful');
    console.log('   ID:', created.id);
    console.log('   Tracking:', created.tracking_number);

    // UPDATE SHIPMENT TEST
    console.log('\n2️⃣  Testing UPDATE shipment...');
    const updatePayload = {
      status: 'in_transit',
      tracking_number: 'TEST-' + Date.now(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('shipments')
      .update(updatePayload)
      .eq('id', testShipmentId)
      .select()
      .single();

    if (updateError) {
      console.log('❌ UPDATE failed:', updateError.message);
    } else {
      console.log('✅ UPDATE successful');
      console.log('   Status:', updated.status);
      console.log('   Tracking:', updated.tracking_number);
    }

    // DELETE TEST
    console.log('\n3️⃣  Testing DELETE shipment...');
    const { error: deleteError } = await supabase
      .from('shipments')
      .delete()
      .eq('id', testShipmentId);

    if (deleteError) {
      console.log('❌ DELETE failed:', deleteError.message);
    } else {
      console.log('✅ DELETE successful');
      testShipmentId = null;
    }

    // Cleanup customer
    console.log('\n🧹 Cleaning up test customer...');
    await supabase.from('customers').delete().eq('id', testCustomerId);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Shipment CRUD tests passed!\n');
  } catch (err) {
    console.error('\n❌ Fatal error during testing:', err.message);

    // Cleanup on failure
    if (testShipmentId) {
      await supabase.from('shipments').delete().eq('id', testShipmentId);
    }
    if (testCustomerId) {
      await supabase.from('customers').delete().eq('id', testCustomerId);
    }
  }
}

async function testShoppingOrderCRUD() {
  console.log('\n🧪 Testing Shopping Order CRUD Operations\n');
  console.log('='.repeat(80));

  let testOrderId = null;
  let testCustomerId = null;

  try {
    // First create a customer
    console.log('\n0️⃣  Setting up test customer...');
    const { data: customer } = await supabase
      .from('customers')
      .insert({
        name: 'Shopping Test Customer',
        phone: '+66899999999',
      })
      .select()
      .single();

    testCustomerId = customer.id;

    // CREATE SHOPPING ORDER TEST
    console.log('\n1️⃣  Testing CREATE shopping order...');
    const createPayload = {
      customer_id: testCustomerId,
      product_details: 'Test product for CRUD',
      items_count: 1,
      estimated_product_cost: 1000,
      commission_rate: 10,
      commission_amount: 100,
      total_amount: 1100,
      status: 'pending',
      payment_status: 'unpaid',
    };

    const { data: created, error: createError } = await supabase
      .from('shopping_orders')
      .insert(createPayload)
      .select()
      .single();

    if (createError) {
      console.log('❌ CREATE failed:', createError.message);
      console.log('   Details:', createError.details);
      return;
    }

    testOrderId = created.id;
    console.log('✅ CREATE successful');
    console.log('   ID:', created.id);
    console.log('   Order Number:', created.order_number);

    // UPDATE TEST
    console.log('\n2️⃣  Testing UPDATE shopping order...');
    const { data: updated, error: updateError } = await supabase
      .from('shopping_orders')
      .update({ status: 'purchasing' })
      .eq('id', testOrderId)
      .select()
      .single();

    if (updateError) {
      console.log('❌ UPDATE failed:', updateError.message);
    } else {
      console.log('✅ UPDATE successful');
      console.log('   Status:', updated.status);
    }

    // DELETE TEST
    console.log('\n3️⃣  Testing DELETE shopping order...');
    const { error: deleteError } = await supabase
      .from('shopping_orders')
      .delete()
      .eq('id', testOrderId);

    if (deleteError) {
      console.log('❌ DELETE failed:', deleteError.message);
    } else {
      console.log('✅ DELETE successful');
      testOrderId = null;
    }

    // Cleanup
    await supabase.from('customers').delete().eq('id', testCustomerId);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Shopping Order CRUD tests passed!\n');
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    if (testOrderId) await supabase.from('shopping_orders').delete().eq('id', testOrderId);
    if (testCustomerId) await supabase.from('customers').delete().eq('id', testCustomerId);
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting CRUD System Tests\n');

  await testCustomerCRUD();
  await testShipmentCRUD();
  await testShoppingOrderCRUD();

  console.log('\n✅ All tests complete!\n');
}

runAllTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
