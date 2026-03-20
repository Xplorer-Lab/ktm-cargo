# Deployment Guide — KTM Cargo Express

## Prerequisites

- Node.js 20+
- npm
- Supabase project (with database, auth, and optionally Edge Functions)
- Hosting platform (Vercel, Netlify, Fly.io, or static hosting)

## Required Secrets / Environment Variables

| Variable                      | Where                          | Description                                                |
| ----------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `VITE_SUPABASE_URL`           | Frontend build                 | Supabase project URL                                       |
| `VITE_SUPABASE_ANON_KEY`      | Frontend build                 | Supabase anon/publishable key (browser-safe)               |
| `VITE_SENTRY_DSN`             | Frontend build                 | Sentry DSN for error tracking (optional)                   |
| `VITE_LOGROCKET_APP_ID`       | Frontend build                 | LogRocket app ID (optional)                                |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend build                 | Stripe publishable key `pk_live_…` (optional, for billing) |
| `STRIPE_SECRET_KEY`           | Supabase Edge Function secrets | Stripe secret key `sk_live_…` — **never in frontend**      |
| `STRIPE_WEBHOOK_SECRET`       | Supabase Edge Function secrets | Stripe webhook signing secret `whsec_…`                    |
| `SUPABASE_SERVICE_ROLE_KEY`   | Migration scripts only         | For running migrations programmatically                    |

> **Security:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`
> must **never** appear in the frontend build or in the repository.

## Step-by-step Deployment

### 1. Apply database migrations

Follow the ordered runbook in [`migrations/README.md`](migrations/README.md).
At minimum, apply the **Phase 3 (P0)** security migrations, including
`add_portal_auth_identity_links.sql` and `add_client_portal_rls.sql` for
customer/vendor portal access.

Verify with:

```bash
node scripts/verify_p0_migrations.mjs
```

If monetization is enabled, also apply:

```bash
# In Supabase SQL Editor:
migrations/add_subscription_fields.sql
```

### 2. Deploy Supabase Edge Functions (if using Stripe)

```bash
# Install Supabase CLI if not already
npm i -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_…
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…

# Deploy functions
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy stripe-webhook
```

Then configure Stripe to send webhooks to:

```
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

Events to enable:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 3. Build the frontend

```bash
npm ci
npm run build
```

The output is in `dist/` — a static SPA.

### 4. Deploy to hosting

**Vercel (recommended):**

```bash
npx vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard. Set the env vars above in
Vercel → Settings → Environment Variables.

**Netlify:**

```bash
npx netlify deploy --prod --dir=dist
```

**Static hosting / Docker:**

Serve the `dist/` folder with any HTTP server. For SPA routing, configure
all paths to fall back to `index.html`.

### 5. Post-deploy verification

1. Open the app and confirm Supabase connection works (login screen loads)
2. Sign in and verify profile creation (auth self-heal)
3. Check Sentry for any errors
4. If Stripe is enabled: test a checkout flow with Stripe test mode

## CI / CD

GitHub Actions workflows are in `.github/workflows/`:

| Workflow       | Trigger                   | What it does                                      |
| -------------- | ------------------------- | ------------------------------------------------- |
| `ci.yml`       | Push & PR to main/develop | Lint, test, build, security scan, bundle analysis |
| `pr-check.yml` | PR opened/updated         | PR size labels, commit lint, build preview        |
| `deploy.yml`   | (configure as needed)     | Production deployment                             |
| `release.yml`  | (configure as needed)     | Release automation                                |

All workflows require these GitHub Secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `CODECOV_TOKEN` (optional, for coverage)
- `SNYK_TOKEN` (optional, for security scan)
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (optional, for preview deploys)

## Rollback

1. Vercel/Netlify: Redeploy a previous commit from the dashboard
2. Database: Migrations are additive (no destructive changes); to undo, write a reverse migration
3. Edge Functions: `supabase functions deploy <name>` with the previous version

## Monitoring

- **Sentry** — Error tracking and performance (configured via `VITE_SENTRY_DSN`)
- **LogRocket** — Session replay (configured via `VITE_LOGROCKET_APP_ID`)
- **Supabase Dashboard** — Database, auth, and edge function logs
- **Stripe Dashboard** — Payment and webhook event logs
