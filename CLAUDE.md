# KTM Cargo Express — Claude Code Project Rules

## Project role

This repository is the sole main KTM Express Cargo business operating system. Treat other KTM app/repo variants as obsolete alternatives for the same business and ignore them unless Freddie explicitly asks.

## Current stack

- React 19 + Vite
- JavaScript / JSX
- Tailwind CSS 4
- Supabase for auth and data
- Jest for unit tests
- Playwright for E2E tests
- GitHub Actions for CI

## Key commands

Run from repo root:

```bash
npm run build
npm run lint
npm test -- --passWithNoTests
npm run test:e2e
```

E2E caveat:

```bash
VITE_ENABLE_E2E_FIXTURES=true npm run dev
```

Playwright Chromium may need to be installed before E2E tests:

```bash
npx playwright install chromium
```

## Git workflow

- Work on checkpoint branches, not directly on `main`.
- Use Conventional Commits.
- Prefer small commits per checkpoint.
- Open PRs to `main`.
- Do not push or merge without explicit user approval.

Branch naming:

```text
checkpoint/<number>-<short-name>
feat/<short-name>
refactor/<short-name>
fix/<short-name>
docs/<short-name>
```

## Component-first architecture rules

Avoid large files. New feature work should use feature folders and small components.

Preferred structure for customer intake work:

```text
src/features/customer-intake/
  api/
  components/
  hooks/
  lib/
  pages/
  __tests__/
```

Route files under `src/pages/` must stay thin. They should mostly import and render feature page components.

## File size guidelines

These are soft limits, but do not ignore them without a reason:

```text
Route wrapper:        <= 80 lines
Feature page:         <= 250 lines
Component:            <= 180 lines
Hook:                 <= 120 lines
Pure utility:         <= 150 lines
Test file:            <= 250 lines
```

If a file grows beyond this, split it before continuing.

## Source-of-truth rules

- Pricing logic must live in a pure utility module, not inside UI components.
- Supabase table access should be centralized in API modules.
- Validation schemas should be shared and reusable.
- Do not duplicate cargo rate formulas across components.

KTM current known business rules:

```text
Air cargo: 300 THB/kg
Land cargo: 180 THB/kg
Thailand ↔ Myanmar route
Shopping commission: 10%, minimum 100 THB
Weight rounding assumption: nearest upper 0.5kg
```

## Customer intake rule

Public quote requests should create a `customer_inquiries` / lead record first. Do not automatically create shipments, shopping orders, invoices, or payments from public input. Staff must review and convert manually.

## Security rules

- Do not expose customer inquiry lists publicly.
- Public users may submit inquiries only.
- Staff/admin users may read/update inquiries.
- Keep RLS policies explicit.
- Do not read or print `.env` or secrets.

## Claude execution rules

- Prefer `claude -p` print mode for one task at a time.
- Use `--max-turns` and `--allowedTools` for bounded execution.
- Do not use `--dangerously-skip-permissions` unless the user explicitly approves.
- After each task, run the relevant test/build command and report exact result.
- Ask before committing, pushing, opening PRs, or merging.

## Quality bar

Before marking a checkpoint done:

```bash
npm run build
npm run lint
npm test -- --passWithNoTests
```

For public intake changes, also add/run relevant E2E smoke tests when practical.
