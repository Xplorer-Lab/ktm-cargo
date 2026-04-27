import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const shouldUseExternalBaseUrl = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: './e2e',
  // Route smoke tests share browser storage/session fixtures through query flags.
  // Keep them serial to avoid cross-test state bleed and local flake.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldUseExternalBaseUrl
    ? undefined
    : {
        command: 'VITE_ENABLE_E2E_FIXTURES=true npm run dev -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
