import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { vendorSchema } from '@/lib/schemas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
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
import {
  Plus,
  Search,
  Building2,
  Truck,
  Package,
  Star,
  TrendingUp,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  FileText,
  Trash2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import VendorForm from '@/components/vendors/VendorForm';
import VendorOrderForm from '@/components/vendors/VendorOrderForm';
import VendorCapacityOverview from '@/components/vendors/VendorCapacityOverview';
import {
  calculateVendorMetrics,
  getVendorSpendingByType,
  getMonthlyVendorSpending,
  getVendorAlerts,
} from '@/components/vendors/VendorAnalytics';
import {
  checkVendorContractAlerts,
  checkVendorPerformanceAlerts,
} from '@/components/vendors/VendorPerformanceService';
import {
  processUnpaidOrders,
  markPaymentPaid,
  checkOverduePayments,
  checkUpcomingPayments,
} from '@/components/vendors/VendorPaymentService';
import VendorPaymentPanel from '@/components/vendors/VendorPaymentPanel';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

const typeConfig = {
  cargo_carrier: { label: 'Cargo Carrier', icon: Truck, color: 'bg-blue-100 text-blue-800' },
  supplier: { label: 'Supplier', icon: Package, color: 'bg-purple-100 text-purple-800' },
  packaging: { label: 'Packaging', icon: Package, color: 'bg-amber-100 text-amber-800' },
  customs_broker: {
    label: 'Customs Broker',
    icon: FileText,
    color: 'bg-emerald-100 text-emerald-800',
  },
  warehouse: { label: 'Warehouse', icon: Building2, color: 'bg-rose-100 text-rose-800' },
};

import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function Vendors() {
  const [showForm, setShowForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list('-created_date'),
    onError: (err) => handleError(err, 'Failed to fetch vendors'),
  });

  const { data: vendorOrders = [] } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => db.vendorOrders.list('-created_date', 500),
    onError: (err) => handleError(err, 'Failed to fetch vendor orders'),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date', 100),
    onError: (err) => handleError(err, 'Failed to fetch shipments'),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => db.inventoryItems.list(),
    onError: (err) => handleError(err, 'Failed to fetch inventory'),
  });

  const { data: vendorPayments = [] } = useQuery({
    queryKey: ['vendor-payments'],
    queryFn: () => db.vendorPayments.list('-created_date'),
    onError: (err) => handleError(err, 'Failed to fetch payments'),
  });

  const createVendorMutation = useMutation({
    mutationFn: (data) => {
      const validatedData = vendorSchema.parse(data);
      return db.vendors.create(validatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowForm(false);
      toast.success('Vendor added');
    },
    onError: (err) => handleError(err, 'Failed to create vendor'),
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const validatedData = vendorSchema.partial().parse(data);
      return db.vendors.update(id, validatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowForm(false);
      setEditingVendor(null);
      toast.success('Vendor updated');
    },
    onError: (err) => handleError(err, 'Failed to update vendor'),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id) => db.vendors.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setVendorToDelete(null);
      toast.success('Vendor deleted successfully');
    },
    onError: (err) => handleError(err, 'Failed to delete vendor'),
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => db.vendorOrders.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      setShowOrderForm(false);
      toast.success('Order assigned to vendor');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => db.vendorOrders.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
  });

  // Analytics
  const vendorsWithMetrics = useMemo(
    () => vendors.map((v) => ({ ...v, metrics: calculateVendorMetrics(v, vendorOrders) })),
    [vendors, vendorOrders]
  );

  const spendingByType = useMemo(() => getVendorSpendingByType(vendorOrders), [vendorOrders]);
  const monthlySpending = useMemo(() => getMonthlyVendorSpending(vendorOrders), [vendorOrders]);
  const alerts = useMemo(() => getVendorAlerts(vendors, vendorOrders), [vendors, vendorOrders]);

  const totalSpent = vendorOrders
    .filter((o) => o.status === 'completed')
    .reduce((s, o) => s + (o.amount || 0), 0);
  const activeVendors = vendors.filter((v) => v.status === 'active').length;
  const pendingOrders = vendorOrders.filter(
    (o) => o.status === 'pending' || o.status === 'in_progress'
  ).length;

  // Check for vendor alerts on load
  React.useEffect(() => {
    if (vendors.length > 0 && vendorOrders.length > 0) {
      checkVendorContractAlerts(vendors);
      checkVendorPerformanceAlerts(vendors, vendorOrders);
    }
  }, [vendors.length, vendorOrders.length]);

  // Check for payment alerts
  React.useEffect(() => {
    checkOverduePayments();
    checkUpcomingPayments();
  }, [vendorPayments.length]);

  const handleProcessPayments = async () => {
    toast.promise(
      processUnpaidOrders(vendorOrders, vendors).then(() => {
        queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      }),
      {
        loading: 'Generating payment requests...',
        success: 'Payment requests generated',
        error: 'Failed to process',
      }
    );
  };

  const handleMarkPaid = async (paymentId, method, reference) => {
    await markPaymentPaid(paymentId, method, reference);
    queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
    toast.success('Payment recorded');
  };

  const filteredVendors = vendorsWithMetrics.filter((v) => {
    const matchesType = typeFilter === 'all' || v.vendor_type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleVendorSubmit = (data) => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, data });
    } else {
      createVendorMutation.mutate(data);
    }
  };

  const handleDeleteVendor = () => {
    if (vendorToDelete) {
      deleteVendorMutation.mutate(vendorToDelete.id);
    }
  };

  const completeOrder = (order) => {
    updateOrderMutation.mutate({
      id: order.id,
      data: {
        ...order,
        status: 'completed',
        actual_date: format(new Date(), 'yyyy-MM-dd'),
        on_time: order.expected_date ? new Date() <= new Date(order.expected_date) : true,
      },
    });
    toast.success('Order marked complete');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
              Vendor Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage suppliers and track performance</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowOrderForm(true)}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Assign</span> Order
            </Button>
            <Button
              onClick={() => {
                setEditingVendor(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add</span> Vendor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-slate-500">Vendors</p>
                  <p className="text-xl sm:text-2xl font-bold">{activeVendors}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-slate-500">Spent</p>
                  <p className="text-lg sm:text-2xl font-bold">฿{totalSpent.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-slate-500">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold">{pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-rose-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-rose-700">Alerts</p>
                  <p className="text-xl sm:text-2xl font-bold text-rose-900">{alerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="vendors" className="text-xs sm:text-sm">
              Vendors
            </TabsTrigger>
            <TabsTrigger value="capacity" className="text-xs sm:text-sm">
              Capacity
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">
              Orders
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">
              Payments
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4 mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(typeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredVendors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendors.map((vendor) => {
                  const TypeIcon = typeConfig[vendor.vendor_type]?.icon || Building2;
                  return (
                    <Card
                      key={vendor.id}
                      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setEditingVendor(vendor);
                        setShowForm(true);
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${typeConfig[vendor.vendor_type]?.color || 'bg-slate-100'}`}
                            >
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{vendor.name}</p>
                              <p className="text-xs text-slate-500">
                                {typeConfig[vendor.vendor_type]?.label}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {vendor.is_preferred && (
                              <Badge className="bg-amber-100 text-amber-800">
                                <Star className="w-3 h-3" />
                              </Badge>
                            )}
                            <Badge
                              className={
                                vendor.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                              }
                            >
                              {vendor.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                          {vendor.contact_name && (
                            <p className="text-slate-600">{vendor.contact_name}</p>
                          )}
                          {vendor.phone && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <Phone className="w-3 h-3" /> {vendor.phone}
                            </div>
                          )}
                        </div>

                        {/* Pricing Info */}
                        {vendor.cost_per_kg > 0 && (
                          <div className="flex gap-2 text-xs mb-3">
                            <Badge variant="outline">฿{vendor.cost_per_kg}/kg</Badge>
                            {vendor.cost_per_kg_bulk > 0 && (
                              <Badge
                                variant="outline"
                                className="text-emerald-600 border-emerald-300"
                              >
                                Bulk: ฿{vendor.cost_per_kg_bulk}/kg
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Capacity Bar */}
                        {vendor.monthly_capacity_kg > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Capacity</span>
                              <span>
                                {vendor.current_month_allocated_kg || 0} /{' '}
                                {vendor.monthly_capacity_kg} kg
                              </span>
                            </div>
                            <Progress
                              value={
                                ((vendor.current_month_allocated_kg || 0) /
                                  vendor.monthly_capacity_kg) *
                                100
                              }
                              className="h-1.5"
                            />
                          </div>
                        )}

                        <div className="pt-3 border-t space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Performance Score</span>
                            <span className="font-medium">{vendor.metrics?.score || 0}/100</span>
                          </div>
                          <Progress value={vendor.metrics?.score || 0} className="h-2" />
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{vendor.metrics?.totalOrders || 0} orders</span>
                            <span>฿{(vendor.metrics?.totalSpent || 0).toLocaleString()}</span>
                            <span>{vendor.metrics?.onTimeRate || 100}% on-time</span>
                          </div>
                        </div>
                        <div className="pt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVendorToDelete(vendor);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
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
                  <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No vendors found</h3>
                  <Button onClick={() => setShowForm(true)}>Add First Vendor</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Capacity Tab */}
          <TabsContent value="capacity" className="mt-4">
            <VendorCapacityOverview vendors={vendors} />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-4">Date</th>
                        <th className="text-left p-4">Vendor</th>
                        <th className="text-left p-4">Type</th>
                        <th className="text-left p-4">Reference</th>
                        <th className="text-right p-4">Amount</th>
                        <th className="text-center p-4">Status</th>
                        <th className="text-center p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorOrders.slice(0, 20).map((order) => (
                        <tr key={order.id} className="border-t">
                          <td className="p-4 text-slate-500">
                            {order.created_date && format(new Date(order.created_date), 'MMM d')}
                          </td>
                          <td className="p-4 font-medium">{order.vendor_name}</td>
                          <td className="p-4">
                            <Badge variant="outline">{order.order_type}</Badge>
                          </td>
                          <td className="p-4 text-slate-600">{order.reference_name || '-'}</td>
                          <td className="p-4 text-right font-medium">
                            ฿{order.amount?.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              className={
                                order.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => completeOrder(order)}
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-4">
            <VendorPaymentPanel
              payments={vendorPayments}
              onMarkPaid={handleMarkPaid}
              onProcess={handleProcessPayments}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Vendor Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySpending}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => `฿${v.toLocaleString()}`} />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Spending by Order Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={spendingByType}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="amount"
                          label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                        >
                          {spendingByType.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `฿${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Vendors by Performance */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Vendor Performance Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendorsWithMetrics
                    .sort((a, b) => b.metrics.score - a.metrics.score)
                    .slice(0, 5)
                    .map((v, i) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{v.name}</p>
                          <p className="text-xs text-slate-500">
                            {v.metrics.totalOrders} orders • {v.metrics.onTimeRate}% on-time
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{v.metrics.score}</p>
                          <p className="text-xs text-slate-500">score</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            {alerts.length > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Vendor Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alerts.map((alert, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${alert.priority === 'high' ? 'bg-rose-50' : 'bg-amber-50'}`}
                      >
                        <p className="text-sm">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Vendor Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(v) => {
            setShowForm(v);
            if (!v) setEditingVendor(null);
          }}
        >
          <DialogContent className="max-w-lg p-0 border-0 bg-transparent">
            <VendorForm
              vendor={editingVendor}
              onSubmit={handleVendorSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingVendor(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Order Form Dialog */}
        <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
          <VendorOrderForm
            vendors={vendors}
            shipments={shipments}
            inventoryItems={inventoryItems}
            onSubmit={(data) => createOrderMutation.mutate(data)}
            onCancel={() => setShowOrderForm(false)}
          />
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!vendorToDelete} onOpenChange={() => setVendorToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the vendor
                "{vendorToDelete?.name}" and remove them from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVendor}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
