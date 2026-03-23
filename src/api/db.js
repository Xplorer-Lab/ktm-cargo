import { supabase } from './supabaseClient';
import * as Sentry from '@sentry/react';

const IS_PROD =
  typeof __APP_IS_PROD__ !== 'undefined'
    ? __APP_IS_PROD__
    : typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

/**
 * Map a Supabase/PostgREST error to a safe, user-facing Error.
 *
 * In **production** the thrown Error.message is always generic so that
 * table names, column hints, and constraint details are never leaked to
 * the client.  The full error is captured in Sentry for debugging.
 *
 * In **development** the detailed message is preserved for convenience.
 */
function createSafeErrorResponse(error, operation, tableName, extraContext = {}) {
  // Always send full details to Sentry
  Sentry.captureException(
    error instanceof Error ? error : new Error(error?.message || 'Unknown DB error'),
    {
      tags: {
        component: 'db',
        operation,
        table: tableName,
        supabaseCode: error?.code,
      },
      extra: {
        supabaseCode: error?.code,
        supabaseDetails: error?.details,
        supabaseHint: error?.hint,
        supabaseMessage: error?.message,
        ...extraContext,
      },
    }
  );

  // Build the user-friendly response that will be returned
  const devMessage =
    error?.details || error?.hint || error?.message || `Failed to ${operation} ${tableName}`;
  const prodMessage = `Failed to ${operation} record. Please try again or contact support.`;

  return {
    success: false,
    data: null,
    code: error?.code || 'DB_ERROR',
    message: IS_PROD ? prodMessage : devMessage,
  };
}

// Helper to parse sort string (e.g. "-created_date" -> { column: "created_date", ascending: false })
const parseSort = (sortString) => {
  if (!sortString) return null;
  const isDesc = sortString.startsWith('-');
  const column = isDesc ? sortString.substring(1) : sortString;
  return { column, ascending: !isDesc };
};

// Read-Only Entity Client Factory (Legacy - throws errors)
export const createReadOnlyEntityClient = (tableName, selectFields = '*') => ({
  list: async (sortString, limit) => {
    let query = supabase.from(tableName).select(selectFields);

    if (sortString) {
      const { column, ascending } = parseSort(sortString);
      query = query.order(column, { ascending });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw createSafeErrorResponse(error, 'list', tableName);
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq('id', id)
      .single();
    if (error) throw createSafeErrorResponse(error, 'get', tableName, { id });
    return data;
  },

  filter: async (filters, sortString, limit) => {
    let query = supabase.from(tableName).select(selectFields);

    // Allowlist: only safe read-only filter operators
    const SAFE_OPERATORS = new Set([
      'eq',
      'gt',
      'gte',
      'lt',
      'lte',
      'ilike',
      'like',
      'is',
      'in',
      'neq',
    ]);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && typeof value === 'object' && value.operator) {
        if (SAFE_OPERATORS.has(value.operator) && typeof query[value.operator] === 'function') {
          query = query[value.operator](key, value.value);
        } else {
          // Silently ignore blocked/Unknown operators — safe fallback to no-op for this key
          console.warn(`Blocked filter operator: '${value.operator}' — not in allowlist`);
        }
      } else {
        query = query.eq(key, value);
      }
    });

    if (sortString) {
      const { column, ascending } = parseSort(sortString);
      query = query.order(column, { ascending });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw createSafeErrorResponse(error, 'filter', tableName, { filters });
    return data || [];
  },
});

// Full Entity Client Factory (Legacy - throws errors)
export const createEntityClient = (tableName, selectFields = '*') => ({
  ...createReadOnlyEntityClient(tableName, selectFields),

  create: async (data) => {
    const { data: created, error } = await supabase
      .from(tableName)
      .insert(data)
      .select(selectFields)
      .single();
    if (error) throw createSafeErrorResponse(error, 'create', tableName, { data });
    return created;
  },

  update: async (id, updates) => {
    const { data: updated, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select(selectFields)
      .single();
    if (error) throw createSafeErrorResponse(error, 'update', tableName, { id, updates });
    return updated;
  },

  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw createSafeErrorResponse(error, 'delete', tableName, { id });
    return true;
  },
});

// Factory for New Global Pattern
export const createSafeEntityClient = (tableName, selectFields = '*') => {
  const legacy = createEntityClient(tableName, selectFields);

  const wrap = async (promiseObj) => {
    try {
      const data = await promiseObj;
      return { success: true, data, code: null, message: null };
    } catch (safeError) {
      // safeError is already the JSON object created by createSafeErrorResponse
      return safeError;
    }
  };

  return {
    list: (...args) => wrap(legacy.list(...args)),
    get: (...args) => wrap(legacy.get(...args)),
    filter: (...args) => wrap(legacy.filter(...args)),
    create: (...args) => wrap(legacy.create(...args)),
    update: (...args) => wrap(legacy.update(...args)),
    delete: (...args) => wrap(legacy.delete(...args)),
  };
};

