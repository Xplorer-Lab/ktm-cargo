import { filterShoppingOrders, isUnpaidShoppingOrder } from './shoppingOrderFilters';

describe('shoppingOrderFilters', () => {
  const sampleOrders = [
    {
      id: '1',
      order_number: 'SHOP-1',
      customer_name: 'Alice',
      product_details: 'Phone case',
      status: 'pending',
      payment_status: 'unpaid',
    },
    {
      id: '2',
      order_number: 'SHOP-2',
      customer_name: 'Bob',
      product_details: 'Laptop bag',
      status: 'shipping',
      payment_status: 'deposit_paid',
    },
    {
      id: '3',
      order_number: 'SHOP-3',
      customer_name: 'Cara',
      product_details: 'Shoes',
      status: 'delivered',
      payment_status: 'paid',
    },
    {
      id: '4',
      order_number: 'SHOP-4',
      customer_name: 'Dan',
      product_details: 'Watch',
      status: 'cancelled',
      payment_status: 'unpaid',
    },
  ];

  it('identifies unpaid follow-up orders using status and payment status', () => {
    expect(isUnpaidShoppingOrder(sampleOrders[0])).toBe(true);
    expect(isUnpaidShoppingOrder(sampleOrders[1])).toBe(true);
    expect(isUnpaidShoppingOrder(sampleOrders[2])).toBe(false);
    expect(isUnpaidShoppingOrder(sampleOrders[3])).toBe(false);
  });

  it('unpaid tab shows unpaid and deposit-paid non-cancelled orders that still need follow-up', () => {
    const result = filterShoppingOrders(sampleOrders, { activeTab: 'unpaid' });

    expect(result.map((o) => o.id)).toEqual(['1', '2']);
  });

  it('supports search and status filters in combination', () => {
    const result = filterShoppingOrders(sampleOrders, {
      activeTab: 'all',
      statusFilter: 'shipping',
      searchQuery: 'laptop',
    });

    expect(result.map((o) => o.id)).toEqual(['2']);
  });
});
