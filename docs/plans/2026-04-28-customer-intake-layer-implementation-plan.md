# KTM Customer Intake Layer Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add the missing customer-facing intake layer to `ktm-cargo`: public price calculator, quote request form, Supabase-backed lead storage, staff operations visibility, and contact CTAs.

**Architecture:** Keep `ktm-cargo` as the only source of truth for KTM Express Cargo. Do not compare against or borrow from alternative KTM app/repo variants unless Freddie explicitly asks. Build the current business model directly into this repo: a thin public layer that captures customer intent and feeds the existing staff operating system. All pricing rules should live in one shared calculator module so landing page, quote form, staff views, and future chatbot use the same formulas.

**Tech Stack:** React 19, Vite, JavaScript/JSX, Tailwind CSS 4, Supabase, Zod, Jest, Playwright.

---

## Execution Guardrails

### Claude Code policy

Use Claude Code as a bounded executor, not as an uncontrolled autonomous committer.

```text
Hermes role: plan, orchestrate, review, verify, decide checkpoint boundaries
Claude Code role: implement one checkpoint/task at a time
GitHub role: branch, PR, CI, release gate
```

Rules:

```text
- Use `claude -p` print mode for one scoped task at a time.
- Set `--max-turns` for every Claude execution.
- Do not use `--dangerously-skip-permissions` unless explicitly approved.
- Do not allow Claude to commit, push, open PR, or merge without approval.
- After every Claude task, run local verification before continuing.
```

### GitHub checkpoint workflow

Use small PR-sized checkpoints:

```text
Checkpoint 0: planning + Claude/Hermes rules
Checkpoint 1: pricing utility + tests
Checkpoint 2: customer_inquiries migration + API wrapper
Checkpoint 3: public PriceCalculator + quote request form
Checkpoint 4: Operations inquiry queue
Checkpoint 5: E2E smoke tests + docs polish
```

Required local gate before push:

```bash
npm run format
npm run lint
npm test -- --passWithNoTests
npm run build
git diff --check
```

Relevant docs:

```text
docs/checkpoints/github-checkpoint-workflow.md
docs/checkpoints/customer-intake-checkpoints.md
CLAUDE.md
```

### Component-first architecture

Do not build this as one large page file. Use feature folders and thin route wrappers.

```text
src/
  features/
    customer-intake/
      api/
      components/
      hooks/
      lib/
      pages/
      __tests__/
  pages/
    PriceCalculator.jsx    # thin wrapper only
```

Soft file-size limits:

```text
Route wrapper:        <= 80 lines
Feature page:         <= 250 lines
Component:            <= 180 lines
Hook:                 <= 120 lines
Pure utility:         <= 150 lines
Test file:            <= 250 lines
```

### Source-of-truth rules

```text
- Pricing formulas live only in `src/features/customer-intake/lib/ktmPricing.js`.
- Supabase inquiry operations live only in `src/features/customer-intake/api/customerInquiries.js`.
- UI components call hooks/API modules; they do not contain DB logic.
- Public quote submission creates an inquiry/lead only.
- Staff review/manual conversion happens before shipment/order creation.
```

---

## 0. Current Findings

### Main repo

`ktm-cargo` is now the sole main project for KTM Express Cargo.

```text
/Users/ktythaung/ktm-repo-compare/ktm-cargo
```

Other KTM app/repo variants were alternative builds for the same business. Ignore them unless Freddie explicitly asks to inspect them.

### Why this repo is the base

```text
- Supabase-backed
- migrations included
- system spec exists
- public + staff routes exist
- build passes
- lint passes with warnings only
- closest fit for the real KTM Express Cargo operating model
```

### Existing routes in `ktm-cargo`

```text
Public:
- /
- /Feedback
- /StaffLogin
- /VendorRegistration

Staff:
- /Operations
- /Shipments
- /ShoppingOrders
- /Procurement
- /Invoices
- /Customers
- /Vendors
- /Inventory
- /Reports
- /Tasks
- /ShipmentDocuments
- /FeedbackQueue
- /FeedbackAnalytics
- /Settings
```

### Missing / weak area

The internal staff system is already broad. The missing piece is the **customer-facing intake layer**:

