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
  if (typeof overrideFee === 'number' && Number.isFinite(overrideFee))
    return roundMoney(overrideFee);
  const w = safeNum(weightKg);
  if (w < 5) return 50;
  if (w < 15) return 100;
  return 200;
}

/**
 * Compute shipping, insurance, packaging, commission, surcharges, totals and profit.
 * Updated for "Dropshipping / Personal Shopper Model" as default.
 *
 * @param {{
 *   actualWeightKg: number,
 *   pricePerKg: number, // Selling Price Per Kg
 *   costPerKg: number, // Cargo Cost Per Kg
 *   useVolumetric?: boolean, // Toggle for future expansion
 *   dimensionsCm?: { length, width, height },
 *   includePackingFee?: boolean, // Toggle for self-packing MVP
 *   packagingFee?: number,
 *   productCost?: number,
 *   commissionRatePercent?: number,
 *   insuranceRatePercent?: number,
 *   includeInsurance?: boolean,
 *   surcharges?: Array<{ applies_to: string, surcharge_type: 'fixed'|'percentage', amount: number }>,
 *   serviceType?: string,
 * }} params
 * @returns {{
 *   chargeableWeight: number,
 *   cargoCost: number,
 *   customerShippingFee: number,
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
  const actualWeight = Math.max(0, safeNum(params.actualWeightKg || params.chargeableWeightKg));
  const useVolumetric = Boolean(params.useVolumetric);

  // 1. Calculate the final working weight
  const w =
    useVolumetric && params.dimensionsCm
      ? chargeableWeight(actualWeight, params.dimensionsCm, true)
      : actualWeight;

  const sellingPricePerKg = Math.max(0, safeNum(params.pricePerKg));
  const cargoCostPerKg = Math.max(0, safeNum(params.costPerKg));
  const productCost = Math.max(0, safeNum(params.productCost));

  const commissionRate = safeNum(params.commissionRatePercent, 0);
  const insuranceRate = safeNum(params.insuranceRatePercent, 3);
  const includeInsurance = params.includeInsurance !== false;
  const includePackingFee = Boolean(params.includePackingFee);
  const serviceType = params.serviceType || '';

  // 2. Core Dropshipping Calculations
  const customerShippingFee = roundMoney(sellingPricePerKg * w);
  const cargoCost = roundMoney(cargoCostPerKg * w);

  // 3. Optional MVP Features (Packing & Insurance)
  const insuranceFee = includeInsurance
    ? roundMoney(customerShippingFee * (insuranceRate / 100))
    : 0;
  const packagingFee = includePackingFee
    ? roundMoney(packagingFeeByWeight(w, params.packagingFee))
    : 0;

  const isShopping = String(serviceType).startsWith('shopping');
  const commission = isShopping ? roundMoney(productCost * (commissionRate / 100)) : 0;

  // 4. Surcharges
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
        s.surcharge_type === 'fixed'
          ? safeNum(s.amount)
          : roundMoney((customerShippingFee * safeNum(s.amount)) / 100);
    }
  }
  surchargeTotal = roundMoney(surchargeTotal);

  // 5. Final Totals
  const totalCustomer = roundMoney(
    productCost + customerShippingFee + insuranceFee + packagingFee + commission + surchargeTotal
  );

  // Total internally incurred cost (insuranceFee is collected from customer, not KTM's expense)
  const totalCost = roundMoney(productCost + cargoCost + packagingFee);

  // Profit = Commission + (Customer Shipping Fee - Cargo Cost) + Insurance Fee + Surcharges
  const profit = roundMoney(totalCustomer - totalCost);
  const marginPercent = totalCustomer > 0 ? roundMoney((profit / totalCustomer) * 100, 1) : 0;

  return {
    chargeableWeight: w,
    cargoCost,
    customerShippingFee,
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
  const shipping = Math.max(0, safeNum(params.shipping_amount));
  const insurance = Math.max(0, safeNum(params.insurance_amount));
  const packaging = Math.max(0, safeNum(params.packaging_fee));
  const product = Math.max(0, safeNum(params.product_cost));
  const commission = Math.max(0, safeNum(params.commission_amount));
  const taxRate = Math.max(0, safeNum(params.tax_rate));
  const discount = Math.max(0, safeNum(params.discount_amount));

  const subtotal = roundMoney(shipping + insurance + packaging + product + commission);
  const taxAmount = roundMoney((subtotal * taxRate) / 100);
  const total = roundMoney(Math.max(0, subtotal + taxAmount - discount));

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
  const productCost = Math.max(0, safeNum(params.productCost));
  const weight = Math.max(0, safeNum(params.weightKg));
  const pricePerKg = Math.max(0, safeNum(params.pricePerKg));
  const vendorCostPerKg = Math.max(0, safeNum(params.vendorCostPerKg));
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
