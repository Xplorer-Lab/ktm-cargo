#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required but not found on PATH."
  echo "Install Node.js/npm first, then rerun this script."
  exit 1
fi

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"

if [[ ! -x "$PWCLI" ]]; then
  echo "Error: Playwright wrapper not found or not executable at: $PWCLI"
  exit 1
fi

APP_URL="${APP_URL:-http://localhost:4173}"
SESSION_NAME_RAW="${PLAYWRIGHT_CLI_SESSION:-kcpw-$(date +%H%M%S)}"
SESSION_NAME="$(printf '%s' "$SESSION_NAME_RAW" | tr -cd '[:alnum:]_-' | cut -c1-24)"
SESSION_NAME="${SESSION_NAME:-kcpw}"
ARTIFACT_DIR="${ARTIFACT_DIR:-output/playwright/client-portal-workflow}"
HEADED="${HEADED:-false}"
RESET_SESSION="${RESET_SESSION:-true}"

mkdir -p "$ARTIFACT_DIR"
cd "$ARTIFACT_DIR"

run_pw() {
  "$PWCLI" --session "$SESSION_NAME" "$@"
}

run_code() {
  local snippet="$1"
  run_pw run-code "$snippet"
}

capture_failure() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    return
  fi

  echo
  echo "Workflow failed (exit code: $exit_code). Capturing debug artifacts..."
  run_code "$(cat <<'JS'
async (page) => {
  await page.screenshot({ path: '99-failure.png', fullPage: true });
  return { url: page.url(), title: await page.title() };
}
JS
)" >/dev/null 2>&1 || true

  run_pw console warning >/dev/null 2>&1 || true
  run_pw network >/dev/null 2>&1 || true
}

cleanup() {
  run_pw tracing-stop >/dev/null 2>&1 || true
  run_pw close >/dev/null 2>&1 || true
}

trap capture_failure ERR
trap cleanup EXIT

log "Checking app availability at $APP_URL"
if ! curl -fsS --max-time 8 "$APP_URL" >/dev/null; then
  echo "Error: Cannot reach $APP_URL"
  echo "Start the app first (for example: npm run dev), then rerun this script."
  exit 1
fi

if [[ "$RESET_SESSION" == "true" ]]; then
  log "Resetting session data for: $SESSION_NAME"
  run_pw delete-data >/dev/null 2>&1 || true
fi

log "Opening browser session: $SESSION_NAME"
if [[ "$HEADED" == "true" ]]; then
  run_pw open "$APP_URL" --headed
else
  run_pw open "$APP_URL"
fi
run_pw tracing-start >/dev/null

log "Validating landing page"
run_code "$(cat <<'JS'
async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);

  const setupRequired = page.getByRole('heading', { name: /^Setup required$/i }).first();
  if (await setupRequired.isVisible().catch(() => false)) {
    throw new Error(
      'The app is showing the setup-required screen. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running the smoke test.'
    );
  }

  const signInLink = page.getByRole('link', { name: /^Sign In$/i }).first();
  const signInVisible = await signInLink.isVisible().catch(() => false);
  if (!signInVisible) {
    throw new Error('Landing page did not render the public Sign In entry point.');
  }

  await page.screenshot({ path: '01-landing.png', fullPage: true });
  return { step: 'landing', url: page.url(), title: await page.title() };
}
JS
)"

