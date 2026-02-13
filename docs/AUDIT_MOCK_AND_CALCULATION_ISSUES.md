# Audit: Mock Data, Legacy Data, Duplicates & Placeholder Logic

**Date:** 2025-02-13  
**Scope:** Identify functions using mock/legacy/duplicated data or placeholder logic instead of real calculation/API flow.  
**Trace:** Entry points → API/client → services → components → UI; calculation module (`src/lib/calculations.js`) as single source of truth.

---

## Findings overview

The audit checks that the app uses the central calculation module (`src/lib/calculations.js`) and real data sources instead of duplicated logic or hardcoded placeholders.

**1. Calculation logic not using the central module**  
Several components reimplement formulas that already exist in `src/lib/calculations.js`. PriceCalculator and ShipmentForm duplicate volumetric/chargeable weight and order totals (shipping, insurance, commission, profit, margin). InvoiceForm and InvoiceService duplicate invoice totals (subtotal, tax, total) and use a hardcoded `pricePerKg = 110` fallback in InvoiceService. The fix is to import and use `volumetricWeight()`, `chargeableWeight()`, `computeOrderTotals()`, and `computeInvoiceTotals()` from the calculations module and to remove the literal `110` in favour of settings/DB or 0.

**2. Mock / placeholder integrations**  
Some code is still stubbed or in-memory: messenger.js returns a mock success object with a todo for real API calls; InvoiceService uses an in-memory `invoiceSequence` instead of a DB-backed sequence. These should be replaced with real integrations or clearly documented and gated (messenger), and the invoice sequence should be moved to the DB.

**3. Hardcoded fallbacks**  
Missing or legacy values are filled with literal numbers (e.g. DocumentGenerator uses `95` when `price_per_kg` is missing; Settings and InvoiceService use `110`). Fallbacks should come from config/settings (e.g. `default_shopping_price_per_kg`) as a single source, or the UI should omit rate/amount when missing.

**4. Duplicated service type definitions**  
Service types (names, prices, cost basis) are defined in five places: InvoiceForm, PriceCalculator, ShipmentForm, CustomerNewOrder, PricingManager. Recommendation is one shared source (e.g. `src/constants/serviceTypes.js`) with default list, and components that need live pricing call `db.servicePricing` and merge (reuse or centralise PriceCalculator’s merge logic).

**5. Intentional sample/seed data**  
Tasks.jsx seed data, NotificationTemplateManager sample data, CustomerSegmentationEngine tiers, and test mocks are intentional; no change required for this audit.

**Severity and order of work**  
High priority: use the calculations module everywhere and remove the `110` placeholder in InvoiceService. Medium: config for fallbacks, DB invoice sequence, single source for service types, DB pricing in ShipmentForm, and document or implement messenger. Section 7 below gives the recommended order of fixes.

---

## 1. Calculation logic not using `src/lib/calculations.js`

### 1.1 PriceCalculator.jsx

| Location | Issue | Recommendation |
|----------|--------|----------------|
| Lines 162–171 | **Duplicate volumetric/chargeable weight:** Inline `(L×W×H)/5000` and `chargeableWeight = useVolumetric && vol > actual ? vol : actual` | Import and use `volumetricWeight()` and `chargeableWeight()` from `@/lib/calculations`. |
| Lines 179–209 | **Duplicate order totals:** Inline `shippingCost`, `insuranceFee`, `packagingFee`, `commission`, `surchargeTotal`, `totalCustomer`, `profit`, `margin` | Use `computeOrderTotals()` from `@/lib/calculations` with same params (chargeableWeightKg, pricePerKg, costPerKg, productCost, commissionRatePercent, includeInsurance, packagingFee, surcharges, serviceType). Keep `totalMMK = totalCustomer * exchangeRate` in component. |

**Root cause:** PriceCalculator was built before or in parallel with the central calculations module; it never refactored to use it.

---

### 1.2 ShipmentForm.jsx

| Location | Issue | Recommendation |
|----------|--------|----------------|
| Lines 52–61 | **Hardcoded service types:** `serviceTypes` array with fixed `costBasis` and `price` (90/120, 75/95, etc.) | Fetch from DB like PriceCalculator: `useQuery(['service-pricing'], () => db.servicePricing.filter({ is_active: true }))` and merge with a shared default list (or single source in one module). |
| Lines 119–131 | **Duplicate calculation:** Inline `vendorCost`, `price`, `insurance = price * 0.03`, `total`, `profit`, `margin` | Use `computeOrderTotals()` from `@/lib/calculations` (chargeableWeightKg, pricePerKg, costPerKg, packagingFee, includeInsurance, serviceType). Use `roundMoney` for display. |
| Line 129 | **Hardcoded insurance rate:** `price * 0.03` (3%) | Use insurance rate from service pricing or from calculations (e.g. `insuranceRatePercent` param). |

