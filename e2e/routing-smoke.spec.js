import { expect, test } from '@playwright/test';

test.describe('KTM route and workflow smoke', () => {
  test('landing page renders as a public brochure', async ({ page }) => {
    await page.goto('/?__e2e=public');

    await expect(page.getByRole('heading', { name: /ထိုင်းမှ မြန်မာသို့/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /KTM က ဘာတွေ လုပ်ပေးလဲ/i })).toBeVisible();
    await expect(page.getByText(/Online checkout မပါ — inquiry only/i)).toBeVisible();
  });

  test('protected operations route redirects unauthenticated users to staff login', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=public');

    await expect(page).toHaveURL(/\/StaffLogin\?/);
    await expect(page.getByText(/Staff Login/i)).toBeVisible();
    await expect(page.getByText(/Continue to \/Operations/i)).toBeVisible();
  });

  test('legacy client portal route redirects to root', async ({ page }) => {
    await page.goto('/ClientPortal?__e2e=public');

    await expect(page.getByRole('heading', { name: /KTM က ဘာတွေ လုပ်ပေးလဲ/i })).toBeVisible();
  });

  test('authenticated staff lands on operations workflow instead of legacy dashboard', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=staff-admin');

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible();
    await expect(page.getByText(/Here's what's happening with your business today/i)).toBeVisible();
  });

  test('staff login returns users to the protected page they originally requested', async ({
    page,
  }) => {
    await page.goto('/Shipments?__e2e=staff-login');

    await page.waitForURL(/\/StaffLogin\?next=%2FShipments&__e2e=staff-login$/);
    await page.getByLabel('Email').fill('ops.workflow@ktm.test');
    await page.getByLabel('Password').fill('demo-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/Shipments\?__e2e=staff-login$/);
    await expect(page.getByRole('heading', { name: /Shipments/i })).toBeVisible();
  });

  test('non-staff login is blocked from staff operations', async ({ page }) => {
    await page.goto('/StaffLogin?__e2e=customer-login');

    await page.getByLabel('Email').fill('mya.workflow@ktm.test');
    await page.getByLabel('Password').fill('demo-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/Account Not Configured/i)).toBeVisible();
    await expect(
      page.getByText(/This account is not configured for staff operations/i)
    ).toBeVisible();
  });

  test('legacy dashboard route redirects into the operations workflow', async ({ page }) => {
    await page.goto('/Dashboard?__e2e=staff-admin');

    await page.waitForURL(/\/Operations\?__e2e=staff-admin$/);
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible();
  });

  test('common typo aliases redirect to canonical staff routes', async ({ page }) => {
    await page.goto('/shipment?__e2e=workflow-staff');
    await page.waitForURL(/\/Shipments\?__e2e=workflow-staff$/);
    await expect(page.getByRole('heading', { name: /Shipments/i })).toBeVisible();

    await page.goto('/operation?__e2e=workflow-staff');
    await page.waitForURL(/\/Operations\?__e2e=workflow-staff$/);
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible();

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
