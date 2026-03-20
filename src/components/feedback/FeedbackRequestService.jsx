import { db } from '@/api/db';
import { sendMessengerNotification } from '@/api/integrations';

export async function sendFeedbackRequest(shipment, customer) {
  if (!customer?.email) return false;

  const feedbackLink = `${window.location.origin}/Feedback?shipment=${shipment.id}`;

  const message = `Dear ${customer.name || shipment.customer_name},\n\nYour shipment ${shipment.tracking_number} has been delivered! 🎉\n\nRate your experience here: ${feedbackLink}`;

  try {
    await sendMessengerNotification({
      to: customer.email,
      message: message,
      platform: 'line'
    });

    // Create pending feedback record
    await db.feedback.create({
      shipment_id: shipment.id,
      journey_id: shipment.journey_id || null,
      customer_id: customer.id || '',
      customer_name: customer.name || shipment.customer_name,
      customer_email: customer.email,
      service_type: shipment.service_type,
      feedback_kind: 'delivery_feedback',
      order_reference_type: 'shipment',
      order_reference_id: shipment.id,
      status: 'pending',
    });

    return true;
  } catch (error) {
    console.error('Failed to send feedback request:', error);
    return false;
  }
}

export async function checkAndRequestFeedback(shipment, customers) {
  // Find customer by name or phone
  const customer = customers.find(
    (c) => c.name === shipment.customer_name || c.phone === shipment.customer_phone
  );

  if (customer?.email) {
    return sendFeedbackRequest(shipment, customer);
  }
  return false;
}
