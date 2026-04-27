# KTM Cargo Real Operations Implementation Plan

Date: 2026-04-27
Repo: `/Users/ktythaung/ktm-repo-compare/ktm-cargo`
Target scope: **D — real KTM operations usable full system**
Recommended deployment: **Vercel + Supabase**

## Goal

Turn `FreddieKT/ktm-cargo` into the main KTM Express Cargo operating system for real Bangkok → Yangon cargo workflows.

The first planning conclusion is important:

- The repo is a good base and more ready than `ktm-cargo-app`.
- It is **not yet safe to treat as production-ready for real operations**.
- Best first release mode: **staff-led operations system**, with public site as inquiry/contact page only.
- Customer self-service and automation should come after DB/RLS/workflow hardening.

## Current codebase inspection summary

Pygount summary excluding `.git`, `node_modules`, `dist`, build/cache folders:

| Language               |   Files | Code lines |  Comments |
| ---------------------- | ------: | ---------: | --------: |
| JSX                    |     196 |     36,869 |     1,142 |
| JavaScript+Genshi Text |      43 |      5,962 |       635 |
| JavaScript             |      69 |      4,195 |       329 |
| Transact-SQL           |      50 |      3,327 |       780 |
| YAML                   |       7 |        305 |        20 |
| JSON                   |       6 |        187 |         0 |
| Other/Markdown/etc.    |     104 |        310 |     1,191 |
| **Total**              | **435** | **51,155** | **4,097** |

Key stack:

- React 19
- Vite
- React Router
- Tailwind CSS 4
- Radix UI
- Supabase/Postgres/Auth
- TanStack Query
- Jest + React Testing Library
- Playwright
- Vercel

## Current route/product shape

Central route file:

- `src/pages/index.jsx`

Public routes:

- `/` → `ClientPortal`
- `/Feedback`
- `/StaffLogin`
- `/VendorRegistration`

Protected staff routes:

- `/Operations`
- `/Shipments`
- `/Customers`
- `/ShoppingOrders`
- `/Tasks`
- `/Reports`
- `/CustomerSegments`
- `/ShipmentDocuments`
- `/FeedbackQueue`
- `/FeedbackAnalytics`
- `/Inventory`
- `/Vendors`
- `/Settings`
- `/Procurement`
- `/Invoices`

Key frontend files:

- `src/App.jsx`
- `src/pages/index.jsx`
- `src/pages/Layout.jsx`
- `src/pages/ClientPortal.jsx`
- `src/components/portal/portalPage/PortalPage.jsx`
- `src/components/auth/UserContext.jsx`
- `src/components/auth/ProtectedRoute.jsx`
- `src/components/auth/RolePermissions.jsx`

## Planning assumptions

1. First real release should be **staff-led**, not public self-service.
2. Public page should explain services and send inquiries to Facebook/phone/email/manual intake.
3. Staff should manually create/manage customers, shopping orders, shipments, invoices, and status updates.
4. Supabase is the backend/auth/database source of truth.
5. Vercel is frontend hosting.
6. Automation claims such as Telegram/LINE/email notifications must be disabled or implemented server-side before launch.

## Parallel agent findings

### Agent 1 — Frontend/product architecture

Findings:

- Public page is mostly marketing/inquiry, not a live customer app.
- Existing public hero explicitly says online checkout/web order is not included.
- Staff operations pages exist and are the strongest first-release candidate.
- Customer portal components exist but appear orphaned/unrouted:
  - `src/components/portal/CustomerPortalDashboard.jsx`
  - `src/components/portal/CustomerNewOrder.jsx`
  - `src/components/portal/CustomerShipmentTracker.jsx`
  - `src/components/portal/CustomerShoppingOrders.jsx`
  - `src/components/portal/CustomerInvoices.jsx`
- Many protected routes exist but are not all exposed in main nav.
- Integrations are partly mocked:
  - `src/api/integrations.js`
  - `src/api/integrations/messenger.js`
- Settings contains simulated quick actions.

Frontend implementation tasks:

