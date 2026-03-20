import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Scale,
  Package,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Truck,
  Users,
  Plus,
  Link,
  Unlink,
  Save,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

import { useErrorHandler } from '@/hooks/useErrorHandler';
export default function WeightAllocationManager({
  purchaseOrders = [],
  shipments = [],
  shoppingOrders = [],
  onUpdateShipment,
  onUpdateShoppingOrder,
  onUpdatePO,
}) {
  const [selectedPO, setSelectedPO] = useState(null);
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [allocationType, setAllocationType] = useState('shipment');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [allocateWeight, setAllocateWeight] = useState('');

  // Calculate summary stats
  const activePOs = purchaseOrders.filter(
    (po) =>
      ['approved', 'sent', 'partial_received', 'received'].includes(po.status) &&
      po.total_weight_kg > 0
  );

  const totalPurchasedKg = activePOs.reduce((sum, po) => sum + (po.total_weight_kg || 0), 0);
  const totalAllocatedKg = activePOs.reduce((sum, po) => sum + (po.allocated_weight_kg || 0), 0);
  const totalRemainingKg = activePOs.reduce((sum, po) => sum + (po.remaining_weight_kg || 0), 0);

  const avgBuyPrice =
    activePOs.length > 0
      ? activePOs.reduce((sum, po) => sum + (po.cost_per_kg || 0), 0) / activePOs.length
      : 0;

  // Get shipments linked to a specific PO
  const getLinkedShipments = (poId) => {
    return shipments.filter((s) => s.vendor_po_id === poId);
  };

  // Get shopping orders linked to a specific PO
  const getLinkedShoppingOrders = (poId) => {
    return shoppingOrders.filter((s) => s.vendor_po_id === poId);
  };

  // Get unallocated orders
  const unallocatedShipments = shipments.filter(
    (s) => !s.vendor_po_id && s.weight_kg > 0 && !['delivered', 'cancelled'].includes(s.status)
  );

  const unallocatedShoppingOrders = shoppingOrders.filter(
    (s) =>
      !s.vendor_po_id &&
      (s.actual_weight || s.estimated_weight) > 0 &&
      !['delivered', 'cancelled'].includes(s.status)
  );

  // Calculate profit metrics
  const calculatePOProfit = (po) => {
    const linkedShipments = getLinkedShipments(po.id);
    const linkedShopping = getLinkedShoppingOrders(po.id);

    const shipmentRevenue = linkedShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const shipmentCost = linkedShipments.reduce((sum, s) => sum + (s.vendor_total_cost || 0), 0);

    const shoppingRevenue = linkedShopping.reduce((sum, s) => sum + (s.shipping_cost || 0), 0);
    const shoppingCost = linkedShopping.reduce((sum, s) => sum + (s.vendor_cost || 0), 0);

    return {
      revenue: shipmentRevenue + shoppingRevenue,
      cost: shipmentCost + shoppingCost,
      profit: shipmentRevenue + shoppingRevenue - (shipmentCost + shoppingCost),
    };
  };

  // Handle allocation
  const handleAllocate = async () => {
    if (!selectedPO || !selectedOrderId) {
      toast.error('Please select an order to allocate');
      return;
    }

    const weight = parseFloat(allocateWeight);
    if (!weight || weight <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    if (weight > (selectedPO.remaining_weight_kg || 0)) {
      toast.error('Not enough weight available in this PO');
      return;
    }

    const vendorCost = weight * (selectedPO.cost_per_kg || 0);

    try {
      if (allocationType === 'shipment') {
        const shipment = shipments.find((s) => s.id === selectedOrderId);
        if (shipment && onUpdateShipment) {
          await onUpdateShipment(shipment.id, {
            vendor_po_id: selectedPO.id,
            vendor_po_number: selectedPO.po_number,
            vendor_id: selectedPO.vendor_id,
            vendor_name: selectedPO.vendor_name,
            vendor_cost_per_kg: selectedPO.cost_per_kg,
            vendor_total_cost: vendorCost,
          });
        }
      } else {
        const order = shoppingOrders.find((s) => s.id === selectedOrderId);
        if (order && onUpdateShoppingOrder) {
          await onUpdateShoppingOrder(order.id, {
            vendor_po_id: selectedPO.id,
            vendor_po_number: selectedPO.po_number,
            vendor_id: selectedPO.vendor_id,
            vendor_name: selectedPO.vendor_name,
            vendor_cost_per_kg: selectedPO.cost_per_kg,
            vendor_cost: vendorCost,
          });
        }
      }

      // Update PO allocation
      if (onUpdatePO) {
        const newAllocated = (selectedPO.allocated_weight_kg || 0) + weight;
        const newRemaining = (selectedPO.total_weight_kg || 0) - newAllocated;
        await onUpdatePO(selectedPO.id, {
          allocated_weight_kg: newAllocated,
          remaining_weight_kg: newRemaining,
        });
      }

      toast.success('Weight allocated successfully');
      setShowAllocateDialog(false);
      setSelectedOrderId('');
      setAllocateWeight('');
    } catch (error) {
      console.error('Failed to allocate weight:', error);
      toast.error('Failed to allocate weight. Please try again.');
    }
  };

  // Handle unlink
  const handleUnlink = async (type, order) => {
    try {
      const weight =
        type === 'shipment' ? order.weight_kg : order.actual_weight || order.estimated_weight;
      const poId = order.vendor_po_id;
      const po = purchaseOrders.find((p) => p.id === poId);

      if (type === 'shipment' && onUpdateShipment) {
        await onUpdateShipment(order.id, {
          vendor_po_id: '',
          vendor_po_number: '',
          vendor_id: '',
          vendor_name: '',
          vendor_cost_per_kg: 0,
          vendor_total_cost: 0,
        });
      } else if (onUpdateShoppingOrder) {
        await onUpdateShoppingOrder(order.id, {
          vendor_po_id: '',
          vendor_po_number: '',
          vendor_id: '',
          vendor_name: '',
          vendor_cost_per_kg: 0,
          vendor_cost: 0,
        });
      }

      // Update PO allocation
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
      toast.error('Failed to unlink order. Please try again.');
    }
  };

  const openAllocateDialog = (po) => {
    setSelectedPO(po);
    setShowAllocateDialog(true);
    setAllocationType('shipment');
    setSelectedOrderId('');
    setAllocateWeight('');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Scale className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Purchased</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalPurchasedKg.toLocaleString()} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-200 rounded-lg">
                <Users className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Allocated</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {totalAllocatedKg.toLocaleString()} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-200 rounded-lg">
                <Package className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Available</p>
                <p className="text-2xl font-bold text-amber-900">
                  {totalRemainingKg.toLocaleString()} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Avg. Buy Price</p>
                <p className="text-2xl font-bold text-purple-900">฿{avgBuyPrice.toFixed(0)}/kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unallocated Orders Alert */}
      {(unallocatedShipments.length > 0 || unallocatedShoppingOrders.length > 0) && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-medium text-amber-800">Orders Pending Allocation</h3>
            </div>
            <p className="text-sm text-amber-700">
              {unallocatedShipments.length} shipment{unallocatedShipments.length !== 1 ? 's' : ''}{' '}
              and {unallocatedShoppingOrders.length} shopping order
              {unallocatedShoppingOrders.length !== 1 ? 's' : ''} need weight allocation
            </p>
          </CardContent>
        </Card>
      )}

      {/* Allocation Progress */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            Weight Allocation Overview
          </CardTitle>
          <CardDescription>Track purchased cargo allocation to customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Overall Allocation</span>
              <span className="font-medium">
                {totalAllocatedKg.toLocaleString()} / {totalPurchasedKg.toLocaleString()} kg (
                {totalPurchasedKg > 0
                  ? ((totalAllocatedKg / totalPurchasedKg) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <Progress
              value={totalPurchasedKg > 0 ? (totalAllocatedKg / totalPurchasedKg) * 100 : 0}
              className="h-3"
            />
          </div>

          {/* PO Allocation List */}
          <div className="space-y-3 mt-6">
            {activePOs.length > 0 ? (
              activePOs.map((po) => {
                const allocated = po.allocated_weight_kg || 0;
                const total = po.total_weight_kg || 0;
                const remaining = po.remaining_weight_kg || 0;
                const percentage = total > 0 ? (allocated / total) * 100 : 0;
                const linkedShipments = getLinkedShipments(po.id);
                const linkedShopping = getLinkedShoppingOrders(po.id);
                const totalLinked = linkedShipments.length + linkedShopping.length;
                const profitData = calculatePOProfit(po);

                return (
                  <div
                    key={po.id}
                    className="p-4 border rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 cursor-pointer" onClick={() => setSelectedPO(po)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{po.po_number}</h3>
                          <Badge className="bg-blue-100 text-blue-800">{po.vendor_name}</Badge>
                          {remaining === 0 && total > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-800">
                              Fully Allocated
                            </Badge>
                          )}
                          {remaining > 0 && remaining < total * 0.2 && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          Cost: ฿{po.cost_per_kg}/kg • {totalLinked} order
                          {totalLinked !== 1 ? 's' : ''} linked
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <p className="text-sm font-medium">{remaining.toLocaleString()} kg</p>
                          <p className="text-xs text-slate-500">available</p>
                        </div>
                        {remaining > 0 && (
                          <Button
                            size="sm"
                            onClick={() => openAllocateDialog(po)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Allocate
                          </Button>
                        )}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() => setSelectedPO(po)}
                    >
                      <Progress value={percentage} className="flex-1 h-2" />
                      <span className="text-sm font-medium w-12 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                    {profitData.revenue > 0 && (
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-slate-500">
                          Revenue:{' '}
                          <span className="text-blue-600 font-medium">
                            ฿{profitData.revenue.toLocaleString()}
                          </span>
                        </span>
                        <span className="text-slate-500">
                          Cost:{' '}
                          <span className="text-rose-600 font-medium">
                            ฿{profitData.cost.toLocaleString()}
                          </span>
                        </span>
                        <span className="text-slate-500">
                          Profit:{' '}
                          <span className="text-emerald-600 font-medium">
                            ฿{profitData.profit.toLocaleString()}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No active purchase orders with weight data</p>
                <p className="text-sm text-slate-400">
                  Create a PO with weight and cost per kg to track allocations
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PO Detail Dialog */}
      <Dialog open={!!selectedPO && !showAllocateDialog} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {selectedPO?.po_number} - Allocation Details
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-6 mt-4">
              {/* PO Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Vendor</p>
                  <p className="font-medium">{selectedPO.vendor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Weight</p>
                  <p className="font-medium">{selectedPO.total_weight_kg?.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cost per kg</p>
                  <p className="font-medium text-rose-600">฿{selectedPO.cost_per_kg}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Remaining</p>
                  <p className="font-medium text-amber-600">
                    {selectedPO.remaining_weight_kg?.toLocaleString()} kg
                  </p>
                </div>
              </div>

              {/* Allocation Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Allocation Progress</span>
                  <span className="font-medium">
                    {(selectedPO.allocated_weight_kg || 0).toLocaleString()} /{' '}
                    {(selectedPO.total_weight_kg || 0).toLocaleString()} kg
                  </span>
                </div>
                <Progress
                  value={
                    selectedPO.total_weight_kg > 0
                      ? ((selectedPO.allocated_weight_kg || 0) / selectedPO.total_weight_kg) * 100
                      : 0
                  }
                  className="h-3"
                />
              </div>

              {/* Linked Shipments */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Linked Cargo Shipments ({getLinkedShipments(selectedPO.id).length})
                </h4>
                <div className="space-y-2">
                  {getLinkedShipments(selectedPO.id).length > 0 ? (
                    getLinkedShipments(selectedPO.id).map((shipment) => (
                      <div
                        key={shipment.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{shipment.tracking_number}</p>
                            <p className="text-sm text-slate-500">{shipment.customer_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{shipment.weight_kg} kg</p>
                            <div className="flex gap-2 text-xs">
                              <span className="text-rose-600">
                                Cost: ฿{shipment.vendor_total_cost?.toLocaleString() || 0}
                              </span>
                              <span className="text-emerald-600">
                                Profit: ฿{shipment.profit?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                          <Badge
                            className={
                              shipment.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : shipment.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {shipment.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleUnlink('shipment', shipment)}
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No cargo shipments linked
                    </p>
                  )}
                </div>
              </div>

              {/* Linked Shopping Orders */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Linked Shopping Orders ({getLinkedShoppingOrders(selectedPO.id).length})
                </h4>
                <div className="space-y-2">
                  {getLinkedShoppingOrders(selectedPO.id).length > 0 ? (
                    getLinkedShoppingOrders(selectedPO.id).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Package className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-sm text-slate-500">{order.customer_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {order.actual_weight || order.estimated_weight} kg
                            </p>
                            <p className="text-xs text-rose-600">
                              Cost: ฿{order.vendor_cost?.toLocaleString() || 0}
                            </p>
                          </div>
                          <Badge
                            className={
                              order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                            }
                          >
                            {order.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleUnlink('shopping', order)}
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No shopping orders linked
                    </p>
                  )}
                </div>
              </div>

              {/* Profit Summary */}
              {(getLinkedShipments(selectedPO.id).length > 0 ||
                getLinkedShoppingOrders(selectedPO.id).length > 0) && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 mb-2">Profit Summary for this PO</h4>
                  {(() => {
                    const profitData = calculatePOProfit(selectedPO);
                    const margin =
                      profitData.revenue > 0
                        ? ((profitData.profit / profitData.revenue) * 100).toFixed(1)
                        : 0;
                    return (
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-emerald-600">Total Revenue</p>
                          <p className="font-bold text-emerald-900">
                            ฿{profitData.revenue.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-emerald-600">Vendor Cost</p>
                          <p className="font-bold text-rose-600">
                            ฿{profitData.cost.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-emerald-600">Net Profit</p>
                          <p className="font-bold text-emerald-900">
                            ฿{profitData.profit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-emerald-600">Margin</p>
                          <p className="font-bold text-emerald-900">{margin}%</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedPO(null)} className="flex-1">
                  Close
                </Button>
                {(selectedPO.remaining_weight_kg || 0) > 0 && (
                  <Button
                    onClick={() => {
                      setShowAllocateDialog(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Allocate Weight
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Allocate Weight Dialog */}
      <Dialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-blue-600" />
              Allocate Weight from {selectedPO?.po_number}
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p>
                  <strong>Vendor:</strong> {selectedPO.vendor_name}
                </p>
                <p>
                  <strong>Available:</strong> {selectedPO.remaining_weight_kg?.toLocaleString()} kg
                </p>
                <p>
                  <strong>Cost:</strong> ฿{selectedPO.cost_per_kg}/kg
                </p>
              </div>

              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select
                  value={allocationType}
                  onValueChange={(v) => {
                    setAllocationType(v);
                    setSelectedOrderId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipment">
                      Cargo Shipment ({unallocatedShipments.length} pending)
                    </SelectItem>
                    <SelectItem value="shopping">
                      Shopping Order ({unallocatedShoppingOrders.length} pending)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Order</Label>
                {allocationType === 'shipment' && unallocatedShipments.length === 0 ? (
                  <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-500 text-center">
                    No unallocated cargo shipments available
                  </div>
                ) : allocationType === 'shopping' && unallocatedShoppingOrders.length === 0 ? (
                  <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-500 text-center">
                    No unallocated shopping orders available
                  </div>
                ) : (
                  <Select
                    value={selectedOrderId}
                    onValueChange={(v) => {
                      setSelectedOrderId(v);
                      if (allocationType === 'shipment') {
                        const s = unallocatedShipments.find((x) => x.id === v);
                        setAllocateWeight(s?.weight_kg?.toString() || '');
                      } else {
                        const s = unallocatedShoppingOrders.find((x) => x.id === v);
                        setAllocateWeight(
                          (s?.actual_weight || s?.estimated_weight)?.toString() || ''
                        );
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an order..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allocationType === 'shipment'
                        ? unallocatedShipments.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.tracking_number} - {s.customer_name} ({s.weight_kg} kg)
                            </SelectItem>
                          ))
                        : unallocatedShoppingOrders.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.order_number} - {s.customer_name} (
                              {s.actual_weight || s.estimated_weight} kg)
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Weight to Allocate (kg)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={selectedPO.remaining_weight_kg}
                  value={allocateWeight}
                  onChange={(e) => setAllocateWeight(e.target.value)}
                  placeholder="Enter weight"
                />
                {allocateWeight && (
                  <p className="text-xs text-slate-500">
                    Vendor cost: ฿
                    {(parseFloat(allocateWeight) * (selectedPO.cost_per_kg || 0)).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAllocateDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAllocate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedOrderId || !allocateWeight}
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
