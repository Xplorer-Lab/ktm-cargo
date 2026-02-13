/**
 * Central business calculations for KTM Cargo Express.
 * Single source of truth for cargo/shopping pricing, profit, and invoice totals.
 * All UI and services should use these functions so formulas are precise and consistent.
 *
 * Rounding: Money is rounded to 2 decimal places (THB). Weight to 3 decimal places.
 */

const VOLUMETRIC_DIVISOR = 5000;

/**
 * Round a number to specified decimal places (avoids float noise).
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function roundMoney(value, decimals = 2) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/**
 * Safe parse: returns 0 for NaN, null, undefined, or invalid.
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export function safeNum(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Volumetric weight (kg): (L × W × H cm) / 5000.
 * @param {{ length?: number|string, width?: number|string, height?: number|string }} dimensions - cm
 * @returns {number}
 */
export function volumetricWeight(dimensions) {
  if (!dimensions || typeof dimensions !== 'object') return 0;
  const l = safeNum(dimensions.length);
  const w = safeNum(dimensions.width);
  const h = safeNum(dimensions.height);
  if (l <= 0 || w <= 0 || h <= 0) return 0;
  return roundMoney((l * w * h) / VOLUMETRIC_DIVISOR, 3);
}

/**
 * Chargeable weight: max(actualKg, volumetricKg) when useVolumetric, else actualKg.
 * @param {number} actualKg
 * @param {{ length?, width?, height? }} dimensionsCm
 * @param {boolean} useVolumetric
 * @returns {number}
 */
export function chargeableWeight(actualKg, dimensionsCm, useVolumetric) {
  const actual = safeNum(actualKg);
  if (actual <= 0) return 0;
  if (!useVolumetric) return roundMoney(actual, 3);
  const vol = volumetricWeight(dimensionsCm || {});
  return roundMoney(Math.max(actual, vol), 3);
}

/**
 * Default packaging fee by weight (THB). Can be overridden by service.
 * @param {number} weightKg
 * @param {number} [overrideFee] - from service config
 * @returns {number}
 */
export function packagingFeeByWeight(weightKg, overrideFee) {
  if (typeof overrideFee === 'number' && Number.isFinite(overrideFee)) return roundMoney(overrideFee);
  const w = safeNum(weightKg);
  if (w < 5) return 50;
  if (w < 15) return 100;
  return 200;
}

/**
 * Compute shipping, insurance, packaging, commission, surcharges, totals and profit.
 * Uses same logic as PriceCalculator, ShipmentForm, ShoppingOrderForm so quote = order = invoice.
 *
 * @param {{
 *   chargeableWeightKg: number,
 *   pricePerKg: number,
 *   costPerKg: number,
 *   productCost?: number,
 *   commissionRatePercent?: number,
 *   insuranceRatePercent?: number,
 *   includeInsurance?: boolean,
 *   packagingFee?: number,
 *   surcharges?: Array<{ applies_to: string, surcharge_type: 'fixed'|'percentage', amount: number }>,
 *   serviceType?: string,
 * }} params
 * @returns {{
 *   shippingCost: number,
 *   insuranceFee: number,
 *   packagingFee: number,
 *   commission: number,
 *   surchargeTotal: number,
 *   totalCustomer: number,
 *   totalCost: number,
 *   profit: number,
 *   marginPercent: number,
 * }}
 */
