import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { format, differenceInDays } from 'date-fns';
import { createNotification } from '@/components/notifications/NotificationService';

/**
 * Updates vendor metrics when a shipment is delivered
 */
export async function updateVendorOnDelivery(shipmentId, vendorOrders, vendors) {
  // Find vendor order associated with this shipment
  const vendorOrder = vendorOrders.find(
    (o) => o.reference_id === shipmentId && o.order_type === 'shipment'
  );

  if (!vendorOrder) return null;

  const vendor = vendors.find((v) => v.id === vendorOrder.vendor_id);
  if (!vendor) return null;

  const actualDate = format(new Date(), 'yyyy-MM-dd');
  const onTime = vendorOrder.expected_date
    ? new Date(actualDate) <= new Date(vendorOrder.expected_date)
    : true;

  // Update vendor order with completion data
  await db.vendorOrders.update(vendorOrder.id, {
    status: 'completed',
    actual_date: actualDate,
    on_time: onTime,
  });

  // Recalculate vendor metrics
  const allVendorOrders = await db.vendorOrders.filter({
    vendor_id: vendor.id,
    status: 'completed',
  });

  const totalOrders = allVendorOrders.length;
  const totalSpent = allVendorOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  const ordersWithDates = allVendorOrders.filter((o) => o.expected_date && o.actual_date);
  const onTimeOrders = ordersWithDates.filter((o) => o.on_time === true);
  const onTimeRate =
    ordersWithDates.length > 0
      ? Math.round((onTimeOrders.length / ordersWithDates.length) * 100)
      : 100;

  const ratedOrders = allVendorOrders.filter((o) => o.quality_rating);
  const avgRating =
    ratedOrders.length > 0
      ? Math.round(
        (ratedOrders.reduce((sum, o) => sum + o.quality_rating, 0) / ratedOrders.length) * 10
      ) / 10
      : vendor.rating || 5;

  // Update vendor with new metrics
  await db.vendors.update(vendor.id, {
    total_orders: totalOrders,
    total_spent: totalSpent,
    on_time_rate: onTimeRate,
    rating: avgRating,
  });

  // Check for declining performance
  if (onTimeRate < 80 && vendor.on_time_rate >= 80) {
    await triggerVendorPerformanceAlert(vendor, onTimeRate);
  }

  return { vendor, onTimeRate, totalOrders };
}

/**
 * Trigger vendor performance decline alert
 */
export async function triggerVendorPerformanceAlert(vendor, newOnTimeRate) {
  const adminEmail = await getAdminEmail();

  return createNotification({
    type: 'system',
    title: `Vendor Performance Declining: ${vendor.name}`,
    message: `${vendor.name}'s on-time delivery rate has dropped to ${newOnTimeRate}%. Previous rate was ${vendor.on_time_rate}%. Consider reviewing their performance and discussing improvement measures.`,
    priority: 'high',
    referenceType: 'vendor',
    referenceId: vendor.id,
    recipientEmail: adminEmail,
    sendNotification: true,
  });
}

/**
 * Trigger contract expiring alert
 */
export async function triggerContractExpiringAlert(vendor, daysRemaining) {
  const adminEmail = await getAdminEmail();

  return createNotification({
    type: 'system',
    title: `Contract Expiring: ${vendor.name}`,
    message: `The contract with ${vendor.name} expires in ${daysRemaining} days (${vendor.contract_end}). Review performance and initiate renewal discussions.`,
    priority: daysRemaining <= 7 ? 'critical' : 'medium',
    referenceType: 'vendor',
    referenceId: vendor.id,
    recipientEmail: adminEmail,
    sendNotification: true,
  });
}

/**
 * Check all vendors for expiring contracts
 */
export async function checkVendorContractAlerts(vendors) {
  const alerts = [];
  const today = new Date();

  for (const vendor of vendors) {
    if (!vendor.contract_end || vendor.status !== 'active') continue;

    const daysRemaining = differenceInDays(new Date(vendor.contract_end), today);

    if (daysRemaining <= 30 && daysRemaining > 0) {
      // Check if we already sent an alert recently
      const existingAlerts = await db.notifications.filter({
        reference_id: vendor.id,
        type: 'system',
        status: 'unread',
      });

      const hasRecentAlert = existingAlerts.some((a) => a.title?.includes('Contract Expiring'));

      if (!hasRecentAlert) {
        alerts.push(await triggerContractExpiringAlert(vendor, daysRemaining));
      }
    }
  }

  return alerts;
}

/**
 * Check all vendors for performance issues
 */
export async function checkVendorPerformanceAlerts(vendors, vendorOrders) {
  const alerts = [];

  for (const vendor of vendors) {
    if (vendor.status !== 'active') continue;

    // Calculate current metrics
    const completedOrders = vendorOrders.filter(
      (o) => o.vendor_id === vendor.id && o.status === 'completed'
    );

    if (completedOrders.length < 3) continue; // Need minimum orders to evaluate

    const ordersWithDates = completedOrders.filter((o) => o.expected_date && o.actual_date);
    const onTimeOrders = ordersWithDates.filter((o) => o.on_time === true);
    const currentOnTimeRate =
      ordersWithDates.length > 0
        ? Math.round((onTimeOrders.length / ordersWithDates.length) * 100)
        : 100;

    // Check if performance dropped below threshold
    if (currentOnTimeRate < 70) {
      const existingAlerts = await db.notifications.filter({
        reference_id: vendor.id,
        type: 'system',
        status: 'unread',
      });

      const hasRecentAlert = existingAlerts.some((a) => a.title?.includes('Performance Declining'));

      if (!hasRecentAlert) {
        alerts.push(await triggerVendorPerformanceAlert(vendor, currentOnTimeRate));
      }
    }
  }

  return alerts;
}

async function getAdminEmail() {
  const user = await auth.me().catch(() => null);
  return user?.email || null;
}