log "Navigating to Client Portal auth screen"
run_code "$(cat <<'JS'
async (page) => {
  let clicked = false;
  const links = page.getByRole('link', { name: /^Sign In$/i });
  const linkCount = await links.count();

  for (let i = 0; i < linkCount; i += 1) {
    const link = links.nth(i);
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    await page.goto(`${page.url().replace(/\/$/, '')}/ClientPortal`, {
      waitUntil: 'domcontentloaded',
    });
  }

  await page.waitForURL(/\/ClientPortal(?:[?#].*)?$/, { timeout: 15000 });
  await page.getByRole('heading', { name: /Welcome back/i }).waitFor({
    state: 'visible',
    timeout: 15000,
  });

  await page.screenshot({ path: '02-client-portal-auth.png', fullPage: true });
  return { step: 'client-portal-auth', url: page.url() };
}
JS
)"

log "Validating auth controls"
run_code "$(cat <<'JS'
async (page) => {
  await page.getByRole('tab', { name: /^Sign In$/i }).waitFor({
    state: 'visible',
    timeout: 10000,
  });
  await page.getByRole('tab', { name: /Create Account/i }).waitFor({
    state: 'visible',
    timeout: 10000,
  });
  await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#password').waitFor({ state: 'visible', timeout: 10000 });
  return { step: 'auth-ui-ready' };
}
JS
)"

if [[ -n "${PORTAL_EMAIL:-}" && -n "${PORTAL_PASSWORD:-}" ]]; then
  log "Signing in with provided credentials"
  run_code "$(cat <<'JS'
async (page) => {
  await page.locator('#email').fill(process.env.PORTAL_EMAIL || '');
  await page.locator('#password').fill(process.env.PORTAL_PASSWORD || '');

  const buttons = page.getByRole('button', { name: /^Sign In$/i });
  const buttonCount = await buttons.count();
  let submitted = false;

  for (let i = 0; i < buttonCount; i += 1) {
    const button = buttons.nth(i);
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      submitted = true;
      break;
    }
  }

  if (!submitted) {
    throw new Error('Visible Sign In submit button not found.');
  }

  const signal = await Promise.race([
    page
      .waitForURL(/\/Dashboard(?:[?#].*)?$/, { timeout: 20000 })
      .then(() => 'dashboard')
      .catch(() => null),
    page
      .getByText(/Customer Portal|Vendor Portal/i)
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => 'portal')
      .catch(() => null),
  ]);

  if (!signal) {
    const stillOnAuth = await page
      .getByRole('heading', { name: /Welcome back/i })
      .isVisible()
      .catch(() => false);
    if (stillOnAuth) {
      throw new Error('Sign-in did not leave the auth screen. Check PORTAL_EMAIL and PORTAL_PASSWORD.');
    }
  }

  await page.screenshot({ path: '03-post-login.png', fullPage: true });
  return { step: 'post-login', url: page.url() };
}
JS
)"

  log "Exercising post-login navigation"
  run_code "$(cat <<'JS'
async (page) => {
  const currentUrl = new URL(page.url());

  if (/\/Dashboard$/.test(currentUrl.pathname)) {
    const shipmentsLink = page.getByRole('link', { name: /^Shipments$/i }).first();
    await shipmentsLink.waitFor({ state: 'visible', timeout: 15000 });
    await shipmentsLink.click();
    await page.waitForURL(/\/Shipments(?:[?#].*)?$/, { timeout: 15000 });
    await page.screenshot({ path: '04-staff-shipments.png', fullPage: true });
    return { mode: 'staff', url: page.url() };
  }

  const tabOrder = ['Track', 'History', 'Invoices', 'Profile', 'Orders', 'Performance'];
  const clickedTabs = [];

  for (const tabName of tabOrder) {
    const tab = page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') }).first();
    const visible = await tab.isVisible().catch(() => false);
    if (!visible) {
      continue;
    }
    await tab.click();
    clickedTabs.push(tabName);
    await page.waitForTimeout(400);
  }

  if (clickedTabs.length === 0) {
    throw new Error('No visible portal tabs found after sign-in.');
  }

  await page.screenshot({ path: '04-portal-tabs.png', fullPage: true });
  return { mode: 'portal', clickedTabs, url: page.url() };
}
JS
)"
else
  log "Skipping sign-in. Set PORTAL_EMAIL and PORTAL_PASSWORD to continue into authenticated pages."
fi

log "Capturing final screenshot"
run_code "$(cat <<'JS'
async (page) => {
  await page.screenshot({ path: '98-final.png', fullPage: true });
  return { url: page.url(), title: await page.title() };
}
JS
)"

log "Workflow complete. Artifacts: $(pwd)"
