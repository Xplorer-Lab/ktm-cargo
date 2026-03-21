# Backend Architecture

## Overview

KTM Cargo Express uses Supabase as the backend boundary, with Postgres owning
the authoritative business rules. The frontend talks to the database in two
ways:

1. generic table CRUD through [`src/api/db.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/db.js)
2. narrow RPC wrappers through [`src/api/shipmentAllocationRpc.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/shipmentAllocationRpc.js)

The database side is where the important invariants live. Migrations define
tables, constraints, triggers, RLS policies, and stored functions. The frontend
mostly orchestrates user interaction and invalidates queries after mutations.

## Layered Structure

### 1. Supabase client bootstrap

[`src/api/supabaseClient.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/supabaseClient.js)
chooses between the real Supabase client and the E2E fixture client. That keeps
the rest of the app agnostic to the environment.

### 2. Generic CRUD layer

[`src/api/db.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/db.js) builds simple
table clients for common read/write operations. This is the default path for
most entities.

### 3. RPC adapter layer

[`src/api/shipmentAllocationRpc.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/shipmentAllocationRpc.js)
is a thin adapter around `supabase.rpc(...)`. It exists because shipment
allocation needs atomic server-side behavior that cannot be safely reproduced
with separate frontend writes.

### 4. Domain call sites

The current frontend RPC usage is narrow:

- [`src/pages/Shipments.jsx`](/private/tmp/ktm-cargo-rpc-docs/src/pages/Shipments.jsx) calls the shipment rebalance RPCs for create, update, and delete
- [`src/components/invoices/InvoiceService.js`](/private/tmp/ktm-cargo-rpc-docs/src/components/invoices/InvoiceService.js) calls `next_invoice_number`

Everything else uses ordinary table CRUD or local application logic.

## Database Responsibilities

The migration folder is the backend source of truth:

- `add_shipment_po_allocation_rpcs.sql` owns atomic shipment mutation logic and PO rebalance helpers
- `add_invoice_number_sequence.sql` owns invoice number generation
- `add_client_portal_rls.sql` owns portal identity helpers
- `fix_rls_policies.sql` owns staff access policy helpers
- `add_order_journey_spine_and_contract_normalization.sql` owns journey spine tables, normalization helpers, support-ticket sync, and shared triggers

That last migration is especially important: it defines the current workflow
model, the compatibility triggers, and several DB-internal functions that keep
legacy rows aligned without frontend involvement.

## Wiring And Orphans

The registry distinguishes between two groups:

- `frontend wired` RPCs are called by the React app today
- `orphaned from frontend` functions are not called directly by the app, even
  if they are still active in the database through triggers or policies

In practice, most of the registry is DB-internal. That is expected here because
the application relies on Postgres triggers and RLS helpers for integrity,
not just on direct client calls.

## Practical Boundaries

- Keep [`src/api/shipmentAllocationRpc.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/shipmentAllocationRpc.js) thin. It should stay a transport adapter, not a business-logic layer.
- Keep mutation invariants in SQL when the data must stay consistent across rows.
- Keep frontend code focused on validation, user feedback, and query invalidation.
- Use the registry in [`src/api/rpc-registry.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/rpc-registry.js) as the contract index for both app-facing RPCs and DB-only helpers.
