import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
      });
    }
  } catch (e) {
    console.error(e);
  }
}
loadEnv();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  console.log('Testing Insert into customer_invoices...');

  // Get a customer ID
  const { data: customers } = await supabase.from('customers').select('id').limit(1);
  if (!customers || customers.length === 0) {
    console.log('No customers found to test insert.');
    return;
  }
  const customerId = customers[0].id;

  const { data, error } = await supabase
    .from('customer_invoices')
    .insert({
      invoice_number: 'TEST-INSERT-001',
      customer_id: customerId,
      status: 'draft',
      total_amount: 100,
      created_date: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.log('Insert Failed:', error.message);
  } else {
    console.log('Insert Success:', data);
    // Cleanup
    await supabase.from('customer_invoices').delete().eq('invoice_number', 'TEST-INSERT-001');
  }
}

checkColumns();