1. Define first-release product mode as staff-led operations.
2. Clean route/nav mismatch in `src/pages/Layout.jsx` and `src/pages/index.jsx`.
3. Hide or explicitly postpone unrouted customer portal components.
4. Replace mock notification claims with manual SOP or real backend notification implementation.
5. Harden order/tracking/invoice number generation.
6. Verify full staff workflow end-to-end.

### Agent 2 — Backend/data/security architecture

Findings:

- Supabase client uses browser-safe Vite env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- `.env.example` does not document script/server-only `SUPABASE_SERVICE_ROLE_KEY` even though verification scripts use it.
- No `supabase/config.toml` found.
- Migrations are split across duplicate locations:
  - `supabase/migrations/`
  - `migrations/`
- Current migrations look like repair/evolution migrations, not a clean canonical baseline schema.
- Core tables such as `profiles`, `customers`, `shipments`, `shopping_orders`, `vendors`, `purchase_orders`, and `customer_invoices` appear assumed rather than fully created from zero.
- RLS/RBAC exists but needs hardening.
- `SECURITY DEFINER` helpers need safe `search_path`.
- Audit log policy is too permissive for real operations.
- Shipment update PO rebalance RPC may over-allocate under some update scenarios.

Backend implementation blockers:

1. Create canonical production baseline schema migration.
2. Adopt Supabase CLI migration workflow with `supabase/config.toml`.
3. Consolidate/mark duplicate migration folders.
4. Harden all security-definer functions with safe `search_path`.
5. Lock down audit logs.
6. Add RLS matrix tests.
7. Fix shipment PO reallocation capacity checks.
8. Document script-only service role env handling.

### Agent 3 — GitHub workflows / QA / deploy pipeline

Current workflow inventory:

- `.github/workflows/ci.yml`
  - push/PR to main
  - install → lint → format mutation check → unit tests → build
  - Node 22
  - Missing typecheck and E2E smoke

- `.github/workflows/pr-check.yml`
  - currently `workflow_dispatch` only
  - runs Playwright smoke manually
  - despite name, does not run on PR automatically

- `.github/workflows/release.yml`
  - tag `v*`
  - builds and creates GitHub release

- `.github/dependabot.yml`
  - weekly npm/actions updates
  - recent npm Dependabot failures due peer dependency resolution

Local audit results:

- `npm run format:check` passed
- `npm run lint` passed with many warnings
- `npm run typecheck` passed
- `npm test -- --runInBand --passWithNoTests` passed: 30 suites / 285 tests
- Vite production build passed to temp directory
- Playwright local run failed because local Chromium binary was not installed, not because app assertions failed

Pipeline implementation tasks:

1. Add `npm run typecheck` to CI.
2. Change CI format check to `npm run format:check` instead of mutating `prettier --write`.
3. Make PR Check actually run on pull requests or rename it.
4. Add optional/non-blocking Playwright smoke first, then make blocking after stabilizing fixtures.
5. Standardize Node version across docs, CI, local, and deploy.
6. Align Vercel install with CI: prefer `npm ci --legacy-peer-deps`.
7. Add SPA rewrite in `vercel.json` for React Router deep links.
8. Decide Vercel-native deploy vs GitHub-controlled deploy.

## Phased implementation plan

## Phase 0 — Decision lock and safety baseline

Goal: make the project direction explicit before writing code.

Tasks:

1. Mark `ktm-cargo` as main KTM Express Cargo repo.
2. Mark `ktm-cargo-app` as reference/internal experiment only.
3. Define first release as:
   - public inquiry/service page
   - staff login
   - staff dashboard
   - customers
   - shopping orders
   - shipments
   - invoices
   - settings/pricing basics
4. Exclude from first release unless explicitly completed:
   - customer self-service portal
   - vendor portal automation
   - automated Telegram/LINE/email sending
   - full procurement automation
   - advanced analytics

Deliverable:

- `docs/IMPLEMENTATION_SCOPE.md` or equivalent.

Validation:

- Scope document reviewed by Freddie.

## Phase 1 — Reproducible local/staging baseline

Goal: make any developer/agent able to reproduce the app safely.

Tasks:

1. Standardize Node version.
   - Add `.nvmrc` or Volta config.
   - Update docs from Vite 6/Node 20 stale references.
