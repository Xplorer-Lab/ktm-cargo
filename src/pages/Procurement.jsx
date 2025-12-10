import React, { useState } from 'react';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Building2,
  FileText,
  Package,
  DollarSign,
  BarChart3,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  PackageCheck,
  Pencil,
  Trash2,
  Eye,
  Send,
  Shield,
  History,
  Receipt,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import VendorOnboarding from '@/components/procurement/VendorOnboarding';
import VendorInviteForm from '@/components/procurement/VendorInviteForm';
import PurchaseOrderForm from '@/components/procurement/PurchaseOrderForm';
import GoodsReceiptForm from '@/components/procurement/GoodsReceiptForm';
import ContractManager from '@/components/procurement/ContractManager';
import PaymentAutomation from '@/components/procurement/PaymentAutomation';
import ProcurementAnalytics from '@/components/procurement/ProcurementAnalytics';
import ApprovalRulesManager from '@/components/procurement/ApprovalRulesManager';
import PendingApprovalsPanel from '@/components/procurement/PendingApprovalsPanel';
import ApprovalHistoryPanel from '@/components/procurement/ApprovalHistoryPanel';
import InvoiceList from '@/components/procurement/InvoiceList';
import WeightAllocationManager from '@/components/procurement/WeightAllocationManager';
import {
  submitPOForApproval,
  approvePO,
  rejectPO,
  getPendingApprovals,
  getApprovalHistory,
} from '@/components/procurement/ApprovalWorkflowService';
import {
  generateInvoiceFromReceipt,
  markInvoicePaid,
} from '@/components/procurement/InvoiceService';

const PO_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-800', icon: FileText },
  pending_approval: {
    label: 'Pending Approval',
    color: 'bg-amber-100 text-amber-800',
    icon: Clock,
  },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  sent: { label: 'Sent', color: 'bg-purple-100 text-purple-800', icon: Send },
  partial_received: { label: 'Partial', color: 'bg-orange-100 text-orange-800', icon: Package },
  received: { label: 'Received', color: 'bg-emerald-100 text-emerald-800', icon: PackageCheck },
  cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800', icon: AlertTriangle },
};

import { startTour } from '@/components/common/TourGuide';

