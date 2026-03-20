/**
 * Supabase Edge Function: stripe-webhook
 *
 * Receives Stripe webhook events, verifies the signature, and updates
 * the user's subscription state in the profiles table.
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY      — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET  — Webhook endpoint signing secret (whsec_…)
 *
 * Handled events:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 *
 * Idempotency: Each event is identified by its event.id; we use upsert
 * semantics on the subscription fields so replayed events are harmless.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

serve(async (req: Request) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeKey || !webhookSecret) {
      throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });

    // ── Signature verification ──────────────────────────────────────────
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // ── Supabase client (service_role for writing subscription data) ────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing Stripe event: ${event.type} (${event.id})`);

    // ── Event handlers ──────────────────────────────────────────────────
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          // Fetch the subscription to get tier details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await updateSubscription(supabase, userId, subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await updateSubscription(supabase, userId, subscription);
        } else {
          // Fallback: find user by stripe_customer_id
          await updateSubscriptionByCustomerId(supabase, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              subscription_tier: 'free',
              subscription_current_period_end: null,
            })
            .eq('id', userId);
        } else {
          const customerId = subscription.customer as string;
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              subscription_tier: 'free',
              subscription_current_period_end: null,
            })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = subscription.metadata?.supabase_user_id;
          if (userId) {
            await updateSubscription(supabase, userId, subscription);
          } else {
            await updateSubscriptionByCustomerId(supabase, subscription);
          }
        } else if (invoice.customer) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
            })
            .eq('stripe_customer_id', invoice.customer as string);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────

/** Map a Stripe Price ID to our tier name. */
function priceIdToTier(priceId: string): string {
  // Replace these with your actual Stripe Price IDs
  const map: Record<string, string> = {
    price_pro_monthly: 'pro',
    price_enterprise_monthly: 'enterprise',
  };
  return map[priceId] || 'pro';
}

/** Update subscription fields on the profile by user ID. */
async function updateSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price?.id || '';
  const tier = priceIdToTier(priceId);

  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status, // active, trialing, past_due, etc.
      subscription_tier: tier,
      subscription_stripe_id: subscription.id,
      subscription_current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('id', userId);
}

/** Fallback: find user by stripe_customer_id and update. */
async function updateSubscriptionByCustomerId(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price?.id || '';
  const tier = priceIdToTier(priceId);

  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_tier: tier,
      subscription_stripe_id: subscription.id,
      subscription_current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}
