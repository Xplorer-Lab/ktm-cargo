import fs from 'fs';
import path from 'path';
import { shipmentSchema, shoppingOrderSchema } from '@/domains/core/schemas';

const indexPath = path.resolve(process.cwd(), 'src', 'pages', 'index.jsx');
const layoutPath = path.resolve(process.cwd(), 'src', 'pages', 'Layout.jsx');
const invoicesPath = path.resolve(process.cwd(), 'src', 'pages', 'Invoices.jsx');
const procurementInvoiceServicePath = path.resolve(
  process.cwd(),
  'src',
  'components',
  'procurement',
  'InvoiceService.jsx'
);
const dbPath = path.resolve(process.cwd(), 'src', 'api', 'db.js');
const customerSupportPath = path.resolve(
  process.cwd(),
  'src',
  'components',
  'portal',
  'CustomerSupport.jsx'
);

function extractRoutePaths(source) {
  const routeRegex = /<Route\s[^>]*path=["']([^"']+)["']/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(source)) !== null) {
    routes.push(match[1]);
  }
  return routes;
}

function extractNavItems(source) {
  const navRegex = /\{[\s\S]*?name:\s*'([^']+)'[\s\S]*?page:\s*'([^']+)'[\s\S]*?\}/g;
  const items = [];
  let match;
  while ((match = navRegex.exec(source)) !== null) {
    items.push({ name: match[1], page: match[2] });
  }
  return items;
}

function extractWorkflowStagePages(source) {
  const sectionRegex = /title:\s*'Workflow Stages'[\s\S]*?items:\s*\[([\s\S]*?)\][\s\S]*?\}/;
  const sectionBlock = source.match(sectionRegex)?.[1] || '';
  const pageRegex = /page:\s*'([^']+)'/g;
  const pages = [];
  let match;
  while ((match = pageRegex.exec(sectionBlock)) !== null) {
    pages.push(match[1]);
  }
  return pages;
}

