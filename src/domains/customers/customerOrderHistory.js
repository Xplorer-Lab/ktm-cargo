const DEFAULT_SHIPMENT_LABEL = 'Cargo shipment';
const DEFAULT_SHOPPING_LABEL = 'Shopping order';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function formatServiceLabel(serviceType, fallback) {
  if (!serviceType) return fallback;
  return String(serviceType).replace(/_/g, ' ');
}

function buildSearchText(parts) {
  return parts
    .filter(Boolean)
    .map((part) => String(part).toLowerCase())
    .join(' ');
}

export function normalizeShipmentOrder(shipment) {
  const sourceId = shipment?.id || '';
  const displayId = shipment?.tracking_number || `SHP-${String(sourceId).slice(-6).toUpperCase()}`;
  const createdDate = shipment?.created_date || shipment?.updated_date || null;

  return {
    id: `shipment-${sourceId || displayId}`,
    sourceType: 'shipment',
    sourceId,
    displayId,
    description: shipment?.items_description || 'Package shipment',
    serviceLabel: formatServiceLabel(shipment?.service_type, DEFAULT_SHIPMENT_LABEL),
    status: shipment?.status || 'pending',
    paymentStatus: shipment?.payment_status || 'unpaid',
    totalAmount: toNumber(shipment?.total_amount),
    weightKg: toNumber(shipment?.weight_kg),
    createdDate,
    sortTimestamp: toTimestamp(createdDate),
    raw: shipment,
    searchText: buildSearchText([
      displayId,
      shipment?.items_description,
      shipment?.service_type,
      shipment?.status,
      shipment?.payment_status,
    ]),
  };
}

export function normalizeShoppingOrder(order) {
  const sourceId = order?.id || '';
  const displayId =
    order?.order_number ||
    order?.reference_number ||
    `SHOP-${String(sourceId).slice(-6).toUpperCase()}`;
  const createdDate = order?.created_date || order?.order_date || order?.updated_date || null;

  return {
    id: `shopping-${sourceId || displayId}`,
    sourceType: 'shopping',
    sourceId,
    displayId,
    description: order?.product_details || order?.items_description || 'Shopping order',
    serviceLabel: DEFAULT_SHOPPING_LABEL,
    status: order?.status || 'pending',
    paymentStatus: order?.payment_status || 'unpaid',
    totalAmount: toNumber(order?.total_amount),
    weightKg: toNumber(order?.actual_weight || order?.estimated_weight),
    createdDate,
    sortTimestamp: toTimestamp(createdDate),
    raw: order,
    searchText: buildSearchText([
      displayId,
      order?.product_details,
      order?.product_links,
      order?.status,
      order?.payment_status,
      order?.vendor_name,
    ]),
  };
}

export function buildCustomerOrderHistory(shipments = [], shoppingOrders = []) {
  const unified = [
    ...shipments.map((shipment) => normalizeShipmentOrder(shipment)),
    ...shoppingOrders.map((order) => normalizeShoppingOrder(order)),
  ];

  return unified.sort((a, b) => {
    if (a.sortTimestamp !== b.sortTimestamp) return b.sortTimestamp - a.sortTimestamp;
    return b.id.localeCompare(a.id);
  });
}
