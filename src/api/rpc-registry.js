/**
 * RPC registry for KTM Cargo Express.
 *
 * Plain JS on purpose: this repo already runs with `allowJs`, and the user
 * asked to avoid TypeScript churn.
 *
 * Each entry documents:
 * - the SQL function signature
 * - the expected parameter types
 * - the output shape returned to callers or trigger consumers
 * - whether the frontend calls it directly
 */

/**
 * @typedef {Object} RpcParam
 * @property {string} name
 * @property {string} type
 * @property {string} description
 *
 * @typedef {Object} RpcDefinition
 * @property {'app_rpc'|'db_helper'|'trigger_function'|'security_helper'} kind
 * @property {string} description
 * @property {RpcParam[]} params
 * @property {string} returns
 * @property {string} outputShape
 * @property {string} sourceMigration
 * @property {boolean} frontendWired
 * @property {boolean} dbInternal
 * @property {string} invocation
 * @property {string[]} wiredIn
 * @property {string} [notes]
 */

const TRIGGER_ROW_SHAPE = 'Postgres trigger `NEW` row for the target table';
const SHIPMENT_REBALANCE_SHAPE =
  '{ shipment: public.shipments row | null, purchase_orders: public.purchase_orders row[] }';

const rpc = (definition) => definition;

export const rpcRegistry = Object.freeze({
  next_invoice_number: rpc({
    kind: 'app_rpc',
    description: 'Returns the next DB-backed invoice number in `INV-YYYYMM-XXXX` format.',
    params: [],
    returns: 'text',
    outputShape: 'string invoice number',
    sourceMigration: 'migrations/add_invoice_number_sequence.sql',
    frontendWired: true,
    dbInternal: false,
    invocation: 'supabase.rpc("next_invoice_number")',
    wiredIn: ['src/components/invoices/InvoiceService.js'],
    notes: 'Backed by `invoice_number_seq` and granted to authenticated users and `service_role`.',
  }),

  normalize_shipment_rpc_payload: rpc({
    kind: 'db_helper',
    description: 'Normalizes shipment payload JSON before it is cast into a row.',
    params: [
      {
        name: 'p_payload',
        type: 'jsonb',
        description: 'Raw shipment payload from the RPC caller.',
      },
    ],
    returns: 'jsonb',
    outputShape: 'normalized JSONB payload with blank UUID-like fields coerced to null',
    sourceMigration: 'migrations/add_shipment_po_allocation_rpcs.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'called internally by shipment allocation RPCs',
    wiredIn: [],
    notes: 'Normalizes `customer_id`, `vendor_po_id`, `vendor_id`, and `journey_id`.',
  }),

  lock_purchase_orders_for_rebalance: rpc({
    kind: 'db_helper',
    description: 'Locks the previous and next purchase orders in a deterministic order.',
    params: [
      {
        name: 'p_previous_po_id',
        type: 'uuid | null',
        description: 'Previous linked purchase order id, if any.',
      },
      {
        name: 'p_next_po_id',
        type: 'uuid | null',
        description: 'Next linked purchase order id, if any.',
      },
    ],
    returns: 'void',
    outputShape: 'no direct return value; only row locks are acquired',
    sourceMigration: 'migrations/add_shipment_po_allocation_rpcs.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'called internally by shipment allocation RPCs',
    wiredIn: [],
    notes: 'Prevents deadlocks when shipment updates move weight between two POs.',
  }),

  apply_purchase_order_allocation_delta: rpc({
    kind: 'db_helper',
    description: 'Applies a single allocation delta to one purchase order.',
    params: [
      {
        name: 'p_po_id',
        type: 'uuid',
        description: 'Purchase order to update.',
      },
      {
        name: 'p_delta',
        type: 'numeric',
        description: 'Allocation delta in kilograms.',
      },
    ],
    returns: 'public.purchase_orders',
    outputShape: 'updated purchase_order row',
    sourceMigration: 'migrations/add_shipment_po_allocation_rpcs.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'called internally by shipment allocation RPCs',
    wiredIn: [],
    notes: 'Raises if the new allocation would exceed purchase order capacity.',
  }),

  create_shipment_with_po_rebalance: rpc({
    kind: 'app_rpc',
    description: 'Creates a shipment and updates linked purchase order allocation atomically.',
    params: [
      {
        name: 'p_payload',
        type: 'jsonb',
        description: 'Validated shipment payload.',
      },
    ],
    returns: 'jsonb',
    outputShape: SHIPMENT_REBALANCE_SHAPE,
    sourceMigration: 'migrations/add_shipment_po_allocation_rpcs.sql',
    frontendWired: true,
    dbInternal: false,
    invocation: 'supabase.rpc("create_shipment_with_po_rebalance")',
    wiredIn: ['src/api/shipmentAllocationRpc.js', 'src/pages/Shipments.jsx'],
    notes: 'The frontend calls this instead of performing separate shipment and PO writes.',
  }),

  update_shipment_with_po_rebalance: rpc({
    kind: 'app_rpc',
    description: 'Updates a shipment and rebalances linked purchase order allocations atomically.',
    params: [
      {
        name: 'p_shipment_id',
        type: 'uuid',
        description: 'Shipment id to update.',
      },
      {
        name: 'p_updates',
        type: 'jsonb',
        description: 'Partial shipment updates.',
      },
    ],
    returns: 'jsonb',
    outputShape: SHIPMENT_REBALANCE_SHAPE,
    sourceMigration: 'migrations/add_shipment_po_allocation_rpcs.sql',
    frontendWired: true,
    dbInternal: false,
    invocation: 'supabase.rpc("update_shipment_with_po_rebalance")',
    wiredIn: ['src/api/shipmentAllocationRpc.js', 'src/pages/Shipments.jsx'],
    notes: 'Uses row locks and delta math to keep PO capacity consistent.',
  }),

  delete_shipment_with_po_rebalance: rpc({
    kind: 'app_rpc',
    description: 'Deletes a shipment and releases linked purchase order allocation atomically.',
    params: [
      {
        name: 'p_shipment_id',
        type: 'uuid',
        description: 'Shipment id to delete.',
      },
    ],
    returns: 'jsonb',
    outputShape: SHIPMENT_REBALANCE_SHAPE,
    sourceMigration: 'migrations/add_shipment_po_allocation_rpcs.sql',
    frontendWired: true,
    dbInternal: false,
    invocation: 'supabase.rpc("delete_shipment_with_po_rebalance")',
    wiredIn: ['src/api/shipmentAllocationRpc.js', 'src/pages/Shipments.jsx'],
    notes: 'Releases PO allocation before removing the shipment row.',
  }),

  is_admin_or_director: rpc({
    kind: 'security_helper',
    description: 'Checks whether the current authenticated user is an admin or managing director.',
    params: [],
    returns: 'boolean',
    outputShape: 'boolean access decision',
    sourceMigration: 'migrations/fix_rls_policies.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used inside RLS policies',
    wiredIn: [],
    notes: 'Runs as `SECURITY DEFINER` to avoid recursive policy checks.',
  }),

  my_customer_id: rpc({
    kind: 'security_helper',
    description: 'Resolves the current customer profile id for portal RLS policies.',
    params: [],
    returns: 'uuid',
    outputShape: 'customer id or null',
    sourceMigration: 'migrations/add_client_portal_rls.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used inside RLS policies',
    wiredIn: [],
    notes: 'Prefers `auth_user_id`, then falls back to email matching.',
  }),

  my_vendor_id: rpc({
    kind: 'security_helper',
    description: 'Resolves the current vendor profile id for portal RLS policies.',
    params: [],
    returns: 'uuid',
    outputShape: 'vendor id or null',
    sourceMigration: 'migrations/add_client_portal_rls.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used inside RLS policies',
    wiredIn: [],
    notes: 'Prefers `auth_user_id`, then falls back to email matching.',
  }),

  generate_tracking_number: rpc({
    kind: 'trigger_function',
    description: 'Auto-fills shipment tracking numbers on insert when missing.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.shipments NEW row with `tracking_number` populated',
    sourceMigration: 'migrations/add_auto_number_triggers.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE INSERT ON public.shipments',
    wiredIn: [],
    notes: 'Formats values as `SHIP-YYYYMMDD-000001`.',
  }),

  generate_order_number: rpc({
    kind: 'trigger_function',
    description: 'Auto-fills shopping order numbers on insert when missing.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.shopping_orders NEW row with `order_number` populated',
    sourceMigration: 'migrations/add_auto_number_triggers.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE INSERT ON public.shopping_orders',
    wiredIn: [],
    notes: 'Formats values as `SO-YYYYMMDD-000001`.',
  }),

  update_company_settings_updated_at: rpc({
    kind: 'trigger_function',
    description: 'Refreshes the company settings timestamp before update.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.company_settings NEW row with `updated_at` refreshed',
    sourceMigration: 'migrations/create_company_settings.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE UPDATE ON public.company_settings',
    wiredIn: [],
  }),

  profiles_prevent_self_escalation: rpc({
    kind: 'trigger_function',
    description: 'Prevents a profile owner from elevating their own role fields.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.profiles NEW row with role/staff_role reverted when needed',
    sourceMigration: 'migrations/fix_profiles_prevent_self_escalation.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE UPDATE ON public.profiles',
    wiredIn: [],
    notes: 'Relies on `is_admin_or_director()` for the privilege check.',
  }),

  ktm_touch_updated_date: rpc({
    kind: 'trigger_function',
    description: 'Shared helper that stamps `updated_date` on the row being written.',
    params: [],
    returns: 'trigger',
    outputShape: TRIGGER_ROW_SHAPE,
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE UPDATE on tables with an `updated_date` column',
    wiredIn: [],
  }),

  ktm_generate_journey_number: rpc({
    kind: 'db_helper',
    description: 'Generates the next canonical journey number.',
    params: [],
    returns: 'text',
    outputShape: 'string journey number like `JRN-YYYYMM-00001`',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'called by journey defaults trigger',
    wiredIn: [],
  }),

  ktm_set_order_journey_defaults: rpc({
    kind: 'trigger_function',
    description: 'Assigns a journey number before insert when one is not provided.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.order_journeys NEW row with `journey_number` populated',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE INSERT ON public.order_journeys',
    wiredIn: [],
  }),

  ktm_normalize_po_status: rpc({
    kind: 'db_helper',
    description: 'Normalizes purchase order status vocabulary to the canonical set.',
    params: [
      {
        name: 'input_status',
        type: 'text',
        description: 'Legacy or canonical status input.',
      },
    ],
    returns: 'text',
    outputShape: 'canonical purchase order status or null',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used by purchase order normalization trigger and backfill',
    wiredIn: [],
  }),

  ktm_apply_po_status_normalization: rpc({
    kind: 'trigger_function',
    description: 'Applies canonical purchase order status normalization before write.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.purchase_orders NEW row with normalized `status`',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE INSERT OR UPDATE OF status ON public.purchase_orders',
    wiredIn: [],
  }),

  ktm_normalize_vendor_type: rpc({
    kind: 'db_helper',
    description: 'Normalizes vendor type vocabulary to the canonical set.',
    params: [
      {
        name: 'input_type',
        type: 'text',
        description: 'Legacy or canonical vendor type input.',
      },
    ],
    returns: 'text',
    outputShape: 'canonical vendor type or null',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used by vendor normalization trigger and backfill',
    wiredIn: [],
  }),

  ktm_apply_vendor_type_normalization: rpc({
    kind: 'trigger_function',
    description: 'Applies canonical vendor type normalization before write.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.vendors NEW row with normalized `vendor_type`',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE INSERT OR UPDATE OF vendor_type ON public.vendors',
    wiredIn: [],
  }),

  ktm_normalize_invoice_type: rpc({
    kind: 'db_helper',
    description: 'Normalizes invoice type values, including legacy vendor invoice labels.',
    params: [
      {
        name: 'input_type',
        type: 'text',
        description: 'Legacy or canonical invoice type input.',
      },
    ],
    returns: 'text',
    outputShape: 'canonical invoice type string',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used by invoice type normalization trigger and backfill',
    wiredIn: [],
  }),

  ktm_apply_invoice_type_normalization: rpc({
    kind: 'trigger_function',
    description: 'Applies canonical invoice type normalization before write.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.customer_invoices NEW row with normalized `invoice_type`',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE INSERT OR UPDATE OF invoice_type ON public.customer_invoices',
    wiredIn: [],
  }),

  ktm_generate_support_ticket_number: rpc({
    kind: 'db_helper',
    description: 'Generates the next support ticket number.',
    params: [],
    returns: 'text',
    outputShape: 'string ticket number like `TKT-YYYYMM-00001`',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'called by support ticket defaults trigger',
    wiredIn: [],
  }),

  ktm_set_support_ticket_defaults: rpc({
    kind: 'trigger_function',
    description: 'Assigns a support ticket number before insert when one is missing.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.support_tickets NEW row with `ticket_number` populated',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'BEFORE INSERT ON public.support_tickets',
    wiredIn: [],
  }),

  ktm_normalize_feedback_status: rpc({
    kind: 'db_helper',
    description: 'Normalizes legacy feedback status values to the canonical set.',
    params: [
      {
        name: 'input_status',
        type: 'text',
        description: 'Legacy or canonical feedback status input.',
      },
    ],
    returns: 'text',
    outputShape: 'canonical feedback status string',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used by feedback normalization trigger and backfill',
    wiredIn: [],
  }),

  ktm_normalize_feedback_kind: rpc({
    kind: 'db_helper',
    description: 'Resolves feedback kind from new and legacy feedback fields.',
    params: [
      {
        name: 'input_kind',
        type: 'text',
        description: 'Current feedback kind value.',
      },
      {
        name: 'legacy_type',
        type: 'text',
        description: 'Legacy `feedback_type` value.',
      },
      {
        name: 'has_shipment',
        type: 'boolean',
        description: 'Whether the feedback row is tied to a shipment.',
      },
    ],
    returns: 'text',
    outputShape: 'canonical feedback kind string',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation: 'used by feedback normalization trigger and backfill',
    wiredIn: [],
  }),

  ktm_apply_feedback_normalization: rpc({
    kind: 'trigger_function',
    description: 'Applies feedback status and kind normalization before write.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.feedback NEW row with normalized `status` and `feedback_kind`',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation:
      'BEFORE INSERT OR UPDATE OF status, feedback_kind, feedback_type, shipment_id ON public.feedback',
    wiredIn: [],
  }),

  ktm_sync_support_ticket_from_feedback: rpc({
    kind: 'trigger_function',
    description: 'Syncs legacy feedback rows into support tickets.',
    params: [],
    returns: 'trigger',
    outputShape: 'public.feedback NEW row after side effects on `support_tickets`',
    sourceMigration: 'migrations/add_order_journey_spine_and_contract_normalization.sql',
    frontendWired: false,
    dbInternal: true,
    invocation:
      'AFTER INSERT OR UPDATE OF feedback_kind, status, subject, message, comment, category, priority ON public.feedback',
    wiredIn: [],
    notes: 'Creates or updates `support_tickets` and backfills `feedback.support_ticket_id`.',
  }),
});

export const rpcRegistryEntries = Object.entries(rpcRegistry);
export const frontendWiredRpcNames = rpcRegistryEntries
  .filter(([, definition]) => definition.frontendWired)
  .map(([name]) => name);
export const dbInternalRpcNames = rpcRegistryEntries
  .filter(([, definition]) => definition.dbInternal)
  .map(([name]) => name);

export default rpcRegistry;