function extractTypeConfigKeys(source) {
  const block = source.match(/const\s+TYPE_CONFIG\s*=\s*\{([\s\S]*?)\};/)?.[1] || '';
  const keyRegex = /^\s*([a-zA-Z0-9_]+)\s*:\s*\{/gm;
  const keys = [];
  let match;
  while ((match = keyRegex.exec(block)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

describe('Workflow route and pipeline contracts', () => {
  it('keeps workflow-stage route mapping available for operations', () => {
    const source = fs.readFileSync(indexPath, 'utf-8');
    const routes = extractRoutePaths(source);

    expect(routes).toEqual(
      expect.arrayContaining([
        '/PriceCalculator',
        '/ShoppingOrders',
        '/Procurement',
        '/Shipments',
        '/Invoices',
        '/FeedbackQueue',
        '/shipment',
        '/operation',
        '/invoice',
      ])
    );
  });

  it('keeps primary staff navigation ordered by business pipeline stages', () => {
    const source = fs.readFileSync(layoutPath, 'utf-8');
    const pagesInOrder = extractWorkflowStagePages(source);

    const quoteIndex = pagesInOrder.indexOf('PriceCalculator');
    const orderIntakeIndex = pagesInOrder.indexOf('ShoppingOrders');
    const bookingIndex = pagesInOrder.indexOf('Procurement');
    const transitIndex = pagesInOrder.indexOf('Shipments');
    const reconcileIndex = pagesInOrder.indexOf('Invoices');

    expect(quoteIndex).toBeGreaterThanOrEqual(0);
    expect(orderIntakeIndex).toBeGreaterThan(quoteIndex);
    expect(bookingIndex).toBeGreaterThan(orderIntakeIndex);
    expect(transitIndex).toBeGreaterThan(bookingIndex);
    expect(reconcileIndex).toBeGreaterThan(transitIndex);
  });

  it('keeps feedback queue and analytics as separate route labels', () => {
    const source = fs.readFileSync(layoutPath, 'utf-8');
    const navItems = extractNavItems(source);
    const feedbackQueueItem = navItems.find((item) => item.page === 'FeedbackQueue');
    const feedbackAnalyticsItem = navItems.find((item) => item.page === 'FeedbackAnalytics');

    expect(feedbackQueueItem).toBeTruthy();
    expect(feedbackAnalyticsItem).toBeTruthy();
    expect(feedbackQueueItem.name.toLowerCase()).not.toContain('analytics');
  });

  it('filters procurement invoices down to vendor bills before rendering the AP list', () => {
    const procurementSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src', 'pages', 'Procurement.jsx'),
      'utf-8'
    );

    expect(procurementSource).toMatch(
      /const vendorBills = invoices\.filter\(\(invoice\) => invoice\.invoice_type === 'vendor_bill'\)/
    );
  });

  it('supports vendor_bill type whenever procurement service emits vendor bills', () => {
    const invoicePageSource = fs.readFileSync(invoicesPath, 'utf-8');
    const procurementInvoiceServiceSource = fs.readFileSync(procurementInvoiceServicePath, 'utf-8');

    const invoiceTypeKeys = extractTypeConfigKeys(invoicePageSource);
    const emitsVendorBill = /invoice_type:\s*'vendor_bill'/.test(procurementInvoiceServiceSource);

    if (emitsVendorBill) {
      expect(invoiceTypeKeys).toContain('vendor_bill');
    }
  });

  it('supports shopping->shipment handoff in an e2e business pipeline contract', () => {
    const shoppingOrder = shoppingOrderSchema.parse({
      customer_name: 'Mya Mya',
      customer_phone: '0991234567',
      product_links: 'https://example.com/item-1',
      product_details: 'Kitchen appliances',
      estimated_product_cost: 800,
      estimated_weight: 4,
      actual_weight: 4.2,
      commission_rate: 10,
      commission_amount: 80,
      shipping_cost: 420,
      total_amount: 1300,
      status: 'received',
      payment_status: 'deposit_paid',
      vendor_po_id: 'po-1',
      vendor_cost_per_kg: 80,
    });

    const shipment = shipmentSchema.parse({
      customer_name: shoppingOrder.customer_name,
      customer_phone: shoppingOrder.customer_phone,
      service_type: 'cargo_medium',
      weight_kg: shoppingOrder.actual_weight || shoppingOrder.estimated_weight || 1,
      items_description: shoppingOrder.product_details,
      delivery_address: shoppingOrder.delivery_address || 'Yangon',
      vendor_po_id: shoppingOrder.vendor_po_id,
      vendor_cost_per_kg: shoppingOrder.vendor_cost_per_kg,
      status: 'confirmed',
      payment_status: 'unpaid',
    });

    expect(shipment.customer_name).toBe(shoppingOrder.customer_name);
    expect(shipment.items_description).toBe(shoppingOrder.product_details);
    expect(shipment.vendor_po_id).toBe(shoppingOrder.vendor_po_id);
  });

  it('wires journey spine clients in db layer when journey schema exists', () => {
    const dbSource = fs.readFileSync(dbPath, 'utf-8');

    expect(dbSource).toMatch(/orderJourneys:\s*createEntityClient\('order_journeys'/);
    expect(dbSource).toMatch(/journeyEvents:\s*createEntityClient\('journey_events'/);
    expect(dbSource).toMatch(/orderJourneys:\s*createSafeEntityClient\('order_journeys'/);
    expect(dbSource).toMatch(/journeyEvents:\s*createSafeEntityClient\('journey_events'/);
  });

  it('uses support_ticket semantics for customer support (split-safe contract)', () => {
    const supportSource = fs.readFileSync(customerSupportPath, 'utf-8');
    const usesDedicatedSupportTable = /db\.supportTickets\./.test(supportSource);
    const usesFeedbackKindSupportTicket = /feedback_kind:\s*'support_ticket'/.test(supportSource);

    expect(usesDedicatedSupportTable || usesFeedbackKindSupportTicket).toBe(true);
  });
});
