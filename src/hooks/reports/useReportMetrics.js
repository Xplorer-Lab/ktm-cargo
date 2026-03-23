import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { isWithinInterval, parseISO } from 'date-fns';

export function useReportData() {
  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date', 500),
  });

  const { data: shoppingOrders = [] } = useQuery({
    queryKey: ['shopping-orders'],
    queryFn: () => db.shoppingOrders.list('-created_date', 500),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => db.expenses.list('-date'),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => db.campaigns.list('-created_date'),
  });

  const { data: customReports = [] } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => db.scheduledReports.list('-created_date'),
  });

  const { data: servicePricing = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => db.servicePricing.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => db.purchaseOrders.list('-created_date', 500),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list(),
  });

  return {
    shipments,
    shoppingOrders,
    customers,
    expenses,
    campaigns,
    customReports,
    servicePricing,
    purchaseOrders,
    vendors,
  };
}

export function useFilteredData(data, dateRange) {
  const { shipments, shoppingOrders, expenses } = data;

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (!s.created_date) return false;
      const date = parseISO(s.created_date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [shipments, dateRange]);

  const filteredOrders = useMemo(() => {
    return shoppingOrders.filter((o) => {
      if (!o.created_date) return false;
      const date = parseISO(o.created_date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [shoppingOrders, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.date) return false;
      const date = parseISO(e.date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [expenses, dateRange]);

  return { filteredShipments, filteredOrders, filteredExpenses };
}

export function useReportMetrics(data, filteredData) {
  const { filteredShipments, filteredOrders, filteredExpenses } = filteredData;

  // Shopping order metrics
  const shoppingOrdersTotalRevenue = filteredOrders.reduce(
    (sum, o) => sum + (o.total_amount || 0),
    0
  );
  const shoppingOrdersTotalVendorCost = filteredOrders.reduce(
    (sum, o) => sum + (o.vendor_cost || 0),
    0
  );
  const shoppingOrdersTotalCargoCost = filteredOrders.reduce(
    (sum, o) => sum + (o.cargo_cost || 0),
    0
  );
  const shoppingOrdersTrueProfit = filteredOrders.reduce(
    (sum, o) => sum + (o.commission_amount || 0) + ((o.shipping_cost || 0) - (o.vendor_cost || 0)),
    0
  );

  // Overall metrics
  const totalRevenue =
    filteredShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0) +
    shoppingOrdersTotalRevenue;

  const totalProfit =
    filteredShipments.reduce((sum, s) => sum + (s.profit || 0), 0) + shoppingOrdersTrueProfit;

  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalProfit - totalExpensesAmount;
  const totalWeight = filteredShipments.reduce((sum, s) => sum + (s.weight_kg || 0), 0);
  const avgOrderValue = totalRevenue / (filteredShipments.length + filteredOrders.length) || 0;

  return {
    shoppingOrdersTotalRevenue,
    shoppingOrdersTotalVendorCost,
    shoppingOrdersTotalCargoCost,
    shoppingOrdersTrueProfit,
    totalRevenue,
    totalProfit,
    totalExpensesAmount,
    netProfit,
    totalWeight,
    avgOrderValue,
  };
}
