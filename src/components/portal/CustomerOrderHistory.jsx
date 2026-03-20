import { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search,
  Package,
  ShoppingBag,
  Filter,
  Download,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import { buildCustomerOrderHistory } from '@/domains/customers/customerOrderHistory';

const PAGE_SIZE = 20;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  purchasing: { label: 'Purchasing', color: 'bg-sky-100 text-sky-700' },
  purchased: { label: 'Purchased', color: 'bg-indigo-100 text-indigo-700' },
  received: { label: 'Received', color: 'bg-purple-100 text-purple-700' },
  shipping: { label: 'Shipping', color: 'bg-orange-100 text-orange-700' },
  picked_up: { label: 'Picked Up', color: 'bg-indigo-100 text-indigo-700' },
  in_transit: { label: 'In Transit', color: 'bg-amber-100 text-amber-700' },
  customs: { label: 'Customs', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

const STATUS_FILTER_OPTIONS = [
  'pending',
  'confirmed',
  'purchasing',
  'purchased',
  'received',
  'shipping',
  'picked_up',
  'in_transit',
  'customs',
  'delivered',
  'cancelled',
];

const ORDER_TYPE_CONFIG = {
  shipment: {
    label: 'Shipment',
    icon: Package,
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  shopping: {
    label: 'Shopping',
    icon: ShoppingBag,
    badgeClass: 'bg-purple-100 text-purple-700',
  },
};

export default function CustomerOrderHistory({ customer }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [page, setPage] = useState(0);

  const { data: orderHistory = [], isLoading } = useQuery({
    queryKey: ['customer-order-history', customer?.id, customer?.name],
    queryFn: async () => {
      if (!customer?.id && !customer?.name) return [];

      const filters = customer?.id
        ? { customer_id: customer.id }
        : { customer_name: customer.name };

      const [shipmentsResult, shoppingOrdersResult] = await Promise.allSettled([
        db.shipments.filter(filters, '-created_date'),
        db.shoppingOrders.filter(filters, '-created_date'),
      ]);

      if (shipmentsResult.status === 'rejected' && shoppingOrdersResult.status === 'rejected') {
        throw shipmentsResult.reason;
      }

      const shipments = shipmentsResult.status === 'fulfilled' ? shipmentsResult.value : [];
      const shoppingOrders =
        shoppingOrdersResult.status === 'fulfilled' ? shoppingOrdersResult.value : [];

      return buildCustomerOrderHistory(shipments, shoppingOrders);
    },
    enabled: !!(customer?.id || customer?.name),
  });

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orderHistory.filter((order) => {
      const matchesSearch = !needle || order.searchText.includes(needle);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orderHistory, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedOrders = filteredOrders.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(0);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(0);
  };

  const handleExport = () => {
    const csv = [
      ['Order Type', 'Reference', 'Date', 'Description', 'Weight (kg)', 'Amount', 'Status'].join(
        ','
      ),
      ...filteredOrders.map((order) =>
        [
          order.sourceType,
          order.displayId,
          order.createdDate ? format(new Date(order.createdDate), 'yyyy-MM-dd') : '',
          `"${String(order.description || '').replace(/"/g, '""')}"`,
          order.weightKg,
          order.totalAmount,
          order.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const selectedStatus = selectedOrder
    ? STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending
    : null;
  const selectedType = selectedOrder
    ? ORDER_TYPE_CONFIG[selectedOrder.sourceType] || ORDER_TYPE_CONFIG.shipment
    : null;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by tracking, product details, or reference..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_FILTER_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status]?.label || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={filteredOrders.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Order History ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : paginatedOrders.length > 0 ? (
            <div className="space-y-3">
              {paginatedOrders.map((order) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const orderType = ORDER_TYPE_CONFIG[order.sourceType] || ORDER_TYPE_CONFIG.shipment;
                const TypeIcon = orderType.icon;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <TypeIcon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{order.displayId}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {order.description?.slice(0, 60) || 'Order'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {order.createdDate
                            ? format(new Date(order.createdDate), 'MMM d, yyyy')
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">฿{order.totalAmount.toLocaleString()}</p>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <Badge className={orderType.badgeClass}>{orderType.label}</Badge>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No orders found</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <p className="text-sm text-slate-500">
                Showing {currentPage * PAGE_SIZE + 1}–
                {Math.min((currentPage + 1) * PAGE_SIZE, filteredOrders.length)} of{' '}
                {filteredOrders.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <span className="text-sm text-slate-600 px-2">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-mono text-lg font-bold">{selectedOrder.displayId}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={selectedType?.badgeClass}>{selectedType?.label}</Badge>
                  <Badge className={selectedStatus?.color}>{selectedStatus?.label}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Order Date</p>
                  <p className="font-medium">
                    {selectedOrder.createdDate
                      ? format(new Date(selectedOrder.createdDate), 'MMM d, yyyy')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Service</p>
                  <p className="font-medium">{selectedOrder.serviceLabel}</p>
                </div>
                <div>
                  <p className="text-slate-500">Weight</p>
                  <p className="font-medium">
                    {selectedOrder.weightKg ? `${selectedOrder.weightKg} kg` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Payment</p>
                  <p className="font-medium">{selectedOrder.paymentStatus}</p>
                </div>
              </div>

              <div className="text-sm">
                <p className="text-slate-500">
                  {selectedOrder.sourceType === 'shopping' ? 'Product Details' : 'Items'}
                </p>
                <p className="font-medium">{selectedOrder.description}</p>
                {selectedOrder.sourceType === 'shopping' && selectedOrder.raw?.product_links && (
                  <p className="text-xs text-slate-500 mt-2 break-all">
                    {selectedOrder.raw.product_links}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                <span className="text-slate-500">Total Amount</span>
                <span className="text-2xl font-bold">
                  ฿{selectedOrder.totalAmount.toLocaleString()}
                </span>
              </div>

              {selectedOrder.sourceType === 'shopping' && (
                <div className="p-3 rounded-lg bg-purple-50 text-purple-700 text-sm flex items-start gap-2">
                  <Truck className="w-4 h-4 mt-0.5" />
                  <span>
                    This shopping order will be purchased in Thailand before shipment to Yangon.
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