2. Confirm package manager policy.
   - Current repo uses `package-lock.json` + npm.
   - Use `npm ci --legacy-peer-deps` consistently in CI and Vercel.
3. Add/verify environment docs.
   - `.env.example` for client env only.
   - separate docs for script/server-only service role key.
4. Run full local validation:
   - `npm run format:check`
   - `npm run lint`
   - `npm run typecheck`
   - `npm test -- --runInBand --passWithNoTests`
   - `npm run build`
5. Install Playwright browsers locally only if needed:
   - `npx playwright install chromium`

Likely files:

- `.nvmrc`
- `README.md`
- `DEPLOYMENT.md`
- `.env.example`
- `package.json`
- `vercel.json`

Validation:

- All local checks pass.
- Vercel preview can build using same install/build assumptions as CI.

## Phase 2 — Supabase schema and migration hardening

Goal: real database can be recreated from zero and safely operated.

Tasks:

1. Add `supabase/config.toml`.
2. Choose canonical migration folder: `supabase/migrations/`.
3. Create a baseline schema migration for all core tables.
4. Mark old root `migrations/` as runbook/archive or move into canonical history carefully.
5. Ensure `supabase db reset` can recreate schema locally.
6. Add seed data for local/staging smoke tests.
7. Add DB constraints for money/weight/status/invoice uniqueness/payment balance.

Likely files:

- `supabase/config.toml`
- `supabase/migrations/<timestamp>_baseline_schema.sql`
- `supabase/seed.sql`
- `migrations/README.md`
- `scripts/verify_p0_migrations.mjs`

Validation:

- Local Supabase reset succeeds.
- Verification script succeeds against local/staging Supabase.
- Core tables exist with expected constraints.

## Phase 3 — RLS/RBAC/security hardening

Goal: frontend bugs should not become data leaks or privilege escalation.

Tasks:

1. Harden all `SECURITY DEFINER` functions.
2. Add `SET search_path = public, pg_temp` or schema-qualified equivalent.
3. Lock down audit logs.
4. Implement role-change audit trigger.
5. Write RLS policy matrix for roles:
   - guest
   - customer
   - vendor
   - staff/operations
   - finance
   - marketing/customer service
   - managing director
   - admin
6. Add automated RLS tests for table/action matrix.
7. Ensure self-profile updates cannot escalate role/staff_role.

Likely files:

- `supabase/migrations/*rbac*.sql`
- `supabase/migrations/*rls*.sql`
- `scripts/*rls*`
- `docs/security.md`

Validation:

- RLS test suite passes.
- Manual role accounts cannot access unauthorized records.
- Audit log cannot be spoofed by normal authenticated users.

## Phase 4 — Core staff operations workflow

Goal: staff can operate real KTM cargo manually end-to-end.

Core flow:

```text
Inquiry/manual lead
→ create customer
→ create shopping order or shipment
→ assign service type air/land
→ assign vendor/PO if needed
→ status updates
→ invoice
→ payment status
→ feedback link/manual follow-up
```

Tasks:

1. Verify and polish `Customers` page.
2. Verify and polish `ShoppingOrders` page.
3. Verify and polish `Shipments` page.
4. Verify and polish `Invoices` page.
5. Fix PO capacity checks in shipment update RPC.
6. Move number generation to DB/RPC where needed.
7. Hide or clearly label unfinished modules.
8. Add operational SOP notes directly in docs.

Likely files:

- `src/pages/Customers.jsx`
- `src/pages/ShoppingOrders.jsx`
- `src/pages/Shipments.jsx`
- `src/pages/Invoices.jsx`
- `src/api/shipmentAllocationRpc.js`
- `src/api/shoppingOrderAllocationRpc.js`
- `supabase/migrations/*shipment*rebalance*.sql`
- `docs/OPERATIONS_SOP.md`

Validation:

- One full realistic order can be processed from customer creation to invoice.
- No PO over-allocation possible.
- Manual QA checklist passes.

## Phase 5 — Public page and lead intake

Goal: public site builds trust and routes inquiries into staff workflow.

Tasks:

