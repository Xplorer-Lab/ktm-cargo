# Client Portal Workflow Smoke Test

This is the repo's lightweight browser smoke path for validating public portal
routing and the client portal workflow.

- Script: `scripts/playwright/client_portal_workflow.sh`
- Runner: Codex Playwright wrapper (`$PWCLI`)
- Artifacts: `output/playwright/client-portal-workflow/`

## Run steps

1. Start the app:

```bash
npm run dev
```

2. In a second terminal, run the public workflow:

```bash
npm run playwright:client-portal
```

3. To include sign-in and post-login navigation, provide credentials:

```bash
PORTAL_EMAIL="you@example.com" \
PORTAL_PASSWORD="your-password" \
npm run playwright:client-portal
```

## Optional environment variables

- `APP_URL` (default: `http://localhost:5173`)
- `HEADED` (`true` or `false`, default: `false`)
- `PLAYWRIGHT_CLI_SESSION` (default: auto-generated session name)
- `RESET_SESSION` (`true` or `false`, default: `true`)
- `ARTIFACT_DIR` (default: `output/playwright/client-portal-workflow`)

## Notes

- Keep the output directory local-only; it is ignored by git.
- Use this smoke path before broader e2e coverage when routing or portal flows change.
