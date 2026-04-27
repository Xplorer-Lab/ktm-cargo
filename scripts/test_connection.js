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
  } catch (_e) {
    console.error(_e);
  }
}
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to Supabase...');
console.log(`URL: ${supabaseUrl ? 'PRESENT (redacted)' : 'MISSING'}`);
console.log(`Key: ${supabaseKey ? 'PRESENT (redacted)' : 'MISSING'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const start = Date.now();
  // Try to fetch 1 row from a public table that we know exists (e.g. customers or vendors)
  const { data, error } = await supabase
    .from('customers')
    .select('count', { count: 'exact', head: true });
  const duration = Date.now() - start;

  if (error) {
    console.error('❌ Connection Failed:', error.message);
    if (error.code === 'PGRST301') {
      console.error(
        '   (Hint: This might be a Row Level Security (RLS) issue if the table is private, but connection itself reached the server.)'
      );
    }
    process.exitCode = 1;
  } else {
    console.log(`✅ Connection Successful! (Latency: ${duration}ms)`);
    console.log(
      `   Accessed 'customers' table. Row count: ${data === null ? 'Available (Head Request)' : 'Available'}`
    );
  }
}

testConnection();
