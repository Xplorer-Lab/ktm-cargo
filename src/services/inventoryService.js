/**
 * Inventory Service — auto-deduct stock on shipment/order lifecycle events.
 *
 * Deduction rules:
 *  - Shipment confirmed  → deduct 'packaging' items (1 unit per item, per shipment)
 *  - Shopping order moves to 'shipping' → deduct 'goods' items linked to the order
 *
 * Each deduction creates a stock_movement record for full audit trail.
 */

import { db } from '@/api/db';

/**
 * Compute new status string based on stock level.
 * @param {number} stock
 * @param {number} reorderPoint
 * @returns {'in_stock'|'low_stock'|'out_of_stock'}
 */
function computeStockStatus(stock, reorderPoint) {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= reorderPoint) return 'low_stock';
  return 'in_stock';
}

/**
 * Record a single stock outflow movement and update item stock.
 * @param {Object} item        - inventory_items row
 * @param {number} quantity    - units to deduct
 * @param {string} reason      - human-readable reason (e.g. "Shipment SHP-001 confirmed")
 */
async function deductStock(item, quantity, reason) {
  if (!item || quantity <= 0) return;

  const newStock = Math.max(0, (item.current_stock || 0) - quantity);

  await db.stockMovements.create({
    item_id: item.id,
    item_name: item.name,
    movement_type: 'out',
    quantity,
    stock_after: newStock,
    reason,
  });

  await db.inventoryItems.update(item.id, {
    current_stock: newStock,
    status: computeStockStatus(newStock, item.reorder_point || 0),
  });
}

/**
 * Deduct packaging inventory when a shipment is confirmed.
 * Deducts 1 unit from every 'packaging' category item that has stock > 0.
 *
 * @param {Object} shipment - shipment row (needs .id, .shipment_number)
 */
export async function deductInventoryForShipment(shipment) {
  try {
    const allItems = await db.inventoryItems.list();
    const packagingItems = allItems.filter(
      (item) => item.category === 'packaging' && (item.current_stock || 0) > 0
    );

    const reason = `Shipment ${shipment.shipment_number || shipment.id} confirmed`;

    await Promise.all(packagingItems.map((item) => deductStock(item, 1, reason)));
  } catch (err) {
    // Non-blocking — log but don't fail the shipment flow
    console.error('[inventoryService] deductInventoryForShipment failed:', err);
  }
}

/**
 * Deduct goods inventory when a shopping order moves to 'shipping'.
 * Deducts 1 unit from every 'goods' category item that has stock > 0.
 *
 * @param {Object} order - shopping_orders row (needs .id, .order_number)
 */
export async function deductInventoryForOrder(order) {
  try {
    const allItems = await db.inventoryItems.list();
    const goodsItems = allItems.filter(
      (item) => item.category === 'goods' && (item.current_stock || 0) > 0
    );

    const reason = `Shopping order ${order.order_number || order.id} moved to shipping`;

    await Promise.all(goodsItems.map((item) => deductStock(item, 1, reason)));
  } catch (err) {
    // Non-blocking — log but don't fail the order flow
    console.error('[inventoryService] deductInventoryForOrder failed:', err);
  }
}
