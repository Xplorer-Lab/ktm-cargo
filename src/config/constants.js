export const ROLES = Object.freeze({
    ADMIN: 'admin',
    STAFF: 'staff',
    USER: 'user',
});

export const STAFF_ROLES = Object.freeze({
    FINANCE_LEAD: 'finance_lead',
    MARKETING_MANAGER: 'marketing_manager',
    OPERATIONS: 'operations',
    SUPPORT: 'support',
});

export const STATUSES = Object.freeze({
    PENDING: 'pending',
    COMPLETED: 'completed',
    IN_PROGRESS: 'in_progress',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    ACTIVE: 'active',
    DRAFT: 'draft',
});

export const PAYMENT_STATUSES = Object.freeze({
    PAID: 'paid',
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
});

export const JOURNEY_MODES = Object.freeze({
    CARGO_ONLY: 'cargo_only',
    SHOPPING_PROXY: 'shopping_proxy',
    HYBRID: 'hybrid',
});

export const JOURNEY_STAGES = Object.freeze({
    INQUIRY_RECEIVED: 'inquiry_received',
    QUOTED: 'quoted',
    CONFIRMED: 'confirmed',
    PAYMENT_PARTIAL: 'payment_partial',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    THAILAND_FULFILLMENT: 'thailand_fulfillment',
    CONSOLIDATED: 'consolidated',
    BOOKED_WITH_CARRIER: 'booked_with_carrier',
    DEPARTED_THAILAND: 'departed_thailand',
    ARRIVED_MYANMAR: 'arrived_myanmar',
    CUSTOMS_CLEARED: 'customs_cleared',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    AFTER_SALES_OPEN: 'after_sales_open',
    RECONCILED: 'reconciled',
    CANCELLED: 'cancelled',
});

export const JOURNEY_PAYMENT_STATUSES = Object.freeze({
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    PAID: 'paid',
    REFUNDED: 'refunded',
});

export const INVOICE_STATUSES = Object.freeze({
    DRAFT: 'draft',
    ISSUED: 'issued',
    SENT: 'sent',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
});

export const INVOICE_TYPES = Object.freeze({
    SHIPMENT: 'shipment',
    SHOPPING_ORDER: 'shopping_order',
    VENDOR_BILL: 'vendor_bill',
    ADJUSTMENT: 'adjustment',
});

export const VENDOR_TYPES = Object.freeze({
    SUPPLIER: 'supplier',
    CARGO_CARRIER: 'cargo_carrier',
    PACKAGING: 'packaging',
    CUSTOMS_BROKER: 'customs_broker',
    WAREHOUSE: 'warehouse',
});

export const PURCHASE_ORDER_STATUSES = Object.freeze({
    DRAFT: 'draft',
    PENDING_APPROVAL: 'pending_approval',
    APPROVED: 'approved',
    SENT: 'sent',
    PARTIAL_RECEIVED: 'partial_received',
    RECEIVED: 'received',
    CANCELLED: 'cancelled',
});

export const PURCHASE_ORDER_STATUS_ALIASES = Object.freeze({
    pending: 'pending_approval',
    sent_to_vendor: 'sent',
    partially_received: 'partial_received',
    fully_received: 'received',
    closed: 'cancelled',
});

export const FEEDBACK_STATUSES = Object.freeze({
    PENDING: 'pending',
    SUBMITTED: 'submitted',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    REVIEWED: 'reviewed',
    ARCHIVED: 'archived',
    CANCELLED: 'cancelled',
});

export const FEEDBACK_KINDS = Object.freeze({
    DELIVERY_FEEDBACK: 'delivery_feedback',
    SUPPORT_TICKET: 'support_ticket',
    NPS: 'nps',
    GENERAL: 'general',
});

export const ORDER_REFERENCE_TYPES = Object.freeze({
    JOURNEY: 'journey',
    SHIPMENT: 'shipment',
    SHOPPING_ORDER: 'shopping_order',
    PURCHASE_ORDER: 'purchase_order',
    INVOICE: 'invoice',
    SUPPORT_TICKET: 'support_ticket',
    GENERAL: 'general',
});

export const CUSTOMER_TYPES = Object.freeze({
    INDIVIDUAL: 'individual',
    ONLINE_SHOPPER: 'online_shopper',
    SME_IMPORTER: 'sme_importer',
});
