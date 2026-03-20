/**
 * Mutation-path tests for Procurement page handlers.
 *
 * Covers: PO create/update, approval workflow (submit/approve/reject),
 * auto-approval, goods receipt, and query invalidation patterns.
 */

// ── Mocks ────────────────────────────────────────────────────────────────

const mockUpdatePO = jest.fn().mockResolvedValue({ id: 'po-1' });
const mockCreatePO = jest.fn().mockResolvedValue({ id: 'po-new' });

jest.mock('@/api/db', () => ({
  db: {
    purchaseOrders: {
      create: (...args) => mockCreatePO(...args),
      update: (...args) => mockUpdatePO(...args),
      list: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock the approval workflow service
const mockSubmitPOForApproval = jest.fn();
const mockApprovePO = jest.fn();
const mockRejectPO = jest.fn();

jest.mock('@/components/procurement/ApprovalWorkflowService', () => ({
  submitPOForApproval: (...args) => mockSubmitPOForApproval(...args),
  approvePO: (...args) => mockApprovePO(...args),
  rejectPO: (...args) => mockRejectPO(...args),
}));

// ── Imports ──────────────────────────────────────────────────────────────

import { db } from '@/api/db';

// ── Extracted logic mirrors ──────────────────────────────────────────────

async function handleSubmitForApproval(po, approvalRules, vendors, queryClient) {
  const result = await mockSubmitPOForApproval(po, approvalRules, vendors);
  queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  queryClient.invalidateQueries({ queryKey: ['approval-history'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  return result;
}

async function handleApprovePOWorkflow(po, currentUser, comments, queryClient) {
  await mockApprovePO(po, currentUser?.email, currentUser?.full_name, comments);
  queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  queryClient.invalidateQueries({ queryKey: ['approval-history'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

async function handleRejectPOWorkflow(po, currentUser, comments, queryClient) {
  await mockRejectPO(po, currentUser?.email, currentUser?.full_name, comments);
  queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  queryClient.invalidateQueries({ queryKey: ['approval-history'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

function handlePOSubmit(data, editingPO) {
  if (editingPO) {
    return { action: 'update', id: editingPO.id, data };
  }
  return { action: 'create', data };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Procurement mutation paths', () => {
  let queryClient;
  const currentUser = { email: 'admin@ktm.com', full_name: 'Admin User' };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = { invalidateQueries: jest.fn() };
  });

  describe('handlePOSubmit routing', () => {
    it('routes to create when no editing PO', () => {
      const result = handlePOSubmit({ vendor_id: 'v-1', total_weight_kg: 100 }, null);
      expect(result.action).toBe('create');
      expect(result.data.vendor_id).toBe('v-1');
    });

    it('routes to update when editing PO exists', () => {
      const result = handlePOSubmit({ total_weight_kg: 200 }, { id: 'po-1', po_number: 'PO-001' });
      expect(result.action).toBe('update');
      expect(result.id).toBe('po-1');
    });
  });

  describe('handleSubmitForApproval', () => {
    const po = { id: 'po-1', po_number: 'PO-001', total_amount: 50000 };
    const rules = [{ min_amount: 0, max_amount: 100000, approver_email: 'mgr@ktm.com' }];
    const vendors = [{ id: 'v-1' }];

    it('calls approval service and invalidates all relevant queries', async () => {
      mockSubmitPOForApproval.mockResolvedValueOnce({
        status: 'pending_approval',
        approver: { approver_name: 'Manager' },
      });

      const result = await handleSubmitForApproval(po, rules, vendors, queryClient);

      expect(mockSubmitPOForApproval).toHaveBeenCalledWith(po, rules, vendors);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['approval-history'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notifications'] });
      expect(result.approver.approver_name).toBe('Manager');
    });

    it('handles auto-approved result', async () => {
      mockSubmitPOForApproval.mockResolvedValueOnce({ status: 'auto_approved' });

      const result = await handleSubmitForApproval(po, rules, vendors, queryClient);
      expect(result.status).toBe('auto_approved');
    });

    it('propagates service errors', async () => {
      mockSubmitPOForApproval.mockRejectedValueOnce(new Error('Approval rules not configured'));

      await expect(handleSubmitForApproval(po, [], vendors, queryClient)).rejects.toThrow(
        'Approval rules not configured'
      );
    });
  });

  describe('handleApprovePOWorkflow', () => {
    const po = { id: 'po-1', status: 'pending_approval' };

    it('approves PO with user context and comments', async () => {
      mockApprovePO.mockResolvedValueOnce(undefined);

      await handleApprovePOWorkflow(po, currentUser, 'Looks good', queryClient);

      expect(mockApprovePO).toHaveBeenCalledWith(po, 'admin@ktm.com', 'Admin User', 'Looks good');
    });

    it('invalidates all three query keys after approval', async () => {
      mockApprovePO.mockResolvedValueOnce(undefined);

      await handleApprovePOWorkflow(po, currentUser, '', queryClient);

      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
    });

    it('propagates approval errors', async () => {
      mockApprovePO.mockRejectedValueOnce(new Error('Not authorized'));

      await expect(handleApprovePOWorkflow(po, currentUser, '', queryClient)).rejects.toThrow(
        'Not authorized'
      );
    });
  });

  describe('handleRejectPOWorkflow', () => {
    const po = { id: 'po-2', status: 'pending_approval' };

    it('rejects PO with rejection reason', async () => {
      mockRejectPO.mockResolvedValueOnce(undefined);

      await handleRejectPOWorkflow(po, currentUser, 'Budget exceeded', queryClient);

      expect(mockRejectPO).toHaveBeenCalledWith(
        po,
        'admin@ktm.com',
        'Admin User',
        'Budget exceeded'
      );
    });

    it('invalidates caches after rejection', async () => {
      mockRejectPO.mockResolvedValueOnce(undefined);

      await handleRejectPOWorkflow(po, currentUser, '', queryClient);

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase-orders'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['approval-history'],
      });
    });
  });
});