**Root cause:** ShipmentForm uses its own service list and formula set; no dependency on calculations.js or DB pricing.

---

### 1.3 InvoiceForm.jsx

| Location | Issue | Recommendation |
|----------|--------|----------------|
| Lines 42–50 | **Hardcoded SERVICE_TYPES:** Fixed list with `price` (120, 95, 70, 110, 115, 150, 95) | Load from `db.servicePricing` (or shared constant + DB override) so invoice service type options match PriceCalculator/ShipmentForm. |
| Lines 112–127 | **Duplicate invoice totals:** Inline `subtotal`, `taxAmount`, `total` (same formula as `computeInvoiceTotals`) | Use `computeInvoiceTotals()` from `@/lib/calculations` so rounding and formula match exactly. |
| Line 152 | **Inline shipping:** `setValue('shipping_amount', weight * pricePerKg)` | Acceptable for auto-fill; ensure saved/displayed totals still come from `computeInvoiceTotals` for consistency. |
| Lines 189, 197 | **Inline price_per_kg:** `Math.round((shipping / weight) * 100) / 100` when selecting order | Prefer deriving from order record; if recalc needed, consider a small helper that uses same rounding as calculations (e.g. `roundMoney`). |

**Root cause:** InvoiceForm duplicates both service type definitions and invoice total logic instead of using calculations.js and shared pricing source.

---

### 1.4 InvoiceService.js

| Location | Issue | Recommendation |
|----------|--------|----------------|
| **No import of calculations.js** | All totals and shipping are computed inline. | Use `computeInvoiceTotals()` for invoice totals; use `computeOrderTotals()` when building from shipment/order if full breakdown is needed. |
| Line 127 | **Inline:** `shippingAmount = weight * pricePerKg` | Keep as-is if values are from shipment; ensure any new “from scratch” flows use calculations.js. |
| Line 130 | **Inline:** `subtotal = shippingAmount + insuranceAmount + packagingFee` (createInvoiceFromShipment) | For consistency, build line items and call `computeInvoiceTotals()` so invoice totals match InvoiceForm and calculations.js. |
| Line 173 | **Placeholder fallback:** `pricePerKg = weight > 0 ? Math.round(...) : 110` | **Remove hardcoded `110`.** Use 0 or fetch default from settings/DB (e.g. `default_shopping_price_per_kg` or service pricing). |
| Lines 172–173 | **Inline:** `totalAmount = parseFloat(order.total_amount) || (productCost + commissionAmount + shippingCost)`; `pricePerKg = ... : 110` | Prefer order’s stored `price_per_kg` if available; default price from DB/settings, not literal `110`. |

**Root cause:** InvoiceService was written without the calculations module; fallback `110` is a literal placeholder.

---

## 2. Mock / placeholder integrations

### 2.1 src/api/integrations/messenger.js

| Location | Issue | Recommendation |
|----------|--------|----------------|
| Lines 14–18 | **Mock implementation:** `// Todo: Implement actual API calls`; returns `{ success: true, mock: true, platform }` | Replace with real LINE/Telegram API calls when integrating; until then, document as intentional stub and gate usage in UI if needed. |

---

### 2.2 Invoice sequence (InvoiceService.js)

| Location | Issue | Recommendation |
|----------|--------|----------------|
| Lines 19–20, 26–32 | **In-memory sequence:** `let invoiceSequence = 0`; comment: "in production, this should be database-managed" | Move to DB: e.g. Supabase sequence or a `invoice_sequences` table (e.g. per prefix/month) and increment in a transaction when generating. |

---

## 3. Hardcoded fallbacks and legacy defaults

### 3.1 DocumentGenerator.jsx

| Location | Issue | Recommendation |
|----------|--------|----------------|
| Lines 180–181 | **Fallback rate:** `shipment.price_per_kg \|\| 95` and same for amount calculation | Prefer no display of rate/amount if missing, or use a config value (e.g. from settings) instead of literal `95`. |

---

### 3.2 Settings.jsx

