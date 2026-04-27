# KTM Cargo Customer Intake Checkpoint Plan

## Purpose

Move KTM Cargo from roughly 60% complete to 75–80% by adding the missing customer-facing intake layer while keeping the existing staff operating system stable.

## Checkpoint 0 — Planning and Claude/Hermes readiness

**Goal:** Prepare safe execution before code changes.

**Scope:**

```text
- Confirm Claude Code auth works
- Confirm gh auth works
- Add CLAUDE.md project rules
- Add GitHub checkpoint workflow doc
- Update implementation plan with component-first constraints
```

**Exit criteria:**

```text
- Claude smoke test passes
- gh auth status passes
- checkpoint docs exist
- no application code changed
```

**Verification:**

```bash
claude -p 'Reply with exactly: CLAUDE_OK' --max-turns 1
gh auth status
git status --short
```

---

## Checkpoint 1 — Pricing source of truth

**Goal:** Add canonical KTM pricing logic without UI coupling.

**Files:**

```text
src/features/customer-intake/lib/ktmPricing.js
src/features/customer-intake/__tests__/ktmPricing.test.js
```

**Rules:**

```text
- Air: 300 THB/kg
- Land: 180 THB/kg
- Round up to 0.5kg
- Shopping commission: 10%, minimum 100 THB
- Pure functions only
```

**Verification:**

```bash
npm test -- ktmPricing
npm run build
```

---

## Checkpoint 2 — Backend inquiry storage

**Goal:** Add public inquiry storage and staff-readable API.

**Files:**

```text
migrations/add_customer_inquiries.sql
src/features/customer-intake/api/customerInquiries.js
src/features/customer-intake/__tests__/customerInquiries.test.js
```

**Rules:**

```text
- Public users can insert only
- Staff can read/update
- Do not expose lead list publicly
- Do not auto-create shipment/order/invoice
```

**Verification:**

```bash
npm test -- customerInquiries
npm run build
```

---

## Checkpoint 3 — Public intake UI

**Goal:** Add public calculator and quote request flow.

**Files:**

```text
src/pages/PriceCalculator.jsx
src/features/customer-intake/pages/PriceCalculatorPage.jsx
src/features/customer-intake/components/PriceCalculatorForm.jsx
src/features/customer-intake/components/QuoteEstimateCard.jsx
src/features/customer-intake/components/QuoteRequestForm.jsx
src/features/customer-intake/components/ContactCTA.jsx
src/features/customer-intake/hooks/useQuoteEstimate.js
src/features/customer-intake/hooks/useCustomerInquirySubmit.js
```

**Rules:**

```text
- Route file stays thin
- Components stay small
- Pricing comes from ktmPricing.js only
- Form submission creates inquiry only
```

**Verification:**

```bash
npm run build
npm run lint
```

Manual cases:

```text
3kg air = 900 THB
3kg land = 540 THB
1.2kg air = 1.5kg billable = 450 THB
```

---

## Checkpoint 4 — Staff Operations inquiry queue

**Goal:** Staff can see and update customer inquiries.

**Files:**

```text
src/features/customer-intake/components/InquiryQueue.jsx
src/features/customer-intake/components/InquiryStatusActions.jsx
src/pages/Operations.jsx
```

**Rules:**

```text
- Operations page imports modular queue component
- Staff can mark contacted/quoted/cancelled
- Conversion remains manual/future work
```

**Verification:**

```bash
npm run build
npm run lint
```

---

## Checkpoint 5 — E2E and documentation

**Goal:** Protect the customer intake flow from regressions.

**Files:**

```text
e2e/customer-intake.spec.js
SYSTEM_SPEC.md
README.md
```

**Verification:**

```bash
npm test -- --passWithNoTests
npm run build
npm run lint
npm run test:e2e
```

E2E caveat:

```bash
VITE_ENABLE_E2E_FIXTURES=true npm run dev
```

---

## Final definition of done

```text
- Public calculator exists
- Public quote request creates inquiry
- Staff sees inquiry in Operations
- No big new files
- Feature-based directory structure exists
- Pricing logic has unit tests
- Build/lint/tests pass
- PR workflow green
```
