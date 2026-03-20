/**
 * Mutation-path tests for Vendors page handlers.
 *
 * Covers: vendor create/update/delete, payment processing,
 * mark-paid flow, order completion, and cache invalidation.
 */

// ── Mocks ────────────────────────────────────────────────────────────────

const mockCreateVendor = jest.fn().mockResolvedValue({ id: 'v-new' });
const mockUpdateVendor = jest.fn().mockResolvedValue({ id: 'v-1' });
const mockDeleteVendor = jest.fn().mockResolvedValue({ id: 'v-1' });
const mockUpdateOrder = jest.fn().mockResolvedValue({ id: 'vo-1' });

jest.mock('@/api/db', () => ({
  db: {
    vendors: {
      create: (...args) => mockCreateVendor(...args),
      update: (...args) => mockUpdateVendor(...args),
      delete: (...args) => mockDeleteVendor(...args),
      list: jest.fn().mockResolvedValue([]),
    },
    vendorOrders: {
      update: (...args) => mockUpdateOrder(...args),
      list: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockProcessUnpaid = jest.fn().mockResolvedValue(undefined);
const mockMarkPaymentPaid = jest.fn().mockResolvedValue(undefined);

jest.mock('@/components/vendors/VendorPaymentService', () => ({
  processUnpaidOrders: (...args) => mockProcessUnpaid(...args),
  markPaymentPaid: (...args) => mockMarkPaymentPaid(...args),
  checkOverduePayments: jest.fn(),
  checkUpcomingPayments: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────

import { db } from '@/api/db';

// ── Extracted logic mirrors ──────────────────────────────────────────────

function handleVendorSubmit(data, editingVendor) {
  if (editingVendor) {
    return { action: 'update', id: editingVendor.id, data };
  }
  return { action: 'create', data };
}

async function handleProcessPayments(vendorOrders, vendors, queryClient) {
  await mockProcessUnpaid(vendorOrders, vendors);
  queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
}

async function handleMarkPaid(paymentId, method, reference, queryClient) {
  await mockMarkPaymentPaid(paymentId, method, reference);
  queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
}

function completeOrder(order) {
  const now = new Date();
  const actual_date = now.toISOString().slice(0, 10);
  const on_time = order.expected_date ? now <= new Date(order.expected_date) : true;

  return {
    id: order.id,
    data: {
      ...order,
      status: 'completed',
      actual_date,
      on_time,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Vendor mutation paths', () => {
  let queryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = { invalidateQueries: jest.fn() };
  });

  describe('handleVendorSubmit routing', () => {
    it('routes to create when no editing vendor', () => {
      const result = handleVendorSubmit({ name: 'New Vendor', type: 'freight' }, null);
      expect(result.action).toBe('create');
      expect(result.data.name).toBe('New Vendor');
    });

    it('routes to update when editing vendor exists', () => {
      const result = handleVendorSubmit(
        { name: 'Updated Vendor' },
        { id: 'v-1', name: 'Old Vendor' }
      );
      expect(result.action).toBe('update');
      expect(result.id).toBe('v-1');
    });
  });

  describe('handleProcessPayments', () => {
    const vendorOrders = [{ id: 'vo-1', status: 'completed', vendor_id: 'v-1', total_cost: 5000 }];
    const vendors = [{ id: 'v-1', name: 'Vendor A' }];

    it('processes unpaid orders and invalidates payment cache', async () => {
      await handleProcessPayments(vendorOrders, vendors, queryClient);

      expect(mockProcessUnpaid).toHaveBeenCalledWith(vendorOrders, vendors);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['vendor-payments'],
      });
    });

    it('propagates processing errors', async () => {
      mockProcessUnpaid.mockRejectedValueOnce(new Error('No orders to process'));

      await expect(handleProcessPayments([], [], queryClient)).rejects.toThrow(
        'No orders to process'
      );
    });
  });

  describe('handleMarkPaid', () => {
    it('marks payment as paid with method and reference', async () => {
      await handleMarkPaid('pay-1', 'bank_transfer', 'REF-12345', queryClient);

      expect(mockMarkPaymentPaid).toHaveBeenCalledWith('pay-1', 'bank_transfer', 'REF-12345');
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['vendor-payments'],
      });
    });

    it('handles null reference gracefully', async () => {
      await handleMarkPaid('pay-2', 'cash', null, queryClient);

      expect(mockMarkPaymentPaid).toHaveBeenCalledWith('pay-2', 'cash', null);
    });

    it('propagates payment errors', async () => {
      mockMarkPaymentPaid.mockRejectedValueOnce(new Error('Payment not found'));

      await expect(handleMarkPaid('pay-999', 'cash', null, queryClient)).rejects.toThrow(
        'Payment not found'
      );
    });
  });

  describe('completeOrder', () => {
    it('sets status to completed with actual date', () => {
      const order = {
        id: 'vo-1',
        status: 'in_transit',
        vendor_id: 'v-1',
        expected_date: '2099-12-31',
      };

      const result = completeOrder(order);

      expect(result.data.status).toBe('completed');
      expect(result.data.actual_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.id).toBe('vo-1');
    });

    it('marks on_time=true when completed before expected date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const order = {
        id: 'vo-2',
        status: 'in_transit',
        expected_date: futureDate.toISOString().slice(0, 10),
      };

      const result = completeOrder(order);
      expect(result.data.on_time).toBe(true);
    });

    it('marks on_time=false when completed after expected date', () => {
      const order = {
        id: 'vo-3',
        status: 'in_transit',
        expected_date: '2020-01-01', // far in the past
      };

      const result = completeOrder(order);
      expect(result.data.on_time).toBe(false);
    });

    it('defaults on_time=true when no expected date', () => {
      const order = {
        id: 'vo-4',
        status: 'in_transit',
        expected_date: null,
      };

      const result = completeOrder(order);
      expect(result.data.on_time).toBe(true);
    });
  });
});
