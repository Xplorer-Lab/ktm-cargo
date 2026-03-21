# 07 — Frontend Implementation Plan
**KTM Cargo Express** | React 19 + Vite 6 + Supabase + TanStack Query + Vercel
**Audience:** Developers | **Goal:** Systematic frontend build-out with consistent patterns

---

## 1. Current State Assessment

### What Exists

| Area | Status | Notes |
|---|---|---|
| React 19 + Vite 6 + Tailwind 4 | ✅ Done | Standard setup |
| Supabase client + auth | ✅ Done | `src/api/supabaseClient.js`, `src/api/auth.js` |
| TanStack Query v5 | ✅ Done | `App.jsx` wraps `<QueryClientProvider>` |
| react-hook-form + zod | ✅ Done | Some pages use them, not all |
| React Router v7 | ✅ Done | v7 in package.json (react-router-dom v7.13.1) |
| Route guards | ✅ Done | `ProtectedRoute`, `GuestOnlyRoute`, `layoutRouteGuards.js` |
| Lazy loading all pages | ✅ Done | All pages lazy-loaded via `React.lazy` in `index.jsx` |
| Vite manual chunks | ✅ Done | `vendor-react`, `vendor-charts`, `vendor-ui`, `vendor-forms`, `vendor-dates`, `vendor-icons` |
| UI component library | ✅ Done | ~50 Radix-based components in `src/components/ui/` |
| Domain components | 🟡 Partial | `src/components/{shipments,customers,shopping,...}/` — all exist, quality varies |
| TanStack Query patterns | 🟡 Inconsistent | `ShoppingOrders`, `Procurement` use `useQuery`/`useMutation`; many pages use direct Supabase calls |
| Realtime integration | ❌ None | Supabase Realtime is subscribed in `UserContext` for auth only; no query-level subscriptions |
| Optimistic updates | ❌ None | All mutations wait for server response |
| Form validation schemas | 🟡 Fragmented | `domains/core/schemas.js` has enums/primitives; pages define inline zod schemas |
| Shared query hooks | ❌ None | No `hooks/` layer for reusable query factory functions |
| Error handling layer | 🟡 Fragmented | `api/db.js` has `createSafeErrorResponse`; each page handles errors differently |

### What the Blueprint Requires (That Doesn't Exist or Is Incomplete)

- **Realtime live updates** for shipment status, new shopping orders, feedback submissions, task assignments
- **Optimistic UI** for order creation, status changes, invoice marking paid
- **Centralized query key factory** so cache invalidation is predictable across pages
- **Form strategy** that is consistent across all domain pages
- **Supabase Edge Function** calls (not just direct table access) for complex operations
- **E2E test coverage** for critical paths (shopping order creation, shipment status flow, invoice generation)

---

## 2. Page/Component Inventory

### Pages — Build vs Refactor

