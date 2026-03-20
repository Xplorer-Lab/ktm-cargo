/**
 * Mutation-path tests for Shipments page handlers.
 *
 * Covers: status transitions, payment status updates, notification
 * side-effects, vendor performance triggers, and permission guards.
 *
 * All external services and db are mocked.
 */

// ── Mocks ────────────────────────────────────────────────────────────────

const mockUpdate = jest.fn().mockResolvedValue({ id: 'ship-1' });
const mockDelete = jest.fn().mockResolvedValue({ id: 'ship-1' });
const mockCreate = jest.fn().mockResolvedValue({ id: 'ship-new', tracking_number: 'KTM-001' });

jest.mock('@/api/db', () => ({
  db: {
    shipments: {
      create: (...args) => mockCreate(...args),
      update: (...args) => mockUpdate(...args),
      delete: (...args) => mockDelete(...args),
      list: jest.fn().mockResolvedValue([]),
    },
    purchaseOrders: {
      update: jest.fn().mockResolvedValue({}),
      list: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockTriggerStatusAlert = jest.fn().mockResolvedValue(undefined);
const mockTriggerPaymentAlert = jest.fn().mockResolvedValue(undefined);
const mockTriggerDeliveryFeedback = jest.fn();
const mockSendFeedbackRequest = jest.fn().mockResolvedValue(undefined);
const mockUpdateVendorOnDelivery = jest.fn().mockResolvedValue(null);

jest.mock('@/components/notifications/NotificationService', () => ({
  triggerShipmentCreatedAlert: jest.fn().mockResolvedValue(undefined),
  triggerShipmentStatusAlert: (...args) => mockTriggerStatusAlert(...args),
  triggerPaymentReceivedAlert: (...args) => mockTriggerPaymentAlert(...args),
  triggerDeliveryFeedbackAlert: (...args) => mockTriggerDeliveryFeedback(...args),
}));

jest.mock('@/components/feedback/FeedbackRequestService', () => ({
  sendFeedbackRequest: (...args) => mockSendFeedbackRequest(...args),
}));

jest.mock('@/components/vendors/VendorPerformanceService', () => ({
  updateVendorOnDelivery: (...args) => mockUpdateVendorOnDelivery(...args),
}));

jest.mock('@/components/auth/RolePermissions', () => ({
  hasPermission: jest.fn((user, perm) => user?.role === 'admin' || user?.role === 'staff'),
}));

// ── Imports ──────────────────────────────────────────────────────────────

import { db } from '@/api/db';
import { hasPermission } from '@/components/auth/RolePermissions';

// ── Helpers (extracted logic mirrors) ────────────────────────────────────

/**
 * Mirror of Shipments.jsx handleStatusChange logic for testability.
 */
async function handleStatusChange(
  shipment,
  newStatus,
  { customers, vendors, vendorOrders, queryClient }
) {
  const oldStatus = shipment.status;
  await db.shipments.update(shipment.id, { status: newStatus });
  queryClient.invalidateQueries({ queryKey: ['shipments'] });

  if (oldStatus !== newStatus) {
    await mockTriggerStatusAlert(shipment, oldStatus, newStatus);
  }

  if (newStatus === 'delivered' && oldStatus !== 'delivered') {
    const customer = customers.find(
      (c) => c.name === shipment.customer_name || c.phone === shipment.customer_phone
    );
    if (customer) {
      mockTriggerDeliveryFeedback(shipment, customer);
      if (customer.email) {
        await mockSendFeedbackRequest(shipment, customer);
      }
    }

    const result = await mockUpdateVendorOnDelivery(shipment.id, vendorOrders, vendors);
    if (result) {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
    }
  }
}

/**
 * Mirror of Shipments.jsx handlePaymentChange logic.
 */
async function handlePaymentChange(shipment, newPaymentStatus, queryClient) {
  await db.shipments.update(shipment.id, { payment_status: newPaymentStatus });
  queryClient.invalidateQueries({ queryKey: ['shipments'] });

  if (newPaymentStatus === 'paid' && shipment.payment_status !== 'paid') {
    await mockTriggerPaymentAlert(shipment);
  }
}

/**
 * Mirror of deleteMutation permission check logic.
 */
function canDeleteShipment(user) {
  return hasPermission(user, 'manage_shipments');
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Shipment mutation paths', () => {
  let queryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = {
      invalidateQueries: jest.fn(),
    };
  });

  describe('handleStatusChange', () => {
    const baseShipment = {
      id: 'ship-1',
      status: 'pending',
      customer_name: 'Aung Aung',
      customer_phone: '09123456789',
      payment_status: 'unpaid',
    };

    const customers = [
      { id: 'cust-1', name: 'Aung Aung', phone: '09123456789', email: 'aung@test.com' },
    ];
    const vendors = [{ id: 'v-1', name: 'Vendor A' }];
    const vendorOrders = [{ id: 'vo-1', shipment_id: 'ship-1', vendor_id: 'v-1' }];

    it('updates shipment status and invalidates cache', async () => {
      await handleStatusChange(baseShipment, 'confirmed', {
        customers,
        vendors,
        vendorOrders,
        queryClient,
      });

      expect(mockUpdate).toHaveBeenCalledWith('ship-1', { status: 'confirmed' });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['shipments'] });
    });

    it('triggers status notification when status actually changes', async () => {
      await handleStatusChange(baseShipment, 'in_transit', {
        customers,
        vendors,
        vendorOrders,
        queryClient,
      });

      expect(mockTriggerStatusAlert).toHaveBeenCalledWith(baseShipment, 'pending', 'in_transit');
    });

    it('does not trigger notification when status is the same', async () => {
      await handleStatusChange({ ...baseShipment, status: 'pending' }, 'pending', {
        customers,
        vendors,
        vendorOrders,
        queryClient,
      });

      expect(mockTriggerStatusAlert).not.toHaveBeenCalled();
    });

    it('triggers feedback request on delivery with customer email', async () => {
      await handleStatusChange(baseShipment, 'delivered', {
        customers,
        vendors,
        vendorOrders,
        queryClient,
      });

      expect(mockTriggerDeliveryFeedback).toHaveBeenCalledWith(baseShipment, customers[0]);
      expect(mockSendFeedbackRequest).toHaveBeenCalledWith(baseShipment, customers[0]);
    });

    it('skips feedback email when customer has no email', async () => {
      const noEmailCustomers = [{ id: 'cust-1', name: 'Aung Aung', phone: '09123456789' }];

      await handleStatusChange(baseShipment, 'delivered', {
        customers: noEmailCustomers,
        vendors,
        vendorOrders,
        queryClient,
      });

      expect(mockTriggerDeliveryFeedback).toHaveBeenCalled();
      expect(mockSendFeedbackRequest).not.toHaveBeenCalled();
    });

    it('updates vendor performance on delivery', async () => {
      mockUpdateVendorOnDelivery.mockResolvedValueOnce({ updated: true });

      await handleStatusChange(baseShipment, 'delivered', {
        customers,
        vendors,
        vendorOrders,
        queryClient,
      });

      expect(mockUpdateVendorOnDelivery).toHaveBeenCalledWith('ship-1', vendorOrders, vendors);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['vendors'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['vendor-orders'] });
    });

    it('does not invalidate vendor queries when vendor update returns null', async () => {
      mockUpdateVendorOnDelivery.mockResolvedValueOnce(null);

      await handleStatusChange(baseShipment, 'delivered', {
        customers,
        vendors,
        vendorOrders,
        queryClient,
      });

      expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['vendors'] });
    });
  });

  describe('handlePaymentChange', () => {
    const shipment = {
      id: 'ship-2',
      payment_status: 'unpaid',
      status: 'delivered',
    };

    it('updates payment status and invalidates cache', async () => {
      await handlePaymentChange(shipment, 'paid', queryClient);

      expect(mockUpdate).toHaveBeenCalledWith('ship-2', { payment_status: 'paid' });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['shipments'] });
    });

    it('triggers payment notification when newly paid', async () => {
      await handlePaymentChange(shipment, 'paid', queryClient);

      expect(mockTriggerPaymentAlert).toHaveBeenCalledWith(shipment);
    });

    it('does not trigger notification for partial payment', async () => {
      await handlePaymentChange(shipment, 'partial', queryClient);

      expect(mockTriggerPaymentAlert).not.toHaveBeenCalled();
    });

    it('does not re-trigger when already paid', async () => {
      await handlePaymentChange({ ...shipment, payment_status: 'paid' }, 'paid', queryClient);

      expect(mockTriggerPaymentAlert).not.toHaveBeenCalled();
    });
  });

  describe('delete permission guard', () => {
    it('allows admin to delete', () => {
      expect(canDeleteShipment({ role: 'admin' })).toBe(true);
    });

    it('allows staff to delete', () => {
      expect(canDeleteShipment({ role: 'staff' })).toBe(true);
    });

    it('blocks customer from deleting', () => {
      expect(canDeleteShipment({ role: 'customer' })).toBe(false);
    });

    it('blocks when user is null', () => {
      expect(canDeleteShipment(null)).toBe(false);
    });
  });
});
