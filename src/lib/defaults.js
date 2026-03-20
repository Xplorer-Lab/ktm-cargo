/**
 * Application-wide default pricing and business constants.
 *
 * These are **fallback** values used when neither `service_pricing` (DB table)
 * nor `company_settings.default_shopping_price_per_kg` (user settings) are
 * available.  At runtime the cascade should be:
 *
 *   1. service_pricing table (highest priority)
 *   2. company_settings / user business_settings
 *   3. These constants (lowest priority — last resort only)
 *
 * To change default pricing for all new environments, update the values here
 * and apply the corresponding changes in the Supabase service_pricing table.
 */

/** Default shopping service rate in ฿ per kg */
export const DEFAULT_SHOPPING_PRICE_PER_KG = 110;

/**
 * Canonical service-type pricing defaults.
 *
 * Each entry carries a `costBasis` (internal cost) and `price` (customer-facing
 * rate).  Components that display service-type dropdowns should import this
 * array rather than defining their own copy.
 *
 * When the `service_pricing` DB table is populated these values are overridden
 * at runtime; they exist solely as sensible fallbacks.
 */
export const SERVICE_TYPE_DEFAULTS = [
  { value: 'cargo_small', label: 'Cargo (1-5kg)', costBasis: 90, price: 120 },
  { value: 'cargo_medium', label: 'Cargo (6-15kg)', costBasis: 75, price: 95 },
  { value: 'cargo_large', label: 'Cargo (16-30kg)', costBasis: 55, price: 70 },
  {
    value: 'shopping_small',
    label: 'Shopping + Small Items',
    costBasis: 80,
    price: DEFAULT_SHOPPING_PRICE_PER_KG,
  },
  { value: 'shopping_fashion', label: 'Shopping + Fashion/Electronics', costBasis: 85, price: 115 },
  { value: 'shopping_bulk', label: 'Shopping + Bulk Order', costBasis: 70, price: 90 },
  { value: 'express', label: 'Express (1-2 days)', costBasis: 100, price: 150 },
  { value: 'standard', label: 'Standard (3-5 days)', costBasis: 75, price: 95 },
];
