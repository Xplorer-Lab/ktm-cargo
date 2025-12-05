import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
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
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Search,
  ShoppingBag,
  ExternalLink,
  Package,
  Eye,
  DollarSign,
  Weight,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Pencil,
  Trash2,
  Link,
  AlertTriangle,
  Phone,
  Scale,
  FileText,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { sendShoppingOrderNotification } from '@/components/notifications/ShippingNotificationService';
import ShoppingOrderAllocationPanel from '@/components/shopping/ShoppingOrderAllocationPanel';
import {
  processShoppingOrderInvoicing,
  calculateShoppingOrderProfit,
} from '@/components/shopping/ShoppingInvoiceService';

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

import { startTour } from '@/components/common/TourGuide';

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

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list(),
  });

  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    product_links: '',
    product_details: '',
    estimated_product_cost: '',
    actual_product_cost: '',
    estimated_weight: '',
    actual_weight: '',
    commission_rate: 10,
    delivery_address: '',
    notes: '',
    status: 'pending',
    payment_status: 'unpaid',
    vendor_po_id: '',
    vendor_po_number: '',
    vendor_id: '',
    vendor_name: '',
    vendor_cost_per_kg: 0,
    vendor_cost: 0,
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
    const unpaidOrders = orders.filter(
      (o) => o.payment_status === 'unpaid' && o.status !== 'cancelled'
    ).length;
    const totalWeight = orders.reduce(
      (sum, o) => sum + (o.actual_weight || o.estimated_weight || 0),
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

  const createMutation = useMutation({
    mutationFn: (data) =>
      db.shoppingOrders.create({
        ...data,
        order_number: `SHOP-${Date.now().toString(36).toUpperCase()}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-orders'] });
      setShowForm(false);
      resetForm();
      toast.success('Shopping order created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, sendNotification, customerEmail }) => {
      const result = await db.shoppingOrders.update(id, data);
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
      setShowForm(false);
      setEditingOrder(null);
      resetForm();
      toast.success('Order updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.shoppingOrders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-orders'] });
      toast.success('Order deleted');
    },
  });

  const updatePOMutation = useMutation({
    mutationFn: ({ id, data }) => db.purchaseOrders.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  // Handle PO allocation update
  const handleUpdatePO = async (poId, data) => {
    await updatePOMutation.mutateAsync({ id: poId, data });
  };

  // Handle order update for allocation
  const handleUpdateOrderForAllocation = async (orderId, data) => {
    await updateMutation.mutateAsync({ id: orderId, data });
  };

  // Auto-generate invoice when status becomes delivered + paid
  const handleAutoInvoice = async (order) => {
    if (order.status === 'delivered' && order.payment_status === 'paid') {
      const result = await processShoppingOrderInvoicing(order, customers);
      if (result.isNew) {
        toast.success(`Invoice ${result.invoice?.invoice_number} generated`);
      }
    }
  };

  const calculateTotals = (formData) => {
    const productCost =
      parseFloat(formData.actual_product_cost || formData.estimated_product_cost) || 0;
    const weight = parseFloat(formData.actual_weight || formData.estimated_weight) || 0;
    const commission = productCost * (formData.commission_rate / 100);
    const shippingCost = weight * 110;
    return {
      productCost,
      commission,
      shippingCost,
      total: productCost + commission + shippingCost,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totals = calculateTotals(form);

    const orderData = {
      ...form,
      estimated_product_cost: parseFloat(form.estimated_product_cost) || 0,
      actual_product_cost: parseFloat(form.actual_product_cost) || 0,
      commission_amount: totals.commission,
      estimated_weight: parseFloat(form.estimated_weight) || 0,
      actual_weight: parseFloat(form.actual_weight) || 0,
      shipping_cost: totals.shippingCost,
      total_amount: totals.total,
    };

    if (editingOrder) {
      // Check if status changed to shipping or delivered
      const statusChanged = editingOrder.status !== orderData.status;
      const shouldNotify =
        statusChanged && (orderData.status === 'shipping' || orderData.status === 'delivered');
      const customer = customers.find((c) => c.id === orderData.customer_id);

      updateMutation.mutate(
        {
          id: editingOrder.id,
          data: orderData,
          sendNotification: shouldNotify,
          customerEmail: customer?.email,
        },
        {
          onSuccess: () => {
            // Auto-generate invoice if delivered + paid
            handleAutoInvoice({ ...editingOrder, ...orderData });
          },
        }
      );

      if (shouldNotify && customer?.email) {
        toast.success(`Notification will be sent to ${customer.email}`);
      }
    } else {
      createMutation.mutate(orderData);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setForm({
      customer_id: order.customer_id || '',
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      product_links: order.product_links || '',
      product_details: order.product_details || '',
      estimated_product_cost: order.estimated_product_cost || '',
      actual_product_cost: order.actual_product_cost || '',
      estimated_weight: order.estimated_weight || '',
      actual_weight: order.actual_weight || '',
      commission_rate: order.commission_rate || 10,
      delivery_address: order.delivery_address || '',
      notes: order.notes || '',
      status: order.status || 'pending',
      payment_status: order.payment_status || 'unpaid',
      vendor_po_id: order.vendor_po_id || '',
      vendor_po_number: order.vendor_po_number || '',
      vendor_id: order.vendor_id || '',
      vendor_name: order.vendor_name || '',
      vendor_cost_per_kg: order.vendor_cost_per_kg || 0,
      vendor_cost: order.vendor_cost || 0,
    });
    setShowForm(true);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setForm({
        ...form,
        customer_id: customerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        delivery_address: customer.address_yangon || '',
      });
    }
  };

  const resetForm = () => {
    setForm({
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      product_links: '',
      product_details: '',
      estimated_product_cost: '',
      actual_product_cost: '',
      estimated_weight: '',
      actual_weight: '',
      commission_rate: 10,
      delivery_address: '',
      notes: '',
      status: 'pending',
      payment_status: 'unpaid',
      vendor_po_id: '',
      vendor_po_number: '',
      vendor_id: '',
      vendor_name: '',
      vendor_cost_per_kg: 0,
      vendor_cost: 0,
    });
    setEditingOrder(null);
  };

  // Handle PO selection in form
  const handlePOSelect = (poId) => {
    if (!poId || poId === 'none') {
      setForm({
        ...form,
        vendor_po_id: '',
        vendor_po_number: '',
        vendor_id: '',
        vendor_name: '',
        vendor_cost_per_kg: 0,
        vendor_cost: 0,
      });
      return;
    }

    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      const weight = parseFloat(form.actual_weight || form.estimated_weight) || 0;
      const vendorCost = weight * (po.cost_per_kg || 0);
      setForm({
        ...form,
        vendor_po_id: po.id,
        vendor_po_number: po.po_number,
        vendor_id: po.vendor_id,
        vendor_name: po.vendor_name,
        vendor_cost_per_kg: po.cost_per_kg || 0,
        vendor_cost: vendorCost,
      });
    }
  };

  // Get selected PO's available weight
  const getSelectedPOAvailableWeight = () => {
    if (!form.vendor_po_id) return null;
    const po = purchaseOrders.find((p) => p.id === form.vendor_po_id);
    return po?.remaining_weight_kg || 0;
  };

  // Check if weight exceeds available
  const orderWeight = parseFloat(form.actual_weight || form.estimated_weight) || 0;
  const availableWeight = getSelectedPOAvailableWeight();
  const weightExceedsAvailable =
    form.vendor_po_id && availableWeight !== null && orderWeight > availableWeight;

  // Update vendor cost when weight changes
  const handleWeightChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (newForm.vendor_po_id && newForm.vendor_cost_per_kg) {
      const weight = parseFloat(newForm.actual_weight || newForm.estimated_weight) || 0;
      newForm.vendor_cost = weight * newForm.vendor_cost_per_kg;
    }
    setForm(newForm);
  };

  const handleQuickStatusChange = (order, newStatus, e) => {
    e?.stopPropagation();
    // Get customer email for notification
    const customer = customers.find((c) => c.id === order.customer_id);
    const customerEmail = customer?.email;

    updateMutation.mutate({
      id: order.id,
      data: { status: newStatus },
      sendNotification: newStatus === 'shipping' || newStatus === 'delivered',
      customerEmail,
    });

    if ((newStatus === 'shipping' || newStatus === 'delivered') && customerEmail) {
      toast.success(`Notification sent to ${customerEmail}`);
    }
  };

  const handleQuickPaymentChange = (order, newStatus, e) => {
    e?.stopPropagation();
    updateMutation.mutate(
      { id: order.id, data: { payment_status: newStatus } },
      {
        onSuccess: () => {
          // Auto-generate invoice if delivered + paid
          if (newStatus === 'paid' && order.status === 'delivered') {
            handleAutoInvoice({ ...order, payment_status: newStatus });
          }
        },
      }
    );
  };

  // Filter orders based on tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === 'pending' && !['pending', 'purchasing'].includes(o.status)) return false;
      if (activeTab === 'in_transit' && !['purchased', 'received', 'shipping'].includes(o.status))
        return false;
      if (activeTab === 'completed' && o.status !== 'delivered') return false;
      if (activeTab === 'unpaid' && (o.payment_status === 'paid' || o.status === 'cancelled'))
        return false;

      // Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          o.customer_name?.toLowerCase().includes(query) ||
          o.order_number?.toLowerCase().includes(query) ||
          o.product_details?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [orders, activeTab, statusFilter, searchQuery]);

  // Get linked PO info
  const getLinkedPO = (order) => {
    if (!order.vendor_po_id) return null;
    return purchaseOrders.find((po) => po.id === order.vendor_po_id);
  };

  const totals = calculateTotals(form);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="orders-header">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Shopping Orders</h1>
              <Button variant="ghost" size="icon" onClick={() => startTour('shoppingOrders')} className="text-slate-400 hover:text-blue-600" title="Take a Tour">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-slate-500 mt-1">Personal shopping service with cargo delivery</p>
          </div>
          <Button
            id="new-order-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Shopping Order
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
              onUpdatePO={handleUpdatePO}
            />
          </TabsContent>

          {/* Orders Grid */}
          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-64" />
                  ))}
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const paymentConfig =
                    PAYMENT_CONFIG[order.payment_status] || PAYMENT_CONFIG.unpaid;
                  const StatusIcon = statusConfig.icon;
                  const linkedPO = getLinkedPO(order);

                  return (
                    <Card
                      key={order.id}
                      className="border-0 shadow-sm hover:shadow-md transition-all group"
                    >
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-900">{order.order_number}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {order.customer_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Product Info */}
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3 min-h-[40px]">
                          {order.product_details || order.product_links}
                        </p>

                        {/* Weight Allocation */}
                        {linkedPO ? (
                          <div className="p-2 bg-blue-50 rounded-lg mb-3 text-xs">
                            <div className="flex items-center gap-1 text-blue-700">
                              <Link className="w-3 h-3" />
                              <span>Linked to {linkedPO.po_number}</span>
                            </div>
                            <p className="text-blue-600 mt-1">
                              Vendor: {linkedPO.vendor_name} • Cost: ฿
                              {order.vendor_cost?.toLocaleString() || 0}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-50 rounded-lg mb-3 text-xs">
                            <div className="flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Not allocated to PO</span>
                            </div>
                          </div>
                        )}

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div className="flex items-center gap-1 text-slate-600">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              ฿
                              {(
                                order.actual_product_cost ||
                                order.estimated_product_cost ||
                                0
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Weight className="w-4 h-4" />
                            <span>{order.actual_weight || order.estimated_weight || 0} kg</span>
                          </div>
                        </div>

                        {/* Profit Info */}
                        {order.vendor_po_id &&
                          (() => {
                            const profit = calculateShoppingOrderProfit(order);
                            return profit.grossProfit > 0 ? (
                              <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 rounded mb-2">
                                <span className="text-emerald-600">
                                  Profit: ฿{profit.grossProfit.toLocaleString()}
                                </span>
                                <span className="text-emerald-700 font-medium">
                                  {profit.margin}%
                                </span>
                              </div>
                            ) : null;
                          })()}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <Badge className={paymentConfig.color}>{paymentConfig.label}</Badge>
                          <p className="font-bold text-purple-600">
                            ฿{(order.total_amount || 0).toLocaleString()}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleViewDetails(order)}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setEditConfirm({ open: true, order })}
                          >
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600"
                            onClick={() => setDeleteConfirm({ open: true, order })}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No orders found</h3>
                  <p className="text-slate-500 mb-6">
                    {searchQuery ? 'Try adjusting your search' : 'Create your first shopping order'}
                  </p>
                  <Button onClick={() => setShowForm(true)} className="bg-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Order
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(v) => {
            setShowForm(v);
            if (!v) resetForm();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                {editingOrder ? 'Edit Shopping Order' : 'New Shopping Order'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Customer Selection */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                <Label className="font-medium">Customer Information</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Select Existing</Label>
                    <Select value={form.customer_id} onValueChange={handleCustomerSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} - {c.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Name *</Label>
                    <Input
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      placeholder="Customer name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Phone *</Label>
                    <Input
                      value={form.customer_phone}
                      onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                      placeholder="Phone number"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-2">
                <Label>Product Links/URLs *</Label>
                <Textarea
                  value={form.product_links}
                  onChange={(e) => setForm({ ...form, product_links: e.target.value })}
                  placeholder="Paste product URLs from online stores..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Product Details (Size, Color, Qty)</Label>
                <Textarea
                  value={form.product_details}
                  onChange={(e) => setForm({ ...form, product_details: e.target.value })}
                  placeholder="Specify size, color, quantity, variants..."
                  rows={2}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Est. Product Cost (฿)</Label>
                  <Input
                    type="number"
                    value={form.estimated_product_cost}
                    onChange={(e) => setForm({ ...form, estimated_product_cost: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Actual Cost (฿)</Label>
                  <Input
                    type="number"
                    value={form.actual_product_cost}
                    onChange={(e) => setForm({ ...form, actual_product_cost: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className={`text-xs ${weightExceedsAvailable && !form.actual_weight ? 'text-rose-600' : ''}`}
                  >
                    Est. Weight (kg){' '}
                    {form.vendor_po_id && availableWeight !== null && (
                      <span className="text-slate-400">/ {availableWeight.toFixed(1)} avail</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.estimated_weight}
                    onChange={(e) => handleWeightChange('estimated_weight', e.target.value)}
                    placeholder="0"
                    className={
                      weightExceedsAvailable && !form.actual_weight
                        ? 'border-rose-500 focus:ring-rose-500'
                        : ''
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className={`text-xs ${weightExceedsAvailable && form.actual_weight ? 'text-rose-600' : ''}`}
                  >
                    Actual Weight (kg){' '}
                    {form.vendor_po_id && availableWeight !== null && (
                      <span className="text-slate-400">/ {availableWeight.toFixed(1)} avail</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.actual_weight}
                    onChange={(e) => handleWeightChange('actual_weight', e.target.value)}
                    placeholder="0"
                    className={
                      weightExceedsAvailable && form.actual_weight
                        ? 'border-rose-500 focus:ring-rose-500'
                        : ''
                    }
                  />
                </div>
              </div>

              {/* Weight Exceeded Alert */}
              {weightExceedsAvailable && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <div>
                    <p className="text-sm font-medium text-rose-800">
                      Weight exceeds available capacity
                    </p>
                    <p className="text-xs text-rose-600">
                      Order weight ({orderWeight.toFixed(1)} kg) exceeds PO available weight (
                      {availableWeight.toFixed(1)} kg). Reduce weight or select another PO.
                    </p>
                  </div>
                </div>
              )}

              {/* PO Allocation */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <Label className="font-medium text-blue-800 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Weight Allocation (Link to Purchase Order)
                </Label>
                <Select value={form.vendor_po_id || 'none'} onValueChange={handlePOSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Purchase Order..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Allocation --</SelectItem>
                    {availablePOs.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} - {po.vendor_name} ({po.remaining_weight_kg?.toFixed(1)} kg
                        available @ ฿{po.cost_per_kg}/kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.vendor_po_id &&
                  (() => {
                    const selectedPO = purchaseOrders.find((p) => p.id === form.vendor_po_id);
                    const vendor = vendors.find((v) => v.id === form.vendor_id);
                    const remainingWeight = selectedPO?.remaining_weight_kg || 0;
                    const totalWeight = selectedPO?.total_weight_kg || 0;
                    const usedPercent =
                      totalWeight > 0 ? ((totalWeight - remainingWeight) / totalWeight) * 100 : 0;

                    return (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-blue-600">Vendor</p>
                            <p className="font-medium">{form.vendor_name}</p>
                          </div>
                          <div>
                            <p className="text-blue-600">Cost/kg</p>
                            <p className="font-medium">฿{form.vendor_cost_per_kg}</p>
                          </div>
                          <div>
                            <p className="text-blue-600">Total Vendor Cost</p>
                            <p className="font-medium text-rose-600">
                              ฿{form.vendor_cost?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>

                        {/* PO Weight Available */}
                        <div className="p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-700">
                              PO Weight Available
                            </span>
                            <span className="text-xs text-blue-600">
                              {remainingWeight.toFixed(1)} / {totalWeight.toFixed(1)} kg
                            </span>
                          </div>
                          <Progress value={100 - usedPercent} className="h-2" />
                          <p className="text-xs text-blue-500 mt-1">
                            {usedPercent.toFixed(0)}% allocated from this PO
                          </p>
                        </div>

                        {/* Vendor Capacity */}
                        {vendor && vendor.monthly_capacity_kg > 0 && (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-emerald-700">
                                Vendor Monthly Capacity
                              </span>
                              <span className="text-xs text-emerald-600">
                                {(
                                  (vendor.monthly_capacity_kg || 0) -
                                  (vendor.current_month_allocated_kg || 0)
                                ).toFixed(1)}{' '}
                                kg available
                              </span>
                            </div>
                            <Progress
                              value={
                                vendor.monthly_capacity_kg > 0
                                  ? ((vendor.monthly_capacity_kg -
                                    (vendor.current_month_allocated_kg || 0)) /
                                    vendor.monthly_capacity_kg) *
                                  100
                                  : 0
                              }
                              className="h-2"
                            />
                            <p className="text-xs text-emerald-500 mt-1">
                              {(vendor.current_month_allocated_kg || 0).toFixed(1)} /{' '}
                              {vendor.monthly_capacity_kg.toFixed(1)} kg used this month
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                {!form.vendor_po_id && availablePOs.length === 0 && (
                  <p className="text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    No Purchase Orders with available weight. Create a PO first in Procurement.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commission Rate</Label>
                  <Select
                    value={form.commission_rate.toString()}
                    onValueChange={(v) => setForm({ ...form, commission_rate: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="8">8%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Address (Yangon)</Label>
                  <Input
                    value={form.delivery_address}
                    onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                    placeholder="Delivery address"
                  />
                </div>
              </div>

              {/* Status (Edit mode) */}
              {editingOrder && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={form.payment_status}
                      onValueChange={(v) => setForm({ ...form, payment_status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Price Summary */}
              {(form.estimated_product_cost ||
                form.actual_product_cost ||
                form.estimated_weight ||
                form.actual_weight) && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-sm font-medium text-purple-700 mb-3">Price Calculation</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-purple-600">Product Cost:</span>
                      <span className="text-right font-medium">
                        ฿{totals.productCost.toLocaleString()}
                      </span>
                      <span className="text-purple-600">Commission ({form.commission_rate}%):</span>
                      <span className="text-right font-medium">
                        ฿{totals.commission.toLocaleString()}
                      </span>
                      <span className="text-purple-600">Shipping (฿110/kg):</span>
                      <span className="text-right font-medium">
                        ฿{totals.shippingCost.toLocaleString()}
                      </span>
                      <span className="font-bold text-purple-800 pt-2 border-t border-purple-200">
                        Total:
                      </span>
                      <span className="text-right font-bold text-purple-800 pt-2 border-t border-purple-200">
                        ฿{totals.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={weightExceedsAvailable}
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                Order Details
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 mt-4">
                {/* Order Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{selectedOrder.order_number}</p>
                    <p className="text-sm text-slate-500">
                      Created{' '}
                      {selectedOrder.created_date
                        ? format(new Date(selectedOrder.created_date), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                  <Badge className={STATUS_CONFIG[selectedOrder.status]?.color}>
                    {STATUS_CONFIG[selectedOrder.status]?.label}
                  </Badge>
                </div>

                {/* Customer Info */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Customer</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {selectedOrder.customer_phone}
                  </p>
                  {selectedOrder.delivery_address && (
                    <p className="text-sm text-slate-600 mt-1">{selectedOrder.delivery_address}</p>
                  )}
                </div>

                {/* Product Details */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Products</p>
                  <p className="text-sm">
                    {selectedOrder.product_details || selectedOrder.product_links}
                  </p>
                  {selectedOrder.product_links && (
                    <a
                      href={selectedOrder.product_links}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Product Link
                    </a>
                  )}
                </div>

                {/* Weight Allocation */}
                {(() => {
                  const linkedPO = getLinkedPO(selectedOrder);
                  return linkedPO ? (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1">Weight Allocation</p>
                      <p className="font-medium text-blue-800">{linkedPO.po_number}</p>
                      <p className="text-sm text-blue-700">Vendor: {linkedPO.vendor_name}</p>
                      <p className="text-sm text-blue-700">
                        Vendor Cost: ฿{selectedOrder.vendor_cost?.toLocaleString() || 0}
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
                    <span className="text-purple-600">Shipping:</span>
                    <span className="text-right">
                      ฿{(selectedOrder.shipping_cost || 0).toLocaleString()}
                    </span>
                    {selectedOrder.vendor_cost > 0 && (
                      <>
                        <span className="text-rose-600">Vendor Cost:</span>
                        <span className="text-right text-rose-600">
                          -฿{(selectedOrder.vendor_cost || 0).toLocaleString()}
                        </span>
                      </>
                    )}
                    <span className="font-bold text-purple-800 pt-2 border-t border-purple-200">
                      Total:
                    </span>
                    <span className="text-right font-bold text-purple-800 pt-2 border-t border-purple-200">
                      ฿{(selectedOrder.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Profit Summary */}
                {selectedOrder.vendor_po_id &&
                  (() => {
                    const profit = calculateShoppingOrderProfit(selectedOrder);
                    return (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-xs text-emerald-600 mb-2 font-medium">Profit Analysis</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-emerald-600">Revenue:</span>
                          <span className="text-right">฿{profit.revenue.toLocaleString()}</span>
                          <span className="text-emerald-600">Vendor Cost:</span>
                          <span className="text-right text-rose-600">
                            -฿{profit.vendorCost.toLocaleString()}
                          </span>
                          <span className="text-emerald-600">Product Cost:</span>
                          <span className="text-right text-rose-600">
                            -฿{profit.productCost.toLocaleString()}
                          </span>
                          <span className="font-bold text-emerald-800 pt-2 border-t border-emerald-200">
                            Gross Profit:
                          </span>
                          <span className="text-right font-bold text-emerald-800 pt-2 border-t border-emerald-200">
                            ฿{profit.grossProfit.toLocaleString()} ({profit.margin}%)
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
                        onClick={async () => {
                          const result = await processShoppingOrderInvoicing(
                            selectedOrder,
                            customers
                          );
                          if (result.isNew) {
                            toast.success(`Invoice ${result.invoice?.invoice_number} generated`);
                          } else if (result.invoice) {
                            toast.info('Invoice already exists');
                          }
                        }}
                      >
                        <Receipt className="w-4 h-4 mr-2" /> Generate Invoice
                      </Button>
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