| Route | File | Status | Action |
|---|---|---|---|
| `/` (LandingPage) | `pages/LandingPage.jsx` | ✅ Built (593L) | Refactor: extract hero/sections into reusable components |
| `/ClientPortal` | `pages/ClientPortal.jsx` | ✅ Built (629L) | Refactor: extract portal sections |
| `/PriceCalculator` | `pages/PriceCalculator.jsx` | ✅ Built (739L) | Refactor: extract calculator widget into `components/shared/PriceCalculatorWidget.jsx` |
| `/StaffLogin` | `pages/StaffLogin.jsx` | ✅ Built (253L) | Refactor: extract into `components/auth/` |
| `/VendorRegistration` | `pages/VendorRegistration.jsx` | ✅ Built (545L) | Refactor: wire into TanStack Query + react-hook-form pattern |
| `/Operations` | `pages/Operations.jsx` | ✅ Built (219L) | Refactor: wire stats to `dashboard.service.js` queries |
| `/Shipments` | `pages/Shipments.jsx` | ✅ Built (725L) | Refactor: extract table/filters, add realtime, add optimistic status updates |
| `/ShoppingOrders` | `pages/ShoppingOrders.jsx` | ✅ Built (835L) | Refactor: extract form to component, add optimistic creates |
| `/Customers` | `pages/Customers.jsx` | ✅ Built (670L) | Refactor: add TanStack Query pattern, extract to components |
| `/CustomerSegments` | `pages/CustomerSegments.jsx` | ✅ Built (852L) | Refactor: extract segment builder into `components/segments/` |
| `/Invoices` | `pages/Invoices.jsx` | ✅ Built (863L) | Refactor: add optimistic "mark paid", realtime for new invoices |
| `/Procurement` | `pages/Procurement.jsx` | ✅ Built (1085L) | Refactor: heavy page — extract sub-panels to components; add approval mutations |
| `/Vendors` | `pages/Vendors.jsx` | ✅ Built (827L) | Refactor: add TanStack Query + optimistic updates for capacity |
| `/Inventory` | `pages/Inventory.jsx` | ✅ Built (857L) | Refactor: add stock movement mutations |
| `/Reports` | `pages/Reports.jsx` | ✅ Built (1802L) | Refactor: lazy-load heavy chart components |
| `/Tasks` | `pages/Tasks.jsx` | ✅ Built (931L) | Refactor: add optimistic task completion, realtime task updates |
| `/ShipmentDocuments` | `pages/ShipmentDocuments.jsx` | ✅ Built (592L) | Minor: extract document templates into `components/documents/` |
| `/FeedbackQueue` | `pages/FeedbackQueue.jsx` | 🟡 Needs work (205L) | Refactor: add TanStack Query, optimistic status changes |
| `/FeedbackAnalytics` | `pages/FeedbackAnalytics.jsx` | 🟡 Needs work (338L) | Refactor: add chart components, lazy load |
| `/Feedback` | `pages/Feedback.jsx` | ✅ Built (292L) | Public page: add react-hook-form + zod |
| `/Settings` | `pages/Settings.jsx` | ✅ Built (614L) | Refactor: split into tab components, extract forms |
| `/NotFound` | `pages/NotFound.jsx` | ✅ Built (50L) | No action |

### New Shared Components to Build

| Component | Purpose | Priority |
|---|---|---|
| `hooks/useRealtimeQuery.js` | Wire Supabase Realtime channel → TanStack Query invalidation | P0 |
| `hooks/useShoppingOrders.js` | Centralized query/mutation hooks for shopping orders | P0 |
| `hooks/useShipments.js` | Centralized query/mutation hooks for shipments | P0 |
| `hooks/useOptimisticMutation.js` | Generic optimistic update helper | P1 |
| `components/shared/StatusBadge.jsx` | Unified status badge across all domains | P1 |
| `components/shared/DataTable.jsx` | Shared table with sort/filter/pagination wrapper | P1 |
| `components/shared/ConfirmDialog.jsx` | Reusable confirmation dialog (delete, cancel actions) | P1 |
| `components/shared/EmptyState.jsx` | Empty state with icon, message, CTA | P1 |
| `components/shared/PageHeader.jsx` | Consistent page header with title, breadcrumbs, actions | P1 |
| `hooks/useFormDialog.js` | Composable hook for dialog-backed form open/close state | P2 |

---

## 3. Component Implementation Order

Build in dependency order — shared pieces first.

```
Phase 1: Infrastructure (no UI changes, pure patterns)
├── 1. TanStack Query key factory   → `src/api/queryKeys.js`
├── 2. Shared query hooks           → `src/hooks/` (useShoppingOrders, useShipments, useCustomers, etc.)
├── 3. Realtime integration hook    → `src/hooks/useRealtimeQuery.js`
└── 4. Optimistic mutation helper    → `src/hooks/useOptimisticMutation.js`

Phase 2: Shared UI primitives
├── 5. PageHeader, StatusBadge, EmptyState, ConfirmDialog, DataTable
└── 6. FormDialog hook + extract common form shells

Phase 3: High-traffic page refactors (most users, highest impact)
├── 7. ShoppingOrders     → centralize queries + optimistic creates
├── 8. Shipments          → realtime status + optimistic updates
├── 9. Operations         → wire stats to service layer
└── 10. Invoices          → optimistic "mark paid", realtime invoice updates

Phase 4: Medium-traffic page refactors
├── 11. Customers + CustomerSegments
├── 12. Vendors
├── 13. Tasks
└── 14. Procurement

Phase 5: Lower-traffic / public pages
├── 15. FeedbackQueue + FeedbackAnalytics
├── 16. Feedback (public form → react-hook-form + zod)
├── 17. VendorRegistration (wire to TanStack Query)
├── 18. Settings (tab extraction)
└── 19. Reports (lazy-load charts)

Phase 6: Polish
├── 20. LandingPage section extraction
├── 21. PriceCalculator widget extraction
└── 22. Document generator component polish
```

