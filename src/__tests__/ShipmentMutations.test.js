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
const mockPurchaseOrderUpdate = jest.fn().mockResolvedValue({});

jest.mock('@/api/db', () => ({
  db: {
    shipments: {
      create: (...args) => mockCreate(...args),
      update: (...args) => mockUpdate(...args),
      delete: (...args) => mockDelete(...args),
      list: jest.fn().mockResolvedValue([]),
    },
    purchaseOrders: {
      update: (...args) => mockPurchaseOrderUpdate(...args),
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
  hasPermission: jest.fn((user, _perm) => user?.role === 'admin' || user?.role === 'staff'),
}));

// ── Imports ──────────────────────────────────────────────────────────────

import { db } from '@/api/db';
import { hasPermission } from '@/components/auth/RolePermissions';
import {
  applyPORebalanceOperations,
  buildPORebalanceOperations,
  canAllocateToPO,
  getShipmentAllocationWeight,
  rollbackPORebalanceOperations,
} from '@/lib/poAllocation';

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

function findLinkedPurchaseOrder(purchaseOrders, poId) {
  if (!poId) return null;
  return purchaseOrders.find((item) => item.id === poId) || null;
}

async function createShipmentWithAllocation(shipment, purchaseOrders) {
  const nextPo = findLinkedPurchaseOrder(purchaseOrders, shipment.vendor_po_id);
  const operations = buildPORebalanceOperations({
    nextPo,
    nextWeight: getShipmentAllocationWeight(shipment),
  });

  await applyPORebalanceOperations(db.purchaseOrders.update, operations);

  try {
    return await db.shipments.create(shipment);
  } catch (error) {
    await rollbackPORebalanceOperations(db.purchaseOrders.update, operations);
    throw error;
  }
}

async function updateShipmentWithAllocation(id, data, shipments, purchaseOrders) {
  const oldShipment = shipments.find((item) => item.id === id);
  const nextShipment = oldShipment ? { ...oldShipment, ...data } : data;
  const previousPo = findLinkedPurchaseOrder(purchaseOrders, oldShipment?.vendor_po_id);
  const nextPo = findLinkedPurchaseOrder(purchaseOrders, nextShipment.vendor_po_id);
  const operations = buildPORebalanceOperations({
    previousPo,
    nextPo,
    previousWeight: getShipmentAllocationWeight(oldShipment),
    nextWeight: getShipmentAllocationWeight(nextShipment),
  });

  await applyPORebalanceOperations(db.purchaseOrders.update, operations);

  try {
    return await db.shipments.update(id, data);
  } catch (error) {
    await rollbackPORebalanceOperations(db.purchaseOrders.update, operations);
    throw error;
  }
}

async function deleteShipmentWithAllocation(id, shipments, purchaseOrders) {
  const shipment = shipments.find((item) => item.id === id);
  const previousPo = findLinkedPurchaseOrder(purchaseOrders, shipment?.vendor_po_id);
  const operations = buildPORebalanceOperations({
    previousPo,
    previousWeight: getShipmentAllocationWeight(shipment),
  });

  await applyPORebalanceOperations(db.purchaseOrders.update, operations);

  try {
    return await db.shipments.delete(id);
  } catch (error) {
    await rollbackPORebalanceOperations(db.purchaseOrders.update, operations);
    throw error;
  }
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

  describe('allocation rebalance', () => {
    const baseShipment = {
      id: 'ship-1',
      vendor_po_id: 'po-1',
      weight_kg: '2',
      customer_name: 'Aung Aung',
      customer_phone: '09123456789',
    };
    const basePurchaseOrders = [
      {
        id: 'po-1',
        total_weight_kg: 10,
        allocated_weight_kg: 6,
        remaining_weight_kg: 4,
      },
      {
        id: 'po-2',
        total_weight_kg: 8,
        allocated_weight_kg: 1,
        remaining_weight_kg: 7,
      },
    ];

    it('allocates shipment weight to the target PO on create and rolls back on failure', async () => {
      mockCreate.mockRejectedValueOnce(new Error('create failed'));

      await expect(createShipmentWithAllocation(baseShipment, basePurchaseOrders)).rejects.toThrow(
        'create failed'
      );

      expect(mockPurchaseOrderUpdate).toHaveBeenNthCalledWith(1, 'po-1', {
        allocated_weight_kg: 8,
        remaining_weight_kg: 2,
      });
      expect(mockPurchaseOrderUpdate).toHaveBeenNthCalledWith(2, 'po-1', {
        allocated_weight_kg: 6,
        remaining_weight_kg: 4,
      });
    });

    it('rebalances allocation net of the old shipment weight when the PO does not change', async () => {
      mockUpdate.mockResolvedValueOnce({ id: 'ship-1' });

      await updateShipmentWithAllocation(
        'ship-1',
        { weight_kg: '3' },
        [baseShipment],
        basePurchaseOrders
      );

      expect(mockPurchaseOrderUpdate).toHaveBeenCalledWith('po-1', {
        allocated_weight_kg: 7,
        remaining_weight_kg: 3,
      });
      expect(mockUpdate).toHaveBeenCalledWith('ship-1', { weight_kg: '3' });
    });

    it('moves allocation from the old PO to the new PO when the PO changes', async () => {
      mockUpdate.mockResolvedValueOnce({ id: 'ship-1' });

      await updateShipmentWithAllocation(
        'ship-1',
        { vendor_po_id: 'po-2', weight_kg: '3' },
        [baseShipment],
        basePurchaseOrders
      );

      expect(mockPurchaseOrderUpdate).toHaveBeenNthCalledWith(1, 'po-1', {
        allocated_weight_kg: 4,
        remaining_weight_kg: 6,
      });
      expect(mockPurchaseOrderUpdate).toHaveBeenNthCalledWith(2, 'po-2', {
        allocated_weight_kg: 4,
        remaining_weight_kg: 4,
      });
    });

    it('skips PO rebalance when the previous shipment snapshot is missing from cache', async () => {
      mockUpdate.mockResolvedValueOnce({ id: 'ship-1' });

      await updateShipmentWithAllocation('ship-1', { weight_kg: '3' }, [], basePurchaseOrders);

      expect(mockPurchaseOrderUpdate).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith('ship-1', { weight_kg: '3' });
    });

    it('deallocates shipment weight from the source PO on delete and rolls back on failure', async () => {
      mockDelete.mockRejectedValueOnce(new Error('delete failed'));

      await expect(
        deleteShipmentWithAllocation('ship-1', [baseShipment], basePurchaseOrders)
      ).rejects.toThrow('delete failed');

      expect(mockPurchaseOrderUpdate).toHaveBeenNthCalledWith(1, 'po-1', {
        allocated_weight_kg: 4,
        remaining_weight_kg: 6,
      });
      expect(mockPurchaseOrderUpdate).toHaveBeenNthCalledWith(2, 'po-1', {
        allocated_weight_kg: 6,
        remaining_weight_kg: 4,
      });
    });

    it('skips PO rebalance when the previous shipment snapshot is missing on delete', async () => {
      mockDelete.mockResolvedValueOnce({ id: 'ship-1' });

      await deleteShipmentWithAllocation('ship-1', [], basePurchaseOrders);

      expect(mockPurchaseOrderUpdate).not.toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalledWith('ship-1');
    });

    it('allows edits to reuse current linked capacity while still rejecting overweight input', () => {
      const po = {
        id: 'po-1',
        total_weight_kg: 10,
        allocated_weight_kg: 6,
        remaining_weight_kg: 4,
      };

      expect(canAllocateToPO(po, 6, 2)).toBe(true);
      expect(canAllocateToPO(po, 7, 2)).toBe(false);
    });
  });
});
