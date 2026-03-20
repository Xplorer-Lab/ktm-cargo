import { api } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { STATUSES } from '@/config/constants';

const EMPTY_ARRAY = [];

// ---------------------------------------------------------------------------
// Business Logic Functions (Pure functions, easy to test)
// ---------------------------------------------------------------------------

export const calculateFinancials = (shipments = [], shoppingOrders = [], expenses = []) => {
    // Total Collected: all revenue from Shipments and Shopping Orders
    const shipmentRevenue = shipments.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const orderRevenue = shoppingOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const totalCollected = shipmentRevenue + orderRevenue;

    // Total Vendor Paid
    const totalVendorPaid = shoppingOrders.reduce((sum, o) => {
        if (String(o.vendor_payment_status || '').toLowerCase() === 'paid') {
            return sum + (Number(o.vendor_cost) || Number(o.actual_product_cost) || Number(o.estimated_product_cost) || 0);
        }
        return sum;
    }, 0);

    // Total Cargo Paid (Expenses)
    const totalCargoPaid = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Net Profit
    const netProfit = totalCollected - totalVendorPaid - totalCargoPaid;

    const totalWeight = shipments.reduce((sum, s) => sum + (Number(s.weight_kg) || 0), 0);

    return {
        totalCollected,
        totalVendorPaid,
        totalCargoPaid,
        netProfit,
        totalWeight,
    };
};

export const categorizeShipments = (shipments = []) => {
    const pending = shipments.filter((s) =>
        [STATUSES.PENDING, 'confirmed', 'picked_up'].includes(s.status)
    );
    const inTransit = shipments.filter((s) => ['in_transit', 'customs'].includes(s.status));
    const delivered = shipments.filter((s) => s.status === STATUSES.DELIVERED);
    const recent = shipments.slice(0, 5);

    return {
        pending,
        inTransit,
        delivered,
        recent,
    };
};

// ---------------------------------------------------------------------------
// Data Access Hook (Encapsulates React Query and API calls)
// ---------------------------------------------------------------------------

export const useDashboardData = () => {
    const { data: shipmentsRes, isLoading: shipmentsLoading } = useQuery({
        queryKey: ['dashboard-shipments'],
        queryFn: () => api.shipments.list('-created_date', 100),
    });

    const { data: customersRes, isLoading: customersLoading } = useQuery({
        queryKey: ['dashboard-customers'],
        queryFn: () => api.customers.list(),
    });

    const { data: ordersRes, isLoading: ordersLoading } = useQuery({
        queryKey: ['dashboard-shopping-orders'],
        queryFn: () => api.shoppingOrders.list('-created_date', 50),
    });

    const { data: expensesRes, isLoading: expensesLoading } = useQuery({
        queryKey: ['dashboard-expenses'],
        queryFn: () => api.expenses.list(),
    });

    const isLoading = shipmentsLoading || customersLoading || ordersLoading || expensesLoading;

    // Golden Rule 6: Using safe response wrapper check
    const shipments = shipmentsRes?.success ? shipmentsRes.data : EMPTY_ARRAY;
    const customers = customersRes?.success ? customersRes.data : EMPTY_ARRAY;
    const shoppingOrders = ordersRes?.success ? ordersRes.data : EMPTY_ARRAY;
    const expenses = expensesRes?.success ? expensesRes.data : EMPTY_ARRAY;

    // Memoized aggregations
    const financials = useMemo(
        () => calculateFinancials(shipments, shoppingOrders, expenses),
        [shipments, shoppingOrders, expenses]
    );

    const shipmentCategories = useMemo(
        () => categorizeShipments(shipments),
        [shipments]
    );

    return {
        shipments,
        customers,
        shoppingOrders,
        expenses,
        financials,
        shipmentCategories,
        isLoading,
    };
};
