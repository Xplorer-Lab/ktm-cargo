import { useMemo } from 'react';

export function useProfitabilityMetrics(filteredShipments, filteredShoppingOrders) {
  return useMemo(() => {
    const shipmentRevenue = filteredShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const shipmentVendorCost = filteredShipments.reduce(
      (sum, s) => sum + (s.vendor_total_cost || 0),
      0
    );
    const shipmentProfit = filteredShipments.reduce((sum, s) => sum + (s.profit || 0), 0);

    const shoppingRevenue = filteredShoppingOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const shoppingVendorCost = filteredShoppingOrders.reduce(
      (sum, o) => sum + (o.vendor_cost || 0),
      0
    );
    const shoppingProfit = filteredShoppingOrders.reduce(
      (sum, o) =>
        sum + (o.commission_amount || 0) + ((o.shipping_cost || 0) - (o.vendor_cost || 0)),
      0
    );

    const totalRevenue = shipmentRevenue + shoppingRevenue;
    const totalVendorCost = shipmentVendorCost + shoppingVendorCost;
    const totalProfit = shipmentProfit + shoppingProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const totalOrders = filteredShipments.length + filteredShoppingOrders.length;
    const avgRevenuePerOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgProfitPerOrder = totalOrders > 0 ? totalProfit / totalOrders : 0;
    const avgCostPerOrder = totalOrders > 0 ? totalVendorCost / totalOrders : 0;

    return {
      shipmentRevenue,
      shipmentVendorCost,
      shipmentProfit,
      shoppingRevenue,
      shoppingVendorCost,
      shoppingProfit,
      totalRevenue,
      totalVendorCost,
      totalProfit,
      profitMargin,
      totalOrders,
      avgRevenuePerOrder,
      avgProfitPerOrder,
      avgCostPerOrder,
    };
  }, [filteredShipments, filteredShoppingOrders]);
}
