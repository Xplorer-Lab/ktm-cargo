# Deployment Guide

## What this guide covers

This repo now deploys to **Vercel only** for preview and production. Supabase provides auth and data.

## Prerequisites

- Node.js 20+
- npm
- A Supabase project
- A Vercel project linked to this repository

## Runtime environment variables

Set these in Vercel and in any local `.env` file:

| Variable                 | Required | Purpose                  |
| ------------------------ | -------- | ------------------------ |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anon/public key |
| `VITE_SENTRY_DSN`        | No       | Frontend error tracking  |
| `VITE_LOGROCKET_APP_ID`  | No       | Session replay           |

If monetization is enabled, keep the Stripe values in Supabase Edge Function secrets only:

| Variable                | Required | Purpose                         |
| ----------------------- | -------- | ------------------------------- |
| `STRIPE_SECRET_KEY`     | No       | Stripe secret key               |
| `STRIPE_WEBHOOK_SECRET` | No       | Stripe webhook signature secret |

## GitHub Actions and Vercel secrets

For PR previews and production deploys through GitHub Actions, set:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Optional workflow secrets:

- `SLACK_WEBHOOK_URL`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## Deploy flow

1. Apply database migrations using [`migrations/README.md`](migrations/README.md).
2. Confirm the runtime env vars are present in Vercel.
3. Build locally:

```bash
npm ci
npm run build
```

4. Deploy through Vercel or by pushing to GitHub:
   - Pull requests create preview deployments.
   - `main` creates production deployments.

## Post-deploy checks

- App loads with Supabase credentials present
- Staff login loads from `/StaffLogin` and returns staff users to their requested module
- Staff routes load from `/Operations`
- Public brochure pages load from `/` and `/ClientPortal`
- Public feedback form loads from `/Feedback?shipment=<id>` without the app layout
- Typo redirects such as `/shipment` and `/operation` resolve to the canonical staff routes
- Preview and production URLs match the branch being deployed

## Rollback

- Vercel: redeploy a previous successful commit
- Supabase: apply a reverse migration only if you truly need to undo schema changes

## Related docs

- [`SYSTEM_SPEC.md`](SYSTEM_SPEC.md)
- [`migrations/README.md`](migrations/README.md)
- [`scripts/playwright/README.md`](scripts/playwright/README.md)
