import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  ShoppingBag,
  ExternalLink,
  Package,
  DollarSign,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Pencil,
  Trash2,
  AlertTriangle,
  Scale,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import ShoppingOrderForm from '@/components/shopping/ShoppingOrderForm';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import ShoppingOrderAllocationPanel from '@/components/shopping/ShoppingOrderAllocationPanel';
import CustomerOrderList from '@/components/shopping/CustomerOrderList';
// Invoice creation is now manual - go to Invoices page to create invoices
import { startTour } from '@/components/common/TourGuide';

import { toast } from 'sonner';
import { sendShoppingOrderNotification } from '@/components/notifications/ShippingNotificationService';

import { filterShoppingOrders, isUnpaidShoppingOrder } from '@/pages/shoppingOrderFilters';
import { appendE2EFixture } from '@/lib/e2e';
import { buildShoppingOrderAllocationPlan } from '@/lib/shoppingOrderAllocation';
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },

  purchasing: { label: 'Purchasing', color: 'bg-blue-100 text-blue-800', icon: ShoppingBag },
  purchased: { label: 'Purchased', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
  received: { label: 'Received', color: 'bg-purple-100 text-purple-800', icon: Package },
  shipping: { label: 'Shipping', color: 'bg-cyan-100 text-cyan-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-800', icon: XCircle },
};

