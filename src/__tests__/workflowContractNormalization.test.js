import fs from 'fs';
import path from 'path';
import {
  feedbackSchema,
  journeyEventSchema,
  orderJourneySchema,
  purchaseOrderSchema,
  shipmentSchema,
  shoppingOrderSchema,
  vendorSchema,
} from '@/domains/core/schemas';

const feedbackServicePath = path.resolve(
  process.cwd(),
  'src',
  'components',
  'feedback',
  'FeedbackRequestService.jsx',
);

const basePurchaseOrder = {
  vendor_id: 'vendor-1',
  vendor_name: 'Carrier Co',
  order_date: '2026-03-20',
  total_weight: 20,
  price_per_kg: 120,
  total_amount: 2400,
};

const baseVendor = {
  name: 'Carrier Co',
  contact_name: 'Ops Team',
  phone: '0991234567',
};

const baseShipment = {
  customer_name: 'Aung Aung',
  service_type: 'cargo_medium',
  weight_kg: 5,
  items_description: 'Consumer goods',
};

function getFeedbackRequestStatusLiteral() {
  const source = fs.readFileSync(feedbackServicePath, 'utf-8');
  const match = source.match(/status:\s*'([^']+)'/);
  return match?.[1] || null;
}

describe('Workflow contract normalization', () => {
  it('normalizes purchase-order aliases into canonical status values', () => {
    const canonical = purchaseOrderSchema.parse({ ...basePurchaseOrder, status: 'sent' });
    const legacySent = purchaseOrderSchema.parse({
      ...basePurchaseOrder,
      status: 'sent_to_vendor',
    });
    const legacyPartial = purchaseOrderSchema.parse({
      ...basePurchaseOrder,
      status: 'partially_received',
    });
    const legacyFull = purchaseOrderSchema.parse({
      ...basePurchaseOrder,
      status: 'fully_received',
    });

    expect(canonical.status).toBe('sent');
    expect(legacySent.status).toBe('sent');
    expect(legacyPartial.status).toBe('partial_received');
    expect(legacyFull.status).toBe('received');
  });

  it('normalizes vendor-type aliases into cargo_carrier', () => {
    const canonical = vendorSchema.parse({ ...baseVendor, vendor_type: 'cargo_carrier' });
    const legacyCargo = vendorSchema.parse({ ...baseVendor, vendor_type: 'cargo' });
    const legacySupplierCargo = vendorSchema.parse({
      ...baseVendor,
      vendor_type: 'supplier_cargo',
    });

    expect(canonical.vendor_type).toBe('cargo_carrier');
    expect(legacyCargo.vendor_type).toBe('cargo_carrier');
    expect(legacySupplierCargo.vendor_type).toBe('cargo_carrier');
  });

  it('enforces strict shipment lifecycle statuses', () => {
    expect(
      shipmentSchema.safeParse({ ...baseShipment, status: 'in_transit' }).success,
    ).toBe(true);
    expect(
      shipmentSchema.safeParse({ ...baseShipment, status: 'unexpected_status' }).success,
    ).toBe(false);
  });

  it('keeps shopping-order schema aligned with operational fields used in forms', () => {
    const payload = {
      customer_name: 'Aung Aung',
      customer_phone: '0991234567',
      product_links: 'https://shop.example/item-1',
      product_details: '2x phone accessories',
      estimated_product_cost: 1000,
      actual_product_cost: 1100,
      estimated_weight: 2.5,
      actual_weight: 2.6,
      commission_rate: 10,
      commission_amount: 110,
      shipping_cost: 390,
      total_amount: 1600,
      delivery_address: 'Yangon',
      vendor_po_id: 'po-1',
      vendor_cost_per_kg: 90,
      vendor_cost: 234,
      status: 'purchasing',
      payment_status: 'deposit_paid',
    };
    const parsed = shoppingOrderSchema.parse(payload);

    expect(parsed).toHaveProperty('product_links');
    expect(parsed).toHaveProperty('estimated_weight');
    expect(parsed).toHaveProperty('actual_weight');
    expect(parsed).toHaveProperty('shipping_cost');
    expect(parsed).toHaveProperty('delivery_address');
    expect(parsed).toHaveProperty('vendor_po_id');
    expect(parsed).toHaveProperty('vendor_cost_per_kg');
    expect(parsed).toHaveProperty('vendor_cost');
  });

  it('keeps feedback request status aligned with feedback schema status enum', () => {
    const feedbackRequestStatus = getFeedbackRequestStatusLiteral();
    expect(feedbackRequestStatus).toBeTruthy();

    const parseResult = feedbackSchema.safeParse({
      shipment_id: 'ship-1',
      customer_name: 'Aung Aung',
      rating: 5,
      status: feedbackRequestStatus,
    });
    expect(parseResult.success).toBe(true);
  });

  it('provides journey-spine schemas for lifecycle + event tracking', () => {
    const journey = orderJourneySchema.parse({
      journey_number: 'JRNY-0001',
      mode: 'shopping_proxy',
      current_stage: 'quoted',
      payment_status: 'partial',
      customer_name: 'Aung Aung',
    });

    const journeyEvent = journeyEventSchema.parse({
      journey_id: 'journey-1',
      event_type: 'stage_transition',
      stage_from: 'quoted',
      stage_to: 'confirmed',
      entity_type: 'manual',
    });

    expect(journey.current_stage).toBe('quoted');
    expect(journeyEvent.stage_to).toBe('confirmed');
    expect(journeyEvent.event_status).toBe('recorded');
  });
});
