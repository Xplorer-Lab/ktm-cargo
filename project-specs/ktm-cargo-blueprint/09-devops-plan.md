# 09 — DevOps Plan
**KTM Cargo Express** | React 19 + Vite 6 + Supabase + TanStack Query + Vercel
**Audience:** Small team (minimal DevOps bandwidth) · **Goal:** Automate everything, minimize manual steps

---

## 1. Vercel Setup

### Project Configuration
The project is already connected to Vercel. Verify via:
```bash
npm i -g vercel
cd ~/Desktop/Projects/ktm-cargo
vercel link
vercel project ls
```

If reconnecting needed, import from GitHub: `vercel.com/new` → import `ktm-cargo`.

### Framework Preset
Vercel auto-detects Vite. Confirm settings:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm ci`
- **Node.js Version:** 20 (set in `vercel.json` or `.nvmrc`)

```json
// vercel.json — add to project root
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "nodeVersion": "20"
}
```

### Environment Groups (Preview vs Production)
Vercel's Environment Groups eliminate per-branch manual config. Define three groups in the Vercel dashboard → Settings → Environment:

| Group | Variables | Applies To |
|---|---|---|
| `Production` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_APP_URL` | Production deployment |
| `Preview` | Same keys, point to staging Supabase project | All preview deployments |
| `Development` | Dev/local values | Local dev only (not deployed) |

Also set **Environment Variables** directly on the project (these cascade to all environments unless overridden by a group):
- `NODE_VERSION = 20`
- `ENABLE_PREVIEW_CHECKS = true` (blocks deploy on type errors in preview)

