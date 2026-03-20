import { expect, test } from '@playwright/test';

test.describe('KTM route and workflow smoke', () => {
  test('landing page renders core public entry points', async ({ page }) => {
    await page.goto('/?__e2e=public');

    await expect(page.getByRole('heading', { name: /Seamless Logistics/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View KTM Profile/i }).first()).toBeVisible();
    await expect(page.getByText(/no self-service checkout or web ordering/i)).toBeVisible();
  });

  test('protected operations route redirects unauthenticated users to the public home page', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=public');

    await page.waitForURL(/\/\?__e2e=public$/);
    await expect(page.getByRole('heading', { name: /Seamless Logistics/i })).toBeVisible();
  });

  test('client portal renders the brochure instead of client actions', async ({ page }) => {
    await page.goto('/ClientPortal?__e2e=public');

    await expect(page.getByRole('heading', { name: /Company Profile/i })).toBeVisible();
    await expect(page.getByText(/public brochure/i)).toBeVisible();
    await expect(page.getByText(/no self-service ordering/i)).toBeVisible();
  });

  test('authenticated staff lands on operations workflow instead of legacy dashboard', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=staff-admin');

    await expect(page.getByRole('heading', { name: /KTM Cargo Workflow Spine/i })).toBeVisible();
    await expect(page.getByText(/One canonical journey for staff operations/i)).toBeVisible();
  });

  test('legacy dashboard route redirects into the operations workflow', async ({ page }) => {
    await page.goto('/Dashboard?__e2e=staff-admin');

    await page.waitForURL(/\/Operations\?__e2e=staff-admin$/);
    await expect(page.getByRole('heading', { name: /KTM Cargo Workflow Spine/i })).toBeVisible();
  });

  test('common typo aliases redirect to canonical staff routes', async ({ page }) => {
    await page.goto('/shipment?__e2e=workflow-staff');
    await page.waitForURL(/\/Shipments\?__e2e=workflow-staff$/);
    await expect(page.getByRole('heading', { name: /Shipments/i })).toBeVisible();

    await page.goto('/operation?__e2e=workflow-staff');
    await page.waitForURL(/\/Operations\?__e2e=workflow-staff$/);
    await expect(page.getByRole('heading', { name: /KTM Cargo Workflow Spine/i })).toBeVisible();

    await page.goto('/invoice?__e2e=workflow-staff');
    await page.waitForURL(/\/Invoices\?__e2e=workflow-staff$/);
    await expect(page.getByRole('heading', { name: /Invoices/i })).toBeVisible();
  });

  test('public feedback link bypasses the app layout', async ({ page }) => {
    await page.goto('/Feedback?shipment=ship-123&__e2e=public');

    await expect(page.getByRole('heading', { name: /How was your experience/i })).toBeVisible();
    await expect(page.getByText(/Operations Console/i)).toHaveCount(0);
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
