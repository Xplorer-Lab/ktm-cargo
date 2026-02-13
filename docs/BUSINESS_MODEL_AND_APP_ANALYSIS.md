# Business Model vs App Analysis & Recommendations

**Date:** February 2025  
**Purpose:** Align the KTM Cargo Express app with your Thailand → Myanmar cargo/shopping business model, identify gaps, propose enhancements, and ensure financial logic is precise and error-free.

---

## 1. Your Business Model (Summary)

| Element | Description |
|--------|-------------|
| **Flow** | Clients in Myanmar order online → you buy on their behalf (e.g. Adidas, Lazada, Shopee) → add profit → ship to Myanmar. |
| **Revenue** | **Service fee** (on product cost) + **Cargo rate** (per kg, with margin). |
| **Cargo** | You get lower per-kg rates from logistics providers and resell at a marked-up price. No proprietary routing yet. |

---

## 2. App vs Business Model: Key Differences & Gaps

### 2.1 Alignments (What the App Already Supports)

- **Client management:** Customers, contacts, addresses (e.g. Yangon), segments.
- **Orders:** Shopping orders (product cost, weight, commission, shipping) and cargo shipments (weight, service type, vendor cost, price per kg).
- **Financial concepts:** Service fee as **commission** (% on product cost), **cargo margin** via `price_per_kg` vs `cost_per_kg` / `vendor_cost_per_kg`, insurance, packaging, surcharges.
- **Invoicing:** Customer invoices with line items (shipping, insurance, packaging, product cost, commission), tax, discount.
- **Procurement:** Purchase orders (POs), vendor costs per kg, weight allocation from POs to shopping orders.
- **Pricing config:** Settings → Pricing Manager for service types, cost/price per kg, insurance rate, packaging, surcharges.

### 2.2 Gaps and Differences

| Gap | Your Model | Current App | Recommendation |
|-----|------------|-------------|----------------|
| **Service fee vs “commission”** | Explicit “service fee” on product. | Implemented as **commission** (% of product cost). Naming differs; logic matches. | Optional: add a “Service fee” label in UI/PDFs and keep one underlying field (e.g. `commission_amount` / `commission_rate`) for consistency. |
| **Cargo rate = cost + margin** | Cargo rate includes predefined margin before offering to client. | App has `cost_per_kg` (vendor/cost basis) and `price_per_kg` (customer). Margin is implicit (price − cost). | **Align:** Ensure all flows use **Pricing Manager** (or a single source) for price/cost per kg so “cargo rate” is always cost + configured margin. |
| **Single source for shopping rate** | One clear cargo/shopping rate to clients. | **ShoppingOrderForm** uses **hardcoded `110`** THB/kg; InvoiceService uses **110** for shopping invoices. PriceCalculator and ShipmentForm use DB/defaults. | **Critical:** Replace hardcoded `110` with rate from **service pricing** (e.g. `shopping_small` or a dedicated “shopping” service) or from business settings. |
| **Product management** | Products from Lazada, Shopee, etc.; track what was bought. | No product catalog or “source platform” (Lazada/Shopee). Orders have free-text `product_details` / `product_links`. | Add **Product/Source** concept: optional product list or at least **source platform** (Lazada / Shopee / Adidas / Other) and link to orders for reporting and reorders. |
| **Routing / logistics** | No proprietary routing yet; use major logistics providers. | No explicit “logistics provider” or “route” on shipments. | Add optional **logistics provider** and **route/carrier** on shipments (and optionally on service pricing) for future routing and cost analysis. |
| **Formula consistency** | Same formulas everywhere. | Formulas duplicated in **PriceCalculator**, **ShipmentForm**, **ShoppingOrderForm**, **InvoiceForm**, **InvoiceService**, **ShoppingInvoiceService**. | Introduce a **central calculation module** (see Section 4) so all screens and invoices use the same logic. |

---

## 3. App Objectives vs Current State

| Objective | Status | Notes |
|-----------|--------|--------|
| **1. Client Management** | ✅ In place | Customers, segments, portal; consider “preferred service type” and “default commission %” per client. |
| **2. Product Management** | ⚠️ Partial | No catalog; only order-level product details/links. Add product/source platform and optional catalog. |
| **3. Financial Management** | ✅ In place | Invoices, payments, vendor bills, PO costs; ensure all numbers come from central logic. |
| **4. Invoice System** | ✅ In place | Draft → Issued, line items, tax, discount; manual creation from shipments/shopping orders. |
| **5. Business logic & formulas** | ⚠️ Needs hardening | Logic is correct in spirit but duplicated and some values (e.g. 110) hardcoded; needs centralisation and tests. |

