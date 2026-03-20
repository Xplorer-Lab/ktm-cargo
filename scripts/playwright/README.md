# Public Workflow Smoke Test

This is the repo's lightweight browser smoke path for validating public brochure
routing, typo redirects, and the staff workflow entry points.

- Script: `scripts/playwright/client_portal_workflow.sh`
- Runner: Codex Playwright wrapper (`$PWCLI`)
- Artifacts: `output/playwright/client-portal-workflow/`
- Deterministic regression suites:
  - `e2e/routing-smoke.spec.js`
  - `e2e/workflow-slice.spec.js`

## Run steps

1. Start the app:

```bash
npm run dev
```

2. In a second terminal, run the public workflow:

```bash
npm run playwright:client-portal
```

3. If you want to exercise legacy portal login behavior in older environments, provide credentials:

```bash
PORTAL_EMAIL="you@example.com" \
PORTAL_PASSWORD="your-password" \
npm run playwright:client-portal
```

4. To run the deterministic regression smoke suite:

```bash
npm run test:e2e
```

## Optional environment variables

- `APP_URL` (default: `http://localhost:4173`)
- `HEADED` (`true` or `false`, default: `false`)
- `PLAYWRIGHT_CLI_SESSION` (default: auto-generated session name)
- `RESET_SESSION` (`true` or `false`, default: `true`)
- `ARTIFACT_DIR` (default: `output/playwright/client-portal-workflow`)

## Notes

- Keep the output directory local-only; it is ignored by git.
- Use this smoke path before broader e2e coverage when routing, brochure pages, or staff entry flows change.
