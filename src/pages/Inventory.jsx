import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Box,
  Truck,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Bell,
  HelpCircle,
  Trash2,
  MapPin,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  analyzeInventoryDemand,
  getStockStatus,
  getReorderAlerts,
} from '@/components/inventory/InventoryAnalytics';
import { triggerLowStockAlert } from '@/components/notifications/NotificationService';
import BulkInventoryActions from '@/components/inventory/BulkInventoryActions';
import InventoryCharts from '@/components/inventory/InventoryCharts';
import { startInventoryTour } from '@/components/common/TourGuide';

const categoryConfig = {
  packaging: { label: 'Packaging', icon: Box, color: 'bg-blue-100 text-blue-800' },
  supplies: { label: 'Supplies', icon: Package, color: 'bg-purple-100 text-purple-800' },
  equipment: { label: 'Equipment', icon: Truck, color: 'bg-amber-100 text-amber-800' },
  goods: { label: 'Goods', icon: Package, color: 'bg-emerald-100 text-emerald-800' },
};

export default function Inventory() {
  const [showForm, setShowForm] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('inventory');
  const [itemToDelete, setItemToDelete] = useState(null);

  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => db.inventoryItems.list('-created_date'),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => db.stockMovements.list('-created_date', 500),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date', 200),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list('name'),
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => db.inventoryItems.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowForm(false);
      toast.success('Item added to inventory');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => db.inventoryItems.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => db.inventoryItems.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setItemToDelete(null);
      toast.success('Item deleted successfully');
    },
  });

  // Check for low stock and trigger notifications
  const checkLowStockAlerts = async (item, newStock) => {
    if (newStock <= item.reorder_point) {
      const user = await auth.me().catch(() => null);
      if (user?.email) {
        triggerLowStockAlert({ ...item, current_stock: newStock }, user.email);
      }
    }
  };

  const createMovementMutation = useMutation({
    mutationFn: async (data) => {
      const item = items.find((i) => i.id === data.item_id);
      const newStock =
        data.movement_type === 'in'
          ? (item.current_stock || 0) + data.quantity
          : (item.current_stock || 0) - data.quantity;

      await db.stockMovements.create({
        ...data,
        item_name: item.name,
        stock_after: newStock,
      });

      await db.inventoryItems.update(item.id, {
        current_stock: newStock,
        status: getStockStatus({ ...item, current_stock: newStock }).status,
        ...(data.movement_type === 'in'
          ? { last_restock_date: format(new Date(), 'yyyy-MM-dd') }
          : {}),
      });

      // Check for low stock alerts
      await checkLowStockAlerts(item, newStock);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setShowMovement(false);
      setSelectedItem(null);
      toast.success('Stock updated');
    },
  });

  // Calculate analytics
  const alerts = useMemo(
    () => getReorderAlerts(items, movements, shipments),
    [items, movements, shipments]
  );
  const lowStockCount = items.filter((i) => i.current_stock <= i.reorder_point).length;
  const outOfStockCount = items.filter((i) => i.current_stock <= 0).length;
  const totalValue = items.reduce((sum, i) => sum + i.current_stock * (i.unit_cost || 0), 0);

  const filteredItems = items.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'packaging',
    current_stock: 0,
    unit: 'pieces',
    reorder_point: 10,
    reorder_quantity: 50,
    unit_cost: 0,
    vendor_id: '',
    location: '',
    lead_time_days: 7,
  });

  const handleBulkImport = async (importedItems) => {
    try {
      // Process imports sequentially to avoid overwhelming the DB
      for (const item of importedItems) {
        // Check if item exists by SKU
        const existing = items.find(i => i.sku === item.sku && item.sku);

        if (existing) {
          await db.inventoryItems.update(existing.id, item);
        } else {
          await db.inventoryItems.create(item);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(`Successfully processed ${importedItems.length} items`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import items');
    }
  };

  const handleDeleteItem = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete.id);
    }
  };

  const [movementForm, setMovementForm] = useState({
    movement_type: 'in',
    quantity: 0,
    reference_type: 'manual',
    notes: '',
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="inventory-header">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Inventory Management</h1>
              <Button variant="ghost" size="icon" onClick={startInventoryTour} className="text-slate-400 hover:text-blue-600" title="Take a Tour">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-slate-500 mt-1">Track stock levels and manage supplies</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700" id="add-item-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-slate-500">Items</p>
                  <p className="text-xl sm:text-2xl font-bold">{items.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-amber-700">Low Stock</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-900">{lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-rose-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Box className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-rose-700">Out</p>
                  <p className="text-xl sm:text-2xl font-bold text-rose-900">{outOfStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                <div>
                  <p className="text-[10px] sm:text-sm text-slate-500">Value</p>
                  <p className="text-lg sm:text-2xl font-bold">฿{totalValue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap p-1 gap-1">
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
              Alerts{' '}
              {alerts.length > 0 && (
                <Badge className="bg-rose-500 text-[10px] sm:text-xs px-1.5">{alerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="movements" className="text-xs sm:text-sm">
              Movements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-4">
            <InventoryCharts movements={movements} items={items} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 mt-4">
            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="supplies">Supplies</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="goods">Goods</SelectItem>
                  </SelectContent>
                </Select>
                <div id="bulk-actions">
                  <BulkInventoryActions items={items} onImport={handleBulkImport} />
                </div>
              </CardContent>
            </Card>

            {/* Items Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item);
                  const analytics = analyzeInventoryDemand(item, movements, shipments);
                  const Cat = categoryConfig[item.category]?.icon || Package;

                  return (
                    <Card
                      key={item.id}
                      className="border-0 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${categoryConfig[item.category]?.color || 'bg-slate-100'}`}
                            >
                              <Cat className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.sku}</p>
                              {item.location && (
                                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" /> {item.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={status.color}>{status.status.replace('_', ' ')}</Badge>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Stock Level</span>
                            <span className="font-medium">
                              {item.current_stock} / {item.reorder_point * 3} {item.unit}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(
                              (item.current_stock / (item.reorder_point * 3)) * 100,
                              100
                            )}
                            className={`h-2 ${item.current_stock <= item.reorder_point ? '[&>div]:bg-amber-500' : ''}`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                          <div>
                            <p className="text-slate-500">Daily Usage</p>
                            <p className="font-medium">
                              {analytics.dailyUsage} {item.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Days Left</p>
                            <p
                              className={`font-medium ${analytics.daysUntilStockout < 14 ? 'text-rose-600' : ''}`}
                            >
                              {analytics.daysUntilStockout > 100
                                ? '100+'
                                : analytics.daysUntilStockout}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementForm({ ...movementForm, movement_type: 'out' });
                              setShowMovement(true);
                            }}
                          >
                            <ArrowDownCircle className="w-4 h-4 mr-1" /> Use
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementForm({ ...movementForm, movement_type: 'in' });
                              setShowMovement(true);
                            }}
                          >
                            <ArrowUpCircle className="w-4 h-4 mr-1" /> Restock
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                            onClick={() => setItemToDelete(item)}
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
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <Button onClick={() => setShowForm(true)}>Add First Item</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-4">
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map(({ item, analytics }) => (
                  <Card
                    key={item.id}
                    className={`border-l-4 ${analytics.urgency === 'critical'
                      ? 'border-l-rose-500 bg-rose-50'
                      : analytics.urgency === 'high'
                        ? 'border-l-amber-500 bg-amber-50'
                        : 'border-l-blue-500 bg-blue-50'
                      }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={
                                analytics.urgency === 'critical'
                                  ? 'bg-rose-500'
                                  : analytics.urgency === 'high'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                              }
                            >
                              {analytics.urgency.toUpperCase()}
                            </Badge>
                            <span className="font-semibold text-slate-900">{item.name}</span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Current: {item.current_stock} {item.unit} •
                            {analytics.daysUntilStockout <= 0
                              ? ' Out of stock!'
                              : ` ${analytics.daysUntilStockout} days until stockout`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Suggested Reorder</p>
                            <p className="font-bold text-lg">
                              {analytics.suggestedReorderQty} {item.unit}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementForm({
                                movement_type: 'in',
                                quantity: analytics.suggestedReorderQty,
                                reference_type: 'restock',
                                notes: '',
                              });
                              setShowMovement(true);
                            }}
                          >
                            Restock Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <RefreshCw className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">All stocked up!</h3>
                  <p className="text-slate-500">No reorder alerts at this time</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="movements" className="space-y-4 mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-4">Date</th>
                        <th className="text-left p-4">Item</th>
                        <th className="text-left p-4">Type</th>
                        <th className="text-right p-4">Qty</th>
                        <th className="text-right p-4">After</th>
                        <th className="text-left p-4">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.slice(0, 20).map((m) => (
                        <tr key={m.id} className="border-t">
                          <td className="p-4 text-slate-500">
                            {format(new Date(m.created_date), 'MMM d, HH:mm')}
                          </td>
                          <td className="p-4 font-medium">{m.item_name}</td>
                          <td className="p-4">
                            <Badge
                              className={
                                m.movement_type === 'in'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }
                            >
                              {m.movement_type === 'in' ? '+ In' : '- Out'}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">{m.quantity}</td>
                          <td className="p-4 text-right">{m.stock_after}</td>
                          <td className="p-4 text-slate-500">{m.reference_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Item Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createItemMutation.mutate(form);
              }}
              className="space-y-4 mt-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Item Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="goods">Goods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Stock</Label>
                  <Input
                    type="number"
                    value={form.current_stock}
                    onChange={(e) => setForm({ ...form, current_stock: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="boxes">Boxes</SelectItem>
                      <SelectItem value="rolls">Rolls</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="meters">Meters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reorder Point</Label>
                  <Input
                    type="number"
                    value={form.reorder_point}
                    onChange={(e) => setForm({ ...form, reorder_point: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unit Cost (฿)</Label>
                  <Input
                    type="number"
                    value={form.unit_cost}
                    onChange={(e) => setForm({ ...form, unit_cost: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lead Time (days)</Label>
                  <Input
                    type="number"
                    value={form.lead_time_days}
                    onChange={(e) => setForm({ ...form, lead_time_days: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Warehouse A - Shelf 1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Supplier (Vendor)</Label>
                  <Select
                    value={form.vendor_id}
                    onValueChange={(v) => setForm({ ...form, vendor_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600">
                  Add Item
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stock Movement Dialog */}
        <Dialog
          open={showMovement}
          onOpenChange={(v) => {
            setShowMovement(v);
            if (!v) setSelectedItem(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {movementForm.movement_type === 'in' ? 'Restock' : 'Use Stock'}:{' '}
                {selectedItem?.name}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMovementMutation.mutate({ ...movementForm, item_id: selectedItem.id });
              }}
              className="space-y-4 mt-4"
            >
              <div>
                <Label>Current Stock</Label>
                <p className="text-2xl font-bold">
                  {selectedItem?.current_stock} {selectedItem?.unit}
                </p>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: +e.target.value })}
                  required
                  min={1}
                />
              </div>
              <div>
                <Label>Reference</Label>
                <Select
                  value={movementForm.reference_type}
                  onValueChange={(v) => setMovementForm({ ...movementForm, reference_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="shipment">Shipment</SelectItem>
                    <SelectItem value="restock">Restock Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMovement(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 ${movementForm.movement_type === 'in' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                >
                  {movementForm.movement_type === 'in' ? 'Add Stock' : 'Remove Stock'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the item
                "{itemToDelete?.name}" and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteItem}
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