---

## 4. Innovative Ideas for Internal Efficiency

Since the app is **internal-only**, these focus on operations, accuracy, and speed.

1. **Central calculation engine (single source of truth)**  
   One module (e.g. `src/lib/calculations.js`) that computes:
   - Cargo/shopping: chargeable weight (actual vs volumetric), shipping cost, insurance, packaging, commission, surcharges, total, profit, margin.
   - Invoice: subtotal, tax, discount, total.
   All UI and invoice generation call this; no copy-paste formulas. Enables unit tests and consistent rounding.

2. **Source platform and product tagging**  
   - Add **source_platform** (Lazada, Shopee, Adidas, Other) to shopping orders.  
   - Optional **product catalog** (name, link, typical weight/cost) for quick add and reorders.  
   - Reports by source and product type for purchasing and pricing.

3. **Logistics provider and route (future-proof)**  
   - Optional **logistics_provider** and **route** on shipments (and possibly on service pricing).  
   - When you add routing later, you can assign cost/price by provider/route without changing app structure.

4. **Quote-to-order and order-to-invoice consistency**  
   - When creating a shipment or shopping order from a quote (Price Calculator), pass through the **same** service type, weight, rates, and commission so quote = order.  
   - When creating an invoice from order/shipment, use the **same** calculation engine so invoice totals always match order/shipment totals (except for manual overrides, which should be explicit).

5. **Default rates from business settings**  
   - **Default shopping price per kg** (and optional default cost per kg) in Settings so new orders and invoices use one place instead of hardcoded 110.  
   - Optionally default commission % from Settings (already have `default_commission_rate`).

6. **Weight and currency rounding policy**  
   - Document and implement one policy: e.g. weight to 2 decimals, money in THB to 2 decimals (or whole baht if you prefer).  
   - Use the central engine for all rounding so invoices, reports, and UI never diverge.

7. **Audit trail for financial changes**  
   - Log when key financial fields change (e.g. price_per_kg, commission_rate, discount) and by whom, for dispute resolution and audits.

8. **Quick actions from lists**  
   - From Shopping Orders: “Create invoice,” “Allocate to PO,” “Mark received” in one click where possible.  
   - From Shipments: “Create invoice,” “Print waybill” to reduce clicks.

9. **Dashboard by margin and service**  
   - KPIs: profit and margin by service type (cargo vs shopping), by source platform, and by logistics provider once you have it.  
   - Alerts when margin falls below a set threshold (e.g. after rate changes).

10. **Batch invoice creation**  
    - Select multiple shipments or shopping orders and “Create draft invoices” in one go, using the central engine so totals are consistent.

---

## 5. Business Logic and Formula Precision

### 5.1 Current Formula Summary

- **Volumetric weight:** `(L × W × H) / 5000` (standard divisor).  
- **Chargeable weight:** `max(actual weight, volumetric weight)` when volumetric is used.  
- **Shipping (cargo/shopping):** `price_per_kg × chargeable_weight`.  
- **Insurance:** `shipping_cost × (insurance_rate / 100)` (e.g. 3%).  
- **Packaging:** Fixed by weight tier or from service (e.g. &lt;5 kg → 50, &lt;15 kg → 100, else 200).  
- **Commission (service fee):** `product_cost × (commission_rate / 100)`.  
- **Surcharges:** Fixed or percentage of shipping; applied by service type (all/cargo/shopping/express).  
- **Customer total:** `product_cost + shipping + insurance + packaging + commission + surcharges`.  
- **Your cost (shopping):** `product_cost + vendor_cost + insurance` (product pass-through; you earn commission + shipping margin).  
- **Profit:** `customer_total − your_cost`; **margin:** `(profit / customer_total) × 100` when `customer_total > 0`.  
- **Invoice:** `subtotal = shipping + insurance + packaging + product + commission`; `tax = round(subtotal × tax_rate / 100)`; `total = subtotal + tax − discount`.