export const db = {
  profiles: createEntityClient('profiles', '*'),
  customers: createEntityClient('customers', '*'),
  shipments: createEntityClient('shipments', '*'),
  shoppingOrders: createEntityClient('shopping_orders', '*'),
  tasks: createEntityClient('tasks', '*'),
  expenses: createEntityClient('expenses', '*'),
  campaigns: createEntityClient('campaigns', '*'),
  feedback: createEntityClient('feedback', '*'),
  inventoryItems: createEntityClient('inventory_items', '*'),
  stockMovements: createEntityClient('stock_movements', '*'),
  notifications: createEntityClient('notifications', '*'),
  vendors: createEntityClient('vendors', '*'),
  vendorOrders: createEntityClient('vendor_orders', '*'),
  vendorPayments: createEntityClient('vendor_payments', '*'),
  servicePricing: createEntityClient('service_pricing', '*'),
  surcharges: createEntityClient('surcharges', '*'),
  customSegments: createEntityClient('custom_segments', '*'),
  scheduledReports: createEntityClient('scheduled_reports', '*'),
  purchaseOrders: createEntityClient('purchase_orders', '*'),
  goodsReceipts: createEntityClient('goods_receipts', '*'),
  vendorContracts: createEntityClient('vendor_contracts', '*'),
  approvalRules: createEntityClient('approval_rules', '*'),
  approvalHistory: createEntityClient('approval_history', '*'),
  auditLogs: createReadOnlyEntityClient('audit_logs', '*'),
  vendorInvitations: createEntityClient('vendor_invitations', '*'),
  customerInvoices: createEntityClient('customer_invoices', '*'),
  vendorPayouts: createEntityClient('vendor_payouts', '*'),
  companySettings: createEntityClient('company_settings', '*'),
  notificationTemplates: createEntityClient('notification_templates', '*'),
  orderJourneys: createEntityClient('order_journeys', '*'),
  journeyEvents: createEntityClient('journey_events', '*'),
  supportTickets: createEntityClient('support_tickets', '*'),
  proofOfDelivery: createEntityClient('proof_of_delivery', '*'),
};

export const api = {
  profiles: createSafeEntityClient('profiles', '*'),
  customers: createSafeEntityClient('customers', '*'),
  shipments: createSafeEntityClient('shipments', '*'),
  shoppingOrders: createSafeEntityClient('shopping_orders', '*'),
  tasks: createSafeEntityClient('tasks', '*'),
  expenses: createSafeEntityClient('expenses', '*'),
  campaigns: createSafeEntityClient('campaigns', '*'),
  feedback: createSafeEntityClient('feedback', '*'),
  inventoryItems: createSafeEntityClient('inventory_items', '*'),
  stockMovements: createSafeEntityClient('stock_movements', '*'),
  notifications: createSafeEntityClient('notifications', '*'),
  vendors: createSafeEntityClient('vendors', '*'),
  vendorOrders: createSafeEntityClient('vendor_orders', '*'),
  vendorPayments: createSafeEntityClient('vendor_payments', '*'),
  servicePricing: createSafeEntityClient('service_pricing', '*'),
  surcharges: createSafeEntityClient('surcharges', '*'),
  customSegments: createSafeEntityClient('custom_segments', '*'),
  scheduledReports: createSafeEntityClient('scheduled_reports', '*'),
  purchaseOrders: createSafeEntityClient('purchase_orders', '*'),
  goodsReceipts: createSafeEntityClient('goods_receipts', '*'),
  vendorContracts: createSafeEntityClient('vendor_contracts', '*'),
  approvalRules: createSafeEntityClient('approval_rules', '*'),
  approvalHistory: createSafeEntityClient('approval_history', '*'),
  auditLogs: createSafeEntityClient('audit_logs', '*'), // Assuming read only is fine to map
  vendorInvitations: createSafeEntityClient('vendor_invitations', '*'),
  customerInvoices: createSafeEntityClient('customer_invoices', '*'),
  vendorPayouts: createSafeEntityClient('vendor_payouts', '*'),
  companySettings: createSafeEntityClient('company_settings', '*'),
  notificationTemplates: createSafeEntityClient('notification_templates', '*'),
  orderJourneys: createSafeEntityClient('order_journeys', '*'),
  journeyEvents: createSafeEntityClient('journey_events', '*'),
  supportTickets: createSafeEntityClient('support_tickets', '*'),
  proofOfDelivery: createSafeEntityClient('proof_of_delivery', '*'),
};