**Why this order:**
- Phase 1 changes nothing visible but enables everything else consistently
- Phase 2 gives every page refactor the same primitives (no per-page badge/table duplication)
- Phase 3 affects the most staff hours per day — highest ROI
- Phase 4 and 5 are incremental; each page follows the established patterns from phases 1–3

---

## 4. State Management Strategy

### Server State (TanStack Query)

All data that comes from Supabase goes through TanStack Query. No page should call `supabase.from()` directly in a render — use a hook.

**Query key factory** — `src/api/queryKeys.js`:
```js
export const queryKeys = {
  shoppingOrders: {
    all: ['shopping-orders'],
    list: (filters) => ['shopping-orders', 'list', filters],
    detail: (id) => ['shopping-orders', 'detail', id],
  },
  shipments: {
    all: ['shipments'],
    list: (filters) => ['shipments', 'list', filters],
    detail: (id) => ['shipments', 'detail', id],
  },
  customers: { all: ['customers'], list: (filters) => ['customers', 'list', filters] },
  invoices:  { all: ['invoices'],  list: (filters) => ['invoices',  'list', filters] },
  vendors:   { all: ['vendors'],   list: (filters) => ['vendors',   'list', filters] },
  tasks:     { all: ['tasks'],    list: (filters) => ['tasks',     'list', filters] },
  purchaseOrders: { all: ['purchase-orders'], list: (f) => ['purchase-orders', 'list', f] },
  feedback:  { all: ['feedback'], list: (f) => ['feedback', 'list', f] },
};
```

**Shared query hook pattern** — `src/hooks/useShoppingOrders.js`:
```js
// All pages importing this get consistent cache behavior and invalidation
export function useShoppingOrders(filters) {
  return useQuery({
    queryKey: queryKeys.shoppingOrders.list(filters),
    queryFn: () => db.shoppingOrders.list({ ...filters, select: '*' }),
    staleTime: 30_000, // 30s for frequently-changing order data
  });
}

export function useCreateShoppingOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => db.shoppingOrders.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.shoppingOrders.all });
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all }); // allocation affects POs
    },
  });
}
```

### UI State (React `useState` / `useReducer`)

Keep UI state co-located with the component that owns it. No global UI state library needed.

- Dialog open/close → `useState` in page or `useFormDialog` hook
- Selected rows in a table → `useState` in page
- Active filters → `useState` + serialized to URL params via `useSearchParams`
- Sidebar open/closed → already in `Layout.jsx` as `useState`

### Optimistic Updates

Use TanStack Query's `onMutate` → `onError` → `onSettled` pattern for writes where instant feedback matters:

```js
const updateShipmentStatus = useMutation({
  mutationFn: ({ id, status }) => db.shipments.update(id, { status }),
  onMutate: async ({ id, status }) => {
    await qc.cancelQueries({ queryKey: queryKeys.shipments.all });
    const snapshot = qc.getQueryData(queryKeys.shipments.all);
    qc.setQueryData(queryKeys.shipments.all, (old) =>
      old.map((s) => (s.id === id ? { ...s, status } : s))
    );
    return { snapshot };
  },
  onError: (_err, _vars, ctx) => {
    qc.setQueryData(queryKeys.shipments.all, ctx.snapshot);
  },
  onSettled: () => {
    qc.invalidateQueries({ queryKey: queryKeys.shipments.all });
  },
});
```

Target optimistic updates for:
- Shipment status changes
- Invoice "mark paid" toggle
- Task completion checkbox
- Shopping order create (with rollback if PO allocation fails)

---

## 5. Routing Strategy

### Current Issues with `src/pages/index.jsx`