### 5.2 Risks for “Absolute Precision”

| Risk | Where | Fix |
|------|--------|-----|
| **Different rounding** | Some places use `Math.round`, others implicit float. | Central engine with a single `roundMoney(value)` (e.g. 2 decimals or whole baht) and use it for all displayed and stored amounts. |
| **Hardcoded rates** | ShoppingOrderForm, InvoiceService, InvoiceForm use `110`. | Use Pricing Manager or business settings; no magic numbers. |
| **Duplicate logic** | Six+ places recompute shipping/commission/totals. | Single module; UI and InvoiceService only call it. |
| **Float precision** | `0.1 + 0.2`-style errors in totals. | Use integer cents/satang or a small decimal library and round at output. |
| **Tax/discount order** | Currently: tax on subtotal, then subtract discount. | Document clearly (e.g. “Tax on subtotal; discount applied after tax”) and implement only in central engine. |
| **Division by zero** | margin when total is 0. | Central checks: margin = total > 0 ? (profit/total)*100 : 0. |
| **Negative or NaN** | parseFloat('') or invalid inputs. | Central engine: normalize inputs (e.g. `parseFloat(x)\|\|0`), validate ranges (weight &gt; 0, 0 ≤ rates ≤ 100), and return defined numbers or clear errors. |

### 5.3 Recommended: Central Calculation Module

- **File:** e.g. `src/lib/calculations.js` (or `src/lib/businessCalculations.js`).  
- **Functions (examples):**
  - `getChargeableWeight(actualKg, dimensionsCm, useVolumetric)`
  - `computeShippingAndExtras({ weight, pricePerKg, costPerKg, productCost, commissionRatePercent, insuranceRatePercent, packagingFee, surcharges, serviceType })`
  - `computeInvoiceTotals({ shipping, insurance, packaging, product, commission, taxRatePercent, discountAmount })`
- **Rounding:** One helper, e.g. `roundMoney(amount, decimals = 2)`.  
- **Usage:** PriceCalculator, ShipmentForm, ShoppingOrderForm, InvoiceForm, InvoiceService, ShoppingInvoiceService, and any reports that show the same totals should all call this module.  
- **Tests:** Unit tests for every function with edge cases (zero weight, zero product cost, 100% commission, zero tax, full discount, etc.) so “absolute precision” is guaranteed and regressions are caught.

### 5.4 Implemented: Central Module

A central calculation module has been added at **`src/lib/calculations.js`** with:

- **`roundMoney(value, decimals)`** – consistent rounding for THB.
- **`safeNum(value, fallback)`** – parse with no NaN.
- **`volumetricWeight(dimensions)`** – (L×W×H)/5000.
- **`chargeableWeight(actualKg, dimensionsCm, useVolumetric)`** – max(actual, volumetric) when applicable.
- **`computeOrderTotals(params)`** – shipping, insurance, packaging, commission, surcharges, total, cost, profit, margin (for both cargo and shopping).
- **`computeInvoiceTotals(params)`** – subtotal, tax on subtotal, total after discount.
- **`computeShoppingOrderTotals(params)`** – product cost, commission, shipping, vendor cost, profit, margin.

Next steps: (1) Add unit tests (e.g. `src/lib/calculations.test.js`); (2) Refactor PriceCalculator, ShipmentForm, ShoppingOrderForm, InvoiceForm, and InvoiceService to import and use these functions instead of inline formulas.

---

## 6. Summary: What to Do First

1. **Remove hardcoded shopping rate (110):** Use service pricing or business settings everywhere (ShoppingOrderForm, InvoiceService, InvoiceForm).  
2. **Introduce central calculation module:** Move all formulas there; add rounding and validation; add unit tests.  
3. **Use central module everywhere:** Refactor PriceCalculator, ShipmentForm, ShoppingOrderForm, InvoiceForm, InvoiceService, and shopping invoice creation to use it.  
4. **Add default shopping rate (and optional default cost) in Settings:** Single place to change “cargo/shopping rate” offered to clients.  
5. **Optional but valuable:** Source platform (Lazada/Shopee/Adidas/Other) on orders; optional logistics provider/route on shipments; product catalog or product tagging for better reporting and reorders.

This keeps your business logic aligned with the app, improves operational efficiency, and makes financial calculations precise and maintainable.
