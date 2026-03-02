import { differenceInDays } from 'date-fns';

/**
 * Vendor performance analytics engine
 */

export function calculateVendorMetrics(vendor, orders) {
  const vendorOrders = orders.filter((o) => o.vendor_id === vendor.id);
  const completedOrders = vendorOrders.filter((o) => o.status === 'completed');

  const totalSpent = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalOrders = completedOrders.length;

  // On-time delivery rate
  const ordersWithDates = completedOrders.filter((o) => o.expected_date && o.actual_date);
  const onTimeOrders = ordersWithDates.filter((o) => {
    const expected = new Date(o.expected_date);
    const actual = new Date(o.actual_date);
    return actual <= expected;
  });
  const onTimeRate =
    ordersWithDates.length > 0 ? (onTimeOrders.length / ordersWithDates.length) * 100 : 100;

  // Average quality rating
  const ratedOrders = completedOrders.filter((o) => o.quality_rating);
  const avgQuality =
    ratedOrders.length > 0
      ? ratedOrders.reduce((sum, o) => sum + o.quality_rating, 0) / ratedOrders.length
      : 5;

  // Average delivery time
  const deliveryTimes = ordersWithDates.map((o) =>
    differenceInDays(new Date(o.actual_date), new Date(o.created_date))
  );
  const avgDeliveryDays =
    deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, d) => sum + d, 0) / deliveryTimes.length
      : 0;

  // Overall score (weighted)
  const score = Math.round(
    onTimeRate * 0.4 + avgQuality * 20 * 0.4 + Math.min(100, 100 - avgDeliveryDays * 2) * 0.2
  );

  return {
    totalSpent,
    totalOrders,
    onTimeRate: Math.round(onTimeRate),
    avgQuality: Math.round(avgQuality * 10) / 10,
    avgDeliveryDays: Math.round(avgDeliveryDays),
    score: Math.min(100, Math.max(0, score)),
    pendingOrders: vendorOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress')
      .length,
  };
}

export function getVendorsByPerformance(vendors, orders) {
  return vendors
    .map((v) => ({
      ...v,
      metrics: calculateVendorMetrics(v, orders),
    }))
    .sort((a, b) => b.metrics.score - a.metrics.score);
}

export function getVendorSpendingByType(orders) {
  const spending = new Map();
  orders
    .filter((o) => o.status === 'completed')
    .forEach((o) => {
      const type = o.order_type || 'other';
      spending.set(type, (spending.get(type) || 0) + (o.amount || 0));
    });
  return Array.from(spending.entries()).map(([type, amount]) => ({
    type: type.replace('_', ' '),
    amount,
  }));
}

export function getMonthlyVendorSpending(orders) {
  const monthly = new Map();
  orders
    .filter((o) => o.status === 'completed')
    .forEach((o) => {
      if (!o.created_date) return;
      const month = o.created_date.substring(0, 7);
      monthly.set(month, (monthly.get(month) || 0) + (o.amount || 0));
    });
  return Array.from(monthly.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }));
}

export function getTopVendors(vendors, orders, limit = 5) {
  return getVendorsByPerformance(vendors, orders).slice(0, limit);
}

export function getVendorAlerts(vendors, orders) {
  const alerts = [];

  vendors.forEach((v) => {
    const metrics = calculateVendorMetrics(v, orders);

    if (metrics.onTimeRate < 80) {
      alerts.push({
        vendor: v,
        type: 'low_performance',
        message: `${v.name} has ${metrics.onTimeRate}% on-time delivery rate`,
        priority: 'high',
      });
    }

    if (v.contract_end) {
      const daysUntilExpiry = differenceInDays(new Date(v.contract_end), new Date());
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        alerts.push({
          vendor: v,
          type: 'contract_expiring',
          message: `${v.name} contract expires in ${daysUntilExpiry} days`,
          priority: 'medium',
        });
      }
    }
  });

  return alerts;
}