### Alias Strategy
- **Production alias:** The production deployment auto-gets `ktm-cargo-express.vercel.app`. Add a custom domain in Settings → Domains (e.g. `app.ktmcargo.com`). Point DNS A/CNAME to Vercel.
- **Preview aliases:** Each PR/branch gets `ktm-cargo-git-branch-name.vercel.app`. No extra config needed — Vercel handles this automatically.
- **Branch-to-URL mapping:** GitHub PR comments auto-post the preview URL via the [Vercel GitHub Integration](https://vercel.com/docs/concepts/git/vercel-for-github). Install it if not already: Vercel dashboard → Settings → Git → Connected GitHub Account → select repos.

---

## 2. CI/CD Pipeline

### Current State
The repo already has 4 GitHub Actions workflows: `ci.yml`, `pr-check.yml`, `deploy.yml`, `release.yml`. The `ci.yml` covers lint, test, build, security, and bundle analysis. We build on that foundation.

### Recommended: Vercel Native + GitHub Actions Hybrid

**Why hybrid:** Vercel's native CI is zero-config for preview deploys (push → preview auto-deploys). GitHub Actions is better for `main` branch production gate (requires all CI jobs green before deploy). Use both.

#### Stage 1 — GitHub Actions: Pull Request Gate (all PRs → `main`)
`.github/workflows/pr-check.yml` (existing or new):
```yaml
# Runs on every PR against main
name: PR Check
on:
  pull_request:
    branches: [main]

concurrency:
  group: pr-check-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage --passWithNoTests
        env: { CI: true }
      - uses: codecov/codecov-action@v5
        with: { token: ${{ secrets.CODECOV_TOKEN }}, fail_ci_if_error: false }

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}
      - uses: actions/upload-artifact@v7
        with: { name: build-dist, path: dist/, retention-days: 1 }
```

**Merge gate:** Set branch protection on `main`:
- Require 1 approving review
- Require status checks to pass: `lint-and-typecheck`, `test`, `build`
- Do NOT require Vercel deployment for PRs (saves resources)

#### Stage 2 — Vercel Native: Preview Deploy
- Every push to any non-`main` branch auto-triggers a Vercel preview deployment.
- Uses the `Preview` environment group variables.
- Preview URL posted automatically to the GitHub PR conversation.

#### Stage 3 — GitHub Actions: Production Deploy (main branch)
`.github/workflows/deploy.yml` (extends existing):
```yaml
name: Deploy Production
on:
  push:
    branches: [main]

concurrency:
  group: production-deploy
  cancel-in-progress: false  # never cancel a prod deploy

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production  # requires manual approval in GitHub env if configured
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./

      - name: Wait for deployment ready
        run: sleep 10

      - name: Smoke test
        run: |
          curl -sf https://${{ vars.PRODUCTION_DOMAIN }}/api/health \
            || curl -sf https://ktm-cargo-express.vercel.app/ \
            || exit 1
```

> **Note:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` are added to GitHub Secrets. Generate tokens at vercel.com → Settings → Tokens.

### Pipeline Summary

| Trigger | What Runs | Where Deploys |
|---|---|---|
| PR against `main` | lint → typecheck → test → build | No deploy (merge gate only) |
| Any other branch push | Vercel native CI | Preview URL |
| `main` push (after merge gate) | Full CI + production deploy | Production |

---

## 3. Branch Strategy

### Recommendation: Trunk-Based Development

For a small team, **trunk-based development** is the right call. Git flow adds overhead you don't need yet.

**Rules:**
1. `main` is always deployable.
2. Feature branches are short-lived (< 2 days). Branch off `main`, merge back via PR.
3. No long-lived `develop` or `staging` branches — use preview environments instead.
4. Hotfixes: branch off `main`, fix, PR back. No special branch.
5. Delete feature branches after merge.

```
main ─────────────────────────────────────────────────── (always live)
       └─ feat/tracking-page ─┐
       └─ feat/notifications ─┤  (short-lived, auto-merge after PR)
       └─ fix/login-bug ─────┘
```

### Release Cadence
- **Continuous delivery:** Merge to `main` → auto-deploys to production (after the `deploy.yml` gate passes).
- **Weekly releases:** If you want a deliberate release cadence, tag releases on `main`:
  ```bash
  git tag v1.2.0 && git push origin v1.2.0
  ```
  Vercel deploys the tagged commit, not the head.
- **Version in app:** Add `VITE_APP_VERSION` at build time via GitHub Actions:
  ```yaml
  - run: echo "VITE_APP_VERSION=${{ github.sha }}" >> $GITHUB_ENV
  ```
  This embeds the commit SHA into the built app for easy debugging.

---

## 4. Environment Management

### Dev / Staging / Production Parity
Keep three Supabase projects (not just one):
- **Development** (`supabase/dev`) — local dev uses this via `.env.local`
- **Staging/Preview** (`supabase/staging`) — linked to Vercel Preview environment group
- **Production** (`supabase/prod`) — linked to Vercel Production environment group

`.env.local` (never committed):
```
VITE_SUPABASE_URL=https://yourproject-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...
VITE_APP_URL=http://localhost:5173
```

**Critical:** `VITE_` prefix is required for Vite to expose variables client-side. The Supabase anon key is safe to expose in client-side code (RLS enforces row-level security server-side).

### Secrets Management
All secrets stored in two places, never in code:

| Tool | What | Where |
|---|---|---|
| Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_APP_URL`, `NODE_VERSION` | Vercel Dashboard → Settings → Environment Variables. Grouped by Preview/Production. |
| GitHub Secrets | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `CODECOV_TOKEN`, `SNYK_TOKEN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | GitHub → Repo → Settings → Secrets and Variables → Actions |

**Rotation rule:** Rotate `VERCEL_TOKEN` every 90 days. The others rotate only on suspected compromise.

---

## 5. Database Migrations

### Migration File Location
Supabase migrations live in `supabase/migrations/`. The existing `migrations/` folder in the project should contain SQL files. Verify with:
```bash
ls ~/Desktop/Projects/ktm-cargo/supabase/migrations/
```

### Safe Migration Process

Migrations run against Supabase via the Supabase CLI. **Never run migrations directly on the production database by hand.**

#### Step 1 — Local Development
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref  # staging first
supabase db push  # applies pending migrations locally
```

#### Step 2 — Staging First
All migrations are first applied to the **staging Supabase project** before production. The CI pipeline should verify the migration works:

```yaml
# .github/workflows/migrate.yml
name: Database Migration
on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']

jobs:
  migrate-staging:
    name: Apply Migrations to Staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase-full-action@v1
        with:
          supabase-token: ${{ secrets.SUPABASE_TOKEN }}
          project-ref: ${{ vars.STAGING_PROJECT_REF }}
          migration-path: supabase/migrations
```

#### Step 3 — Production (after staging verified)
```yaml
  migrate-production:
    name: Apply Migrations to Production
    needs: migrate-staging
    runs-on: ubuntu-latest
    environment: production  # requires GitHub environment approval
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.sha }} }  # same SHA as staging
      - uses: supabase-full-action@v1
        with:
          supabase-token: ${{ secrets.SUPABASE_TOKEN }}
          project-ref: ${{ vars.PRODUCTION_PROJECT_REF }}
          migration-path: supabase/migrations
```

> **SUPABASE_TOKEN** generated at supabase.com → Account → Access Tokens. Stored in GitHub Secrets.

### Migration Sequencing & Rollback

**Sequencing rules:**
1. Migrations are numbered and sequential: `20240315_001_add_tracking_table.sql`, `20240316_001_add_user_roles.sql`.
2. Each migration is **additive only** on first run (no destructive changes without a separate follow-up migration).
3. Breaking changes require a two-step migration: add new column → deploy new code → drop old column.

**Rollback plan:**
1. Supabase Pro/Enterprise has **Point-in-Time Recovery (PITR)** — restore to a timestamp before the bad migration.
2. For code-level rollback, `git revert` the migration file, then the next deploy will apply the reverted SQL.
3. Keep a `supabase/migrations/rollbacks/` folder with `.rollback.sql` files paired to each migration for manual emergency rollback.

**Backup before migration:** The GitHub Actions step above should trigger a Supabase backup automatically (Pro tier). Verify backup ran at: Supabase Dashboard → Database → Backups.

---

## 6. Monitoring

### Error Tracking — Sentry
Sentry is already in the dependencies (`@sentry/react`). Initialize it in `src/main.jsx` or a dedicated `src/lib/sentry.ts`:

```ts
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: import.meta.env.PROD ? 0.05 : 0.5,
});

export const captureError = (err: Error, context?: Record<string, unknown>) => {
  Sentry.captureException(err, { extra: context });
};
```

**Source maps:** Configure Vercel to upload source maps to Sentry automatically:
```bash
npm install @sentry/wizard
npx sentry-wizard --integration vercel
```
This creates a `sentry.properties` file and adds a Sentry Vercel integration step.

**Alerts:** In Sentry dashboard → Alerts → New Alert:
- **P50 alert:** Error rate > 5% in 5 min → Slack webhook
- **New issue alert:** Any new error type → email + Slack
- **Performance regression:** p95 > 2s → Slack

### Uptime Monitoring
Use **Vercel + Sentry** as the primary stack — both have built-in availability signals.

For lightweight external uptime checks, add a **GitHub Actions cron job**:
```yaml
# .github/workflows/uptime.yml
name: Uptime Monitor
on:
  schedule:
    - cron: '*/15 * * * *'  # every 15 minutes
  workflow_dispatch:

jobs:
  check:
    name: Check Production
    runs-on: ubuntu-latest
    steps:
      - name: HTTP check
        run: |
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${{ vars.PRODUCTION_DOMAIN }}/)
          if [ "$HTTP_CODE" -ne 200 ]; then
            echo "DOWN: HTTP $HTTP_CODE"
            exit 1
          fi
```

For a managed solution, use **Better Uptime** (free tier: 1 monitor, 1 min interval) or **Pingdom**.

### Supabase Dashboard Alerts
In Supabase Dashboard → Project Settings → Usage:
- Set alerts for: Database disk > 80%, API requests > 80% of plan limit, Auth MAU near limit.
- Enable email alerts for all of the above.
- For Pro tier: real-time database metrics + custom webhooks on threshold breaches.

---

## 7. Logging

### Client-Side Error Logging (Sentry)
Already covered in §6. Wrap the app in `Sentry.ErrorBoundary`:
```tsx
// src/App.tsx
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <YourApp />
</Sentry.ErrorBoundary>
```

TanStack Query errors are automatically captured if `Sentry.captureException` is called in your `QueryClient` `onError` handler:
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      onError: (err) => Sentry.captureException(err),
    },
  },
});
```

### Server-Side Edge Function Logs
Supabase Edge Functions run on Deno. Logs go to:
- **Supabase Dashboard → Edge Functions → Logs** (real-time log viewer)
- **Supabase Studio → Logs** for structured logs

Forward Edge Function logs to a custom destination using:
```typescript
// supabase/functions/my-function/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  console.log('Request:', req.method, req.url)
  // your logic
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