The routing in `index.jsx` mixes lazy page loading with `Routes` inside `Router`. This works but is harder to maintain at scale. The issue is that `createPageUrl` is custom, and route guards live outside the router tree.

### Target Pattern: `createRoutesFromElements` + Layout Route

Migrate to React Router v7's data router pattern when possible, but the existing pattern can be maintained with cleanup:

**Refactor: extract route config to `src/router/routes.jsx`**
```jsx
// Each route is just data — no giant switch in index.jsx
export const staffRoutes = [
  { path: '/Operations',       component: lazy(() => import('@/pages/Operations')),    pageName: 'Operations' },
  { path: '/Shipments',        component: lazy(() => import('@/pages/Shipments')),     pageName: 'Shipments' },
  // ...
];

export const publicRoutes = [
  { path: '/',                 component: lazy(() => import('@/pages/LandingPage')) },
  { path: '/PriceCalculator', component: lazy(() => import('@/pages/PriceCalculator')) },
  // ...
];
```

**Route guards** stay as wrapper components (not route middleware) — this is the current pattern and it works fine. The `GuestOnlyRoute` redirect logic in particular needs to stay as a component because it reads from `UserContext`.

### Lazy Loading Strategy

All pages are already lazy-loaded via `React.lazy`. Keep this pattern — it ensures the initial bundle is small (only Layout + LandingPage + Login shipped).

For the large pages (Reports at 1802L, Procurement at 1085L), also lazy-load heavy sub-components inside the page:
```jsx
const ProcurementProfitabilityDashboard = lazy(() =>
  import('@/components/reports/ProcurementProfitabilityDashboard.jsx')
);
const ApprovalWorkflowService = lazy(() =>
  import('@/components/procurement/ApprovalWorkflowService.jsx')
);
```

### Route Guard Flow

```
User visits /Shipments
  → ProtectedRoute checks UserContext.user
      → null + loading=false → redirect to /StaffLogin?next=/Shipments
      → role doesn't permit → show "Access Not Configured" page
      → allowed → render Shipments
```

---

## 6. Form Strategy

### Current State

Some pages (`ShipmentForm.jsx`, `ShoppingOrderForm.jsx`) already use `react-hook-form` + `zodResolver` with schemas. Others use uncontrolled inputs + direct `db.*` calls. Need to standardize.

### Target Pattern: Domain Zod Schemas + Shared Field Components

**Schema location: `src/domains/{domain}/schemas.js`**

```js
// src/domains/shoppingOrders/schemas.js
import { z } from 'zod';

export const shoppingOrderSchema = z.object({
  customer_id:    z.string().uuid(),
  journey_mode:    z.enum(['cargo_only', 'shopping_proxy', 'hybrid']),
  thb_amount:      z.number().min(0),
  items:           z.array(itemSchema).min(1),
  notes:           z.string().optional(),
});

export const shoppingOrderDefault = {
  journey_mode: 'shopping_proxy',
  items: [],
  notes: '',
};
```

**Migrate per-domain** (priority order):
1. `ShoppingOrders` — most complex form, already partially done
2. `Shipments`
3. `Invoices`
4. `Customers`
5. `Vendors`
6. `Tasks`
7. `Feedback` (public form)
8. `VendorRegistration`

**Field component pattern** — wrap Radix UI + react-hook-form `Controller`:
```jsx
// src/components/ui/form-fields.jsx
export function FormField({ control, name, label, children }) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>{children}</FormControl>
      <FormMessage />
    </FormItem>
  );
}
```

