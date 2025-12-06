import { db } from '@/api/db';
import { sendMessengerNotification } from '@/api/integrations';

/**
 * Centralized Notification Service
 * Handles creating in-app notifications and sending emails
 */

export async function createNotification({
  type,
  title,
  message,
  priority = 'medium',
  referenceType,
  referenceId,
  recipientEmail,
  sendNotification = false,
}) {
  // Create in-app notification
  const notification = await db.notifications.create({
    type,
    title,
    message,
    priority,
    reference_type: referenceType,
    reference_id: referenceId,
    recipient_email: recipientEmail,
    status: 'unread',
    email_sent: false,
  });

  // Send external notification if requested
  if (sendNotification && recipientEmail) {
    try {
      await sendMessengerNotification({
        to: recipientEmail,
        message: `[${priority.toUpperCase()}] ${title}\n\n${message}`,
        platform: 'line'
      });
      await db.notifications.update(notification.id, { email_sent: true });
    } catch (error) {
      console.error('Failed to send external notification:', error);
    }
  }

  return notification;
}

function generateEmailBody(type, title, message, priority) {
  const priorityColors = {
    critical: '#dc2626',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">BKK-YGN Cargo Alert</h1>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
        <div style="display: inline-block; padding: 4px 12px; background: ${priorityColors[priority]}; color: white; border-radius: 4px; font-size: 12px; text-transform: uppercase; margin-bottom: 16px;">
          ${priority} Priority
        </div>
        <h2 style="color: #1e293b; margin: 0 0 12px 0;">${title}</h2>
        <p style="color: #475569; line-height: 1.6; margin: 0;">${message}</p>
      </div>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="color: #64748b; margin: 0; font-size: 12px;">
          This is an automated notification from BKK-YGN Cargo & Shopping Services
        </p>
      </div>
    </div>
  `;
}

// Low Stock Alert
export async function triggerLowStockAlert(item, adminEmail) {
  const priority = item.current_stock <= 0 ? 'critical' : 'high';
  const title =
    item.current_stock <= 0 ? `Out of Stock: ${item.name}` : `Low Stock Alert: ${item.name}`;
  const message = `${item.name} (SKU: ${item.sku || 'N/A'}) has ${item.current_stock} ${item.unit} remaining. Reorder point is ${item.reorder_point}. Suggested reorder quantity: ${item.reorder_quantity} ${item.unit}.`;

  return createNotification({
    type: 'low_stock',
    title,
    message,
    priority,
    referenceType: 'inventory',
    referenceId: item.id,
    recipientEmail: adminEmail,
    sendNotification: true,
  });
}

// Delivery Feedback Request
export async function triggerDeliveryFeedbackAlert(shipment, customer) {
  const title = `Shipment Delivered - Request Feedback`;
  const message = `Shipment ${shipment.tracking_number || 'N/A'} for ${customer.name} has been delivered. Consider requesting customer feedback.`;

  return createNotification({
    type: 'delivery_feedback',
    title,
    message,
    priority: 'low',
    referenceType: 'shipment',
    referenceId: shipment.id,
    recipientEmail: customer.email,
    sendNotification: false, // Handled by FeedbackRequestService
  });
}

// Task Assignment Alert
export async function triggerTaskAssignedAlert(task, assigneeEmail) {
  const priorityMap = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };
  const title = `New Task Assigned: ${task.title}`;
  const message = `You have been assigned a new task: "${task.title}". ${task.description || ''} Priority: ${task.priority}. Due: ${task.due_date || 'Not set'}.`;

  return createNotification({
    type: 'task_assigned',
    title,
    message,
    priority: priorityMap[task.priority] || 'medium',
    referenceType: 'task',
    referenceId: task.id,
    recipientEmail: assigneeEmail,
    sendNotification: true,
  });
}

// Segment Alert for At-Risk/Lapsed Customers
export async function triggerSegmentAlert(segmentType, count, adminEmail) {
  const alerts = {
    at_risk: {
      title: 'At-Risk Customers Need Attention',
      message: `You have ${count} customers at risk of churning. They haven't ordered in 30+ days. Consider launching a re-engagement campaign.`,
      priority: 'high',
    },
    lapsed: {
      title: 'Lapsed Customers Alert',
      message: `${count} customers have lapsed (no orders in 60+ days). Consider a win-back campaign with special offers.`,
      priority: 'medium',
    },
  };

  const alert = alerts[segmentType];
  if (!alert) return null;

  return createNotification({
    type: 'segment_alert',
    title: alert.title,
    message: alert.message,
    priority: alert.priority,
    referenceType: 'customer',
    recipientEmail: adminEmail,
    sendNotification: true,
  });
}

