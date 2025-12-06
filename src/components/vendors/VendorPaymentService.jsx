import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { format, addDays } from 'date-fns';
import { createNotification } from '@/components/notifications/NotificationService';

const PAYMENT_TERM_DAYS = {
  immediate: 0,
  net_15: 15,
  net_30: 30,
  net_60: 60,
};

/**
 * Generate payment request for completed vendor orders
 */
export async function generatePaymentRequest(vendorOrder, vendor) {
  const daysToAdd = PAYMENT_TERM_DAYS[vendor.payment_terms] || 30;
  const dueDate = format(addDays(new Date(), daysToAdd), 'yyyy-MM-dd');

  // Check if payment already exists for this order
  const existingPayments = await db.vendorPayments.filter({
    vendor_id: vendor.id,
  });

  const alreadyIncluded = existingPayments.some((p) =>
    p.order_ids?.split(',').includes(vendorOrder.id)
  );

  if (alreadyIncluded) return null;

  // Create new payment request
  const payment = await db.vendorPayments.create({
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    order_ids: vendorOrder.id,
    total_amount: vendorOrder.amount || 0,
    payment_terms: vendor.payment_terms,
    due_date: dueDate,
    status: daysToAdd === 0 ? 'scheduled' : 'pending',
  });

  // Notify for immediate payments
  if (daysToAdd === 0) {
    await triggerPaymentDueAlert(payment, vendor);
  }

  return payment;
}

/**
 * Batch generate payments for all unpaid completed orders
 */
export async function processUnpaidOrders(vendorOrders, vendors) {
  const completedOrders = vendorOrders.filter((o) => o.status === 'completed');
  const existingPayments = await db.vendorPayments.list();

  const processedOrderIds = new Set();
  existingPayments.forEach((p) => {
    (p.order_ids || '').split(',').forEach((id) => processedOrderIds.add(id));
  });

  const unpaidOrders = completedOrders.filter((o) => !processedOrderIds.has(o.id));

  // Group by vendor
  const ordersByVendor = {};
  unpaidOrders.forEach((o) => {
    if (!ordersByVendor[o.vendor_id]) ordersByVendor[o.vendor_id] = [];
    ordersByVendor[o.vendor_id].push(o);
  });

  const payments = [];
  for (const [vendorId, orders] of Object.entries(ordersByVendor)) {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) continue;

    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const daysToAdd = PAYMENT_TERM_DAYS[vendor.payment_terms] || 30;
    const dueDate = format(addDays(new Date(), daysToAdd), 'yyyy-MM-dd');

    const payment = await db.vendorPayments.create({
      vendor_id: vendorId,
      vendor_name: vendor.name,
      order_ids: orders.map((o) => o.id).join(','),
      total_amount: totalAmount,
      payment_terms: vendor.payment_terms,
      due_date: dueDate,
      status: daysToAdd === 0 ? 'scheduled' : 'pending',
    });

    payments.push(payment);
  }

  return payments;
}

/**
 * Check and update overdue payments
 */
export async function checkOverduePayments() {
  const payments = await db.vendorPayments.filter({ status: 'pending' });
  const today = new Date();
  const overduePayments = [];

  for (const payment of payments) {
    if (!payment.due_date) continue;

    if (new Date(payment.due_date) < today) {
      await db.vendorPayments.update(payment.id, { status: 'overdue' });
      await triggerPaymentOverdueAlert(payment);
      overduePayments.push(payment);
    }
  }

  return overduePayments;
}

/**
 * Check payments due soon
 */
export async function checkUpcomingPayments() {
  const payments = await db.vendorPayments.filter({ status: 'pending' });
  const today = new Date();
  const upcoming = [];

  for (const payment of payments) {
    if (!payment.due_date) continue;

    const daysUntilDue = Math.ceil((new Date(payment.due_date) - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 3 && daysUntilDue > 0) {
      await triggerPaymentDueAlert(payment, null, daysUntilDue);
      upcoming.push({ ...payment, daysUntilDue });
    }
  }

  return upcoming;
}

/**
 * Mark payment as paid
 */
export async function markPaymentPaid(paymentId, paymentMethod, referenceNumber) {
  return db.vendorPayments.update(paymentId, {
    status: 'paid',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: paymentMethod,
    reference_number: referenceNumber,
  });
}

/**
 * Trigger payment due alert
 */
async function triggerPaymentDueAlert(payment, vendor, daysUntilDue = 0) {
  const adminEmail = await getAdminEmail();
  const urgency = daysUntilDue === 0 ? 'immediate' : `in ${daysUntilDue} days`;

  return createNotification({
    type: 'system',
    title: `Payment Due: ${payment.vendor_name}`,
    message: `Payment of ฿${payment.total_amount?.toLocaleString()} to ${payment.vendor_name} is due ${urgency}. Due date: ${payment.due_date}.`,
    priority: daysUntilDue <= 1 ? 'high' : 'medium',
    referenceType: 'vendor',
    referenceId: payment.vendor_id,
    recipientEmail: adminEmail,
    sendNotification: daysUntilDue <= 1,
  });
}

/**
 * Trigger payment overdue alert
 */
async function triggerPaymentOverdueAlert(payment) {
  const adminEmail = await getAdminEmail();

  return createNotification({
    type: 'system',
    title: `OVERDUE Payment: ${payment.vendor_name}`,
    message: `Payment of ฿${payment.total_amount?.toLocaleString()} to ${payment.vendor_name} is overdue! Due date was ${payment.due_date}. Please process immediately.`,
    priority: 'critical',
    referenceType: 'vendor',
    referenceId: payment.vendor_id,
    recipientEmail: adminEmail,
    sendNotification: true,
  });
}

async function getAdminEmail() {
  const user = await auth.me().catch(() => null);
  return user?.email || null;
}