```text
Landing page
    ↓
Price calculator
    ↓
Quote request form
    ↓
Supabase inquiry/lead record
    ↓
Staff Operations queue
    ↓
Convert to Shipment or Shopping Order
```

---

## 1. Business Rules to Confirm Before Coding Money Logic

These are current working assumptions. Confirm before final implementation if any rule affects real customer price.

| Rule                           | Current assumption                                    |
| ------------------------------ | ----------------------------------------------------- |
| Route                          | Thailand ↔ Myanmar / Bangkok ↔ Yangon                 |
| Air cargo rate                 | 300 THB/kg                                            |
| Land cargo rate                | 180 THB/kg                                            |
| Weight rounding                | Round up to nearest 0.5kg                             |
| Minimum cargo weight           | Assumption: 0.5kg minimum billable weight             |
| Shopping commission            | 10% of product cost                                   |
| Minimum commission             | 100 THB                                               |
| Public calculator result       | Estimate only, not final invoice                      |
| Quote request                  | Staff confirms final price manually                   |
| Customer-facing order creation | Should create inquiry/lead first, not direct shipment |

### Canonical pricing examples

```text
Air, 3kg:
3 × 300 = 900 THB

Land, 3kg:
3 × 180 = 540 THB

Air, 1.2kg:
round up to 1.5kg
1.5 × 300 = 450 THB

Shopping product 700 THB:
10% = 70 THB, min applies
commission = 100 THB
```

---

## 2. Target User Flow

```text
Customer visits KTM website
        ↓
Sees air / land rates
        ↓
Uses calculator
        ↓
Gets estimate
        ↓
Clicks "Request Quote"
        ↓
Submits name + contact + item details
        ↓
Supabase stores inquiry
        ↓
Staff sees inquiry in Operations
        ↓
Staff contacts customer
        ↓
Staff converts inquiry to Shipment or Shopping Order
```

---

## 3. Data Model

Create a new lightweight `customer_inquiries` table. Do not overload shipments or shopping orders for raw leads.

### Proposed table

```sql
create table if not exists public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  contact_channel text not null check (contact_channel in ('phone', 'facebook', 'line', 'telegram', 'email', 'other')),
  contact_value text not null,
  service_type text not null check (service_type in ('air_cargo', 'land_cargo', 'shopping_proxy', 'hybrid')),
  route text default 'TH-MM',
  weight_kg numeric,
  billable_weight_kg numeric,
  rate_per_kg numeric,
  estimated_cargo_fee numeric,
  product_cost_thb numeric,
  shopping_commission numeric,
  estimated_total_thb numeric,
  item_description text,
  pickup_address text,
  delivery_address text,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'converted', 'cancelled')),
  converted_shipment_id uuid,
  converted_shopping_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### RLS policy direction

```text
Public insert: allowed for anonymous quote requests
Public select/update/delete: denied
Staff/admin select/update: allowed
```

Do not expose all customer leads publicly.

---

## 4. Files to Create / Modify

### Create

```text
migrations/add_customer_inquiries.sql
src/lib/pricing/ktmPricing.js
src/lib/pricing/ktmPricing.test.js
src/pages/PriceCalculator.jsx
src/components/public/QuoteRequestForm.jsx
src/components/public/ContactCTA.jsx
src/api/customerInquiries.js
src/__tests__/customerInquiries.test.js
```

### Modify

```text
src/pages/index.jsx
src/pages/ClientPortal.jsx
src/pages/Operations.jsx
src/pages/Layout.jsx
src/domains/core/schemas.js
SYSTEM_SPEC.md
README.md
```

---

# Implementation Tasks

## Task 1: Add canonical pricing utility

**Objective:** Create one source of truth for KTM public pricing.

**Files:**

```text
Create: src/lib/pricing/ktmPricing.js
Create: src/lib/pricing/ktmPricing.test.js
```

**Implementation:**

```js
export const KTM_RATES = {
  air_cargo: 300,
  land_cargo: 180,
};

export const SHOPPING_COMMISSION_RATE = 0.1;
export const MIN_SHOPPING_COMMISSION_THB = 100;
export const MIN_BILLABLE_WEIGHT_KG = 0.5;
export const WEIGHT_INCREMENT_KG = 0.5;