**Form dialog pattern** — wrap create/edit forms in a `AlertDialog` or `Dialog`:
```jsx
function ShoppingOrderFormDialog({ open, onClose, editingOrder }) {
  const form = useForm({ resolver: zodResolver(shoppingOrderSchema), defaultValues: shoppingOrderDefault });

  const mutation = useCreateShoppingOrder(); // from shared hook

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: onClose,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit}>...</form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. Realtime Integration

### Current State

`UserContext.jsx` subscribes to `supabase.auth.onAuthStateChange`. No query-level subscriptions exist.

### Target: `useRealtimeQuery` Hook

This hook subscribes to a Supabase table and invalidates the matching TanStack Query key on changes.

```js
// src/hooks/useRealtimeQuery.js
import { useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeQuery({ table, queryKey, filter, enabled = true }) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`${table}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',   // INSERT, UPDATE, DELETE
          schema: 'public',
          table,
          filter: filter ? Object.entries(filter).map(([k, v]) => `${k}=eq.${v}`).join(',') : undefined,
        },
        (payload) => {
          // Invalidate the query key so data refetches fresh
          qc.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, JSON.stringify(queryKey), JSON.stringify(filter), enabled]);
}
```

**Usage per page:**
```jsx
// In ShoppingOrders page
useRealtimeQuery({
  table: 'shopping_orders',
  queryKey: queryKeys.shoppingOrders.all,
  filter: { business_id: user.business_id },
  enabled: !!user,
});
```

**Priority realtime tables:**
| Table | Invalidate key | Pages affected |
|---|---|---|
| `shipments` | `queryKeys.shipments.all` | Operations, Shipments, ClientPortal |
| `shopping_orders` | `queryKeys.shoppingOrders.all` | Operations, ShoppingOrders |
| `invoices` | `queryKeys.invoices.all` | Operations, Invoices |
| `tasks` | `queryKeys.tasks.all` | Operations, Tasks |
| `feedback` | `queryKeys.feedback.all` | FeedbackQueue, FeedbackAnalytics |

**Note on optimistic updates + realtime conflict:**
When using optimistic updates, a realtime event that arrives after `onMutate` but before `onSettled` will call `invalidateQueries`, which is fine — the next refetch will get the authoritative server state. No conflict.

---

## 8. API Layer

### Current State

Pages mix direct Supabase calls (`supabase.from(...).select(...)`) with `db.*` wrapper calls. The `db.js` module is the abstraction layer but not all pages use it consistently.

### Target: Direct Supabase for Reads, Edge Functions for Writes/Complex Logic

**Reads (use TanStack Query + `db.*` factory):**
```js
// ✓ Good: goes through TanStack Query with caching
const { data } = useQuery({
  queryKey: queryKeys.shipments.list(filters),
  queryFn: () => db.shipments.list({ ...filters }),
});
```

**Simple Creates/Updates/Deletes (use `db.*` factory):**
```js
// ✓ Good: goes through the db wrapper with Sentry error capture
await db.shipments.update(id, { status: 'departed_thailand' });
```

**Complex logic — use Supabase Edge Functions:**
```js
// ✓ Good: RPC for complex server-side logic
const { data, error } = await supabase.rpc('calculate_shipment_forecasting', {
  p_business_id: user.business_id,
  p_from_date: fromDate,
  p_to_date: toDate,
});
```

**Error handling pattern:**
```js
// Every mutation should use this pattern
const mutation = useMutation({
  mutationFn: (data) => db.shipments.update(id, data),
  onError: (err) => {
    const msg = err?.message || 'Update failed';
    toast.error(msg);           // user-facing toast
    Sentry.captureException(err); // already done in db.js, but can add context here
  },
});
```

**Don't call `supabase.from()` directly from pages.** All access goes through `db.js` (for table CRUD) or `supabase.rpc()` (for complex logic). This keeps Sentry error capture in one place.

---

## 9. Testing Strategy

### Current State

- Jest configured (`jest.config.cjs`, `jest.setup.js`)
- 22 test files in `src/__tests__/`
- Playwright configured (`playwright.config.js`, `e2e/` directory)
- `routeSnapshot.test.js`, `workflowRouteAndPipeline.test.js` exist
- No E2E spec files yet (only `routing-smoke.spec.js`, `workflow-slice.spec.js`)

### Jest Unit Test Strategy

**Location:** `src/__tests__/` (existing) + per-domain `*.test.js` co-located with hooks

**What to test:**
1. Query key factory output (`queryKeys.*` — deterministic, easy to test)
2. Zod schemas (boundary validation — `expect().toBeValid()` / `.toBeInvalid()`)
3. Calculation functions (`domains/shipments/calculations.js` already has tests)
4. Allocation logic (`poAllocation.js`, `shoppingOrderAllocation.js` — already have tests)
5. Form schema validation (snapshot test the parsed form data)
6. Component behavior in isolation: `ShoppingOrderForm.test.jsx`, `ShipmentCard.test.jsx`

**Test location convention:**
```
src/
  hooks/
    useShoppingOrders.js        ← implementation
    useShoppingOrders.test.js   ← unit tests
  domains/
    shipments/
      calculations.js
      calculations.test.js
  components/
    shipments/
      ShipmentCard.jsx
      ShipmentCard.test.jsx
```

**Don't test:**
- Pages as monoliths — they test too many things at once. Extract logic to hooks/components and test those.
- API calls (mock at the `db.js` level using `jest.mock('@/api/db')`)

### Playwright E2E Strategy

**Location:** `e2e/` (existing)

**Coverage targets — critical paths (MUST have E2E):**
1. `auth.spec.js` — staff login flow
2. `shopping-order-create.spec.js` — full flow from inquiry to order creation
3. `shipment-status-flow.spec.js` — create shipment → update status → confirm delivery
4. `invoice-generation.spec.js` — create invoice → mark paid
5. `client-portal-feedback.spec.js` — public feedback form submission

**Coverage targets — important paths:**
6. `vendor-registration.spec.js` — new vendor self-registers
7. `price-calculator.spec.js` — quote estimation flow
8. `tasks.spec.js` — task creation and completion

**Playwright config notes:**
- Use `@playwright/test` (already installed)
- E2E tests use a dedicated Supabase client (`src/api/e2eSupabaseClient.js`) — keep this pattern
- `page.addInitScript` to inject auth session

---

## 10. Performance

### Code Splitting

**Already done:**
- All pages lazy-loaded via `React.lazy` in `index.jsx`
- Vite manual chunks for vendor libraries in `vite.config.js`

**Next improvements:**
1. **Lazy-load heavy chart components inside pages** — especially `Reports.jsx` (1802L), `Procurement.jsx` (1085L):
   ```jsx
   const ShipmentForecasting = lazy(() =>
     import('@/components/reports/ShipmentForecasting.jsx')
   );
   ```
2. **Route-level code splitting** is already working. Verify with `npm run build` + check `dist/assets/*.js` chunk sizes.

### Bundle Size Targets

| Chunk | Target |
|---|---|
| `vendor-react.js` | < 200 KB |
| `vendor-charts.js` (recharts) | < 150 KB |
| `vendor-ui.js` (all Radix) | < 100 KB |
| `vendor-forms.js` | < 50 KB |
| Per-page chunks | < 80 KB each |
| Initial load (LCP) | < 300 KB |

Run `npm run analyze` (vite-bundle-visualizer) to inspect current sizes. Target: no single non-vendor chunk > 100 KB.

### Image Optimization

- All `<img>` tags should have `width` + `height` attributes to prevent layout shift
- Use `loading="lazy"` for below-fold images
- Company logos uploaded via settings → stored in Supabase Storage → served with CDN
- `src/pages/LandingPage.jsx` image carousel → lazy-load each slide

### Vite Build Optimizations (already in place)

```js
// vite.config.js — already has these:
optimizeDeps: { include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'] }
build.rollupOptions.output.manualChunks: vendor splits already defined
```

### React 19 + Vite 6 Specific Notes

- React 19's compiler (`react-compiler`) can be added later as opt-in for memoization
- Vite 6's `splitVendorChunk` is the default; keep it
- `vite-bundle-visualizer` already in `devDependencies` — use `npm run analyze` to audit

---

## Summary: Immediate Next Steps

1. **Create `src/api/queryKeys.js`** — single source of truth for all query key arrays
2. **Create `src/hooks/useRealtimeQuery.js`** — 30-line hook for Supabase → TanStack Query invalidation
3. **Create `src/hooks/useOptimisticMutation.js`** — generic optimistic wrapper
4. **Build Phase 1 hooks** (`useShoppingOrders.js`, `useShipments.js`, `useCustomers.js`) using queryKeys
5. **Wire realtime** for `shopping_orders`, `shipments`, `invoices` tables in Operations page
6. **Refactor `ShoppingOrders`** — extract form, add optimistic create, use shared hooks
7. **Run `npm run analyze`** — establish current bundle size baseline