| Location | Issue | Recommendation |
|----------|--------|----------------|
| Line 138 | **Default:** `default_shopping_price_per_kg: 110` | Acceptable as app default if stored in DB/settings; ensure it’s the single source for “no rate” fallbacks (e.g. InvoiceService line 173). |
| Lines 618, 622 | **Fallback 110** when parsing input | Keep as UI fallback only; backend/InvoiceService should use stored setting, not re-use literal 110. |

---

## 4. Duplicated service type definitions

| File | Export/Constant | Issue |
|------|------------------|--------|
| **InvoiceForm.jsx** | `SERVICE_TYPES` | Hardcoded list with labels and prices. |
| **PriceCalculator.jsx** | `DEFAULT_SERVICE_TYPES` | Hardcoded list; merged with DB `servicePricing`. |
| **ShipmentForm.jsx** | `serviceTypes` (local) | Hardcoded list; no DB merge. |
| **CustomerNewOrder.jsx** | `SERVICE_TYPES` | Hardcoded list. |
| **PricingManager.jsx** | `SERVICE_TYPES` | Hardcoded list; also used for CRUD. |

**Recommendation:** Introduce a single source: e.g. `src/constants/serviceTypes.js` (or similar) with default list; components that need live pricing call `db.servicePricing.filter({ is_active: true })` and merge. PriceCalculator’s merge logic can be reused or moved to a shared hook/helper so ShipmentForm and InvoiceForm use the same list and pricing.

---

## 5. Sample / seed data (intentional)

| Location | Purpose | Verdict |
|----------|---------|--------|
| **Tasks.jsx** (lines 320–358) | Seed tasks with `estimated_cost: 5000`, `15000`, `7500`, etc. | Intentional onboarding/seed data; not mock production logic. |
| **NotificationTemplateManager.jsx** (lines 202–209) | `sampleData` for email template preview | Intentional preview data; no change needed. |
| **CustomerSegmentationEngine.jsx** | `minSpent: 50000`, etc. in `VALUE_TIERS` | Business constants; optional to move to config later. |
| **db.test.js / App.test.jsx** | Jest mocks for supabase and lazy components | Test mocks; leave as-is. |

---

## 6. Summary table

| Category | Files | Severity | Action |
|----------|--------|----------|--------|
| **Duplicate order/shipment calculation** | PriceCalculator.jsx, ShipmentForm.jsx | High | Use `computeOrderTotals`, `chargeableWeight`, `volumetricWeight` from `@/lib/calculations`. |
| **Duplicate invoice totals** | InvoiceForm.jsx, InvoiceService.js | High | Use `computeInvoiceTotals()` from `@/lib/calculations`. |
| **Placeholder fallback (110)** | InvoiceService.js (line 173) | High | Remove `110`; use 0 or DB/settings default. |
| **Hardcoded rate fallback (95)** | DocumentGenerator.jsx | Medium | Use config or omit when missing. |
| **Mock integration** | messenger.js | Medium | Document; replace with real API when ready. |
| **Invoice sequence in-memory** | InvoiceService.js | Medium | Move to DB-managed sequence. |
| **Duplicated service type lists** | InvoiceForm, ShipmentForm, PriceCalculator, CustomerNewOrder, PricingManager | Medium | Single source (constant + DB merge). |
| **ShipmentForm not using DB pricing** | ShipmentForm.jsx | Medium | Fetch and merge `db.servicePricing` like PriceCalculator. |

---

## 7. Recommended order of fixes

1. **InvoiceService.js:** Remove `110` fallback; use settings/DB default or 0. Optionally switch to `computeInvoiceTotals` / `computeOrderTotals` where building invoice from shipment/order.
2. **InvoiceForm.jsx:** Use `computeInvoiceTotals()` for the `calculated` useMemo; optionally load service types from DB.
3. **PriceCalculator.jsx:** Import `volumetricWeight`, `chargeableWeight`, `computeOrderTotals` from calculations; remove inline formulas.
4. **ShipmentForm.jsx:** Fetch `db.servicePricing`, merge with defaults; use `computeOrderTotals()` for the `calculated` useMemo.
5. **DocumentGenerator.jsx:** Replace `95` with a config value or avoid showing rate when missing.
6. **Service types:** Add shared module + DB merge; refactor the five usages to use it.
7. **Invoice sequence:** Implement DB-backed sequence and replace in-memory counter.
8. **messenger.js:** Either implement real API or clearly document as stub.

This audit traces from the single source of truth (`src/lib/calculations.js`) and entry points (main, API client, services) and lists every place that still uses mock data, legacy/duplicated logic, or placeholders so the team can fix them systematically.