const PAYMENT_CONFIG = {
  unpaid: { label: 'Unpaid', color: 'bg-rose-100 text-rose-800' },
  deposit_paid: { label: 'Deposit Paid', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
};

const SHIPMENT_ELIGIBLE_ORDER_STATUSES = new Set(['purchased', 'received', 'shipping']);

export default function ShoppingOrders() {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, order: null });
  const [editConfirm, setEditConfirm] = useState({ open: false, order: null });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['shopping-orders'],
    queryFn: () => db.shoppingOrders.list('-created_date'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => db.purchaseOrders.list(),
  });

  // Get active POs with available weight
  const availablePOs = useMemo(() => {
    return purchaseOrders.filter(
      (po) =>
        ['approved', 'sent', 'partial_received', 'received'].includes(po.status) &&
        (po.remaining_weight_kg || 0) > 0
    );
  }, [purchaseOrders]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => ['pending', 'purchasing'].includes(o.status)).length;
    const inTransitOrders = orders.filter((o) =>
      ['purchased', 'received', 'shipping'].includes(o.status)
    ).length;
    const completedOrders = orders.filter((o) => o.status === 'delivered').length;
    const totalRevenue = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalCommission = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.commission_amount || 0), 0);
    const unpaidOrders = orders.filter(isUnpaidShoppingOrder).length;
    const totalWeight = orders.reduce(
      // Use actual_weight when it is a positive number; fall back to estimated_weight
      (sum, o) => sum + ((o.actual_weight > 0 ? o.actual_weight : o.estimated_weight) || 0),
      0
    );

    return {
      totalOrders,
      pendingOrders,
      inTransitOrders,
      completedOrders,
      totalRevenue,
      totalCommission,
      unpaidOrders,
      totalWeight,
    };
  }, [orders]);

  const { handleError } = useErrorHandler();

  const applyPurchaseOrderAllocationPlan = async (plan) => {
    for (const step of plan) {
      await db.purchaseOrders.update(step.poId, step.nextState);
    }
  };

  const rollbackPurchaseOrderAllocationPlan = async (plan) => {
    for (const step of [...plan].reverse()) {
      await db.purchaseOrders.update(step.poId, step.previousState);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const createdOrder = await db.shoppingOrders.create({
        ...data,
        order_number: `SHOP-${Date.now().toString(36).toUpperCase()}`,
      });

      const plan = buildShoppingOrderAllocationPlan({
        purchaseOrders,
        previousOrder: null,
        nextOrder: createdOrder,
      });

      if (plan.length === 0) return createdOrder;

      try {
        await applyPurchaseOrderAllocationPlan(plan);
      } catch (error) {
        await db.shoppingOrders.delete(createdOrder.id);
        throw error;
      }

      return createdOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowForm(false);
      setEditingOrder(null);
      toast.success('Shopping order created');
    },
    onError: (err) => handleError(err, 'Failed to create shopping order'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, sendNotification, customerEmail }) => {
      const previousOrder = orders.find((order) => order.id === id);
      const nextOrder = previousOrder ? { ...previousOrder, ...data } : data;
      const plan = buildShoppingOrderAllocationPlan({
        purchaseOrders,
        previousOrder,
        nextOrder,
      });

      if (plan.length > 0) {
        await applyPurchaseOrderAllocationPlan(plan);
      }

      let result;
      try {
        result = await db.shoppingOrders.update(id, data);
      } catch (error) {
        if (plan.length > 0) {
          await rollbackPurchaseOrderAllocationPlan(plan);
        }
        throw error;
      }
      // Send notification if status changed to shipping or delivered
      if (
        sendNotification &&
        customerEmail &&
        (data.status === 'shipping' || data.status === 'delivered')
      ) {
        const order = orders.find((o) => o.id === id);
        if (order) {
          await sendShoppingOrderNotification({ ...order, ...data }, data.status, customerEmail);
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowForm(false);
      setEditingOrder(null);
      toast.success('Order updated');
    },
    onError: (err) => handleError(err, 'Failed to update shopping order'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const order = orders.find((item) => item.id === id);
      const plan = buildShoppingOrderAllocationPlan({
        purchaseOrders,
        previousOrder: order,
        nextOrder: null,
      });

      if (plan.length > 0) {
        await applyPurchaseOrderAllocationPlan(plan);
      }

      try {
        return await db.shoppingOrders.delete(id);
      } catch (error) {
        if (plan.length > 0) {
          await rollbackPurchaseOrderAllocationPlan(plan);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Order deleted');
    },
    onError: (err) => handleError(err, 'Failed to delete shopping order'),
  });

  // Handle order update for allocation
  const handleUpdateOrderForAllocation = async (orderId, data) => {
    await updateMutation.mutateAsync({ id: orderId, data });
  };

  // Remind user to create invoice when order is delivered + paid
  const remindToCreateInvoice = (order) => {
    if (order.status === 'delivered' && order.payment_status === 'paid') {
      toast.info('Order completed. Review invoice reconciliation from the Invoices page.');
    }
  };

  const handleSubmit = (data) => {
    if (editingOrder) {
      // Check if status changed to shipping or delivered
      const statusChanged = editingOrder.status !== data.status;
      const shouldNotify =
        statusChanged && (data.status === 'shipping' || data.status === 'delivered');
      const customer = customers.find((c) => c.id === data.customer_id);

      updateMutation.mutate(
        {
          id: editingOrder.id,
          data,
          sendNotification: shouldNotify,
          customerEmail: customer?.email,
        },
        {
          onSuccess: () => {
            // Remind to create invoice if delivered + paid
            remindToCreateInvoice({ ...editingOrder, ...data });
          },
        }
      );

      if (shouldNotify && customer?.email) {
        toast.success(`Notification will be sent to ${customer.email}`);
      }
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleQuickPaymentChange = (order, newStatus, e) => {
    e?.stopPropagation();
    updateMutation.mutate(
      { id: order.id, data: { payment_status: newStatus } },
      {
        onSuccess: () => {
          // Remind to create invoice if delivered + paid
          if (newStatus === 'paid' && order.status === 'delivered') {
            remindToCreateInvoice({ ...order, payment_status: newStatus });
          }
        },
      }
    );
  };

  const handleToggleVendorPayment = (order, isPaid, e) => {
    e?.stopPropagation();
    updateMutation.mutate({
      id: order.id,
      data: { vendor_payment_status: isPaid ? 'PAID' : 'UNPAID' },
    });
  };

  // Filter orders based on tab and search
  const filteredOrders = useMemo(() => {
    return filterShoppingOrders(orders, { activeTab, statusFilter, searchQuery });
  }, [orders, activeTab, statusFilter, searchQuery]);

  // Get linked PO info
  const getLinkedPO = (order) => {
    if (!order.vendor_po_id) return null;
    return purchaseOrders.find((po) => po.id === order.vendor_po_id);
  };

  const canConvertOrderToShipment = (order) =>
    Boolean(order) &&
    SHIPMENT_ELIGIBLE_ORDER_STATUSES.has(order.status) &&
    Boolean(order.vendor_po_id) &&
    !order.tracking_number;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          id="orders-header"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Orders</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startTour('shoppingOrders')}
                className="text-slate-400 hover:text-blue-600"
                title="Take a Tour"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-slate-500 mt-1">Manage client orders</p>
          </div>
          <Button
            id="new-order-btn"
            onClick={() => {
              setEditingOrder(null);
              setShowForm(true);
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-200 rounded-lg">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-purple-600 font-medium">Total Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-900">
                    {stats.totalOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-200 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-amber-600 font-medium">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-900">
                    {stats.pendingOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-200 rounded-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-emerald-600 font-medium">Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-900">
                    ฿{stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-0 shadow-sm ${stats.unpaidOrders > 0 ? 'bg-gradient-to-br from-rose-50 to-rose-100' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg ${stats.unpaidOrders > 0 ? 'bg-rose-200' : 'bg-slate-200'}`}
                >
                  <DollarSign
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${stats.unpaidOrders > 0 ? 'text-rose-700' : 'text-slate-700'}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-[10px] sm:text-xs font-medium ${stats.unpaidOrders > 0 ? 'text-rose-600' : 'text-slate-600'}`}
                  >
                    Unpaid
                  </p>
                  <p
                    className={`text-xl sm:text-2xl font-bold ${stats.unpaidOrders > 0 ? 'text-rose-900' : 'text-slate-900'}`}
                  >
                    {stats.unpaidOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <TabsList className="bg-white shadow-sm flex-wrap h-auto p-1 gap-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm">
                Pending ({stats.pendingOrders})
              </TabsTrigger>
              <TabsTrigger value="in_transit" className="text-xs sm:text-sm">
                Transit ({stats.inTransitOrders})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">
                Done ({stats.completedOrders})
              </TabsTrigger>
              <TabsTrigger
                value="unpaid"
                className={`text-xs sm:text-sm ${stats.unpaidOrders > 0 ? 'text-rose-600' : ''}`}
              >
                Unpaid ({stats.unpaidOrders})
              </TabsTrigger>
              <TabsTrigger value="allocation" className="text-xs sm:text-sm">
                <Scale className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Alloc
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-3 flex-1 md:justify-end">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allocation Tab */}
          <TabsContent value="allocation" className="mt-6">
            <ShoppingOrderAllocationPanel
              orders={orders}
              purchaseOrders={purchaseOrders}
              onUpdateOrder={handleUpdateOrderForAllocation}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Orders Grid */}
          <TabsContent value={activeTab} className="mt-6">
            <CustomerOrderList
              orders={filteredOrders}
              isLoading={isLoading}
              searchQuery={searchQuery}
              STATUS_CONFIG={STATUS_CONFIG}
              PAYMENT_CONFIG={PAYMENT_CONFIG}
              getLinkedPO={getLinkedPO}
              onViewDetails={handleViewDetails}
              onEdit={(order) => setEditConfirm({ open: true, order })}
              onDelete={(order) => setDeleteConfirm({ open: true, order })}
              onToggleVendorPayment={handleToggleVendorPayment}
              onCreateOrder={() => {
                setEditingOrder(null);
                setShowForm(true);
              }}
            />
          </TabsContent>
        </Tabs>

        {/* New/Edit Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
            <DialogHeader className="sr-only">
              <DialogTitle>{editingOrder ? 'Edit Order' : 'New Order'}</DialogTitle>
              <DialogDescription>Order form</DialogDescription>
            </DialogHeader>
            <ShoppingOrderForm
              order={editingOrder}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingOrder(null);
              }}
              customers={customers}
              purchaseOrders={purchaseOrders}
            />
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedOrder.order_number}
                    </h2>
                    <p className="text-slate-500 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {selectedOrder.customer_name}
                    </p>
                  </div>
                  <Badge className={STATUS_CONFIG[selectedOrder.status]?.color}>
                    {STATUS_CONFIG[selectedOrder.status]?.label}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-slate-700">Product Info</h3>
                  {selectedOrder.product_links && (
                    <div className="text-sm bg-slate-50 p-2 rounded break-all">
                      <a
                        href={selectedOrder.product_links}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Product
                      </a>
                    </div>
                  )}
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {selectedOrder.product_details}
                  </p>
                </div>

                {/* Weight Allocation */}
                {(() => {
                  const linkedPO =
                    availablePOs.find((p) => p.id === selectedOrder.vendor_po_id) ||
                    purchaseOrders.find((p) => p.id === selectedOrder.vendor_po_id);
                  return linkedPO ? (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1">Weight Allocation</p>
                      <p className="font-medium text-blue-800">{linkedPO.po_number}</p>
                      <p className="text-sm text-blue-700">Vendor: {linkedPO.vendor_name}</p>
                      <p className="text-sm text-blue-700">
                        Vendor Cost: ฿{selectedOrder.vendor_cost?.toLocaleString() || 0}
                      </p>
                    </div>
                  ) : selectedOrder.vendor_po_id ? (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600 text-sm">
                        PO Link ID: {selectedOrder.vendor_po_id} (Not found in list)
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-amber-800 text-sm flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Not yet allocated to a Purchase Order
                      </p>
                    </div>
                  );
                })()}

                {/* Pricing */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-purple-600">Product Cost:</span>
                    <span className="text-right">
                      ฿
                      {(
                        selectedOrder.actual_product_cost ||
                        selectedOrder.estimated_product_cost ||
                        0
                      ).toLocaleString()}
                    </span>
                    <span className="text-purple-600">Weight:</span>
                    <span className="text-right">
                      {selectedOrder.actual_weight || selectedOrder.estimated_weight || 0} kg
                    </span>
                    <span className="text-purple-600">Commission:</span>
                    <span className="text-right">
                      ฿{(selectedOrder.commission_amount || 0).toLocaleString()}
                    </span>
                    <span className="text-purple-600">Shipping (charged):</span>
                    <span className="text-right">
                      ฿{(selectedOrder.shipping_cost || 0).toLocaleString()}
                    </span>
                    <span className="font-bold text-purple-800 pt-2 border-t border-purple-200">
                      Total:
                    </span>
                    <span className="text-right font-bold text-purple-800 pt-2 border-t border-purple-200">
                      ฿{(selectedOrder.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* P&L */}
                {(() => {
                  const revenue = selectedOrder.total_amount || 0;
                  const productCost =
                    selectedOrder.actual_product_cost || selectedOrder.estimated_product_cost || 0;
                  const carrierCost = selectedOrder.vendor_cost || 0;
                  const profit = revenue - productCost - carrierCost;
                  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
                  return (
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
                        P&amp;L Summary
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-slate-600">Revenue:</span>
                        <span className="text-right">฿{revenue.toLocaleString()}</span>
                        <span className="text-slate-600">Product Cost:</span>
                        <span className="text-right text-rose-600">
                          -฿{productCost.toLocaleString()}
                        </span>
                        <span className="text-slate-600">Carrier Cost:</span>
                        <span className="text-right text-rose-600">
                          -฿{carrierCost.toLocaleString()}
                        </span>
                        <span className="font-bold text-emerald-800 pt-2 border-t border-emerald-200">
                          Profit:
                        </span>
                        <span
                          className={`text-right font-bold pt-2 border-t border-emerald-200 ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                        >
                          ฿{profit.toLocaleString()} ({margin}%)
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment Status */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Payment Status:</span>
                  <Badge className={PAYMENT_CONFIG[selectedOrder.payment_status]?.color}>
                    {PAYMENT_CONFIG[selectedOrder.payment_status]?.label}
                  </Badge>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowDetails(false);
                      handleEdit(selectedOrder);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  {selectedOrder.payment_status !== 'paid' && (
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleQuickPaymentChange(selectedOrder, 'paid');
                        setShowDetails(false);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark Paid
                    </Button>
                  )}
                  {selectedOrder.status === 'delivered' &&
                    selectedOrder.payment_status === 'paid' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          toast.info(
                            'Review invoice reconciliation from the Invoices page for this order.'
                          );
                        }}
                      >
                        <Receipt className="w-4 h-4 mr-2" /> Review Invoice Flow
                      </Button>
                    )}
                  {canConvertOrderToShipment(selectedOrder) && (
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setShowDetails(false);
                        navigate(appendE2EFixture('/Shipments', window.location.search), {
                          state: { createFromShoppingOrder: selectedOrder },
                        });
                      }}
                    >
                      <Truck className="w-4 h-4 mr-2" /> Convert to Shipment
                    </Button>
                  )}
                  {!canConvertOrderToShipment(selectedOrder) && (
                    <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      Shipment draft becomes available after purchase receiving and PO allocation.
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => setDeleteConfirm({ open, order: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                Delete Order
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete order{' '}
                <span className="font-semibold">{deleteConfirm.order?.order_number}</span>? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => {
                  deleteMutation.mutate(deleteConfirm.order?.id);
                  setDeleteConfirm({ open: false, order: null });
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Confirmation Dialog */}
        <AlertDialog
          open={editConfirm.open}
          onOpenChange={(open) => setEditConfirm({ open, order: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
                <Pencil className="w-5 h-5" />
                Edit Order
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to edit order{' '}
                <span className="font-semibold">{editConfirm.order?.order_number}</span> for
                customer <span className="font-semibold">{editConfirm.order?.customer_name}</span>.
                Do you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  handleEdit(editConfirm.order);
                  setEditConfirm({ open: false, order: null });
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
