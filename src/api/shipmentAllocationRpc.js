import { supabase } from './supabaseClient';

function unwrapShipmentRpcResult(name, data, error) {
  if (error) {
    throw error;
  }

  if (!data || typeof data !== 'object') {
    throw new Error(`${name} returned an invalid response`);
  }

  return {
    shipment: data.shipment || null,
    purchaseOrders: Array.isArray(data.purchase_orders) ? data.purchase_orders : [],
  };
}

export async function createShipmentWithPoRebalance(payload) {
  const { data, error } = await supabase.rpc('create_shipment_with_po_rebalance', {
    p_payload: payload,
  });
  return unwrapShipmentRpcResult('create_shipment_with_po_rebalance', data, error);
}

export async function updateShipmentWithPoRebalance(shipmentId, updates) {
  const { data, error } = await supabase.rpc('update_shipment_with_po_rebalance', {
    p_shipment_id: shipmentId,
    p_updates: updates,
  });
  return unwrapShipmentRpcResult('update_shipment_with_po_rebalance', data, error);
}

export async function deleteShipmentWithPoRebalance(shipmentId) {
  const { data, error } = await supabase.rpc('delete_shipment_with_po_rebalance', {
    p_shipment_id: shipmentId,
  });
  return unwrapShipmentRpcResult('delete_shipment_with_po_rebalance', data, error);
}
