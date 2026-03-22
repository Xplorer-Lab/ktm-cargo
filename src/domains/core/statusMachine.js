/**
 * Status transition state machine for KTM Cargo.
 * Defines valid transitions for each entity type.
 * Terminal states have no outgoing transitions.
 */

export const SHIPMENT_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['customs', 'cancelled'],
  customs: ['delivered', 'cancelled'],
  delivered: [], // terminal
  cancelled: [], // terminal
};

export const SHOPPING_ORDER_TRANSITIONS = {
  pending: ['purchasing', 'cancelled'],
  purchasing: ['purchased', 'cancelled'],
  purchased: ['received', 'cancelled'],
  received: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [], // terminal
  cancelled: [], // terminal
};

export const PURCHASE_ORDER_TRANSITIONS = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'cancelled'],
  approved: ['sent', 'cancelled'],
  sent: ['partial_received', 'received', 'cancelled'],
  partial_received: ['received', 'cancelled'],
  received: [], // terminal
  cancelled: [], // terminal
};

export const JOURNEY_STAGE_TRANSITIONS = {
  inquiry_received: ['quoted', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['payment_partial', 'payment_confirmed', 'cancelled'],
  payment_partial: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['thailand_fulfillment', 'cancelled'],
  thailand_fulfillment: ['consolidated', 'cancelled'],
  consolidated: ['booked_with_carrier', 'cancelled'],
  booked_with_carrier: ['departed_thailand', 'cancelled'],
  departed_thailand: ['arrived_myanmar', 'cancelled'],
  arrived_myanmar: ['customs_cleared', 'cancelled'],
  customs_cleared: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['after_sales_open', 'reconciled'],
  after_sales_open: ['reconciled', 'cancelled'],
  reconciled: [], // terminal
  cancelled: [], // terminal
};

/**
 * Validate a status transition.
 * @param {string} from - current status
 * @param {string} to - desired status
 * @param {Object} transitionMap - transition map for entity type
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateTransition(from, to, transitionMap) {
  if (from === to) {
    return { valid: false, reason: `Already in status "${to}"` };
  }

  const allowed = transitionMap[from];
  if (!allowed) {
    return { valid: false, reason: `Unknown status "${from}"` };
  }

  if (allowed.length === 0) {
    return { valid: false, reason: `"${from}" is a terminal status — no further transitions allowed` };
  }

  if (!allowed.includes(to)) {
    return {
      valid: false,
      reason: `Cannot transition from "${from}" → "${to}". Allowed: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}

export function canTransitionShipment(from, to) {
  return validateTransition(from, to, SHIPMENT_TRANSITIONS);
}

export function canTransitionShoppingOrder(from, to) {
  return validateTransition(from, to, SHOPPING_ORDER_TRANSITIONS);
}

export function canTransitionPurchaseOrder(from, to) {
  return validateTransition(from, to, PURCHASE_ORDER_TRANSITIONS);
}

export function canTransitionJourneyStage(from, to) {
  return validateTransition(from, to, JOURNEY_STAGE_TRANSITIONS);
}
