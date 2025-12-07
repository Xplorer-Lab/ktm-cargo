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

async function promoteToAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Please provide an email address.');
    console.log('Usage: node promote_to_admin.js <email>');
    process.exit(1);
  }

  console.log(`Promoting user ${email} to Admin...`);

  // 1. Find the user in profiles (if they have logged in)
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (findError || !profile) {
    console.error('User profile not found. Have they signed up and logged in yet?');
    console.error('Error:', findError?.message);
    return;
  }

  // 2. Update the role
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      role: 'admin',
      staff_role: 'managing_director', // Highest permission role
    })
    .eq('id', profile.id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update profile:', updateError.message);
  } else {
    console.log('✅ Success! User promoted to Admin (Managing Director).');
    console.log('Please log out and log back in to see the changes.');
  }
}

promoteToAdmin();
