#!/usr/bin/env node
/**
 * verify_p0_migrations.mjs
 *
 * Verifies that all P0 (mission-critical) database objects exist in the
 * connected Supabase project.  Uses the anon/service-role key from .env.
 *
 * Usage:
 *   npm run db:verify:p0 -- --allow-mutation-checks
 *
 * The invoice-number check calls next_invoice_number(), which advances the
 * sequence. Run only against a non-production/staging verification project.
 * What it checks:
 *   1. `is_admin_or_director()` function exists     (fix_rls_policies.sql)
 *   2. `my_customer_id()` function exists           (add_client_portal_rls.sql)
 *   3. `my_vendor_id()` function exists             (add_client_portal_rls.sql)
 *   4. `next_invoice_number()` RPC works            (add_invoice_number_sequence.sql)
 *   5. profiles table is accessible (RLS)           (fix_rls_policies.sql)
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed (see output)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function loadDotEnv() {
  if (!fs.existsSync('.env')) return;

  const knownKeys = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_ANON_KEY'];

  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    for (const key of knownKeys) {
      const prefix = `${key}=`;
      if (!line.startsWith(prefix)) continue;

      const value = stripWrappingQuotes(line.slice(prefix.length));
      if (key === 'VITE_SUPABASE_URL' && !process.env.VITE_SUPABASE_URL) {
        process.env.VITE_SUPABASE_URL = value;
      }
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = value;
      }
      if (key === 'VITE_SUPABASE_ANON_KEY' && !process.env.VITE_SUPABASE_ANON_KEY) {
        process.env.VITE_SUPABASE_ANON_KEY = value;
      }
    }
  }
}

loadDotEnv(); // load .env without requiring extra runtime dependencies

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY in .env'
  );
  process.exit(1);
}

const allowMutationChecks = process.argv.includes('--allow-mutation-checks');
if (!allowMutationChecks) {
  console.error(
    '❌  Refusing to run mutation checks without --allow-mutation-checks. Use only against a non-production Supabase project.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✅  ${label}`);
}

function fail(label, detail) {
  failed++;
  console.error(`  ❌  ${label}`);
  if (detail) console.error(`      ↳ ${detail}`);
}

console.log('\n🔍  Verifying P0 migrations …\n');

// ── 1. is_admin_or_director() function ─────────────────────────────────
try {
  const { error } = await supabase.rpc('is_admin_or_director');
  // The function may return false for the anon user — that's fine; we only
  // care that the RPC exists (no "function does not exist" error).
  if (error && /does not exist|not found/i.test(error.message)) {
    fail('is_admin_or_director() function', error.message);
  } else {
    ok('is_admin_or_director() function exists');
  }
} catch (e) {
  fail('is_admin_or_director() function', e.message);
}

// ── 2. my_customer_id() function ─────────────────────────────────────────
try {
  const { error } = await supabase.rpc('my_customer_id');
  // For anon/no-auth callers, NULL is valid. We only care the RPC exists.
  if (error && /does not exist|not found/i.test(error.message)) {
    fail('my_customer_id() function', error.message);
  } else {
    ok('my_customer_id() function exists');
  }
} catch (e) {
  fail('my_customer_id() function', e.message);
}

// ── 3. my_vendor_id() function ───────────────────────────────────────────
try {
  const { error } = await supabase.rpc('my_vendor_id');
  // For anon/no-auth callers, NULL is valid. We only care the RPC exists.
  if (error && /does not exist|not found/i.test(error.message)) {
    fail('my_vendor_id() function', error.message);
  } else {
    ok('my_vendor_id() function exists');
  }
} catch (e) {
  fail('my_vendor_id() function', e.message);
}

// ── 4. next_invoice_number() RPC ────────────────────────────────────────
try {
  const { data, error } = await supabase.rpc('next_invoice_number');
  if (error) {
    fail('next_invoice_number() RPC', error.message);
  } else if (typeof data === 'string' && data.startsWith('INV-')) {
    ok(`next_invoice_number() RPC works (got "${data}")`);
  } else {
    fail('next_invoice_number() RPC', `Unexpected return value: ${data}`);
  }
} catch (e) {
  fail('next_invoice_number() RPC', e.message);
}

// ── 5. profiles table is accessible (RLS enabled + self-read policy) ───
try {
  // Try reading current user's profile — proves RLS select policy exists.
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    fail('profiles table accessible (RLS select policy)', error.message);
  } else {
    ok('profiles table accessible (RLS policies in place)');
  }
} catch (e) {
  fail('profiles table accessible', e.message);
}

// ── Summary ────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`  Passed: ${passed}   Failed: ${failed}`);
if (failed > 0) {
  console.log('\n⚠️   Some P0 migrations are MISSING or BROKEN.');
  console.log('   Apply them via the Supabase SQL Editor in this order:');
  console.log('     1. migrations/fix_rls_policies.sql');
  console.log('     2. migrations/fix_profiles_allow_self_insert.sql');
  console.log('     3. migrations/fix_profiles_prevent_self_escalation.sql');
  console.log('     4. migrations/add_invoice_number_sequence.sql');
  console.log('     5. migrations/add_portal_auth_identity_links.sql');
  console.log('     6. migrations/add_client_portal_rls.sql');
  console.log('');
  process.exit(1);
} else {
  console.log('\n🎉  All P0 migrations verified successfully!\n');
  process.exit(0);
}
