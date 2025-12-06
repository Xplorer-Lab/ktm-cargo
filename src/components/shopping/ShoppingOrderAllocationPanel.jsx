import { Skeleton } from '@/components/ui/skeleton';
// ... existing imports ...

export default function ShoppingOrderAllocationPanel({
  orders = [],
  purchaseOrders = [],
  onUpdateOrder,
  onUpdatePO,
  isLoading,
}) {
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPOId, setSelectedPOId] = useState('');

  // ... (existing logic for availablePOs, unallocatedOrders, stats) ...

  const availablePOs = useMemo(() => {
    return purchaseOrders.filter(
      (po) =>
        ['approved', 'sent', 'partial_received', 'received'].includes(po.status) &&
        (po.remaining_weight_kg || 0) > 0
    );
  }, [purchaseOrders]);

  const unallocatedOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        !o.vendor_po_id &&
        !['delivered', 'cancelled'].includes(o.status) &&
        (o.actual_weight || o.estimated_weight) > 0
    );
  }, [orders]);

  const stats = useMemo(() => {
    const totalOrders = orders.filter((o) => !['cancelled'].includes(o.status)).length;
    const allocatedOrders = orders.filter((o) => o.vendor_po_id).length;
    const totalWeight = orders.reduce(
      (sum, o) => sum + (o.actual_weight || o.estimated_weight || 0),
      0
    );
    const allocatedWeight = orders
      .filter((o) => o.vendor_po_id)
      .reduce((sum, o) => sum + (o.actual_weight || o.estimated_weight || 0), 0);
    const totalVendorCost = orders.reduce((sum, o) => sum + (o.vendor_cost || 0), 0);

    return { totalOrders, allocatedOrders, totalWeight, allocatedWeight, totalVendorCost };
  }, [orders]);

  // ... (handlers) ...

  const openAllocateDialog = (order) => {
    setSelectedOrder(order);
    setSelectedPOId('');
    setShowAllocateDialog(true);
  };

  const handleAllocate = async () => {
    // ... (same as before) ...
    if (!selectedOrder || !selectedPOId) {
      toast.error('Please select a Purchase Order');
      return;
    }

    const po = purchaseOrders.find((p) => p.id === selectedPOId);
    if (!po) return;

    const weight = selectedOrder.actual_weight || selectedOrder.estimated_weight || 0;

    if (weight > (po.remaining_weight_kg || 0)) {
      toast.error('Not enough weight available in this PO');
      return;
    }

    const vendorCost = weight * (po.cost_per_kg || 0);

    try {
      // Update order with PO allocation
      await onUpdateOrder(selectedOrder.id, {
        vendor_po_id: po.id,
        vendor_po_number: po.po_number,
        vendor_id: po.vendor_id,
        vendor_name: po.vendor_name,
        vendor_cost_per_kg: po.cost_per_kg,
        vendor_cost: vendorCost,
      });

      // Update PO weight
      if (onUpdatePO) {
        const newAllocated = (po.allocated_weight_kg || 0) + weight;
        const newRemaining = (po.total_weight_kg || 0) - newAllocated;
        await onUpdatePO(po.id, {
          allocated_weight_kg: newAllocated,
          remaining_weight_kg: newRemaining,
        });
      }

      toast.success('Weight allocated successfully');
      setShowAllocateDialog(false);
      setSelectedOrder(null);
      setSelectedPOId('');
    } catch (error) {
      console.error('Failed to allocate weight:', error);
    }
  };

  const handleUnlink = async (order) => {
    // ... (same as before) ...
    try {
      const weight = order.actual_weight || order.estimated_weight || 0;
      const po = purchaseOrders.find((p) => p.id === order.vendor_po_id);

      await onUpdateOrder(order.id, {
        vendor_po_id: '',
        vendor_po_number: '',
        vendor_po_ref: null,
        vendor_id: '',
        vendor_name: '',
        vendor_cost_per_kg: 0,
        vendor_cost: 0,
      });

      // Update PO weight
      if (po && onUpdatePO) {
        const newAllocated = Math.max(0, (po.allocated_weight_kg || 0) - weight);
        const newRemaining = (po.total_weight_kg || 0) - newAllocated;
        await onUpdatePO(po.id, {
          allocated_weight_kg: newAllocated,
          remaining_weight_kg: newRemaining,
        });
      }

      toast.success('Order unlinked from PO');
    } catch (error) {
      console.error('Failed to unlink order:', error);
    }
  };


  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Package className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Weight</p>
                {isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-xl font-bold text-blue-900">{stats.totalWeight.toFixed(1)} kg</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-200 rounded-lg">
                <Link className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Allocated</p>
                {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-xl font-bold text-emerald-900">
                  {stats.allocatedOrders}/{stats.totalOrders}
                </p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Unallocated</p>
                {isLoading ? <Skeleton className="h-7 w-8" /> : <p className="text-xl font-bold text-amber-900">{unallocatedOrders.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <p className="text-xs text-rose-600 font-medium">Vendor Cost</p>
                {isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-xl font-bold text-rose-900">
                  ฿{stats.totalVendorCost.toLocaleString()}
                </p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unallocated Orders Alert */}
      {unallocatedOrders.length > 0 && !isLoading && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-medium text-amber-800">
                    {unallocatedOrders.length} Order{unallocatedOrders.length > 1 ? 's' : ''} Need
                    Allocation
                  </h3>
                  <p className="text-sm text-amber-700">
                    Total weight:{' '}
                    {unallocatedOrders
                      .reduce((sum, o) => sum + (o.actual_weight || o.estimated_weight || 0), 0)
                      .toFixed(1)}{' '}
                    kg
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unallocated Orders List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-600" />
            Orders Pending Allocation
          </CardTitle>
          <CardDescription>Assign shopping orders to vendor Purchase Orders</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : unallocatedOrders.length > 0 ? (
            <div className="space-y-3">
              {unallocatedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-slate-500">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {order.actual_weight || order.estimated_weight || 0} kg
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.actual_weight ? 'Actual' : 'Estimated'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openAllocateDialog(order)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Link className="w-4 h-4 mr-1" /> Allocate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-slate-500">All orders are allocated</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocated Orders List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Allocated Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : orders.filter((o) => o.vendor_po_id).length > 0 ? (
              // ... existing map logic ...

              orders
                .filter((o) => o.vendor_po_id)
                .slice(0, 10)
                .map((order) => {
                  const po = purchaseOrders.find((p) => p.id === order.vendor_po_id);
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50 border-emerald-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Package className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-slate-500">{order.customer_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-emerald-700">
                            {po?.po_number || order.vendor_po_number}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.vendor_name} • ฿{order.vendor_cost?.toLocaleString() || 0}
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {order.actual_weight || order.estimated_weight || 0} kg
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => handleUnlink(order)}
                        >
                          <Unlink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-center py-4 text-slate-500">No allocated orders yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allocate Dialog */}
      <Dialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-purple-600" />
              Allocate to Purchase Order
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 mt-4">
              {/* Order Info */}
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="font-medium">{selectedOrder.order_number}</p>
                <p className="text-sm text-slate-600">{selectedOrder.customer_name}</p>
                <p className="text-sm text-purple-700 font-medium mt-1">
                  Weight: {selectedOrder.actual_weight || selectedOrder.estimated_weight || 0} kg
                </p>
              </div>

              {/* PO Selection */}
              <div className="space-y-2">
                <Label>Select Purchase Order</Label>
                {availablePOs.length > 0 ? (
                  <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a PO..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePOs.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          <div className="flex items-center gap-2">
                            <span>{po.po_number}</span>
                            <span className="text-xs text-slate-500">
                              ({po.remaining_weight_kg?.toFixed(1)} kg available)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                    No Purchase Orders with available weight
                  </div>
                )}
              </div>

              {/* Selected PO Details */}
              {selectedPOId &&
                (() => {
                  const po = purchaseOrders.find((p) => p.id === selectedPOId);
                  const weight = selectedOrder.actual_weight || selectedOrder.estimated_weight || 0;
                  const vendorCost = weight * (po?.cost_per_kg || 0);
                  return (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm">
                      <p>
                        <strong>Vendor:</strong> {po?.vendor_name}
                      </p>
                      <p>
                        <strong>Cost per kg:</strong> ฿{po?.cost_per_kg || 0}
                      </p>
                      <p>
                        <strong>Available:</strong> {po?.remaining_weight_kg?.toFixed(1)} kg
                      </p>
                      <p className="mt-2 pt-2 border-t border-blue-200 font-medium">
                        Vendor Cost: ฿{vendorCost.toLocaleString()}
                      </p>
                    </div>
                  );
                })()}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAllocateDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAllocate}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={!selectedPOId}
                >
                  <Save className="w-4 h-4 mr-2" /> Allocate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
