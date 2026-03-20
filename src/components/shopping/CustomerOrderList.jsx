import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Link,
  AlertTriangle,
  DollarSign,
  Weight,
  ShoppingBag,
  Plus,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { calculateShoppingOrderProfit } from '@/components/shopping/ShoppingInvoiceService';

export default function CustomerOrderList({
  orders,
  isLoading,
  searchQuery,
  STATUS_CONFIG,
  PAYMENT_CONFIG,
  getLinkedPO,
  onViewDetails,
  onEdit,
  onDelete,
  onToggleVendorPayment,
  onCreateOrder,
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No orders found</h3>
          <p className="text-slate-500 mb-6">
            {searchQuery ? 'Try adjusting your search' : 'Create your first shopping order'}
          </p>
          <Button onClick={onCreateOrder} className="bg-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => {
        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
        const paymentConfig = PAYMENT_CONFIG[order.payment_status] || PAYMENT_CONFIG.unpaid;
        const StatusIcon = statusConfig.icon;
        const linkedPO = getLinkedPO(order);

        return (
          <Card key={order.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
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

              {/* Weight Allocation & Vendor Payment Status */}
              {linkedPO ? (
                <div className="p-2 bg-blue-50 rounded-lg mb-3 text-xs">
                  <div className="flex items-center gap-1 text-blue-700">
                    <Link className="w-3 h-3" />
                    <span>Linked to {linkedPO.po_number}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-blue-600">
                      Vendor: {linkedPO.vendor_name} • Cost: ฿
                      {order.vendor_cost?.toLocaleString() || 0}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-6 px-2 text-[10px] uppercase font-bold tracking-wider rounded border ${
                        order.vendor_payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                      onClick={(e) =>
                        onToggleVendorPayment(order, order.vendor_payment_status !== 'PAID', e)
                      }
                    >
                      {order.vendor_payment_status === 'PAID' ? 'VEND PAID' : 'NOT PAID'}
                    </Button>
                  </div>
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
                      <span className="text-emerald-700 font-medium">{profit.margin}%</span>
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
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewDetails(order)}
                >
                  <Eye className="w-3 h-3 mr-1" /> View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onEdit(order)}
                >
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600"
                  onClick={() => onDelete(order)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