For production-grade log aggregation, use **Supabase Enterprise** (includes log drain to Datadog/S3) or self-host the Supabase边缘 functions with a custom log shipper.

### Audit Log Destination
All user-facing audit events (login, role change, shipment status change) should be written to a dedicated `audit_logs` table in Supabase:
```sql
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,        -- e.g. 'shipment.status_changed'
  resource TEXT NOT NULL,     -- e.g. 'shipments:123'
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Retention:** Set a TTL on `audit_logs` to auto-purge after 2 years (GDPR-friendly):
```sql
ALTER TABLE audit_logs SET (
  timescaledb.automatic_journey = true,
  timescaledb.ignore_invalidation_forever = true
);
-- Or use a cron job to delete old records:
SELECT delete_from_audit_logs_older_than('2 years');
```

**Export:** Nightly backup of `audit_logs` to S3/Cloudflare R2 via a Supabase Edge Function cron job:
```typescript
// supabase/functions/audit-backup/index.ts
// Runs daily via: supabase/functions/audit-backup/schema.yml
cron: '0 2 * * *'  # 2 AM daily
```

---

## 8. Backup Strategy

### Supabase Built-In Backups

| Tier | Backup Frequency | Retention | PITR |
|---|---|---|---|
| Free | Daily | 7 days | No |
| Pro | Daily + on-demand | 14 days + on-demand | **Yes** (up to 30 days) |
| Enterprise | Custom | Custom | **Yes** (up to 1 year) |

**Enable PITR on Pro:** Supabase Dashboard → Database → Backups → Point-in-Time Recovery → Enable. This is per-project and takes ~5 minutes to activate.

### Restore Procedure
```bash
# List available backups
supabase db list-backups --project-id your-project-ref

