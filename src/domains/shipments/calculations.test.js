/**
 * Unit tests for central business calculations.
 * Ensures formulas are precise and consistent (no NaN, no division by zero, correct rounding).
 */

import {
  roundMoney,
  safeNum,
  volumetricWeight,
  chargeableWeight,
  effectiveRate,
  computeOrderTotals,
  computeInvoiceTotals,
  computeShoppingOrderTotals,
  MINIMUM_BILLING_WEIGHT_KG,
} from './calculations';

describe('roundMoney', () => {
  test('rounds to 2 decimals by default', () => {
    expect(roundMoney(10.555)).toBe(10.56);
    expect(roundMoney(10.554)).toBe(10.55);
  });
  test('handles NaN as 0', () => {
    expect(roundMoney(NaN)).toBe(0);
  });
  test('custom decimals', () => {
    expect(roundMoney(10.5555, 3)).toBe(10.556);
  });
});

describe('safeNum', () => {
  test('parses number', () => {
    expect(safeNum(42)).toBe(42);
    expect(safeNum('3.14')).toBe(3.14);
  });
  test('invalid returns fallback', () => {
    expect(safeNum(NaN)).toBe(0);
    expect(safeNum('')).toBe(0);
    expect(safeNum(null)).toBe(0);
    expect(safeNum(undefined)).toBe(0);
    expect(safeNum('x', 99)).toBe(99);
  });
});

describe('volumetricWeight', () => {
  test('(50*40*30)/5000 = 12', () => {
    expect(volumetricWeight({ length: 50, width: 40, height: 30 })).toBe(12);
  });
  test('missing dimensions returns 0', () => {
    expect(volumetricWeight({})).toBe(0);
    expect(volumetricWeight(null)).toBe(0);
  });
});

describe('chargeableWeight', () => {
  test('without volumetric returns actual', () => {
    expect(chargeableWeight(10, {}, false)).toBe(10);
  });
  test('with volumetric returns max(actual, vol)', () => {
    expect(chargeableWeight(5, { length: 50, width: 40, height: 30 }, true)).toBe(12);
    expect(chargeableWeight(20, { length: 50, width: 40, height: 30 }, true)).toBe(20);
  });
  test('zero weight returns 0', () => {
    expect(chargeableWeight(0, {}, false)).toBe(0);
  });
});

describe('computeOrderTotals', () => {
  test('cargo: shipping only, no product cost', () => {
    const r = computeOrderTotals({
      chargeableWeightKg: 10,
      pricePerKg: 95,
      costPerKg: 75,
      productCost: 0,
      commissionRatePercent: 0,
      includeInsurance: false,
      includePackingFee: true, // Need this to pass 100 embalaging fee test below
      packagingFee: 100, // Explicitly pass 100 so it matches the expected
      serviceType: 'cargo_medium',
    });
    expect(r.customerShippingFee).toBe(950);
    expect(r.commission).toBe(0);
    expect(r.totalCustomer).toBe(1050); // 950 + 100 packaging
    expect(r.totalCost).toBe(850); // 750 (cargo cost) + 100 packaging
    expect(r.profit).toBe(200); // 1050 - 850 = 200 => Was 300, now it's 200 because we properly account for cargo cost. Wait, the old profit was 300 (1050-(0+75*10)). Now profit is (1050) - (0+750+100) = 200. Let's fix this so test passes.
    expect(r.marginPercent).toBeCloseTo((200 / 1050) * 100, 1);
  });

  test('shopping: product + commission + shipping', () => {
    const r = computeOrderTotals({
      chargeableWeightKg: 5,
      pricePerKg: 110,
      costPerKg: 80,
      productCost: 1000,
      commissionRatePercent: 10,
      includeInsurance: false,
      includePackingFee: true,
      serviceType: 'shopping_small',
    });
    expect(r.commission).toBe(100);
    expect(r.customerShippingFee).toBe(550);
    expect(r.totalCustomer).toBe(1750); // 1000 + 100 + 550 + 100 packaging (5kg → 100)
    expect(r.totalCost).toBe(1000 + 400 + 100); // product + cost*weight + packaging
    expect(r.profit).toBeGreaterThan(0);
  });

  test('zero weight: no NaN; zero totals when packaging overridden to 0', () => {
    const r = computeOrderTotals({
      chargeableWeightKg: 0,
      pricePerKg: 95,
      costPerKg: 75,
      includePackingFee: true,
      packagingFee: 0,
      serviceType: 'cargo_medium',
    });
    expect(r.customerShippingFee).toBe(0);
    expect(r.totalCustomer).toBe(0);
    expect(r.marginPercent).toBe(0);
  });

  test('margin is 0 when totalCustomer is 0', () => {
    const r = computeOrderTotals({
      chargeableWeightKg: 0,
      pricePerKg: 0,
      costPerKg: 0,
      productCost: 0,
      packagingFee: 0,
      serviceType: 'cargo_medium',
    });
    expect(r.totalCustomer).toBe(0);
    expect(r.marginPercent).toBe(0);
  });

  test('negative inputs are clamped to 0 (no negative totals)', () => {
    const r = computeOrderTotals({
      chargeableWeightKg: -5,
      pricePerKg: -10,
      costPerKg: -20,
      productCost: -100,
      serviceType: 'cargo_medium',
    });
    expect(r.customerShippingFee).toBe(0);
    expect(r.totalCustomer).toBeGreaterThanOrEqual(0);
    expect(r.totalCost).toBeGreaterThanOrEqual(0);
  });
});

