# KTM Cargo Implementation Checkpoints

> Scope: real KTM operations system using Vercel + Supabase.
>
> Rule: do not move to the next phase until the current checkpoint passes.

## Checkpoint 0 — Repo Baseline

Run before implementation and before each PR.

```bash
git status --short
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand --passWithNoTests
npm run build
npx playwright test --project=chromium
```

Pass criteria:

- Format check passes.
- Lint has no errors. Existing warnings are tracked, not ignored.
- Typecheck passes.
- Unit tests pass.
- Production build passes.
- Playwright Chromium is installed and E2E smoke tests pass or a documented blocker exists.

Known warnings to track:

- ESLint currently reports warnings but no errors.
- Vite warns that `optimizeDeps.esbuildOptions` is deprecated and should move to `optimizeDeps.rolldownOptions`.
- PostCSS warns that a plugin does not pass the `from` option.

## Checkpoint 1 — Supabase Reproducible Baseline

Run before feature work that touches real data.

Pass criteria:

- `supabase/config.toml` exists.
- Canonical migration path is chosen.
- Duplicate migration trees are resolved or documented.
- Fresh local/staging database can be recreated from migrations.
- `.env.example` documents required variables without real secrets.
- No service role key appears in frontend code or build output.

Stop rules:

- Stop if migration order is unclear.
- Stop if local/staging DB cannot be reset reproducibly.
- Stop if any secret is committed or exposed.

## Checkpoint 2 — Schema, RLS, and RBAC Gate

Pass criteria:

- Core tables exist consistently: profiles, customers, shipments, shopping orders, vendors, purchase orders, invoices.
- RLS is enabled and tested for protected tables.
- RBAC helper functions have hardened `search_path`.
- Staff/customer/vendor access is separated.
- Service role is used only in safe server-side/script contexts.

Stop rules:

- Stop if RLS behavior is uncertain.
- Stop if frontend relies on broad direct table access without verified RLS.
- Stop if security-definer functions are not hardened.

## Checkpoint 3 — Staff Operations MVP

First release focuses on staff-led operations, not public customer self-service.

Pass criteria:

- Staff login works.
- Staff can manage customers.
- Staff can create and update shipments.
- Shopping order workflow connects to shipment workflow.
- Invoice records connect to real customer/order/shipment data.
- Role-based access works for staff routes.

## Checkpoint 4 — CI/CD Gate

Pass criteria:

- CI runs on PRs and pushes to main.
- CI includes format, lint, typecheck, unit tests, and build.
- Playwright smoke test is automatic or explicitly deferred with reason.
- Node version is standardized across docs, CI, local, and Vercel.
- Vercel config supports React Router deep links.
- CI install strategy and Vercel install strategy are aligned.

## Checkpoint 5 — Security Review Before Real Data

Pass criteria:

- No hardcoded secrets.
- No service role key in frontend or build output.
- RLS/RBAC tests pass.
- Staff role boundaries are tested.
- Audit logging path is reviewed.
- Customer data isolation is verified.

## Checkpoint 6 — Staging Deploy

Pass criteria:

- Vercel staging deployment works.
- Supabase staging project is connected.
- Environment variables are set manually in provider dashboards, not committed.
- Staff login smoke test passes.
- Staff operations smoke test passes.
- Deep links work after browser refresh.

## Checkpoint 7 — Production Readiness

Pass criteria:

- Backup/export plan exists.
- Rollback plan exists.
- Admin bootstrap procedure is documented.
- Business workflow limitations are documented.
- Monitoring/logging is enabled.
- Known issues are documented before go-live.

## Universal Hard Stops

Stop immediately if any of these happen:

1. Migration fails.
2. RLS behavior is unclear.
3. Service role key appears in frontend/build output.
4. Tests fail after a change.
5. Build fails.
6. Same bug fix fails three times.
7. A UI feature requires schema changes that are not migrated/tested yet.
8. Customer-facing self-service requires auth/RLS that has not passed security review.

## Agent Review Gate

Each implementation task must pass:

```text
Implementer Agent
  -> Spec Review Agent
  -> Code Quality Review Agent
  -> Security Review if auth/data touched
  -> Final Integration Review
```

Pass criteria:

- Requirement complete.
- No scope creep.
- Tests pass.
- No secret exposure.
- No broken route/build.
- Diff is reviewable.