export function computeOrderTotals(params) {
  const w = safeNum(params.chargeableWeightKg);
  const pricePerKg = safeNum(params.pricePerKg);
  const costPerKg = safeNum(params.costPerKg);
  const productCost = safeNum(params.productCost);
  const commissionRate = safeNum(params.commissionRatePercent, 0);
  const insuranceRate = safeNum(params.insuranceRatePercent, 3);
  const includeInsurance = params.includeInsurance !== false;
  const serviceType = params.serviceType || '';

  const shippingCost = roundMoney(pricePerKg * w);
  const insuranceFee = includeInsurance ? roundMoney(shippingCost * (insuranceRate / 100)) : 0;
  const packagingFee = roundMoney(
    packagingFeeByWeight(w, params.packagingFee)
  );
  const isShopping = String(serviceType).startsWith('shopping');
  const commission = isShopping ? roundMoney(productCost * (commissionRate / 100)) : 0;

  let surchargeTotal = 0;
  const surcharges = params.surcharges || [];
  for (const s of surcharges) {
    const applies =
      s.applies_to === 'all' ||
      (s.applies_to === 'cargo' && serviceType.startsWith('cargo')) ||
      (s.applies_to === 'shopping' && serviceType.startsWith('shopping')) ||
      (s.applies_to === 'express' && serviceType === 'express');
    if (applies) {
      surchargeTotal +=
        s.surcharge_type === 'fixed' ? safeNum(s.amount) : roundMoney((shippingCost * safeNum(s.amount)) / 100);
    }
  }
  surchargeTotal = roundMoney(surchargeTotal);

  const totalCustomer = roundMoney(
    productCost + shippingCost + insuranceFee + packagingFee + commission + surchargeTotal
  );
  const totalCost = roundMoney(productCost + costPerKg * w + insuranceFee);
  const profit = roundMoney(totalCustomer - totalCost);
  const marginPercent = totalCustomer > 0 ? roundMoney((profit / totalCustomer) * 100, 1) : 0;

  return {
    shippingCost,
    insuranceFee,
    packagingFee,
    commission,
    surchargeTotal,
    totalCustomer,
    totalCost,
    profit,
    marginPercent,
  };
}

/**
 * Invoice totals: subtotal, tax (on subtotal), total after discount.
 * Use same rounding so invoice matches order when line items match.
 *
 * @param {{
 *   shipping_amount: number,
 *   insurance_amount: number,
 *   packaging_fee: number,
 *   product_cost: number,
 *   commission_amount: number,
 *   tax_rate: number,
 *   discount_amount: number,
 * }} params
 * @returns {{ subtotal: number, taxAmount: number, total: number }}
 */
export function computeInvoiceTotals(params) {
  const shipping = safeNum(params.shipping_amount);
  const insurance = safeNum(params.insurance_amount);
  const packaging = safeNum(params.packaging_fee);
  const product = safeNum(params.product_cost);
  const commission = safeNum(params.commission_amount);
  const taxRate = safeNum(params.tax_rate);
  const discount = safeNum(params.discount_amount);

  const subtotal = roundMoney(shipping + insurance + packaging + product + commission);
  const taxAmount = Math.round(roundMoney((subtotal * taxRate) / 100));
  const total = roundMoney(subtotal + taxAmount - discount);

  return { subtotal, taxAmount, total };
}

/**
 * Shopping order: commission + shipping; profit = commission + (shipping - vendor cost).
 * Product cost is pass-through. Use for display and validation.
 *
 * @param {{
 *   productCost: number,
 *   weightKg: number,
 *   pricePerKg: number,
 *   vendorCostPerKg?: number,
 *   commissionRatePercent?: number,
 * }} params
 * @returns {{ productCost: number, commission: number, shippingCost: number, total: number, vendorCost: number, profit: number, marginPercent: number }}
 */
export function computeShoppingOrderTotals(params) {
  const productCost = safeNum(params.productCost);
  const weight = safeNum(params.weightKg);
  const pricePerKg = safeNum(params.pricePerKg);
  const vendorCostPerKg = safeNum(params.vendorCostPerKg);
  const commissionRate = safeNum(params.commissionRatePercent, 0);

  const commission = roundMoney(productCost * (commissionRate / 100));
  const shippingCost = roundMoney(weight * pricePerKg);
  const total = roundMoney(productCost + commission + shippingCost);
  const vendorCost = roundMoney(weight * vendorCostPerKg);
  const profit = roundMoney(commission + (shippingCost - vendorCost));
  const marginPercent = total > 0 ? roundMoney((profit / total) * 100, 1) : 0;

  return {
    productCost,
    commission,
    shippingCost,
    total,
    vendorCost,
    profit,
    marginPercent,
  };
}