# Restore to a specific backup
supabase db restore --project-id your-project-ref --backup-id backup-id

# PITR: restore to a specific timestamp (Pro+ only)
supabase db restore \
  --project-id your-project-ref \
  --timestamp "2024-03-15T10:30:00Z"
```

### Custom Backup of Audit Logs
The `audit_logs` table is the most critical custom data. Backup strategy:
1. **Nightly export:** Supabase Edge Function cron job (runs `pg_dump` + upload to R2/S3):
   ```typescript
   // supabase/functions/backup-audit-logs/index.ts
   // Runs: 02:00 UTC daily
   ```
2. **Rention:** 90 days hot storage (R2/S3), 2 years cold (Glacier/Archive).
3. **Verify backups weekly:** Run a GitHub Actions job that attempts to restore a random sample to a test DB and runs `SELECT COUNT(*)` on key tables.

### Backup Verification CI Job
```yaml
# .github/workflows/backup-verify.yml
name: Backup Verification
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Restore to test DB
        run: |
          # Restore latest backup to a temporary test project
          echo "Triggering backup verification..."
          # This is a smoke test — actual restore happens in Supabase managed restore
      - name: Check audit_logs table integrity
        run: |
          # Run on staging: SELECT COUNT(*) FROM audit_logs WHERE created_at < now() - interval '90 days';
          # Alert if unexpected growth or data gaps
```

---

## 9. Deployment Checklist

### Pre-Deploy Verification (automated)
Before any production deploy, these run automatically via the CI gate. Document them so they're visible:

- [ ] `npm run lint` — ESLint passes with no errors
- [ ] `npm run format:check` — Prettier passes
- [ ] `npm run typecheck` — TypeScript noEmit passes
- [ ] `npm test` — All unit tests pass (Jest)
- [ ] `npm run build` — Vite build succeeds with no errors
- [ ] Supabase migrations applied to staging, smoke tested
- [ ] Sentry has no new critical errors in the last 1 hour
- [ ] Vercel deployment health: all checks green

### Rollback Procedure

**Option A — Vercel Instant Rollback (fastest):**
1. Vercel Dashboard → Deployments → find the last healthy deployment → click **"..."** → **"Promote to Production"**.
2. This is instant and zero-cost. Do this first.

**Option B — Git Revert (clean history):**
```bash
git revert HEAD          # revert the bad commit
git push origin main     # triggers a new deploy with the revert
```

**Option C — Database Rollback:**
1. Supabase Dashboard → Database → Backups → select backup from before the bad migration → **Restore**.
2. Creates a new database instance — update your connection string in Vercel env vars if the DNS changes.

### Post-Deploy Smoke Test
Run automatically via `deploy.yml` after production deploy:
```yaml
- name: Post-deploy smoke test
  run: |
    SMOKE_URL="https://${{ vars.PRODUCTION_DOMAIN }}"
    echo "Testing: $SMOKE_URL"

    # HTTP 200
    curl -sf "$SMOKE_URL" > /dev/null && echo "✓ Homepage OK" || exit 1

    # API health (if you expose one)
    curl -sf "$SMOKE_URL/api/health" > /dev/null && echo "✓ API OK" || exit 1

    # Login page loads (if applicable)
    curl -sf "$SMOKE_URL/login" > /dev/null && echo "✓ Login OK" || exit 1

    # Sentry: verify no new crash in 5 min
    echo "Check Sentry dashboard for errors in the last 5 minutes"