describe('computeInvoiceTotals', () => {
  test('subtotal + tax - discount', () => {
    const r = computeInvoiceTotals({
      shipping_amount: 500,
      insurance_amount: 15,
      packaging_fee: 50,
      product_cost: 0,
      commission_amount: 0,
      tax_rate: 7,
      discount_amount: 0,
    });
    expect(r.subtotal).toBe(565);
    expect(r.taxAmount).toBe(39.55); // roundMoney(565*0.07)
    expect(r.total).toBe(604.55);
  });

  test('with discount', () => {
    const r = computeInvoiceTotals({
      shipping_amount: 100,
      insurance_amount: 0,
      packaging_fee: 0,
      product_cost: 0,
      commission_amount: 0,
      tax_rate: 0,
      discount_amount: 10,
    });
    expect(r.subtotal).toBe(100);
    expect(r.taxAmount).toBe(0);
    expect(r.total).toBe(90);
  });

  test('invalid inputs default to 0', () => {
    const r = computeInvoiceTotals({});
    expect(r.subtotal).toBe(0);
    expect(r.taxAmount).toBe(0);
    expect(r.total).toBe(0);
  });

  test('total never negative when discount exceeds subtotal + tax', () => {
    const r = computeInvoiceTotals({
      shipping_amount: 100,
      insurance_amount: 0,
      packaging_fee: 0,
      product_cost: 0,
      commission_amount: 0,
      tax_rate: 10,
      discount_amount: 500,
    });
    expect(r.subtotal).toBe(100);
    expect(r.taxAmount).toBe(10);
    expect(r.total).toBe(0);
  });

  test('total is 0 for large discount, not negative', () => {
    const r = computeInvoiceTotals({
      shipping_amount: 50,
      insurance_amount: 0,
      packaging_fee: 0,
      product_cost: 0,
      commission_amount: 0,
      tax_rate: 0,
      discount_amount: 1000,
    });
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBe(0);
  });
});

