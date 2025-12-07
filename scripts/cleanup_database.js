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

async function cleanup() {
  console.log('Dropping unused table: invoices...');

  // Note: Supabase JS client cannot drop tables directly via standard API unless using rpc or raw SQL if enabled.
  // However, we can try to use a raw query if we had a service role key or if RLS allows.
  // Since we only have ANON key, we might be restricted.
  // Actually, standard Supabase client doesn't support DDL.

  // Alternative: We can't drop the table from here with just the anon key usually.
  // But we can verify if we can access it.

  console.log('NOTE: The Supabase JS client with Anon Key cannot DROP tables.');
  console.log('I will instead rename the entity in the frontend code to avoid usage.');
  console.log('To actually drop the table, you must use the Supabase Dashboard SQL Editor.');
  console.log('Run this SQL in Supabase Dashboard:');
  console.log('DROP TABLE IF EXISTS invoices;');
}

cleanup();