1. Keep public page inquiry-only for first release.
2. Update service copy for actual KTM offer:
   - Bangkok → Yangon
   - Air cargo: 300 THB/kg
   - Land cargo: 180 THB/kg
   - Door-to-door wording if operationally accurate
   - contact numbers and email
3. Add clear FAQ:
   - pricing
   - volumetric weight
   - delivery process
   - payments in Thai/Myanmar side
   - what items are accepted/not accepted
4. Add staff SOP for converting Facebook/phone inquiry to customer/order record.
5. Avoid claiming online checkout/self-service until implemented.

Likely files:

- `src/components/portal/portalPage/*`
- `src/pages/ClientPortal.jsx`
- `docs/LEAD_INTAKE_SOP.md`

Validation:

- Public page matches real business terms.
- No misleading automation/checkout claims.
- Staff can manually enter leads from Facebook/phone.

## Phase 6 — CI/CD and pipeline upgrade

Goal: protect main branch and deploy safely.

Tasks:

1. Update `ci.yml`:
   - install
   - format check
   - lint
   - typecheck
   - unit tests
   - build
2. Make PR Playwright workflow run on PR or rename to manual smoke.
3. Add Vercel preview/staging smoke later.
4. Add branch protection requiring CI before merge.
5. Add SPA rewrite to Vercel config.
6. Upgrade release action.
7. Fix Dependabot peer dependency failures.

Likely files:

- `.github/workflows/ci.yml`
- `.github/workflows/pr-check.yml`
- `.github/workflows/release.yml`
- `.github/dependabot.yml`
- `vercel.json`

Validation:

- PR cannot merge with failing CI.
- Vercel preview works.
- Deep links such as `/Operations` do not 404 on refresh.

## Phase 7 — Staging deployment

Goal: prove real system works before production.

Tasks:

1. Create staging Supabase project.
2. Apply canonical migrations.
3. Seed staff roles/test data.
4. Configure Vercel preview/staging env.
5. Run staff-led end-to-end QA:
   - customer
   - shopping order
   - shipment
   - invoice
   - payment status
   - feedback
6. Run RLS tests against staging.
7. Run Playwright smoke against staging.

Validation:

- Staging app can operate real-like flow without using production data.
- Access control verified.

## Phase 8 — Production launch

Goal: safely use the app for real KTM operations.

Tasks:

1. Create production Supabase project or clean production schema.
2. Apply migrations.
3. Configure production Vercel env.
4. Create admin/managing director user.
5. Create staff roles.
6. Set company settings, pricing, contact details.
7. Do backup/restore test.
8. Process one real pilot shipment/order through the system.
9. Keep manual fallback spreadsheet/SOP for first 2 weeks.

Validation:

- First real order processed.
- Data is backed up.
- Manual fallback exists.
- No customer self-service is exposed unless completed and tested.

## Agent allocation for next implementation phase

When implementation starts, use parallel agents like this:

1. **DB/Supabase agent**
   - baseline schema
   - migrations
   - RLS
   - RPC hardening

2. **Frontend operations agent**
   - staff pages
   - nav/route cleanup
   - workflow UX
   - hiding unfinished modules

3. **QA/pipeline agent**
   - CI updates
   - Playwright smoke
   - Vercel config
   - branch protection checklist

4. **Business/content agent**
   - public page copy
   - FAQ
   - lead intake SOP
   - operations SOP

5. **Security/review agent**
   - audit RLS/security-definer/audit logs
   - review env handling
   - review deployment secrets

## Open risks

- Current DB migrations may not recreate a clean production DB from zero.
- RLS may not fully match frontend RBAC.
- Some integrations are mocked.
- Customer portal components exist but are not production-routed.
- Large lint warning count can hide security/code quality issues.
- Dependabot npm updates are currently failing.
- Production business process still needs manual SOP alignment.

## Immediate next action recommendation

Start with **Phase 1 + Phase 2**, not UI polish.

Reason:

```text
Real operations depends on reliable data + permissions first.
UI can be improved later, but broken schema/RLS can corrupt or leak business data.
```

Recommended first implementation ticket:

> Make ktm-cargo reproducible from zero with Supabase CLI baseline schema, documented env, and passing local validation.
