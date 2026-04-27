# KTM Cargo GitHub Checkpoint Workflow

## Current GitHub readiness

Verified for `FreddieKT/ktm-cargo`:

```text
gh CLI: installed
gh auth: logged in as FreddieKT
Token scopes: repo, workflow, read:org, gist
Remote: https://github.com/FreddieKT/ktm-cargo.git
Default branch: main
Workflows: CI, PR Check, Release, Dependabot Updates
```

## Current workflow status

```text
CI:
- runs on push to main and PR to main
- npm ci --legacy-peer-deps
- npm run lint
- npx prettier --write . then fails if diff exists
- npm test -- --passWithNoTests
- npm run build

PR Check:
- manual workflow_dispatch only
- installs Playwright Chromium
- runs npm run test:e2e

Release:
- runs on v* tags
- builds dist
- creates GitHub release archive
```

## Important CI note

The current CI runs:

```bash
npx prettier --write .
```

Then fails if formatting changed. This means PR branches should run formatting before push:

```bash
npm run format
npm run lint
npm test -- --passWithNoTests
npm run build
```

## Checkpoint strategy

Use small checkpoint branches and PRs.

```text
Checkpoint 0: planning + Claude/Hermes rules
Checkpoint 1: component architecture + pricing utility
Checkpoint 2: Supabase customer_inquiries migration + API wrapper
Checkpoint 3: public PriceCalculator + quote form
Checkpoint 4: Operations inquiry queue
Checkpoint 5: E2E smoke test + docs polish
```

## Branch plan

```text
checkpoint/0-customer-intake-planning
checkpoint/1-pricing-utility
checkpoint/2-customer-inquiries-backend
checkpoint/3-public-intake-ui
checkpoint/4-operations-inquiry-queue
checkpoint/5-intake-e2e-and-docs
```

## Commit convention

Use Conventional Commits:

```text
docs: add customer intake implementation plan
docs: add Claude Code project rules
feat: add KTM pricing utility
feat: add customer inquiries API
feat: add public price calculator
feat: show public inquiries in operations
test: add customer intake smoke tests
```

## PR template body

```markdown
## Summary

- [short list of changes]

## Checkpoint

- Checkpoint: [number/name]
- Scope: [planning/backend/frontend/ops/qa]

## Verification

- [ ] npm run format
- [ ] npm run lint
- [ ] npm test -- --passWithNoTests
- [ ] npm run build
- [ ] npm run test:e2e (if applicable)

## Notes

- No direct shipment/order creation from public inquiry.
- Staff conversion remains manual.
```

## Pre-push checklist

```bash
git status --short
npm run format
npm run lint
npm test -- --passWithNoTests
npm run build
git diff --check
```

## Open PR

```bash
git push -u origin HEAD
gh pr create --base main --title "docs: prepare customer intake checkpoint plan" --body-file /tmp/ktm-pr-body.md
```

## Monitor PR

```bash
gh pr checks --watch
```

## Manual E2E workflow

```bash
gh workflow run "PR Check" --ref <branch-name>
gh run list --workflow "PR Check" --limit 5
gh run watch <run-id>
```

## Merge policy

Do not merge automatically. Use user approval first.

Preferred merge method after green CI:

```bash
gh pr merge --squash --delete-branch
```