// Batch check for inventory alerts
export async function checkInventoryAlerts(items, adminEmail) {
  const alerts = [];
  for (const item of items) {
    if (item.current_stock <= item.reorder_point) {
      alerts.push(await triggerLowStockAlert(item, adminEmail));
    }
  }
  return alerts;
}

// Check segment health and trigger alerts
export async function checkSegmentHealth(segmentSummary, adminEmail) {
  const alerts = [];

  if (segmentSummary.byBehavior.at_risk.count >= 3) {
    alerts.push(
      await triggerSegmentAlert('at_risk', segmentSummary.byBehavior.at_risk.count, adminEmail)
    );
  }

  if (segmentSummary.byBehavior.lapsed.count >= 5) {
    alerts.push(
      await triggerSegmentAlert('lapsed', segmentSummary.byBehavior.lapsed.count, adminEmail)
    );
  }

  return alerts;
}

// New Shipment Created
export async function triggerShipmentCreatedAlert(shipment, recipientEmail) {
  const title = `New Shipment Created`;
  const message = `Shipment ${shipment.tracking_number || 'N/A'} for ${shipment.customer_name} has been created. Service: ${shipment.service_type?.replace('_', ' ')}. Weight: ${shipment.weight_kg}kg. Total: ฿${shipment.total_amount?.toLocaleString()}.`;

  return createNotification({
    type: 'shipment_created',
    title,
    message,
    priority: 'medium',
    referenceType: 'shipment',
    referenceId: shipment.id,
    recipientEmail,
    sendNotification: false,
  });
}

// Shipment Status Updated
export async function triggerShipmentStatusAlert(shipment, oldStatus, newStatus, recipientEmail) {
  const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    customs: 'At Customs',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  const priority =
    newStatus === 'delivered' ? 'low' : newStatus === 'cancelled' ? 'high' : 'medium';
  const title = `Shipment Status: ${statusLabels[newStatus] || newStatus}`;
  const message = `Shipment ${shipment.tracking_number || 'N/A'} for ${shipment.customer_name} status changed from "${statusLabels[oldStatus] || oldStatus}" to "${statusLabels[newStatus] || newStatus}".`;

  return createNotification({
    type: 'shipment_status',
    title,
    message,
    priority,
    referenceType: 'shipment',
    referenceId: shipment.id,
    recipientEmail,
    sendNotification: newStatus === 'delivered',
  });
}

// Payment Received
export async function triggerPaymentReceivedAlert(shipment, recipientEmail) {
  const title = `Payment Received`;
  const message = `Payment of ฿${shipment.total_amount?.toLocaleString()} received for shipment ${shipment.tracking_number || 'N/A'} (${shipment.customer_name}). Payment method: ${shipment.payment_method || 'N/A'}.`;

  return createNotification({
    type: 'payment_received',
    title,
    message,
    priority: 'medium',
    referenceType: 'payment',
    referenceId: shipment.id,
    recipientEmail,
    sendNotification: false,
  });
}

// Invoice Generated
export async function triggerInvoiceGeneratedAlert(invoice, recipientEmail) {
  const title = `Invoice Generated: ${invoice.invoice_number}`;
  const message = `Invoice ${invoice.invoice_number} has been generated for ${invoice.customer_name}. Amount: ฿${invoice.total_amount?.toLocaleString()}. Tracking: ${invoice.tracking_number || 'N/A'}.`;

  return createNotification({
    type: 'invoice_generated',
    title,
    message,
    priority: 'low',
    referenceType: 'invoice',
    referenceId: invoice.id,
    recipientEmail,
    sendNotification: false,
  });
}

// Vendor Payout Created
export async function triggerVendorPayoutAlert(payout, recipientEmail) {
  const title = `Vendor Payout Created: ${payout.payout_number}`;
  const message = `Payout ${payout.payout_number} created for ${payout.vendor_name || 'Carrier'}. Amount: ฿${payout.total_payout?.toLocaleString()}. Due: ${payout.due_date || 'N/A'}. Profit: ฿${payout.profit_amount?.toLocaleString()}.`;

  return createNotification({
    type: 'vendor_payment',
    title,
    message,
    priority: 'medium',
    referenceType: 'vendor',
    referenceId: payout.id,
    recipientEmail,
    sendNotification: false,
  });
}
