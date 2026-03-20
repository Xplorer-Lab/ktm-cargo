import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '@/api/db';
import { shipmentSchema } from '@/domains/core/schemas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ShipmentCard from '@/components/shipments/ShipmentCard';
import ShipmentForm from '@/components/shipments/ShipmentForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Package,
  Truck,
  Clock,
  CheckCircle,
  Star,
  HelpCircle,
  Trash2,
  Plane,
  AlertTriangle,
} from 'lucide-react';

const TRACKING_STEPS = [
  { status: 'pending', label: 'Placed', icon: Clock },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { status: 'picked_up', label: 'Picked Up', icon: Package },
  { status: 'in_transit', label: 'In Transit', icon: Plane },
  { status: 'customs', label: 'Customs', icon: AlertTriangle },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const STATUS_INDEX = {
  pending: 0,
  confirmed: 1,
  picked_up: 2,
  in_transit: 3,
  customs: 4,
  delivered: 5,
  cancelled: -1,
};

function getTrackingStatusIndex(status) {
  const index = STATUS_INDEX[status];
  return typeof index === 'number' ? index : 0;
}
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { sendFeedbackRequest } from '@/components/feedback/FeedbackRequestService';
import {
  triggerDeliveryFeedbackAlert,
  triggerShipmentCreatedAlert,
  triggerShipmentStatusAlert,
  triggerPaymentReceivedAlert,
} from '@/components/notifications/NotificationService';
import { updateVendorOnDelivery } from '@/components/vendors/VendorPerformanceService';
// Invoice creation is now manual - go to Invoices page to create invoices

import { startTour } from '@/components/common/TourGuide';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useUser } from '@/components/auth/UserContext';
import { hasPermission } from '@/components/auth/RolePermissions';
import {
  applyPORebalanceOperations,
  assertPORebalanceCapacity,
  buildPORebalanceOperations,
  getShipmentAllocationWeight,
  rollbackPORebalanceOperations,
} from '@/lib/poAllocation';

