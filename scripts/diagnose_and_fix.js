import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const connectionString =
  'postgresql://postgres.jweovmefiiekvcvhyayb:oDJnpzGgSFzmVhr7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const artifactsDir =
  '/Users/ktythaung/.gemini/antigravity/brain/0428c1e4-b2e8-4dbf-b10e-ad655d7b6cc7';

async function tableExists(tableName) {
  const res = await client.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
    [tableName]
  );
  return res.rows[0].exists;
}

async function columnExists(tableName, columnName) {
  const res = await client.query(
    "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2)",
    [tableName, columnName]
  );
  return res.rows[0].exists;
}

async function runFile(filename) {
  const filePath = path.join(artifactsDir, filename);
  if (fs.existsSync(filePath)) {
    console.log(`Running ${filename}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log(`Successfully ran ${filename}`);
    } catch (e) {
      console.error(`Error running ${filename}:`, e.message);
    }
  } else {
    console.error(`File not found: ${filePath}`);
  }
}

async function run() {
  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Check Core Schema (Shipments)
    if (!(await tableExists('shipments'))) {
      console.log('Table "shipments" missing. Running Schema Part 1...');
      await runFile('supabase_schema.sql');
    } else {
      console.log('Table "shipments" exists.');
    }

    // 2. Check Part 2 Schema (Notifications)
    if (!(await tableExists('notifications'))) {
      console.log('Table "notifications" missing. Running Schema Part 2...');
      await runFile('supabase_schema_part2.sql');
    } else {
      console.log('Table "notifications" exists.');
    }

    // 3. Check Column Fix (created_at vs created_date)
    // We check 'shipments' table for 'created_at'. If it exists, we need to rename.
    if (await columnExists('shipments', 'created_at')) {
      console.log('Column "created_at" found in shipments. Running Fix Columns script...');
      await runFile('supabase_fix_columns.sql');
    } else if (await columnExists('shipments', 'created_date')) {
      console.log('Column "created_date" already exists in shipments. Fix likely applied.');
    } else {
      console.log('Neither created_at nor created_date found in shipments? Odd.');
    }

    // 4. Check Seed Data
    // Check if we have any customers
    const res = await client.query('SELECT COUNT(*) FROM customers');
    const count = parseInt(res.rows[0].count);
    if (count === 0) {
      console.log('No customers found. Running Seed script...');
      await runFile('supabase_seed.sql');
    } else {
      console.log(`Found ${count} customers. Skipping seed.`);
    }

    console.log('Diagnosis and repair complete.');
  } catch (err) {
    console.error('Script failed:', err);
  } finally {
    await client.end();
  }
}

run();
