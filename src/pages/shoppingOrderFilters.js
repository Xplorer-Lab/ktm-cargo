export function isUnpaidShoppingOrder(order) {
  return (
    ['unpaid', 'deposit_paid'].includes(order?.payment_status) && order?.status !== 'cancelled'
  );
}

export function filterShoppingOrders(
  orders,
  { activeTab = 'all', statusFilter = 'all', searchQuery = '' } = {}
) {
  return orders.filter((order) => {
    if (activeTab === 'pending' && !['pending', 'purchasing'].includes(order.status)) return false;
    if (activeTab === 'in_transit' && !['purchased', 'received', 'shipping'].includes(order.status))
      return false;
    if (activeTab === 'completed' && order.status !== 'delivered') return false;
    if (activeTab === 'unpaid' && !isUnpaidShoppingOrder(order)) return false;

    if (statusFilter !== 'all' && order.status !== statusFilter) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (order.customer_name || '').toLowerCase().includes(query) ||
        (order.order_number || '').toLowerCase().includes(query) ||
        (order.product_details || '').toLowerCase().includes(query)
      );
    }

    return true;
  });
}
