import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Diagnosing Database Schema Issue\n');
console.log('='.repeat(80));

async function diagnoseSchema() {
    try {
        // Test 1: Can we access shipments table?
        console.log('\n1️⃣  Testing access to shipments table...');
        const { data: shipments, error: shipError } = await supabase
            .from('shipments')
            .select('id, tracking_number')
            .limit(1);

        if (shipError) {
            console.log('❌ Cannot access shipments table');
            console.log('   Error:', shipError.message);
            console.log('   Code:', shipError.code);
        } else {
            console.log('✅ Can access shipments table');
            console.log('   Found', shipments?.length || 0, 'records');
            if (shipments && shipments.length > 0) {
                console.log('   Sample:', JSON.stringify(shipments[0], null, 2));
            }
        }

        // Test 2: Can we access shopping_orders table?
        console.log('\n2️⃣  Testing access to shopping_orders table...');
        const { data: orders, error: orderError } = await supabase
            .from('shopping_orders')
            .select('id, order_number')
            .limit(1);

        if (orderError) {
            console.log('❌ Cannot access shopping_orders table');
            console.log('   Error:', orderError.message);
        } else {
            console.log('✅ Can access shopping_orders table');
            console.log('   Found', orders?.length || 0, 'records');
        }

        // Test 3: Try to get schema information
        console.log('\n3️⃣  Checking database connection...');
        const { data: testData, error: testError } = await supabase
            .from('customers')
            .select('count')
            .limit(1);

        if (testError) {
            console.log('❌ Database connection issue');
            console.log('   Error:', testError.message);
        } else {
            console.log('✅ Database connection working');
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n💡 DIAGNOSIS:\n');

        if (!shipError && !orderError) {
            console.log('✅ Tables exist and are accessible via Supabase client');
            console.log('\n🔍 The issue is likely one of these:\n');
            console.log('1. **Wrong Database**: You might be running the SQL in a different Supabase project');
            console.log('2. **Schema Context**: The SQL Editor might be using a different schema');
            console.log('3. **Permissions**: The postgres user in SQL Editor has different view than app user');
            console.log('\n📝 SOLUTION:\n');
            console.log('Try adding schema prefix to the SQL:');
            console.log('   ALTER TABLE public.shipments ...');
            console.log('   ALTER TABLE public.shopping_orders ...');
            console.log('\nOR\n');
            console.log('Check which project you\'re in on Supabase dashboard!');
        } else {
            console.log('⚠️  Tables are not accessible even via app client');
            console.log('This suggests a bigger configuration issue.');
        }

        // Additional diagnostic: Check env variables
        console.log('\n4️⃣  Environment Configuration...');
        console.log('   Supabase URL:', process.env.VITE_SUPABASE_URL);
        console.log('   Project ID:', process.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]);
        console.log('\n   ⚠️  Make sure the SQL Editor is open for THIS project!\n');

    } catch (err) {
        console.error('\n❌ Fatal error:', err.message);
    }
}

diagnoseSchema();