export function roundUpToHalfKg(weightKg) {
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight <= 0) return MIN_BILLABLE_WEIGHT_KG;
  return Math.max(
    MIN_BILLABLE_WEIGHT_KG,
    Math.ceil(weight / WEIGHT_INCREMENT_KG) * WEIGHT_INCREMENT_KG
  );
}

export function calculateCargoEstimate({ serviceType, weightKg }) {
  const ratePerKg = KTM_RATES[serviceType];
  if (!ratePerKg) throw new Error(`Unsupported service type: ${serviceType}`);

  const billableWeightKg = roundUpToHalfKg(weightKg);
  const estimatedCargoFee = billableWeightKg * ratePerKg;

  return {
    serviceType,
    inputWeightKg: Number(weightKg),
    billableWeightKg,
    ratePerKg,
    estimatedCargoFee,
  };
}

export function calculateShoppingCommission(productCostThb) {
  const productCost = Number(productCostThb) || 0;
  if (productCost <= 0) return 0;
  return Math.max(MIN_SHOPPING_COMMISSION_THB, productCost * SHOPPING_COMMISSION_RATE);
}

export function calculateQuoteEstimate({ serviceType, weightKg, productCostThb = 0 }) {
  const cargo = calculateCargoEstimate({ serviceType, weightKg });
  const shoppingCommission = calculateShoppingCommission(productCostThb);
  const estimatedTotalThb = cargo.estimatedCargoFee + shoppingCommission;

  return {
    ...cargo,
    productCostThb: Number(productCostThb) || 0,
    shoppingCommission,
    estimatedTotalThb,
  };
}
```

**Tests:**

```js
import {
  roundUpToHalfKg,
  calculateCargoEstimate,
  calculateShoppingCommission,
  calculateQuoteEstimate,
} from './ktmPricing';

test('rounds weight up to nearest 0.5kg', () => {
  expect(roundUpToHalfKg(0.1)).toBe(0.5);
  expect(roundUpToHalfKg(1.2)).toBe(1.5);
  expect(roundUpToHalfKg(2.5)).toBe(2.5);
});

test('calculates air cargo estimate', () => {
  expect(calculateCargoEstimate({ serviceType: 'air_cargo', weightKg: 3 })).toMatchObject({
    billableWeightKg: 3,
    ratePerKg: 300,
    estimatedCargoFee: 900,
  });
});

test('calculates land cargo estimate', () => {
  expect(calculateCargoEstimate({ serviceType: 'land_cargo', weightKg: 3 })).toMatchObject({
    billableWeightKg: 3,
    ratePerKg: 180,
    estimatedCargoFee: 540,
  });
});

test('applies minimum shopping commission', () => {
  expect(calculateShoppingCommission(700)).toBe(100);
  expect(calculateShoppingCommission(2000)).toBe(200);
});

test('calculates combined quote estimate', () => {
  expect(
    calculateQuoteEstimate({ serviceType: 'air_cargo', weightKg: 1.2, productCostThb: 700 })
  ).toMatchObject({
    billableWeightKg: 1.5,
    estimatedCargoFee: 450,
    shoppingCommission: 100,
    estimatedTotalThb: 550,
  });
});
```

**Verify:**

```bash
npm test -- ktmPricing
npm run build
```

---

## Task 2: Add Supabase migration for customer inquiries

**Objective:** Store public quote requests safely.

**Files:**

```text
Create: migrations/add_customer_inquiries.sql
```

**Migration content:**

```sql
create table if not exists public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  contact_channel text not null check (contact_channel in ('phone', 'facebook', 'line', 'telegram', 'email', 'other')),
  contact_value text not null,
  service_type text not null check (service_type in ('air_cargo', 'land_cargo', 'shopping_proxy', 'hybrid')),
  route text default 'TH-MM',
  weight_kg numeric,
  billable_weight_kg numeric,
  rate_per_kg numeric,
  estimated_cargo_fee numeric,
  product_cost_thb numeric,
  shopping_commission numeric,
  estimated_total_thb numeric,
  item_description text,
  pickup_address text,
  delivery_address text,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'converted', 'cancelled')),
  converted_shipment_id uuid,
  converted_shopping_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_inquiries enable row level security;