import { useErrorHandler } from '@/hooks/useErrorHandler';
export default function Procurement() {
  const { handleError } = useErrorHandler();
  const [activeTab, setActiveTab] = useState('orders');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, po: null });
  const [editConfirm, setEditConfirm] = useState({ open: false, po: null });

  const queryClient = useQueryClient();

  // Data fetching
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => db.purchaseOrders.list('-created_date'),
  });

  const { data: goodsReceipts = [] } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: () => db.goodsReceipts.list('-created_at'),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['vendor-contracts'],
    queryFn: () => db.vendorContracts.list(),
  });

  const { data: vendorPayments = [] } = useQuery({
    queryKey: ['vendor-payments'],
    queryFn: () => db.vendorPayments.list('-created_date'),
  });

  const { data: approvalRules = [] } = useQuery({
    queryKey: ['approval-rules'],
    queryFn: () => db.approvalRules.list(),
  });

  const { data: approvalHistory = [] } = useQuery({
    queryKey: ['approval-history'],
    queryFn: () => db.approvalHistory.list('-created_at'),
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: () => db.customerInvoices.list('-created_date'),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date'),
  });

  const { data: shoppingOrders = [] } = useQuery({
    queryKey: ['shopping-orders'],
    queryFn: () => db.shoppingOrders.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => auth.me(),
  });

  const [selectedPOHistory, setSelectedPOHistory] = useState(null);

  // Mutations
  const createPOMutation = useMutation({
    mutationFn: async (data) => {
      const po = await db.purchaseOrders.create(data);
      // Auto-route through approval workflow
      const result = await submitPOForApproval(po, approvalRules, vendors);
      return { po, approvalResult: result };
    },
    onSuccess: ({ approvalResult }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowPOForm(false);
      if (approvalResult.status === 'auto_approved') {
        toast.success('Purchase order auto-approved!');
      } else if (approvalResult.approver) {
        toast.success(`PO routed to ${approvalResult.approver.approver_name} for approval`);
      } else {
        toast.success('Purchase order created');
      }
    },
    onError: (error) => {
      handleError(error, 'Failed to create purchase order', {
        component: 'Procurement',
        action: 'createPO',
      });
    },
  });

  const updatePOMutation = useMutation({
    mutationFn: ({ id, data }) => db.purchaseOrders.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowPOForm(false);
      setEditingPO(null);
      toast.success('Purchase order updated');
    },
    onError: (error) => {
      handleError(error, 'Failed to update purchase order', {
        component: 'Procurement',
        action: 'updatePO',
      });
    },
  });

  const deletePOMutation = useMutation({
    mutationFn: (id) => db.purchaseOrders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order deleted');
    },
    onError: (error) => {
      handleError(error, 'Failed to delete purchase order', {
        component: 'Procurement',
        action: 'deletePO',
      });
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (data) => {
      const receipt = await db.goodsReceipts.create(data);
      // Update PO status
      const allReceived = true;
      await db.purchaseOrders.update(data.po_id, {
        status: allReceived ? 'received' : 'partial_received',
      });
      // Auto-generate invoice
      const po = purchaseOrders.find((p) => p.id === data.po_id);
      const vendor = vendors.find((v) => v.id === data.vendor_id);
      if (po) {
        const invoiceResult = await generateInvoiceFromReceipt(po, receipt, vendor);
        return { receipt, invoiceResult };
      }
      return { receipt };
    },
    onSuccess: ({ invoiceResult }) => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowReceiveForm(false);
      setSelectedPO(null);
      if (invoiceResult?.status === 'created') {
        toast.success(`Goods received & Invoice ${invoiceResult.invoice.invoice_number} generated`);
      } else {
        toast.success('Goods receipt recorded');
      }
    },
    onError: (error) => {
      handleError(error, 'Failed to create goods receipt', {
        component: 'Procurement',
        action: 'createReceipt',
      });
    },
  });

  const createContractMutation = useMutation({
    mutationFn: (data) => db.vendorContracts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-contracts'] });
      toast.success('Contract created');
    },
    onError: (error) => {
      handleError(error, 'Failed to create contract', {
        component: 'Procurement',
        action: 'createContract',
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }) => db.vendorContracts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-contracts'] });
      toast.success('Contract updated');
    },
    onError: (error) => {
      handleError(error, 'Failed to update contract', {
        component: 'Procurement',
        action: 'updateContract',
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id) => db.vendorContracts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-contracts'] });
      toast.success('Contract deleted');
    },
    onError: (error) => {
      handleError(error, 'Failed to delete contract', {
        component: 'Procurement',
        action: 'deleteContract',
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data) => db.vendorPayments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      toast.success('Payment created');
    },
    onError: (error) => {
      handleError(error, 'Failed to create payment', {
        component: 'Procurement',
        action: 'createPayment',
      });
    },
  });

  // Approval Rules Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data) => db.approvalRules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Approval rule created');
    },
    onError: (error) => {
      handleError(error, 'Failed to create approval rule', {
        component: 'Procurement',
        action: 'createRule',
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => db.approvalRules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Approval rule updated');
    },
    onError: (error) => {
      handleError(error, 'Failed to update approval rule', {
        component: 'Procurement',
        action: 'updateRule',
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => db.approvalRules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Approval rule deleted');
    },
    onError: (error) => {
      handleError(error, 'Failed to delete approval rule', {
        component: 'Procurement',
        action: 'deleteRule',
      });
    },
  });

  const markInvoicePaidMutation = useMutation({
    mutationFn: (id) => markInvoicePaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice marked as paid');
    },
    onError: (error) => {
      handleError(error, 'Failed to mark invoice as paid', {
        component: 'Procurement',
        action: 'markInvoicePaid',
      });
    },
  });

  const updateShipmentMutation = useMutation({
    mutationFn: ({ id, data }) => db.shipments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment updated');
    },
    onError: (error) => {
      handleError(error, 'Failed to update shipment', {
        component: 'Procurement',
        action: 'updateShipment',
      });
    },
  });

  const updateShoppingOrderMutation = useMutation({
    mutationFn: ({ id, data }) => db.shoppingOrders.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-orders'] });
      toast.success('Shopping order updated');
    },
    onError: (error) => {
      handleError(error, 'Failed to update shopping order', {
        component: 'Procurement',
        action: 'updateShoppingOrder',
      });
    },
  });

  // Get all pending approval POs
  const allPendingPOs = purchaseOrders.filter((po) => po.status === 'pending_approval');

  // Get pending approvals specifically assigned to current user
  const pendingForMe = purchaseOrders.filter((po) => {
    if (po.status !== 'pending_approval') return false;
    const poHistory = approvalHistory.filter((h) => h.po_id === po.id);
    const latestSubmission = poHistory
      .filter((h) => ['submitted', 'escalated'].includes(h.action))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    return latestSubmission?.approver_email === currentUser?.email;
  });

  // For admins, show all pending if none specifically assigned to them
  const pendingToShow =
    currentUser?.role === 'admin' && pendingForMe.length === 0 ? allPendingPOs : pendingForMe;

  const handleApprovePOWorkflow = async (po, comments) => {
    try {
      await approvePO(po, currentUser?.email, currentUser?.full_name, comments);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Purchase order approved');
    } catch (error) {
      handleError(error, 'Failed to approve purchase order', {
        component: 'Procurement',
        action: 'approvePO',
      });
    }
  };

  const handleRejectPOWorkflow = async (po, comments) => {
    try {
      await rejectPO(po, currentUser?.email, currentUser?.full_name, comments);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Purchase order rejected');
    } catch (error) {
      handleError(error, 'Failed to reject purchase order', {
        component: 'Procurement',
        action: 'rejectPO',
      });
    }
  };

  // Handlers
  const handlePOSubmit = (data) => {
    if (editingPO) {
      updatePOMutation.mutate({ id: editingPO.id, data });
    } else {
      createPOMutation.mutate(data);
    }
  };

  const handleEditPO = (po) => {
    setEditingPO(po);
    setShowPOForm(true);
  };

  const handleReceiveGoods = (po) => {
    setSelectedPO(po);
    setShowReceiveForm(true);
  };

  const handleSubmitForApproval = async (po) => {
    try {
      const result = await submitPOForApproval(po, approvalRules, vendors);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      if (result.status === 'auto_approved') {
        toast.success('Purchase order auto-approved!');
      } else if (result.approver) {
        toast.success(`Sent to ${result.approver.approver_name} for approval`);
      } else {
        toast.success('Submitted for approval');
      }
    } catch (error) {
      handleError(error, 'Failed to submit purchase order for approval', {
        component: 'Procurement',
        action: 'submitForApproval',
      });
    }
  };

  // Filter POs
  const filteredPOs = purchaseOrders.filter(
    (po) =>
      !searchQuery ||
      po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
  const pendingPOs = purchaseOrders.filter((po) =>
    ['draft', 'pending_approval', 'approved', 'sent'].includes(po.status)
  ).length;
  const activeVendors = vendors.filter((v) => v.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          id="procurement-header"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                Procurement Portal
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startTour('procurement')}
                className="text-slate-400 hover:text-blue-600"
                title="Take a Tour"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-1">Manage vendors, orders, and payments</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowInviteForm(true)}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Invite</span> Vendor
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowOnboarding(true)}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add</span> Vendor
            </Button>
            <Button
              onClick={() => {
                setEditingPO(null);
                setShowPOForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              New PO
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 uppercase font-medium">
                    Total PO Value
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-900">
                    ฿{totalPOValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{pendingPOs}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{activeVendors}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">Vendors</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{goodsReceipts.length}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">Received</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-white shadow-sm">
            <TabsTrigger value="orders" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Orders</span>
              <span className="sm:hidden">PO</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Vendors</span>
              <span className="sm:hidden">Vnd</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Contracts</span>
              <span className="sm:hidden">Con</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Payments</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Invoices</span>
              <span className="sm:hidden">Inv</span>
            </TabsTrigger>
            <TabsTrigger
              value="approvals"
              className="gap-1 text-xs sm:text-sm px-2 sm:px-3 relative"
            >
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Approvals</span>
              <span className="sm:hidden">App</span>
              {pendingToShow.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-rose-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                  {pendingToShow.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="allocation" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <Package className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Allocation</span>
              <span className="sm:hidden">Alloc</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />{' '}
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Purchase Orders Tab */}
          <TabsContent value="orders" className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-slate-600">PO Number</th>
                        <th className="text-left p-4 font-medium text-slate-600">Vendor</th>
                        <th className="text-left p-4 font-medium text-slate-600">Date</th>
                        <th className="text-left p-4 font-medium text-slate-600">Status</th>
                        <th className="text-right p-4 font-medium text-slate-600">Amount</th>
                        <th className="text-right p-4 font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPOs.map((po) => {
                        const statusConfig = PO_STATUS_CONFIG[po.status] || PO_STATUS_CONFIG.draft;
                        return (
                          <tr key={po.id} className="border-b hover:bg-slate-50">
                            <td className="p-4 font-medium">{po.po_number}</td>
                            <td className="p-4">{po.vendor_name}</td>
                            <td className="p-4 text-slate-500">
                              {po.created_date
                                ? format(new Date(po.created_date), 'MMM d, yyyy')
                                : '-'}
                            </td>
                            <td className="p-4">
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            </td>
                            <td className="p-4 text-right font-medium">
                              ฿{po.total_amount?.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end gap-1">
                                {po.status === 'draft' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSubmitForApproval(po)}
                                    title="Submit for Approval"
                                  >
                                    <Send className="w-4 h-4 text-blue-600" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedPOHistory(po)}
                                  title="View History"
                                >
                                  <History className="w-4 h-4 text-slate-400" />
                                </Button>
                                {['approved', 'sent', 'partial_received'].includes(po.status) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleReceiveGoods(po)}
                                    title="Receive"
                                  >
                                    <PackageCheck className="w-4 h-4 text-blue-600" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditConfirm({ open: true, po })}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-600"
                                  onClick={() => setDeleteConfirm({ open: true, po })}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredPOs.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No purchase orders found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Vendor Directory</CardTitle>
                  <CardDescription>All registered vendors</CardDescription>
                </div>
                <Button
                  onClick={() => setShowOnboarding(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Vendor
                </Button>
              </CardHeader>
              <CardContent id="vendor-list">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendors.map((vendor) => (
                    <Card
                      key={vendor.id}
                      className="border shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{vendor.name}</h3>
                            <p className="text-sm text-slate-500 capitalize">
                              {vendor.vendor_type?.replace('_', ' ')}
                            </p>
                          </div>
                          <Badge
                            className={
                              vendor.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }
                          >
                            {vendor.status}
                          </Badge>
                        </div>
                        <div className="mt-3 text-sm text-slate-500">
                          <p>{vendor.contact_name}</p>
                          <p>{vendor.phone}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-slate-500">Orders: {vendor.total_orders || 0}</span>
                          <span className="font-medium text-blue-600">
                            ฿{(vendor.total_spent || 0).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {vendors.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No vendors registered</p>
                      <Button className="mt-4" onClick={() => setShowOnboarding(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add First Vendor
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="mt-6">
            <ContractManager
              contracts={contracts}
              vendors={vendors}
              onAdd={(data) => createContractMutation.mutate(data)}
              onUpdate={(id, data) => updateContractMutation.mutate({ id, data })}
              onDelete={(id) => deleteContractMutation.mutate(id)}
            />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-6">
            <PaymentAutomation
              goodsReceipts={goodsReceipts}
              vendorPayments={vendorPayments}
              vendors={vendors}
              onCreatePayment={(data) => createPaymentMutation.mutate(data)}
            />
          </TabsContent>



          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-6">
            <InvoiceList
              invoices={invoices}
              onMarkPaid={(id) => markInvoicePaidMutation.mutate(id)}
              isLoading={isLoadingInvoices}
            />
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="mt-6 space-y-6">
            <PendingApprovalsPanel
              pendingPOs={pendingToShow}
              currentUserEmail={currentUser?.email}
              onApprove={handleApprovePOWorkflow}
              onReject={handleRejectPOWorkflow}
              isAdmin={currentUser?.role === 'admin'}
            />
            <ApprovalRulesManager
              rules={approvalRules}
              onAdd={(data) => createRuleMutation.mutate(data)}
              onUpdate={(id, data) => updateRuleMutation.mutate({ id, data })}
              onDelete={(id) => deleteRuleMutation.mutate(id)}
            />
          </TabsContent>

          {/* Weight Allocation Tab */}
          <TabsContent value="allocation" className="mt-6">
            <WeightAllocationManager
              purchaseOrders={purchaseOrders}
              shipments={shipments}
              shoppingOrders={shoppingOrders}
              onUpdateShipment={async (id, data) => {
                try {
                  await updateShipmentMutation.mutateAsync({ id, data });
                } catch (error) {
                  handleError(error, 'Failed to update shipment', {
                    component: 'Procurement',
                    action: 'updateShipment',
                  });
                }
              }}
              onUpdateShoppingOrder={async (id, data) => {
                try {
                  await updateShoppingOrderMutation.mutateAsync({ id, data });
                } catch (error) {
                  handleError(error, 'Failed to update shopping order', {
                    component: 'Procurement',
                    action: 'updateShoppingOrder',
                  });
                }
              }}
              onUpdatePO={async (id, data) => {
                try {
                  await updatePOMutation.mutateAsync({ id, data });
                } catch (error) {
                  handleError(error, 'Failed to update purchase order', {
                    component: 'Procurement',
                    action: 'updatePO',
                  });
                }
              }}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <ProcurementAnalytics
              purchaseOrders={purchaseOrders}
              goodsReceipts={goodsReceipts}
              vendorPayments={vendorPayments}
              vendors={vendors}
              approvalHistory={approvalHistory}
            />
          </TabsContent>
        </Tabs>

        {/* Vendor Onboarding Dialog */}
        <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">Vendor Onboarding</DialogTitle>
            <DialogDescription className="sr-only">Form to onboard a new vendor</DialogDescription>
            <VendorOnboarding
              onComplete={() => {
                queryClient.invalidateQueries({ queryKey: ['vendors'] });
                setShowOnboarding(false);
              }}
              onCancel={() => setShowOnboarding(false)}
            />
          </DialogContent>
        </Dialog>

        {/* PO Form Dialog */}
        <Dialog open={showPOForm} onOpenChange={setShowPOForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">
              {editingPO ? 'Edit Purchase Order' : 'New Purchase Order'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Form to create or edit a purchase order
            </DialogDescription>
            <PurchaseOrderForm
              vendors={vendors}
              existingPO={editingPO}
              onSubmit={handlePOSubmit}
              onCancel={() => {
                setShowPOForm(false);
                setEditingPO(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Goods Receipt Dialog */}
        <Dialog open={showReceiveForm} onOpenChange={setShowReceiveForm}>
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">Receive Goods</DialogTitle>
            <DialogDescription className="sr-only">Form to record goods receipt</DialogDescription>
            <GoodsReceiptForm
              purchaseOrder={selectedPO}
              onSubmit={(data) => createReceiptMutation.mutate(data)}
              onCancel={() => {
                setShowReceiveForm(false);
                setSelectedPO(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Approval History Dialog */}
        <Dialog open={!!selectedPOHistory} onOpenChange={() => setSelectedPOHistory(null)}>
          <DialogContent className="max-w-lg">
            <DialogTitle className="sr-only">Approval History</DialogTitle>
            <DialogDescription className="sr-only">
              History of approvals for this purchase order
            </DialogDescription>
            <ApprovalHistoryPanel
              history={approvalHistory.filter((h) => h.po_id === selectedPOHistory?.id)}
              poNumber={selectedPOHistory?.po_number}
            />
          </DialogContent>
        </Dialog>

        {/* Vendor Invite Form */}
        <VendorInviteForm
          open={showInviteForm}
          onOpenChange={setShowInviteForm}
          onInviteSent={() => queryClient.invalidateQueries({ queryKey: ['vendors'] })}
        />

        {/* Delete PO Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => setDeleteConfirm({ open, po: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                Delete Purchase Order
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{' '}
                <span className="font-semibold">{deleteConfirm.po?.po_number}</span>? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => {
                  deletePOMutation.mutate(deleteConfirm.po?.id);
                  setDeleteConfirm({ open: false, po: null });
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit PO Confirmation Dialog */}
        <AlertDialog
          open={editConfirm.open}
          onOpenChange={(open) => setEditConfirm({ open, po: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
                <Pencil className="w-5 h-5" />
                Edit Purchase Order
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to edit{' '}
                <span className="font-semibold">{editConfirm.po?.po_number}</span> for vendor{' '}
                <span className="font-semibold">{editConfirm.po?.vendor_name}</span>. Do you want to
                proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  handleEditPO(editConfirm.po);
                  setEditConfirm({ open: false, po: null });
                }}
              >
                Edit Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
