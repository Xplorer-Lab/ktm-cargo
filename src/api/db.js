import { supabase } from './supabaseClient';

// Helper to parse sort string (e.g. "-created_date" -> { column: "created_date", ascending: false })
const parseSort = (sortString) => {
    if (!sortString) return null;
    const isDesc = sortString.startsWith('-');
    const column = isDesc ? sortString.substring(1) : sortString;
    return { column, ascending: !isDesc };
};

// Generic Entity Client Factory
const createEntityClient = (tableName) => ({
    list: async (sortString, limit) => {
        let query = supabase.from(tableName).select('*');

        if (sortString) {
            const { column, ascending } = parseSort(sortString);
            query = query.order(column, { ascending });
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    get: async (id) => {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    create: async (data) => {
        const { data: created, error } = await supabase.from(tableName).insert(data).select().single();
        if (error) throw error;
        return created;
    },

    update: async (id, updates) => {
        const { data: updated, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated;
    },

    delete: async (id) => {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    filter: async (filters, sortString, limit) => {
        let query = supabase.from(tableName).select('*');

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        if (sortString) {
            const { column, ascending } = parseSort(sortString);
            query = query.order(column, { ascending });
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },
});

export const db = {
    customers: createEntityClient('customers'),
    shipments: createEntityClient('shipments'),
    shoppingOrders: createEntityClient('shopping_orders'),
    tasks: createEntityClient('tasks'),
    expenses: createEntityClient('expenses'),
    campaigns: createEntityClient('campaigns'),
    feedback: createEntityClient('feedback'),
    inventoryItems: createEntityClient('inventory_items'),
    stockMovements: createEntityClient('stock_movements'),
    notifications: createEntityClient('notifications'),
    vendors: createEntityClient('vendors'),
    vendorOrders: createEntityClient('vendor_orders'),
    vendorPayments: createEntityClient('vendor_payments'),
    servicePricing: createEntityClient('service_pricing'),
    surcharges: createEntityClient('surcharges'),
    customSegments: createEntityClient('custom_segments'),
    scheduledReports: createEntityClient('scheduled_reports'),
    purchaseOrders: createEntityClient('purchase_orders'),
    goodsReceipts: createEntityClient('goods_receipts'),
    vendorContracts: createEntityClient('vendor_contracts'),
    approvalRules: createEntityClient('approval_rules'),
    approvalHistory: createEntityClient('approval_history'),
    auditLogs: createEntityClient('audit_logs'),
    vendorInvitations: createEntityClient('vendor_invitations'),
    customerInvoices: createEntityClient('customer_invoices'),
    vendorPayouts: createEntityClient('vendor_payouts'),
    companySettings: createEntityClient('company_settings'),
    notificationTemplates: createEntityClient('notification_templates'),
};