export default function Shipments() {
  const [showForm, setShowForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shipmentToDelete, setShipmentToDelete] = useState(null);

  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { user } = useUser();
  const location = useLocation();

  const updatePurchaseOrderAllocation = (poId, data) => db.purchaseOrders.update(poId, data);
  const fetchPurchaseOrder = async (poId) => {
    if (!poId) return null;
    return db.purchaseOrders.get(poId);
  };
  const fetchShipment = async (shipmentId) => {
    if (!shipmentId) throw new Error('Shipment ID is required');
    return db.shipments.get(shipmentId);
  };

  const buildFreshRebalanceContext = async ({
    shipmentId = null,
    nextShipmentData = null,
  } = {}) => {
    const previousShipment = shipmentId ? await fetchShipment(shipmentId) : null;
    if (shipmentId && !previousShipment) {
      throw new Error('Unable to load the latest shipment snapshot');
    }

    const nextShipment = previousShipment
      ? { ...previousShipment, ...(nextShipmentData || {}) }
      : nextShipmentData || {};

    const previousPoId = previousShipment?.vendor_po_id ?? null;
    const nextPoId = nextShipment.vendor_po_id ?? null;

    const [previousPo, nextPo] = await Promise.all([
      fetchPurchaseOrder(previousPoId),
      nextPoId === previousPoId ? fetchPurchaseOrder(previousPoId) : fetchPurchaseOrder(nextPoId),
    ]);

    const operations = buildPORebalanceOperations({
      previousPo,
      nextPo,
      previousWeight: getShipmentAllocationWeight(previousShipment),
      nextWeight: getShipmentAllocationWeight(nextShipment),
    });

    assertPORebalanceCapacity(operations);

    return {
      previousShipment,
      nextShipment,
      previousPo,
      nextPo,
      operations,
    };
  };

  useEffect(() => {
    if (location.state?.createFromShoppingOrder) {
      const order = location.state.createFromShoppingOrder;
      setEditingShipment({
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        customer_id: order.customer_id || '',
        delivery_address: order.delivery_address || '',
        items_description: order.product_details || order.product_links || '',
        weight_kg: order.actual_weight || order.estimated_weight || '',
        vendor_po_id: order.vendor_po_id || '',
        vendor_po_number: order.vendor_po_number || '',
        vendor_id: order.vendor_id || '',
        vendor_name: order.vendor_name || '',
        vendor_cost_per_kg: order.vendor_cost_per_kg || 0,
      });
      setShowForm(true);

      // Clear the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date'),
    onError: (err) => handleError(err, 'Failed to fetch shipments'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.list(),
    onError: (err) => handleError(err, 'Failed to fetch customers'),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list(),
    onError: (err) => handleError(err, 'Failed to fetch vendors'),
  });

  const { data: vendorOrders = [] } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => db.vendorOrders.list(),
    onError: (err) => handleError(err, 'Failed to fetch vendor orders'),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => db.purchaseOrders.list('-created_date'),
    onError: (err) => handleError(err, 'Failed to fetch purchase orders'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const validatedData = shipmentSchema.parse(data);
      const nextPo = await fetchPurchaseOrder(validatedData.vendor_po_id);
      const operations = buildPORebalanceOperations({
        nextPo,
        nextWeight: getShipmentAllocationWeight(validatedData),
      });
      assertPORebalanceCapacity(operations);

      await applyPORebalanceOperations(updatePurchaseOrderAllocation, operations);

      try {
        return await db.shipments.create(validatedData);
      } catch (error) {
        await rollbackPORebalanceOperations(updatePurchaseOrderAllocation, operations);
        throw error;
      }
    },
    onSuccess: (newShipment) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowForm(false);
      // Trigger notification for new shipment
      triggerShipmentCreatedAlert(newShipment).catch((err) => {
        console.error('Shipment created notification failed:', err);
        toast.error('Shipment created, but notification could not be sent.');
      });
    },
    onError: (err) =>
      handleError(err, 'Failed to create shipment', {
        component: 'Shipments',
        action: 'create',
        data: { shipmentData: err?.data || 'unknown' },
      }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const validatedData = shipmentSchema.partial().parse(data);
      const { operations } = await buildFreshRebalanceContext({
        shipmentId: id,
        nextShipmentData: validatedData,
      });

      await applyPORebalanceOperations(updatePurchaseOrderAllocation, operations);

      try {
        return await db.shipments.update(id, validatedData);
      } catch (error) {
        await rollbackPORebalanceOperations(updatePurchaseOrderAllocation, operations);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowForm(false);
      setEditingShipment(null);
      setSelectedShipment(null);
    },
    onError: (err) => handleError(err, 'Failed to update shipment'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Check permission before deleting
      if (!hasPermission(user, 'manage_shipments')) {
        throw new Error('You do not have permission to delete shipments');
      }

      const { operations } = await buildFreshRebalanceContext({
        shipmentId: id,
      });

      await applyPORebalanceOperations(updatePurchaseOrderAllocation, operations);

      try {
        return await db.shipments.delete(id);
      } catch (error) {
        await rollbackPORebalanceOperations(updatePurchaseOrderAllocation, operations);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setSelectedShipment(null);
      setShipmentToDelete(null);
      toast.success('Shipment deleted successfully');
    },
    onError: (err) => handleError(err, 'Failed to delete shipment'),
  });

  const handleSubmit = (data) => {
    if (editingShipment) {
      updateMutation.mutate({ id: editingShipment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (shipment) => {
    setEditingShipment(shipment);
    setShowForm(true);
    setSelectedShipment(null);
  };

  const handleDelete = () => {
    if (shipmentToDelete) {
      deleteMutation.mutate(shipmentToDelete.id);
    }
  };

  const handleStatusChange = async (shipment, newStatus) => {
    const oldStatus = shipment.status;

    // Update shipment first
    await db.shipments.update(shipment.id, { status: newStatus });
    setSelectedShipment((current) =>
      current?.id === shipment.id ? { ...current, status: newStatus } : current
    );
    queryClient.invalidateQueries({ queryKey: ['shipments'] });

    // Trigger status change notification
    if (oldStatus !== newStatus) {
      triggerShipmentStatusAlert(shipment, oldStatus, newStatus).catch((err) => {
        console.error('Shipment status notification failed:', err);
      });
    }

    // Send feedback request when marked as delivered
    if (newStatus === 'delivered' && shipment.status !== 'delivered') {
      const customer = customers.find(
        (c) => c.name === shipment.customer_name || c.phone === shipment.customer_phone
      );
      if (customer) {
        // Create in-app notification
        triggerDeliveryFeedbackAlert(shipment, customer);

        // Send feedback email if customer has email
        if (customer.email) {
          toast.promise(sendFeedbackRequest(shipment, customer), {
            loading: 'Sending feedback request...',
            success: 'Feedback request sent to customer',
            error: 'Could not send feedback request',
          });
        }
      }

      // Update vendor metrics when shipment is delivered
      updateVendorOnDelivery(shipment.id, vendorOrders, vendors).then((result) => {
        if (result) {
          queryClient.invalidateQueries({ queryKey: ['vendors'] });
          queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
        }
      });

      // Remind to create invoice when shipment is delivered and paid
      if (shipment.payment_status === 'paid') {
        toast.info(
          'Shipment delivered & paid. Review invoice reconciliation from the Invoices page.'
        );
      }
    }
  };

  const handlePaymentChange = async (shipment, newPaymentStatus) => {
    // Update shipment first
    await db.shipments.update(shipment.id, { payment_status: newPaymentStatus });
    setSelectedShipment((current) =>
      current?.id === shipment.id ? { ...current, payment_status: newPaymentStatus } : current
    );
    queryClient.invalidateQueries({ queryKey: ['shipments'] });

    // Trigger payment received notification
    if (newPaymentStatus === 'paid' && shipment.payment_status !== 'paid') {
      triggerPaymentReceivedAlert(shipment).catch((err) => {
        console.error('Payment received notification failed:', err);
      });

      // Remind to create invoice when shipment is delivered and paid
      if (shipment.status === 'delivered') {
        toast.info('Payment received. Review invoice reconciliation from the Invoices page.');
      }
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer_phone?.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: shipments.length,
    pending: shipments.filter((s) => s.status === 'pending').length,
    in_transit: shipments.filter((s) =>
      ['confirmed', 'picked_up', 'in_transit', 'customs'].includes(s.status)
    ).length,
    delivered: shipments.filter((s) => s.status === 'delivered').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          id="shipments-header"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                Shipments
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startTour('shipments')}
                className="text-slate-400 hover:text-blue-600"
                title="Take a Tour"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-1">Manage cargo shipments to Yangon</p>
          </div>
          <Button
            id="create-shipment-btn"
            onClick={() => {
              setEditingShipment(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New </span>Shipment
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4" id="shipment-filters">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, or tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="flex-wrap h-auto p-1 gap-1">
                  <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm">
                    All{' '}
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                      {statusCounts.all}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm">
                    <Clock className="w-3 h-3" /> <span className="hidden sm:inline">Pending</span>{' '}
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                      {statusCounts.pending}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="in_transit" className="gap-1 text-xs sm:text-sm">
                    <Truck className="w-3 h-3" /> <span className="hidden sm:inline">Transit</span>{' '}
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                      {statusCounts.in_transit}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="delivered" className="gap-1 text-xs sm:text-sm">
                    <CheckCircle className="w-3 h-3" />{' '}
                    <span className="hidden sm:inline">Delivered</span>{' '}
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                      {statusCounts.delivered}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Shipments Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={`skeleton-shipment-${i}`} className="h-48" />
              ))}
          </div>
        ) : filteredShipments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShipments.map((shipment) => (
              <ShipmentCard key={shipment.id} shipment={shipment} onClick={setSelectedShipment} />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No shipments found</h3>
              <p className="text-slate-500 mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first shipment to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Shipment
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* New/Edit Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">
              {editingShipment ? 'Edit Shipment' : 'New Shipment'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Form to create or edit a shipment details
            </DialogDescription>
            <ShipmentForm
              shipment={editingShipment}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingShipment(null);
              }}
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              customers={customers}
            />
          </DialogContent>
        </Dialog>

        {/* Shipment Details Dialog */}
        <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
          <DialogContent className="max-w-lg">
            <DialogTitle className="sr-only">Shipment Details</DialogTitle>
            <DialogDescription className="sr-only">
              Detailed view of shipment {selectedShipment?.tracking_number}
            </DialogDescription>
            {selectedShipment && (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedShipment.tracking_number || 'Pending'}
                    </h2>
                    <p className="text-slate-500">{selectedShipment.customer_name}</p>
                  </div>
                  <Badge
                    className={
                      selectedShipment.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedShipment.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                    }
                  >
                    {selectedShipment.status?.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Tracking Progress Bar */}
                <div className="relative pt-2 pb-4 sm:px-4">
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    {TRACKING_STEPS.map((step, idx) => {
                      const currentIdx = getTrackingStatusIndex(selectedShipment.status);
                      const isComplete = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      const StepIcon = step.icon;

                      return (
                        <div
                          key={step.status}
                          className="flex flex-col items-center bg-white cursor-default"
                        >
                          <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                              isComplete ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                            } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                          >
                            <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <span
                            className={`text-[9px] sm:text-[10px] mt-2 text-center leading-tight ${isComplete ? 'text-blue-600 font-medium' : 'text-slate-400'}`}
                            style={{ maxWidth: '60px' }}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Progress Line */}
                  <div className="absolute top-6 sm:top-7 left-8 right-8 h-0.5 bg-slate-200 z-0 hidden sm:block">
                    <div
                      className={`h-full transition-all ${selectedShipment.status === 'cancelled' ? 'bg-slate-400' : 'bg-blue-600'}`}
                      style={{
                        width: `${(Math.max(0, getTrackingStatusIndex(selectedShipment.status)) / 5) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="absolute top-[1.125rem] left-6 right-6 h-0.5 bg-slate-200 z-0 sm:hidden">
                    <div
                      className={`h-full transition-all ${selectedShipment.status === 'cancelled' ? 'bg-slate-400' : 'bg-blue-600'}`}
                      style={{
                        width: `${(Math.max(0, getTrackingStatusIndex(selectedShipment.status)) / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Weight</p>
                    <p className="font-medium">{selectedShipment.weight_kg} kg</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Service</p>
                    <p className="font-medium">
                      {selectedShipment.service_type?.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Amount</p>
                    <p className="font-medium text-blue-600">
                      ฿{selectedShipment.total_amount?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payment</p>
                    <Badge
                      className={
                        selectedShipment.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }
                    >
                      {selectedShipment.payment_status}
                    </Badge>
                  </div>
                </div>

                {/* Vendor Cost Info */}
                {selectedShipment.vendor_po_id && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-2">Linked Vendor PO</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500">PO Number</p>
                        <p className="font-medium">{selectedShipment.vendor_po_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Vendor</p>
                        <p className="font-medium">{selectedShipment.vendor_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Vendor Cost</p>
                        <p className="font-medium text-rose-600">
                          ฿{selectedShipment.vendor_total_cost?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Profit</p>
                        <p className="font-medium text-emerald-600">
                          ฿{selectedShipment.profit?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedShipment.items_description && (
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Items</p>
                    <p className="text-sm">{selectedShipment.items_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm mb-2">Update Status</p>
                    <Select
                      value={selectedShipment.status}
                      onValueChange={(v) => handleStatusChange(selectedShipment, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="customs">At Customs</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm mb-2">Payment Status</p>
                    <Select
                      value={selectedShipment.payment_status}
                      onValueChange={(v) => handlePaymentChange(selectedShipment, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedShipment.status === 'delivered' && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      const customer = customers.find(
                        (c) =>
                          c.name === selectedShipment.customer_name ||
                          c.phone === selectedShipment.customer_phone
                      );
                      if (customer?.email) {
                        toast.promise(sendFeedbackRequest(selectedShipment, customer), {
                          loading: 'Sending...',
                          success: 'Feedback request sent!',
                          error: 'Failed to send',
                        });
                      } else {
                        toast.error('Customer email not found');
                      }
                    }}
                  >
                    <Star className="w-4 h-4" />
                    Request Feedback
                  </Button>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => setShipmentToDelete(selectedShipment)}
                    className="px-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedShipment(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button onClick={() => handleEdit(selectedShipment)} className="flex-1">
                    Edit Shipment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!shipmentToDelete} onOpenChange={() => setShipmentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the shipment "
                {shipmentToDelete?.tracking_number}" and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
