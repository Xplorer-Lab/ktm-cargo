/**
 * Unit tests for central business calculations.
 * Ensures formulas are precise and consistent (no NaN, no division by zero, correct rounding).
 */

import {
  roundMoney,
  safeNum,
  volumetricWeight,
  chargeableWeight,
  computeOrderTotals,
  computeInvoiceTotals,
  computeShoppingOrderTotals,
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
      serviceType: 'cargo_medium',
    });
    expect(r.shippingCost).toBe(950);
    expect(r.commission).toBe(0);
    expect(r.totalCustomer).toBe(1050); // 950 + 100 packaging
    expect(r.totalCost).toBe(750);
    expect(r.profit).toBe(300);
    expect(r.marginPercent).toBeCloseTo(28.57, 1);
  });

  test('shopping: product + commission + shipping', () => {
    const r = computeOrderTotals({
      chargeableWeightKg: 5,
      pricePerKg: 110,
      costPerKg: 80,
      productCost: 1000,
      commissionRatePercent: 10,
      serviceType: 'shopping_small',
    });
    expect(r.commission).toBe(100);
    expect(r.shippingCost).toBe(550);
    expect(r.totalCustomer).toBe(1700); // 1000 + 100 + 550 + 50 packaging
    expect(r.totalCost).toBe(1000 + 400 + 16.5); // product + cost*weight + insurance
    expect(r.profit).toBeGreaterThan(0);
  });

  test('zero weight: no NaN; zero totals when packaging overridden to 0', () => {
    const r = computeOrderTotals({
      chargeableWeightKg: 0,
      pricePerKg: 95,
      costPerKg: 75,
      packagingFee: 0,
      serviceType: 'cargo_medium',
    });
    expect(r.shippingCost).toBe(0);
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
    expect(r.taxAmount).toBe(40); // round(565*0.07)
    expect(r.total).toBe(605);
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
});
