import { expect, test } from '@playwright/test';

test.describe('KTM workflow slice', () => {
  test('staff sees the canonical operations spine and seeded business records', async ({
    page,
  }) => {
    await page.goto('/Operations?__e2e=workflow-staff');

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible();
    await expect(page.getByText(/Here's what's happening with your business today/i)).toBeVisible();

    await page.goto('/ShoppingOrders?__e2e=workflow-staff');
    await expect(page.getByRole('heading', { name: /Orders/i })).toBeVisible();
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

    await page.goto('/FeedbackQueue?__e2e=workflow-staff');
    await expect(page.getByRole('heading', { name: /Feedback Queue/i })).toBeVisible();
    await expect(
      page.getByText(/Staff-facing queue for delivery feedback follow-up/i)
    ).toBeVisible();
  });

  test('shopping orders can launch a shipment draft from the current workflow record', async ({
    page,
  }) => {
    await page.goto('/ShoppingOrders?__e2e=workflow-staff');

    await page.getByRole('button', { name: /View/i }).first().click();
    await expect(page.getByRole('heading', { name: /Order Details/i })).toBeVisible();

    await page.getByRole('button', { name: /Convert to Shipment/i }).click();
    await expect(page).toHaveURL(/\/Shipments\?__e2e=workflow-staff$/);
    await expect(page.getByRole('heading', { name: /^Edit Shipment$/i })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toContainText(/Mya Mya/i);
  });

  test('shipment detail actions update lifecycle state in place', async ({ page }) => {
    await page.goto('/Shipments?__e2e=workflow-staff');

    await page.getByText('SHP-202603-0002').click();
    await expect(page.getByText(/Shipment Details/i)).toBeVisible();

    await page.getByRole('combobox').nth(0).click();
    await page.getByRole('option', { name: /Delivered/i }).click();
    await expect(page.getByText(/^delivered$/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Request Feedback/i })).toBeVisible();

    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: /^Paid$/i }).click();
    await expect(page.getByText(/^paid$/i).first()).toBeVisible();
  });

  test('public landing page reads as a brochure only', async ({ page }) => {
    await page.goto('/?__e2e=public');

    await expect(page.getByRole('heading', { name: /KTM က ဘာတွေ လုပ်ပေးလဲ/i })).toBeVisible();
    await expect(page.getByText(/Online checkout မပါ — inquiry only/i)).toBeVisible();
    await expect(page.getByText(/Facebook ဖြင့်မေးမြန်းရန်/i)).toBeVisible();
  });
});
