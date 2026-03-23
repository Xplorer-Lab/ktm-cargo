import { useMemo } from 'react';

export function useOrderProfitability(filteredShipments, filteredShoppingOrders) {
  return useMemo(() => {
    const orders = [
      ...filteredShipments.map((s) => ({
        id: s.id,
        orderNumber: s.tracking_number,
        type: 'Shipment',
        customer: s.customer_name,
        vendor: s.vendor_name || '-',
        revenue: s.total_amount || 0,
        vendorCost: s.vendor_total_cost || 0,
        profit: s.profit || 0,
        weight: s.weight_kg || 0,
        status: s.status,
        date: s.created_date,
      })),
      ...filteredShoppingOrders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        type: 'Shopping',
        customer: o.customer_name,
        vendor: o.vendor_name || '-',
        revenue: o.total_amount || 0,
        vendorCost: o.vendor_cost || 0,
        profit: (o.commission_amount || 0) + ((o.shipping_cost || 0) - (o.vendor_cost || 0)),
        weight: o.actual_weight || o.estimated_weight || 0,
        status: o.status,
        date: o.created_date,
      })),
    ];

    return orders.sort((a, b) => b.profit - a.profit);
  }, [filteredShipments, filteredShoppingOrders]);
}
