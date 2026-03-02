/**
 * Subscription Tier Definitions — KTM Cargo Express
 *
 * Single source of truth for Free / Pro / Enterprise limits.
 * Both client-side UI and backend enforcement read from here.
 *
 * Runtime cascade:
 *   1. profiles.subscription_status (from Stripe webhook)
 *   2. These constants define what each tier can do
 */

export const TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    stripePriceId: null, // no Stripe price — default tier
    trial: false,
    limits: {
      shipmentsPerMonth: 10,
      shoppingOrdersPerMonth: 5,
      invoicesPerMonth: 10,
      customersMax: 20,
      vendorsMax: 5,
      staffUsersMax: 1,
      reportsEnabled: false,
      bulkExport: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29, // USD
    stripePriceId: 'price_pro_monthly', // replace with real Stripe Price ID
    trial: true,
    trialDays: 14,
    limits: {
      shipmentsPerMonth: 500,
      shoppingOrdersPerMonth: 200,
      invoicesPerMonth: 500,
      customersMax: 1000,
      vendorsMax: 50,
      staffUsersMax: 10,
      reportsEnabled: true,
      bulkExport: true,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 99, // USD — or custom
    stripePriceId: 'price_enterprise_monthly', // replace with real Stripe Price ID
    trial: true,
    trialDays: 14,
    limits: {
      shipmentsPerMonth: Infinity,
      shoppingOrdersPerMonth: Infinity,
      invoicesPerMonth: Infinity,
      customersMax: Infinity,
      vendorsMax: Infinity,
      staffUsersMax: Infinity,
      reportsEnabled: true,
      bulkExport: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

/** Ordered list for UI display */
export const TIER_LIST = [TIERS.free, TIERS.pro, TIERS.enterprise];

/**
 * Resolve the tier object for a given subscription status string.
 * Defaults to 'free' for unknown / missing / cancelled / expired statuses.
 *
 * @param {string|null|undefined} status — e.g. 'pro', 'enterprise', 'trialing', 'free'
 * @param {string|null|undefined} tierOverride — explicit tier stored on profile
 * @returns {typeof TIERS.free}
 */
export function resolveTier(status, tierOverride) {
  // If the subscription is active or trialing, use the stored tier
  const activeLike = ['active', 'trialing'];
  const safeOverride =
    tierOverride && Object.prototype.hasOwnProperty.call(TIERS, tierOverride)
      ? tierOverride
      : 'pro';

  if (activeLike.includes(status)) {
    return TIERS[safeOverride];
  }
  // Past due: still allow access but flag it
  if (status === 'past_due') {
    return TIERS[safeOverride];
  }
  // Everything else: free
  return TIERS.free;
}

/**
 * Check whether a tier allows a specific feature / has capacity.
 *
 * @param {typeof TIERS.free} tier
 * @param {keyof typeof TIERS.free.limits} limitKey
 * @param {number} [currentUsage=0] — current count (for numeric limits)
 * @returns {{ allowed: boolean, remaining: number|boolean, limit: number|boolean }}
 */
export function checkLimit(tier, limitKey, currentUsage = 0) {
  if (!tier || !tier.limits || !Object.prototype.hasOwnProperty.call(tier.limits, limitKey)) {
    return { allowed: false, remaining: 0, limit: 0 };
  }
  const limit = tier.limits[limitKey];
  if (typeof limit === 'boolean') {
    return { allowed: limit, remaining: limit, limit };
  }
  const remaining = Math.max(0, limit - currentUsage);
  return { allowed: remaining > 0, remaining, limit };
}

/**
 * Human-readable feature matrix (for docs / pricing page).
 */
export const FEATURE_MATRIX = [
  { feature: 'Shipments / month', free: '10', pro: '500', enterprise: 'Unlimited' },
  { feature: 'Shopping orders / month', free: '5', pro: '200', enterprise: 'Unlimited' },
  { feature: 'Invoices / month', free: '10', pro: '500', enterprise: 'Unlimited' },
  { feature: 'Customers', free: '20', pro: '1,000', enterprise: 'Unlimited' },
  { feature: 'Vendors', free: '5', pro: '50', enterprise: 'Unlimited' },
  { feature: 'Staff users', free: '1', pro: '10', enterprise: 'Unlimited' },
  { feature: 'Reports & analytics', free: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Bulk export', free: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Custom branding', free: '—', pro: '✓', enterprise: '✓' },
  { feature: 'API access', free: '—', pro: '—', enterprise: '✓' },
  { feature: 'Priority support', free: '—', pro: '—', enterprise: '✓' },
  { feature: 'Price', free: 'Free', pro: '$29/mo', enterprise: '$99/mo' },
];
