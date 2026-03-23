/**
 * Central business calculations for KTM Cargo Express.
 * Single source of truth for cargo/shopping pricing, profit, and invoice totals.
 * All UI and services should use these functions so formulas are precise and consistent.
 *
 * Rounding: Money is rounded to 2 decimal places (THB). Weight to 3 decimal places.
 */

const VOLUMETRIC_DIVISOR = 5000;

/** Industry-standard minimum billable weight (kg). */
export const MINIMUM_BILLING_WEIGHT_KG = 1;

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
 * Resolve effective selling rate from an optional tiered rate table.
 * Falls back to defaultRate if no table is provided or no tier matches.
 *
 * Rate table format (sorted ascending by minKg):
 *   [{ minKg: 0, pricePerKg: 120 }, { minKg: 50, pricePerKg: 100 }, ...]
 *
 * @param {number} weightKg
 * @param {Array<{ minKg: number, pricePerKg: number }>|undefined} rateTable
 * @param {number} defaultRate
 * @returns {number}
 */
export function effectiveRate(weightKg, rateTable, defaultRate) {
  if (!rateTable || rateTable.length === 0) return defaultRate;
  const w = safeNum(weightKg);
  // Pick the highest minKg tier that the weight qualifies for
  const tier = [...rateTable].sort((a, b) => b.minKg - a.minKg).find((t) => w >= safeNum(t.minKg));
  return tier ? Math.max(0, safeNum(tier.pricePerKg)) : defaultRate;
}

/**
 * Compute shipping, insurance, commission, surcharges, totals and profit.
 * Packaging fee is disabled (set to 0) — not part of KTM's billing model.
 *
 * @param {{
 *   actualWeightKg: number,
 *   pricePerKg: number,         // Selling price per kg (overridden by rateTable if provided)
 *   costPerKg: number,          // Cargo cost per kg
 *   rateTable?: Array<{ minKg: number, pricePerKg: number }>, // Tiered selling rates
 *   useVolumetric?: boolean,
 *   dimensionsCm?: { length, width, height },
 *   productCost?: number,
 *   commissionRatePercent?: number,
 *   insuranceRatePercent?: number,
 *   includeInsurance?: boolean,
 *   surcharges?: Array<{ applies_to: string, surcharge_type: 'fixed'|'percentage', amount: number }>,
 *   serviceType?: string,
 * }} params
 * @returns {{
 *   chargeableWeight: number,   // Physical/volumetric weight (display)
 *   billingWeight: number,      // Billed weight — min 1 kg (industry standard)
 *   cargoCost: number,
 *   customerShippingFee: number,
 *   insuranceFee: number,
 *   commission: number,
 *   surchargeTotal: number,
 *   totalCustomer: number,
 *   totalCost: number,
 *   profit: number,
 *   marginPercent: number,
 *   warnings: string[],         // 'negative_margin' when profit < 0
 * }}
 */