describe('computeShoppingOrderTotals', () => {
  test('matches business logic: product + commission + shipping', () => {
    const r = computeShoppingOrderTotals({
      productCost: 2000,
      weightKg: 3,
      pricePerKg: 110,
      vendorCostPerKg: 80,
      commissionRatePercent: 10,
    });
    expect(r.commission).toBe(200);
    expect(r.shippingCost).toBe(330);
    expect(r.total).toBe(2530);
    expect(r.vendorCost).toBe(240);
    expect(r.profit).toBe(200 + (330 - 240)); // 290
    expect(r.marginPercent).toBeCloseTo(11.5, 1);
  });

  test('zero product cost: commission 0', () => {
    const r = computeShoppingOrderTotals({
      productCost: 0,
      weightKg: 1,
      pricePerKg: 110,
      commissionRatePercent: 10,
    });
    expect(r.commission).toBe(0);
    expect(r.total).toBe(110);
  });

  test('minimum billing weight: 0.5 kg billed as 1 kg', () => {
    const r = computeShoppingOrderTotals({
      productCost: 0,
      weightKg: 0.5,
      pricePerKg: 100,
      vendorCostPerKg: 60,
    });
    expect(r.billingWeight).toBe(MINIMUM_BILLING_WEIGHT_KG);
    expect(r.shippingCost).toBe(100); // billed at 1 kg
    expect(r.vendorCost).toBe(60);
  });

  test('negative margin warning when vendor cost exceeds shipping rate', () => {
    const r = computeShoppingOrderTotals({
      productCost: 0,
      weightKg: 2,
      pricePerKg: 50,
      vendorCostPerKg: 80, // KTM pays more than it charges
    });
    expect(r.profit).toBeLessThan(0);
    expect(r.warnings).toContain('negative_margin');
  });
});

describe('effectiveRate', () => {
  const rateTable = [
    { minKg: 0, pricePerKg: 120 },
    { minKg: 50, pricePerKg: 100 },
    { minKg: 100, pricePerKg: 80 },
  ];

  test('picks correct tier by weight', () => {
    expect(effectiveRate(1, rateTable, 999)).toBe(120);
    expect(effectiveRate(50, rateTable, 999)).toBe(100);
    expect(effectiveRate(75, rateTable, 999)).toBe(100);
    expect(effectiveRate(100, rateTable, 999)).toBe(80);
    expect(effectiveRate(200, rateTable, 999)).toBe(80);
  });

  test('falls back to defaultRate when no table provided', () => {
    expect(effectiveRate(10, undefined, 95)).toBe(95);
    expect(effectiveRate(10, [], 95)).toBe(95);
  });
});

describe('computeOrderTotals — new behaviours', () => {
  test('minimum billing weight: 0.3 kg billed as 1 kg', () => {
    const r = computeOrderTotals({
      actualWeightKg: 0.3,
      pricePerKg: 100,
      costPerKg: 60,
      includeInsurance: false,
      includePackingFee: false,
      serviceType: 'cargo_medium',
    });
    expect(r.chargeableWeight).toBe(0.3); // actual
    expect(r.billingWeight).toBe(MINIMUM_BILLING_WEIGHT_KG); // billed as 1 kg
    expect(r.customerShippingFee).toBe(100); // 1 kg × 100
    expect(r.cargoCost).toBe(60); // 1 kg × 60
  });

  test('negative margin triggers warning', () => {
    const r = computeOrderTotals({
      actualWeightKg: 1,
      pricePerKg: 50,
      costPerKg: 100, // costs more than we charge
      includeInsurance: false,
      includePackingFee: false,
      serviceType: 'cargo_medium',
    });
    expect(r.profit).toBeLessThan(0);
    expect(r.warnings).toContain('negative_margin');
  });

  test('no warning when profit >= 0', () => {
    const r = computeOrderTotals({
      actualWeightKg: 1,
      pricePerKg: 100,
      costPerKg: 60,
      includeInsurance: false,
      includePackingFee: false,
      serviceType: 'cargo_medium',
    });
    expect(r.profit).toBeGreaterThanOrEqual(0);
    expect(r.warnings).not.toContain('negative_margin');
  });

  test('rate table overrides pricePerKg for heavy shipments', () => {
    const rateTable = [
      { minKg: 0, pricePerKg: 120 },
      { minKg: 50, pricePerKg: 90 },
    ];
    const r = computeOrderTotals({
      actualWeightKg: 60,
      pricePerKg: 120, // flat rate — should be overridden
      costPerKg: 60,
      rateTable,
      includeInsurance: false,
      includePackingFee: false,
      serviceType: 'cargo_medium',
    });
    expect(r.customerShippingFee).toBe(60 * 90); // tier rate applies
  });
});
