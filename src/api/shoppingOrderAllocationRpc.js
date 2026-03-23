import { supabase } from './supabaseClient';
import { getShoppingOrderWeightKg } from '@/lib/shoppingOrderAllocation';

/**
 * Atomically update a shopping order and rebalance PO weight allocations.
 *
 * Replaces the client-side sequential applyPurchaseOrderAllocationPlan +
 * db.shoppingOrders.update pattern which was P0: partial corruption on failure.
 *
 * Requires migration: 20260323_shopping_order_po_rebalance.sql
 */
export async function updateShoppingOrderWithPoRebalance(orderId, updates, previousOrder) {
  const previousPoId = previousOrder?.vendor_po_id || null;

  // Determine next PO: explicit change in updates, or inherit from previous order
  const nextPoId = 'vendor_po_id' in updates ? updates.vendor_po_id || null : previousPoId;

  // Weight to dealloc from old PO
  const previousWeight = previousPoId ? getShoppingOrderWeightKg(previousOrder) : 0;

  // Weight to alloc to new PO (use merged state so actual_weight changes are respected)
  const nextOrderState = { ...previousOrder, ...updates };
  const nextWeight = nextPoId ? getShoppingOrderWeightKg(nextOrderState) : 0;

  const { data, error } = await supabase.rpc('update_shopping_order_with_po_rebalance', {
    p_order_id: orderId,
    p_updates: updates,
    p_previous_po_id: previousPoId,
    p_next_po_id: nextPoId,
    p_previous_weight: previousWeight,
    p_next_weight: nextWeight,
  });

  if (error) throw error;
  return data;
}

/**
 * Atomically dealloc PO weight and delete a shopping order in one DB transaction.
 * Requires migration: 20260323_shopping_order_po_rebalance.sql
 */
export async function deleteShoppingOrderWithPoDealloc(orderId, previousOrder) {
  const previousPoId = previousOrder?.vendor_po_id || null;
  const previousWeight = previousPoId ? getShoppingOrderWeightKg(previousOrder) : 0;

  const { error } = await supabase.rpc('delete_shopping_order_with_po_dealloc', {
    p_order_id: orderId,
    p_previous_po_id: previousPoId,
    p_previous_weight: previousWeight,
  });

  if (error) throw error;
}
