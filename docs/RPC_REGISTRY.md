# RPC Registry

This registry documents every `CREATE FUNCTION` / `CREATE OR REPLACE FUNCTION`
found in `migrations/`.

Legend:

- `Frontend wired` means the function is called from the app code today.
- `DB internal` means the function is only used by triggers, RLS policies, or
  other database-side helpers.
- `Orphaned from frontend` means the app does not call it directly, even if the
  database uses it internally.

## Frontend-Wired RPCs

| Name | Description | Input params with types | Output shape | Frontend wired? | DB internal? | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `next_invoice_number` | Returns the next DB-backed invoice number in `INV-YYYYMM-XXXX` format. | none | string invoice number | yes | no | `migrations/add_invoice_number_sequence.sql` |
| `create_shipment_with_po_rebalance` | Creates a shipment and updates linked purchase order allocation atomically. | `p_payload: jsonb` | `{ shipment: public.shipments row \| null, purchase_orders: public.purchase_orders row[] }` | yes | no | `migrations/add_shipment_po_allocation_rpcs.sql` |
| `update_shipment_with_po_rebalance` | Updates a shipment and rebalances linked purchase order allocations atomically. | `p_shipment_id: uuid`, `p_updates: jsonb` | `{ shipment: public.shipments row \| null, purchase_orders: public.purchase_orders row[] }` | yes | no | `migrations/add_shipment_po_allocation_rpcs.sql` |
| `delete_shipment_with_po_rebalance` | Deletes a shipment and releases linked purchase order allocation atomically. | `p_shipment_id: uuid` | `{ shipment: public.shipments row \| null, purchase_orders: public.purchase_orders row[] }` | yes | no | `migrations/add_shipment_po_allocation_rpcs.sql` |

Wiring evidence:

- `next_invoice_number` is called from [`src/components/invoices/InvoiceService.js`](/private/tmp/ktm-cargo-rpc-docs/src/components/invoices/InvoiceService.js)
- shipment rebalance RPCs are wrapped by [`src/api/shipmentAllocationRpc.js`](/private/tmp/ktm-cargo-rpc-docs/src/api/shipmentAllocationRpc.js) and used by [`src/pages/Shipments.jsx`](/private/tmp/ktm-cargo-rpc-docs/src/pages/Shipments.jsx)

## DB-Internal Functions

| Name | Description | Input params with types | Output shape | Frontend wired? | DB internal? | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `normalize_shipment_rpc_payload` | Normalizes shipment payload JSON before it is cast into a row. | `p_payload: jsonb` | normalized JSONB payload with blank UUID-like fields coerced to null | no | yes | `migrations/add_shipment_po_allocation_rpcs.sql` |
| `lock_purchase_orders_for_rebalance` | Locks the previous and next purchase orders in a deterministic order. | `p_previous_po_id: uuid \| null`, `p_next_po_id: uuid \| null` | no direct return value; only row locks are acquired | no | yes | `migrations/add_shipment_po_allocation_rpcs.sql` |
| `apply_purchase_order_allocation_delta` | Applies a single allocation delta to one purchase order. | `p_po_id: uuid`, `p_delta: numeric` | updated purchase_order row | no | yes | `migrations/add_shipment_po_allocation_rpcs.sql` |
| `is_admin_or_director` | Checks whether the current authenticated user is an admin or managing director. | none | boolean access decision | no | yes | `migrations/fix_rls_policies.sql` |
| `my_customer_id` | Resolves the current customer profile id for portal RLS policies. | none | customer id or null | no | yes | `migrations/add_client_portal_rls.sql` |
| `my_vendor_id` | Resolves the current vendor profile id for portal RLS policies. | none | vendor id or null | no | yes | `migrations/add_client_portal_rls.sql` |
| `generate_tracking_number` | Auto-fills shipment tracking numbers on insert when missing. | none | `public.shipments` NEW row with `tracking_number` populated | no | yes | `migrations/add_auto_number_triggers.sql` |
| `generate_order_number` | Auto-fills shopping order numbers on insert when missing. | none | `public.shopping_orders` NEW row with `order_number` populated | no | yes | `migrations/add_auto_number_triggers.sql` |
| `update_company_settings_updated_at` | Refreshes the company settings timestamp before update. | none | `public.company_settings` NEW row with `updated_at` refreshed | no | yes | `migrations/create_company_settings.sql` |
| `profiles_prevent_self_escalation` | Prevents a profile owner from elevating their own role fields. | none | `public.profiles` NEW row with role/staff_role reverted when needed | no | yes | `migrations/fix_profiles_prevent_self_escalation.sql` |
| `ktm_touch_updated_date` | Shared helper that stamps `updated_date` on the row being written. | none | Postgres trigger `NEW` row for the target table | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_generate_journey_number` | Generates the next canonical journey number. | none | string journey number like `JRN-YYYYMM-00001` | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_set_order_journey_defaults` | Assigns a journey number before insert when one is not provided. | none | `public.order_journeys` NEW row with `journey_number` populated | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_normalize_po_status` | Normalizes purchase order status vocabulary to the canonical set. | `input_status: text` | canonical purchase order status or null | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_apply_po_status_normalization` | Applies canonical purchase order status normalization before write. | none | `public.purchase_orders` NEW row with normalized `status` | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_normalize_vendor_type` | Normalizes vendor type vocabulary to the canonical set. | `input_type: text` | canonical vendor type or null | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_apply_vendor_type_normalization` | Applies canonical vendor type normalization before write. | none | `public.vendors` NEW row with normalized `vendor_type` | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_normalize_invoice_type` | Normalizes invoice type values, including legacy vendor invoice labels. | `input_type: text` | canonical invoice type string | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_apply_invoice_type_normalization` | Applies canonical invoice type normalization before write. | none | `public.customer_invoices` NEW row with normalized `invoice_type` | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_generate_support_ticket_number` | Generates the next support ticket number. | none | string ticket number like `TKT-YYYYMM-00001` | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_set_support_ticket_defaults` | Assigns a support ticket number before insert when one is missing. | none | `public.support_tickets` NEW row with `ticket_number` populated | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_normalize_feedback_status` | Normalizes legacy feedback status values to the canonical set. | `input_status: text` | canonical feedback status string | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_normalize_feedback_kind` | Resolves feedback kind from new and legacy feedback fields. | `input_kind: text`, `legacy_type: text`, `has_shipment: boolean` | canonical feedback kind string | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_apply_feedback_normalization` | Applies feedback status and kind normalization before write. | none | `public.feedback` NEW row with normalized `status` and `feedback_kind` | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |
| `ktm_sync_support_ticket_from_feedback` | Syncs legacy feedback rows into support tickets. | none | `public.feedback` NEW row after side effects on `support_tickets` | no | yes | `migrations/add_order_journey_spine_and_contract_normalization.sql` |

## Notes

- The database has more than one category of function. Some are app-facing RPCs,
  some are pure helpers, and many are trigger functions that exist only to keep
  the schema and legacy data aligned.
- `src/api/shipmentAllocationRpc.js` is intentionally thin. It just forwards to
  the three shipment rebalance RPCs and unwraps the `{ shipment, purchase_orders }`
  response shape.
- `src/components/invoices/InvoiceService.js` is the only frontend call site
  currently using `next_invoice_number`.
