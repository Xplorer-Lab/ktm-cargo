import { db } from '@/api/db';
import { sendMessengerNotification } from '@/api/integrations';

/**
 * Shipping Notification Service
 * Sends email notifications to customers when order status changes
 */

const DEFAULT_TEMPLATES = {
  shopping_shipping: {
    subject: 'Your Order {{order_number}} is On Its Way! 🚚',
    body: `
      <h2>Hello {{customer_name}}!</h2>
      <p>Great news! Your order <strong>{{order_number}}</strong> has been shipped and is on its way to you.</p>
      
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p><strong>Order Number:</strong> {{order_number}}</p>
        {{#tracking_number}}<p><strong>Tracking Number:</strong> {{tracking_number}}</p>{{/tracking_number}}
        <p><strong>Delivery Address:</strong> {{delivery_address}}</p>
      </div>
      
      <p>We'll notify you again once your order has been delivered.</p>
      <p>Thank you for your order!</p>
    `,
  },
  shopping_delivered: {
    subject: 'Your Order {{order_number}} Has Been Delivered! ✅',
    body: `
      <h2>Hello {{customer_name}}!</h2>
      <p>Your order <strong>{{order_number}}</strong> has been successfully delivered!</p>
      
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin-top: 0;">Delivery Confirmation</h3>
        <p><strong>Order Number:</strong> {{order_number}}</p>
        <p><strong>Delivered To:</strong> {{delivery_address}}</p>
        <p><strong>Status:</strong> Delivered</p>
      </div>
      
      <p>We hope you enjoy your purchase! If you have any questions or concerns, please don't hesitate to contact us.</p>
      <p>Thank you for shopping with us!</p>
    `,
  },
  shipment_shipped: {
    subject: 'Your Shipment {{tracking_number}} is In Transit! 🚚',
    body: `
      <h2>Hello {{customer_name}}!</h2>
      <p>Your cargo shipment is now in transit.</p>
      
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin-top: 0;">Shipment Details</h3>
        <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
        <p><strong>Delivery Address:</strong> {{delivery_address}}</p>
        <p><strong>Items:</strong> {{items}}</p>
      </div>
      
      <p>We'll notify you once your shipment has been delivered.</p>
    `,
  },
  shipment_delivered: {
    subject: 'Your Shipment {{tracking_number}} Has Been Delivered! ✅',
    body: `
      <h2>Hello {{customer_name}}!</h2>
      <p>Your cargo shipment has been successfully delivered!</p>
      
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin-top: 0;">Delivery Confirmation</h3>
        <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
        <p><strong>Delivered To:</strong> {{delivery_address}}</p>
      </div>
      
      <p>Thank you for using our service!</p>
    `,
  },
};

/**
 * Replace template placeholders with actual values
 */
function processTemplate(template, data) {
  let result = template;

  // Simple placeholder replacement
  Object.keys(data).forEach((key) => {
    const value = data[key] || '';
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  // Handle conditional blocks {{#field}}...{{/field}}
  Object.keys(data).forEach((key) => {
    const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, 'g');
    if (data[key]) {
      result = result.replace(conditionalRegex, '$1');
    } else {
      result = result.replace(conditionalRegex, '');
    }
  });

  // Clean up any remaining placeholders
  result = result.replace(/{{[^}]+}}/g, '');

  return result;
}

/**
 * Get template for a specific type (from DB or default)
 */
async function getTemplate(templateType) {
  try {
    const templates = await db.notificationTemplates.filter({
      template_type: templateType,
      is_active: true,
    });

    if (templates.length > 0) {
      return {
        subject: templates[0].subject,
        body: templates[0].body,
      };
    }
  } catch (e) {
    console.log('Using default template for:', templateType);
  }

  return DEFAULT_TEMPLATES[templateType] || null;
}

/**
 * Send shipping notification for Shopping Order
 */
export async function sendShoppingOrderNotification(order, newStatus, customerEmail) {
  if (!customerEmail) {
    console.log('No customer email provided, skipping notification');
    return { sent: false, reason: 'no_email' };
  }

  const templateType =
    newStatus === 'shipping'
      ? 'shopping_shipping'
      : newStatus === 'delivered'
        ? 'shopping_delivered'
        : null;

  if (!templateType) {
    return { sent: false, reason: 'invalid_status' };
  }

  const template = await getTemplate(templateType);
  if (!template) {
    return { sent: false, reason: 'no_template' };
  }

  const data = {
    customer_name: order.customer_name || 'Valued Customer',
    order_number: order.order_number || order.id,
    tracking_number: order.tracking_number || '',
    delivery_address: order.delivery_address || 'N/A',
    status: newStatus,
  };

  const subject = processTemplate(template.subject, data);
  const body = processTemplate(template.body, data);

  try {
    await sendMessengerNotification({
      to: customerEmail,
      message: `${subject}\n\n${body.replace(/<[^>]*>/g, '')}`, // Strip HTML for messenger
      platform: 'line',
    });

    // Log notification
    await db.notifications.create({
      type: 'shipment_status',
      title: `Order ${data.order_number} - ${newStatus}`,
      message: `Notification sent to ${customerEmail}`,
      reference_type: 'shipment',
      reference_id: order.id,
      recipient_email: customerEmail,
      status: 'read',
      email_sent: true,
    });

    return { sent: true };
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { sent: false, reason: 'send_failed', error };
  }
}

/**
 * Send shipping notification for Cargo Shipment
 */
export async function sendShipmentNotification(shipment, newStatus, customerEmail) {
  if (!customerEmail) {
    return { sent: false, reason: 'no_email' };
  }

  const templateType =
    newStatus === 'in_transit'
      ? 'shipment_shipped'
      : newStatus === 'delivered'
        ? 'shipment_delivered'
        : null;

  if (!templateType) {
    return { sent: false, reason: 'invalid_status' };
  }

  const template = await getTemplate(templateType);
  if (!template) {
    return { sent: false, reason: 'no_template' };
  }

  const data = {
    customer_name: shipment.customer_name || 'Valued Customer',
    tracking_number: shipment.tracking_number || shipment.id,
    delivery_address: shipment.delivery_address || 'N/A',
    items: shipment.items_description || 'Cargo shipment',
    status: newStatus,
  };

  const subject = processTemplate(template.subject, data);
  const body = processTemplate(template.body, data);

  try {
    await sendMessengerNotification({
      to: customerEmail,
      message: `${subject}\n\n${body.replace(/<[^>]*>/g, '')}`, // Strip HTML for messenger
      platform: 'line',
    });

    await db.notifications.create({
      type: 'shipment_status',
      title: `Shipment ${data.tracking_number} - ${newStatus}`,
      message: `Notification sent to ${customerEmail}`,
      reference_type: 'shipment',
      reference_id: shipment.id,
      recipient_email: customerEmail,
      status: 'read',
      email_sent: true,
    });

    return { sent: true };
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { sent: false, reason: 'send_failed', error };
  }
}

export { DEFAULT_TEMPLATES, processTemplate, getTemplate };