export function computeOrderTotals(params) {
  const actualWeight = Math.max(0, safeNum(params.actualWeightKg || params.chargeableWeightKg));
  const useVolumetric = Boolean(params.useVolumetric);

  // 1. Physical/volumetric weight (for display)
  const w =
    useVolumetric && params.dimensionsCm
      ? chargeableWeight(actualWeight, params.dimensionsCm, true)
      : actualWeight;

  // 2. Billing weight — industry standard minimum 1 kg
  const billingWeight = w > 0 ? Math.max(MINIMUM_BILLING_WEIGHT_KG, w) : 0;

  // 3. Effective selling rate (tiered table overrides flat pricePerKg)
  const sellingPricePerKg = effectiveRate(
    billingWeight,
    params.rateTable,
    Math.max(0, safeNum(params.pricePerKg))
  );
  const cargoCostPerKg = Math.max(0, safeNum(params.costPerKg));
  const productCost = Math.max(0, safeNum(params.productCost));

  const commissionRate = safeNum(params.commissionRatePercent, 0);
  const insuranceRate = safeNum(params.insuranceRatePercent, 3);
  const includeInsurance = params.includeInsurance !== false;
  const serviceType = params.serviceType || '';

  // 4. Core fees — based on billingWeight
  const customerShippingFee = roundMoney(sellingPricePerKg * billingWeight);
  const cargoCost = roundMoney(cargoCostPerKg * billingWeight);

  // 5. Insurance (collected from customer — not KTM's internal expense)
  const insuranceFee = includeInsurance
    ? roundMoney(customerShippingFee * (insuranceRate / 100))
    : 0;

  // 6. Commission (shopping orders only)
  const isShopping = String(serviceType).startsWith('shopping');
  const commission = isShopping ? roundMoney(productCost * (commissionRate / 100)) : 0;

  // 7. Surcharges
  let surchargeTotal = 0;
  const surcharges = params.surcharges || [];
  for (const s of surcharges) {
    if (!s) continue;
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

  // 8. Final totals
  // totalCustomer = productCost + shipping + insurance + commission + surcharge
  const totalCustomer = roundMoney(
    productCost + customerShippingFee + insuranceFee + commission + surchargeTotal
  );

  // totalCost = productCost + cargoCost (packaging removed)
  const totalCost = roundMoney(productCost + cargoCost);

  // profit = commission + (customerShippingFee - cargoCost) + insuranceFee + surchargeTotal
  const profit = roundMoney(
    commission + (customerShippingFee - cargoCost) + insuranceFee + surchargeTotal
  );
  const marginPercent = totalCustomer > 0 ? roundMoney((profit / totalCustomer) * 100, 1) : 0;

  // 9. Warnings
  const warnings = [];
  if (profit < 0) warnings.push('negative_margin');

  return {
    chargeableWeight: w,
    billingWeight,
    cargoCost,
    customerShippingFee,
    insuranceFee,
    commission,
    surchargeTotal,
    totalCustomer,
    totalCost,
    profit,
    marginPercent,
    warnings,
  };
}

/**
 * Invoice totals: subtotal, tax (on subtotal), total after discount.
 * Use same rounding so invoice matches order when line items match.
 *
 * @param {{
 *   shipping_amount: number,
 *   insurance_amount: number,
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
  const product = Math.max(0, safeNum(params.product_cost));
  const commission = Math.max(0, safeNum(params.commission_amount));
  const taxRate = Math.max(0, safeNum(params.tax_rate));
  const discount = Math.max(0, safeNum(params.discount_amount));

  const subtotal = roundMoney(shipping + insurance + product + commission);
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
 * @returns {{
 *   productCost: number,
 *   commission: number,
 *   shippingCost: number,
 *   billingWeight: number,
 *   total: number,
 *   vendorCost: number,
 *   profit: number,
 *   marginPercent: number,
 *   warnings: string[],
 * }}
 */
export function computeShoppingOrderTotals(params) {
  const productCost = Math.max(0, safeNum(params.productCost));
  const weight = Math.max(0, safeNum(params.weightKg));
  const pricePerKg = Math.max(0, safeNum(params.pricePerKg));
  const vendorCostPerKg = Math.max(0, safeNum(params.vendorCostPerKg));
  const commissionRate = safeNum(params.commissionRatePercent, 0);

  // Minimum 1 kg billing weight (industry standard)
  const billingWeight = weight > 0 ? Math.max(MINIMUM_BILLING_WEIGHT_KG, weight) : 0;

  const commission = roundMoney(productCost * (commissionRate / 100));
  const shippingCost = roundMoney(billingWeight * pricePerKg);
  const total = roundMoney(productCost + commission + shippingCost);
  const vendorCost = roundMoney(billingWeight * vendorCostPerKg);
  const profit = roundMoney(commission + (shippingCost - vendorCost));
  const marginPercent = total > 0 ? roundMoney((profit / total) * 100, 1) : 0;

  const warnings = [];
  if (profit < 0) warnings.push('negative_margin');

  return {
    productCost,
    commission,
    shippingCost,
    billingWeight,
    total,
    vendorCost,
    profit,
    marginPercent,
    warnings,
  };
}