create policy "Anyone can create customer inquiries"
  on public.customer_inquiries
  for insert
  to anon, authenticated
  with check (true);

create policy "Staff can read customer inquiries"
  on public.customer_inquiries
  for select
  to authenticated
  using (true);

create policy "Staff can update customer inquiries"
  on public.customer_inquiries
  for update
  to authenticated
  using (true)
  with check (true);
```

**Note:** The staff policies may need tightening depending on the existing profile/role helper functions in Supabase.

**Verify:**

```bash
npm run db:verify:p0
npm run build
```

---

## Task 3: Add inquiry API wrapper

**Objective:** Centralize Supabase reads/writes for customer inquiries.

**Files:**

```text
Create: src/api/customerInquiries.js
Modify: src/api/db.js only if existing db helper pattern requires registration
```

**Implementation direction:**

```js
import { supabase } from './db';

export async function createCustomerInquiry(payload) {
  const { data, error } = await supabase
    .from('customer_inquiries')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listCustomerInquiries() {
  const { data, error } = await supabase
    .from('customer_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateCustomerInquiryStatus(id, status) {
  const { data, error } = await supabase
    .from('customer_inquiries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Verify:**

```bash
npm test -- customerInquiries
npm run build
```

---

## Task 4: Add public PriceCalculator page

**Objective:** Let customers calculate air/land cargo estimates.

**Files:**

```text
Create: src/pages/PriceCalculator.jsx
Modify: src/pages/index.jsx
```

**UI requirements:**

```text
- Service selector: Air Cargo / Land Cargo
- Weight input in kg
- Optional product cost input for shopping proxy
- Result card:
  - billable weight
  - rate per kg
  - cargo fee
  - shopping commission if product cost exists
  - estimated total
- Disclaimer: final quote confirmed by KTM staff
- CTA: Request quote
- CTA: Call / message KTM
```

**Route change:**

Add lazy import and public route in `src/pages/index.jsx`:

```jsx
const PriceCalculator = lazy(() => import('./PriceCalculator'));
```

Add to `PAGES`:

```jsx
PriceCalculator,
```

Add route:

```jsx
<Route path="/PriceCalculator" element={<PriceCalculator />} />
```

**Verify:**

```bash
npm run build
```

Manual check:

```text
/PriceCalculator loads publicly without staff login.
3kg Air shows 900 THB.
3kg Land shows 540 THB.
1.2kg Air shows billable 1.5kg and 450 THB.
```

---

## Task 5: Add QuoteRequestForm component

**Objective:** Capture customer details and calculated quote estimate.

**Files:**

```text
Create: src/components/public/QuoteRequestForm.jsx
Modify: src/pages/PriceCalculator.jsx
```

**Fields:**

```text
customer_name
contact_channel
contact_value
service_type
weight_kg
item_description
pickup_address
delivery_address
notes
estimate fields from pricing utility
```

**Behavior:**

```text
- Pre-fill service/weight from calculator state
- Validate required fields
- Submit to createCustomerInquiry()
- Show success message
- Show fallback contact CTAs if submission fails
```

**Verify:**

```bash
npm run build
```

Manual check:

```text
Submit valid form → inquiry appears in Supabase.
Submit missing name/contact → validation error shown.
```

---

## Task 6: Add ContactCTA component

**Objective:** Make it easy for customers to contact KTM after estimate.

**Files:**

```text
Create: src/components/public/ContactCTA.jsx
Use in: src/pages/PriceCalculator.jsx
Use in: src/pages/ClientPortal.jsx
```

**Content:**

```text
Phone 1: +66 633301746
Phone 2: +66 826705571
Email: ktmexpresscargo@gmail.com
Suggested CTA labels:
- Call KTM
- Request quote
- Send estimate
- Message us
```

**Verify:**

```bash
npm run build
```

---

## Task 7: Show inquiries in Operations

**Objective:** Staff can see new public leads from `/Operations`.

**Files:**

```text
Modify: src/pages/Operations.jsx
Use: src/api/customerInquiries.js
```

**UI requirements:**

```text
Add a "New Customer Inquiries" section/card:
- customer name
- contact channel/value
- service type
- estimated total
- status
- created date
- item description
- action buttons:
  - Mark contacted
  - Mark quoted
  - Convert later
```

**Do not build full conversion yet** in this task. Just show and update status.

**Verify:**

```bash
npm run build
npm run lint
```

Manual check:

```text
Submit public inquiry → visible in Operations.
Click Mark contacted → status updates.
```

---

## Task 8: Add conversion path design, not full automation yet

**Objective:** Avoid wrong business data by making conversion explicit.

**Files:**

```text
Modify: SYSTEM_SPEC.md
Optionally create: docs/plans/customer-inquiry-conversion-design.md
```

**Decision:**

```text
A public inquiry should not automatically become a shipment or shopping order.
Staff must manually review and convert.
```

**Reason:**

```text
- customer estimate may be incomplete
- final weight can change
- product price can change
- pickup/delivery details may need confirmation
- payment rules may apply
```

**Future conversion UX:**

```text
Inquiry detail
    ↓
Convert to:
  - Cargo shipment
  - Shopping order
  - Hybrid journey
    ↓
Pre-fill known fields
    ↓
Staff confirms final values
```

---

## Task 9: Update public landing page CTAs

**Objective:** Make the homepage drive users into calculator/inquiry flow.

**Files:**

```text
Modify: src/pages/ClientPortal.jsx
```

**Homepage sections:**

```text
Hero:
Thailand ↔ Myanmar Cargo Service

Rates:
Air Cargo — 300 THB/kg
Land Cargo — 180 THB/kg

Primary CTA:
Calculate Shipping Fee

Secondary CTA:
Contact KTM

How it works:
1. Calculate or contact us
2. Drop off / pickup item
3. KTM ships to Myanmar
4. Customer receives delivery
```

**Verify:**

```bash
npm run build
```

---

## Task 10: E2E smoke test

**Objective:** Protect the public intake flow from regressions.

**Files:**

```text
Create: e2e/customer-intake.spec.js
```

**Test cases:**

```text
- homepage loads
- calculator route loads
- entering 3kg air shows 900 THB
- entering 3kg land shows 540 THB
- quote form validates required fields
```

**Run:**

```bash
npm run test:e2e
```

**Note:** Existing memory says E2E may require:

```bash
VITE_ENABLE_E2E_FIXTURES=true npm run dev
```

---

## 5. Acceptance Criteria

Implementation is done when:

```text
- /PriceCalculator exists and is public
- Air 300 THB/kg and Land 180 THB/kg calculate correctly
- Weight rounds up to 0.5kg increments
- Shopping commission supports 10% / min 100 THB
- Customer can submit quote request
- Inquiry is stored in Supabase
- Staff can see inquiry in /Operations
- Staff can update inquiry status
- Homepage links clearly to calculator
- Build passes
- Lint has no new errors
- Pricing utility has unit tests
```

---

## 6. Commands for Final Verification

```bash
cd /Users/ktythaung/ktm-repo-compare/ktm-cargo
npm test -- ktmPricing
npm run build
npm run lint
npm run test:e2e
```

Expected:

```text
Unit tests pass
Build passes
Lint has no errors
E2E public intake smoke test passes
```

---

## 7. Commit Plan

Use small commits:

```bash
git commit -m "feat: add canonical KTM pricing calculator"
git commit -m "db: add customer inquiries table"
git commit -m "feat: add public price calculator page"
git commit -m "feat: add quote request form"
git commit -m "feat: show customer inquiries in operations"
git commit -m "docs: document customer intake workflow"
git commit -m "test: add customer intake smoke tests"
```

---

## 8. Do Not Do Yet

Avoid these until the intake layer is stable:

```text
- full chatbot integration
- automatic inquiry-to-shipment conversion
- customer login portal
- payment proof upload
- invoice automation from public quote
- advanced tracking page
```

These are valuable, but doing them now will make the MVP slower and riskier.

---

## Final Recommendation

Implement in this order:

```text
1. Pricing utility
2. PriceCalculator route
3. QuoteRequestForm
4. Supabase customer_inquiries table
5. Operations inquiry queue
6. Landing page CTA polish
7. E2E smoke test
```

This gives KTM the biggest business value fastest: customers can calculate price, submit an inquiry, and staff can follow up inside the existing operating system.
