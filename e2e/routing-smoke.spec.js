import { expect, test } from '@playwright/test';

test.describe('KTM route and workflow smoke', () => {
  test('landing page renders core public entry points', async ({ page }) => {
    await page.goto('/?__e2e=public');

    await expect(page.getByRole('heading', { name: /Seamless Logistics/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Sign In$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Track$/i })).toBeVisible();
  });

  test('protected operations route redirects unauthenticated users to client portal', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=public');

    await page.waitForURL(/\/ClientPortal\?__e2e=public$/);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });

  test('authenticated staff lands on operations workflow instead of legacy dashboard', async ({
    page,
  }) => {
    await page.goto('/ClientPortal?__e2e=staff-admin');

    await page.waitForURL(/\/Operations\?__e2e=staff-admin$/);
    await expect(page.getByRole('heading', { name: /KTM Cargo Workflow Spine/i })).toBeVisible();
    await expect(page.getByText(/One canonical journey for staff operations/i)).toBeVisible();
  });

  test('misconfigured staff reaches stable unauthorized state instead of bouncing', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=staff-misconfigured');

    await expect(page.getByRole('heading', { name: /Access Not Configured/i })).toBeVisible();
    await expect(page).toHaveURL(/\/Operations\?__e2e=staff-misconfigured$/);
  });

  test('price calculator bypasses app layout with or without trailing slash', async ({ page }) => {
    await page.goto('/PriceCalculator?__e2e=public');
    await expect(page.getByRole('heading', { name: /Price Calculator/i })).toBeVisible();
    await expect(page.getByText(/Bangkok → Yangon Shipping Rates/i)).toBeVisible();
    await expect(page.getByText(/Operations Console/i)).toHaveCount(0);

    await page.goto('/PriceCalculator/?__e2e=public');
    await expect(page.getByRole('heading', { name: /Price Calculator/i })).toBeVisible();
    await expect(page.getByText(/Operations Console/i)).toHaveCount(0);
  });
});
