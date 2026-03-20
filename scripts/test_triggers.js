import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

console.log('🧪 Testing Database Triggers\n');
console.log('Testing auto-generation of tracking_number and order_number\n');
console.log('='.repeat(80));

async function testTriggers() {
  let testShipmentId = null;
  let testOrderId = null;
  let testCustomerId = null;

  try {
    // Setup: Create test customer
    console.log('\n📝 Setting up test customer...');
    const { data: customer } = await supabase
      .from('customers')
      .insert({
        name: 'Trigger Test Customer',
        phone: '+66800000001',
      })
      .select()
      .single();

    testCustomerId = customer.id;
    console.log('✅ Test customer created:', customer.id);

    // TEST 1: Shipment with NULL tracking_number (should auto-generate)
    console.log('\n1️⃣  Testing shipment auto-generation...');
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        customer_id: testCustomerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        service_type: 'cargo_small',
        weight_kg: 5.0,
        items_description: 'Trigger test items',
        status: 'pending',
        payment_status: 'unpaid',
        cost_basis: 90,
        price_per_kg: 120,
        total_amount: 600,
        // tracking_number is intentionally omitted - should be auto-generated
      })
      .select()
      .single();

    if (shipmentError) {
      console.log('❌ FAILED:', shipmentError.message);
      console.log('   This means the trigger is NOT working yet.');
      console.log('   Please run the migration SQL first.');
    } else {
      testShipmentId = shipment.id;
      console.log('✅ SUCCESS! Shipment created with auto-generated tracking number:');
      console.log(`   Tracking Number: ${shipment.tracking_number}`);
      console.log(`   Expected Format: SHIP-YYYYMMDD-NNNNNN`);

      const isValidFormat = /^SHIP-\d{8}-\d{6}$/.test(shipment.tracking_number);
      if (isValidFormat) {
        console.log('   ✅ Format is correct!');
      } else {
        console.log('   ⚠️  Format looks unexpected');
      }
    }

    // TEST 2: Shopping order with NULL order_number (should auto-generate)
    console.log('\n2️⃣  Testing shopping order auto-generation...');
    const { data: order, error: orderError } = await supabase
      .from('shopping_orders')
      .insert({
        customer_id: testCustomerId,
        product_details: 'Trigger test product',
        items_count: 1,
        estimated_product_cost: 1000,
        commission_rate: 10,
        commission_amount: 100,
        total_amount: 1100,
        status: 'pending',
        payment_status: 'unpaid',
        // order_number is intentionally omitted - should be auto-generated
      })
      .select()
      .single();

    if (orderError) {
      console.log('❌ FAILED:', orderError.message);
      console.log('   This means the trigger is NOT working yet.');
      console.log('   Please run the migration SQL first.');
    } else {
      testOrderId = order.id;
      console.log('✅ SUCCESS! Order created with auto-generated order number:');
      console.log(`   Order Number: ${order.order_number}`);
      console.log(`   Expected Format: SO-YYYYMMDD-NNNNNN`);

      const isValidFormat = /^SO-\d{8}-\d{6}$/.test(order.order_number);
      if (isValidFormat) {
        console.log('   ✅ Format is correct!');
      } else {
        console.log('   ⚠️  Format looks unexpected');
      }
    }

    // TEST 3: Manual override (providing custom tracking number)
    console.log('\n3️⃣  Testing manual override (custom tracking number)...');
    const customTrackingNumber = 'CUSTOM-TEST-12345';
    const { data: customShipment, error: customError } = await supabase
      .from('shipments')
      .insert({
        customer_id: testCustomerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        tracking_number: customTrackingNumber, // Manually specified
        service_type: 'cargo_small',
        weight_kg: 3.0,
        items_description: 'Custom tracking test',
        status: 'pending',
        payment_status: 'unpaid',
        cost_basis: 90,
        price_per_kg: 120,
        total_amount: 360,
      })
      .select()
      .single();

    if (customError) {
      console.log('❌ FAILED:', customError.message);
    } else {
      console.log('✅ SUCCESS! Custom tracking number preserved:');
      console.log(`   Tracking Number: ${customShipment.tracking_number}`);
      if (customShipment.tracking_number === customTrackingNumber) {
        console.log('   ✅ Custom value was NOT overridden by trigger - Perfect!');
      } else {
        console.log('   ⚠️  Trigger overwrote the custom value - This should not happen');
      }

      // Clean up custom test shipment
      await supabase.from('shipments').delete().eq('id', customShipment.id);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 TRIGGER TESTS COMPLETE!\n');

    if (shipment?.tracking_number && order?.order_number) {
      console.log('✅ All triggers are working correctly!');
      console.log('\nGenerated Values:');
      console.log(`   - Shipment: ${shipment.tracking_number}`);
      console.log(`   - Order: ${order.order_number}`);
      console.log('\n✅ You can now create shipments and orders without providing these IDs!');
    } else {
      console.log('⚠️  Some triggers are not working yet.');
      console.log('   Please run the migration SQL in Supabase dashboard first.');
    }
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    if (testShipmentId) {
      await supabase.from('shipments').delete().eq('id', testShipmentId);
    }
    if (testOrderId) {
      await supabase.from('shopping_orders').delete().eq('id', testOrderId);
    }
    if (testCustomerId) {
      await supabase.from('customers').delete().eq('id', testCustomerId);
    }
    console.log('✅ Cleanup complete\n');
  }
}

testTriggers().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