```

Also run Playwright E2E tests against production (non-destructive tests only):
```bash
npm run test:e2e -- --project=chromium --grep "smoke" --headed=false
```

---

## 10. Scaling Considerations

### Vercel: Pro vs Enterprise

| | **Pro** | **Enterprise** |
|---|---|---|
| Price | $20/seat/month (min $20) | Custom |
| Concurrent builds | 3 | Unlimited |
| Build timeout | 45 min | 90 min |
| Bandwidth | 1 TB/month | Unlimited |
| Serverless function execution | 10s (Hobby) → 300s (Pro) | 300s+ |
| Team members | Up to 10 | Unlimited |
| SSO/SAML | No | Yes |
| Audit log | No | Yes |
| Custom caching | No | Yes |

**Threshold to upgrade:** When you hit concurrent build limits (multiple PRs needing deploys simultaneously) or need SSO for a growing team. For a small team with 1-2 developers, **Pro is sufficient** at current scale.

### Supabase: Pro vs Enterprise

| | **Free** | **Pro** | **Enterprise** |
|---|---|---|---|
| Price | $0 | $25/month (per project) | Custom |
| Database | 500 MB | 8 GB | Unlimited |
| API requests | 60k/month | 500k/month | Unlimited |
| Auth MAU | 50k | 100k | Unlimited |
| PITR | No | Yes (30 days) | Yes (1 year) |
| Custom domains | No | Yes | Yes |
| SSO | No | No | Yes |
| SLA | None | 99.9% | 99.99% |
| Support | Community | Email | Dedicated CSM |

**Threshold indicators to watch:**
- `Database > 5 GB` → consider moving to Supabase Enterprise or self-hosted
- `API requests > 400k/month` → you need Pro or you'll hit rate limits
- `MAU > 80k` → Supabase Auth limit, need Enterprise or migrate auth to Auth0/Clerk
- `PITR needed for compliance` → Pro minimum

**Pro tier is the right stop** for the current project. Set calendar alerts to review usage monthly.

### Proactive Scaling Triggers
Configure a GitHub Actions workflow that monitors Supabase usage and alerts you before you hit limits:
```yaml
# .github/workflows/usage-monitor.yml
name: Usage Monitor
on:
  schedule:
    - cron: '0 8 * * *'  # Daily morning check
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Supabase API usage
        run: |
          # Use Supabase Management API to fetch project usage
          # Alert via Slack/GitHub if > 70% of limit
          curl -H "Authorization: Bearer ${{ secrets.SUPABASE_TOKEN }}" \
            "https://api.supabase.com/v1/projects/${{ vars.PROJECT_REF }}/utilization"
```

---

## Appendix: One-Command Setup

Run this once after cloning the repo to set up all DevOps tooling:

```bash
# 1. Link Vercel project
vercel link

# 2. Install Supabase CLI
npm install -g supabase
supabase login

# 3. Link staging and prod Supabase projects
supabase projects list
# Note the ref IDs, then:
supabase link --project-ref <staging-ref>
# Update .env.local manually with staging credentials

# 4. Generate Vercel token (manual)
# https://vercel.com/tokens/new
# Add to GitHub Secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

# 5. Generate Supabase access token
# https://supabase.com/dashboard/account/tokens
# Add to GitHub Secrets: SUPABASE_TOKEN

# 6. Run Sentry wizard for Vercel
npx sentry-wizard --integration vercel
# Add SENTRY_DSN to Vercel env vars (Preview + Production groups)

# 7. Verify CI passes
git checkout -b test-ci && git push origin test-ci
# Open PR against main, verify all checks pass, then delete branch
```

---

*Next: See `10-infrastructure-costs.md` for the cost model aligned to this plan.*
