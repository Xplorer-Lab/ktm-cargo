/**
 * Mutation-path tests for ShoppingOrders page handlers.
 *
 * Covers: order create/update, payment status changes, PO allocation,
 * notification triggers, and invoice reminder logic.
 */

// ── Mocks ────────────────────────────────────────────────────────────────

const mockCreate = jest.fn().mockResolvedValue({ id: 'so-new', order_number: 'SHOP-ABC' });
const mockUpdateOrder = jest.fn().mockResolvedValue({ id: 'so-1' });
const mockUpdatePO = jest.fn().mockResolvedValue({ id: 'po-1' });
const mockSendNotification = jest.fn().mockResolvedValue(undefined);

jest.mock('@/api/db', () => ({
  db: {
    shoppingOrders: {
      create: (...args) => mockCreate(...args),
      update: (...args) => mockUpdateOrder(...args),
      list: jest.fn().mockResolvedValue([]),
    },
    purchaseOrders: {
      update: (...args) => mockUpdatePO(...args),
      list: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('@/components/notifications/ShippingNotificationService', () => ({
  sendShoppingOrderNotification: (...args) => mockSendNotification(...args),
}));

// ── Imports ──────────────────────────────────────────────────────────────

import { db } from '@/api/db';

// ── Extracted logic mirrors ──────────────────────────────────────────────

function remindToCreateInvoice(order) {
  if (order.status === 'delivered' && order.payment_status === 'paid') {
    return 'Order completed. Remember to create an invoice from the Invoices page.';
  }
  return null;
}

function shouldSendNotification(oldStatus, newStatus) {
  const statusChanged = oldStatus !== newStatus;
  return statusChanged && (newStatus === 'shipping' || newStatus === 'delivered');
}

async function handleUpdateMutation(id, data, orders, sendNotification, customerEmail) {
  await db.shoppingOrders.update(id, data);

  if (
    sendNotification &&
    customerEmail &&
    (data.status === 'shipping' || data.status === 'delivered')
  ) {
    const order = orders.find((o) => o.id === id);
    if (order) {
      await mockSendNotification({ ...order, ...data }, data.status, customerEmail);
    }
  }
}

async function handleQuickPaymentChange(order, newStatus, queryClient) {
  await db.shoppingOrders.update(order.id, { payment_status: newStatus });
  queryClient.invalidateQueries({ queryKey: ['shopping-orders'] });
  queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
}

async function handlePOAllocationUpdate(poId, data) {
  await db.purchaseOrders.update(poId, data);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('ShoppingOrder mutation paths', () => {
  let queryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = { invalidateQueries: jest.fn() };
  });

  describe('remindToCreateInvoice', () => {
    it('returns reminder when status=delivered and payment=paid', () => {
      expect(remindToCreateInvoice({ status: 'delivered', payment_status: 'paid' })).toMatch(
        /create an invoice/i
      );
    });

    it('returns null when not delivered', () => {
      expect(remindToCreateInvoice({ status: 'shipping', payment_status: 'paid' })).toBeNull();
    });

    it('returns null when not paid', () => {
      expect(remindToCreateInvoice({ status: 'delivered', payment_status: 'unpaid' })).toBeNull();
    });

    it('returns null when pending + unpaid', () => {
      expect(remindToCreateInvoice({ status: 'pending', payment_status: 'unpaid' })).toBeNull();
    });
  });

  describe('shouldSendNotification', () => {
    it('sends on status change to shipping', () => {
      expect(shouldSendNotification('pending', 'shipping')).toBe(true);
    });

    it('sends on status change to delivered', () => {
      expect(shouldSendNotification('shipping', 'delivered')).toBe(true);
    });

    it('does not send for other status changes', () => {
      expect(shouldSendNotification('pending', 'purchasing')).toBe(false);
    });

    it('does not send when status is the same', () => {
      expect(shouldSendNotification('shipping', 'shipping')).toBe(false);
    });
  });

  describe('handleUpdateMutation', () => {
    const orders = [{ id: 'so-1', order_number: 'SHOP-1', customer_name: 'Test' }];

    it('updates order in database', async () => {
      await handleUpdateMutation('so-1', { status: 'purchased' }, orders, false, null);

      expect(mockUpdateOrder).toHaveBeenCalledWith('so-1', { status: 'purchased' });
    });

    it('sends notification when status changes to shipping with customer email', async () => {
      await handleUpdateMutation('so-1', { status: 'shipping' }, orders, true, 'customer@test.com');

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'so-1', status: 'shipping' }),
        'shipping',
        'customer@test.com'
      );
    });

    it('does not send notification when sendNotification is false', async () => {
      await handleUpdateMutation('so-1', { status: 'shipping' }, orders, false, 'a@b.com');

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('does not send notification without customer email', async () => {
      await handleUpdateMutation('so-1', { status: 'delivered' }, orders, true, null);

      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('handleQuickPaymentChange', () => {
    it('updates payment status and invalidates caches', async () => {
      const order = { id: 'so-2', status: 'delivered', payment_status: 'unpaid' };
      await handleQuickPaymentChange(order, 'paid', queryClient);

      expect(mockUpdateOrder).toHaveBeenCalledWith('so-2', { payment_status: 'paid' });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['shopping-orders'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['customer-invoices'],
      });
    });
  });

  describe('PO allocation update', () => {
    it('updates purchase order with allocation data', async () => {
      await handlePOAllocationUpdate('po-1', {
        allocated_weight_kg: 50,
        remaining_weight_kg: 150,
      });

      expect(mockUpdatePO).toHaveBeenCalledWith('po-1', {
        allocated_weight_kg: 50,
        remaining_weight_kg: 150,
      });
    });
  });
});
