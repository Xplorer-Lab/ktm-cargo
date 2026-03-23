import { createClient } from '@supabase/supabase-js';

let supabase;

// E2E test mode: only available in non-production builds.
// __APP_IS_PROD__ is replaced at build time by Vite (vite.config.js define).
// In production builds this entire block is dead-code-eliminated by Rollup,
// so e2eSupabaseClient.js is not bundled in production.
if (!__APP_IS_PROD__) {
  const { createE2ESupabaseClient, getE2EFixtureFromLocation } =
    await import('./e2eSupabaseClient');
  const e2eFixture = getE2EFixtureFromLocation();
  if (e2eFixture) {
    supabase = createE2ESupabaseClient(e2eFixture);
  }
}

if (!supabase) {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase credentials. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }

  const isValidUrl = (s) => {
    try {
      const u = new URL(s);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  };

  if (!isValidUrl(supabaseUrl)) {
    throw new Error(
      'Invalid VITE_SUPABASE_URL: it must be a valid HTTP or HTTPS URL (e.g. https://xxxx.supabase.co). Check your .env and use the Project URL from Supabase Dashboard → Project Settings → API.'
    );
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
