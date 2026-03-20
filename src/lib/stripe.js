/**
 * Stripe Client Helpers — KTM Cargo Express
 *
 * Client-side utilities for Stripe integration.
 * Server-side operations (checkout creation, webhook verification) are handled
 * by Supabase Edge Functions (see supabase/functions/).
 *
 * Environment variables (all VITE_ prefixed for Vite):
 *   VITE_STRIPE_PUBLISHABLE_KEY — Stripe publishable key (pk_live_… or pk_test_…)
 *
 * The Stripe **secret key** must NEVER be in the frontend.
 * It lives in Supabase Edge Function secrets only.
 */

import { supabase } from '@/api/supabaseClient';

const STRIPE_PK = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();

/** Lazy-load Stripe.js only when needed (saves bundle size) */
let stripePromise = null;
export function getStripe() {
  if (!stripePromise && STRIPE_PK) {
    stripePromise = import('@stripe/stripe-js').then((m) => m.loadStripe(STRIPE_PK));
  }
  return stripePromise;
}

/**
 * Create a Stripe Checkout session via Supabase Edge Function,
 * then redirect the user to Stripe's hosted checkout page.
 *
 * @param {string} priceId — Stripe Price ID (e.g. price_pro_monthly)
 * @param {string} [successUrl] — redirect after successful payment
 * @param {string} [cancelUrl] — redirect if user cancels
 * @returns {Promise<void>}
 */
export async function redirectToCheckout(priceId, successUrl, cancelUrl) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be logged in to subscribe.');

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      priceId,
      successUrl: successUrl || `${window.location.origin}/settings?tab=billing&status=success`,
      cancelUrl: cancelUrl || `${window.location.origin}/settings?tab=billing&status=cancelled`,
    },
  });

  if (error) throw new Error(error.message || 'Failed to create checkout session');
  if (!data?.url) throw new Error('No checkout URL returned');

  window.location.href = data.url;
}

/**
 * Open the Stripe Customer Portal (manage subscription, payment methods, invoices).
 *
 * @returns {Promise<void>}
 */
export async function redirectToCustomerPortal() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be logged in to manage your subscription.');

  const { data, error } = await supabase.functions.invoke('create-portal', {
    body: {
      returnUrl: `${window.location.origin}/settings?tab=billing`,
    },
  });

  if (error) throw new Error(error.message || 'Failed to open customer portal');
  if (!data?.url) throw new Error('No portal URL returned');

  window.location.href = data.url;
}

/**
 * Fetch the current user's subscription status from the profiles table.
 * This is the client-side read; the authoritative write happens in the webhook.
 *
 * @returns {Promise<{ tier: string, status: string, currentPeriodEnd: string|null }>}
 */
export async function getSubscriptionStatus() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { tier: 'free', status: 'none', currentPeriodEnd: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, subscription_current_period_end')
    .eq('id', user.id)
    .single();

  return {
    tier: profile?.subscription_tier || 'free',
    status: profile?.subscription_status || 'none',
    currentPeriodEnd: profile?.subscription_current_period_end || null,
  };
}
