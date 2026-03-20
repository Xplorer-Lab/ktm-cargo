import { expect, test } from '@playwright/test';

test.describe('KTM workflow slice', () => {
  test('staff sees the canonical operations spine and seeded business records', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=workflow-staff');

    await expect(page.getByRole('heading', { name: /KTM Cargo Workflow Spine/i })).toBeVisible();
    await expect(page.getByText(/Client Inquiry & Quote/i)).toBeVisible();
    await expect(page.getByText(/Payment & Order Confirmation/i)).toBeVisible();
    await expect(page.getByText(/Accounting & After-sales/i)).toBeVisible();

    await page.goto('/ShoppingOrders?__e2e=workflow-staff');
    await expect(page.getByRole('heading', { name: /Shopping Orders/i })).toBeVisible();
    await expect(page.getByText('SHOP-202603-0001')).toBeVisible();
    await expect(page.getByText(/Kitchen appliances bundle/i)).toBeVisible();

    await page.goto('/Shipments?__e2e=workflow-staff');
    await expect(page.getByRole('heading', { name: /Shipments/i })).toBeVisible();
    await expect(page.getByText('SHP-202603-0001')).toBeVisible();
    await expect(page.getByText('Mya Mya').first()).toBeVisible();
    await expect(page.getByText(/delivered/i).first()).toBeVisible();

    await page.goto('/Procurement?__e2e=workflow-staff');
    await expect(page.getByRole('heading', { name: /Procurement Portal/i })).toBeVisible();
    await expect(page.getByText('PO-202603-0001')).toBeVisible();
    await expect(page.getByText(/Approved/i).first()).toBeVisible();

    await page.goto('/Invoices?__e2e=workflow-staff');
    await expect(page.getByRole('heading', { name: /Invoices/i })).toBeVisible();
    await expect(page.getByText('INV-202603-0001')).toBeVisible();
    await expect(page.getByText('BILL-202603-0001')).toBeVisible();
  });

  test('customer portal resolves the customer journey with history, invoices, support, and feedback', async ({
    page,
  }) => {
    await page.goto('/ClientPortal?__e2e=workflow-customer');

    await expect(page.getByText(/Customer Portal/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome back, Mya Mya!/i })).toBeVisible();

    await page.getByRole('tab', { name: /History/i }).click();
    await expect(page.getByText(/Order History \(4\)/i)).toBeVisible();
    await expect(page.getByText('SHOP-202603-0001')).toBeVisible();
    await expect(page.getByText('SHP-202603-0001')).toBeVisible();

    await page.getByRole('tab', { name: /Invoices/i }).click();
    await expect(page.getByText(/^Invoices$/i).first()).toBeVisible();
    await expect(page.getByText('INV-202603-0001')).toBeVisible();

    await page.getByRole('tab', { name: /Support/i }).click();
    await expect(page.getByText(/Submit a Request/i).first()).toBeVisible();

    await page.goto('/Feedback?shipment=shipment-1&journey=journey-1&__e2e=workflow-customer');
    await expect(page.getByRole('heading', { name: /How was your experience\?/i })).toBeVisible();
    await expect(page.getByText('SHP-202603-0001')).toBeVisible();
  });

  test('vendor portal resolves purchase orders and vendor bills', async ({ page }) => {
    await page.goto('/ClientPortal?__e2e=workflow-vendor');

    await expect(page.getByText(/Vendor Portal/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome, Carrier Co!/i })).toBeVisible();

    await page.getByRole('tab', { name: /Orders/i }).click();
    await expect(page.getByText(/Purchase Orders \(1\)/i)).toBeVisible();
    await expect(page.getByText('PO-202603-0001')).toBeVisible();

    await page.getByRole('tab', { name: /Invoices/i }).click();
    await expect(page.getByText(/Vendor Bills/i).first()).toBeVisible();
    await expect(page.getByText('BILL-202603-0001')).toBeVisible();
  });
});
