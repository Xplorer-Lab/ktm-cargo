import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck, DollarSign, Star, Clock, ArrowRight, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function VendorPortalDashboard({ vendor }) {
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['vendor-pos', vendor?.id, vendor?.name],
    queryFn: async () => {
      if (vendor?.id) {
        return db.purchaseOrders.filter({ vendor_id: vendor.id }, '-created_date');
      } else if (vendor?.name) {
        return db.purchaseOrders.filter({ vendor_name: vendor.name }, '-created_date');
      }
      return [];
    },
    enabled: !!(vendor?.id || vendor?.name),
  });

  const { data: vendorOrders = [] } = useQuery({
    queryKey: ['vendor-orders', vendor?.id],
    queryFn: async () => {
      if (vendor?.id) {
        return db.vendorOrders.filter({ vendor_id: vendor.id }, '-created_date');
      }
      return [];
    },
    enabled: !!vendor?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['vendor-payments', vendor?.id],
    queryFn: async () => {
      if (vendor?.id) {
        return db.vendorPayments.filter({ vendor_id: vendor.id }, '-created_date');
      }
      return [];
    },
    enabled: !!vendor?.id,
  });

  // Stats
  const activeOrders = purchaseOrders.filter(
    (po) => !['received', 'cancelled'].includes(po.status)
  );
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const totalEarnings = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  // Performance metrics
  const rating = vendor?.rating || 5;
  const onTimeRate = vendor?.on_time_rate || 100;

  // Monthly earnings trend
  const last3Months = Array.from({ length: 3 }, (_, i) => {
    const date = subMonths(new Date(), 2 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthPayments = payments.filter((p) => {
      if (!p.payment_date) return false;
      const pDate = new Date(p.payment_date);
      return isWithinInterval(pDate, { start, end }) && p.status === 'paid';
    });
    return {
      month: format(date, 'MMM'),
      amount: monthPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome, {vendor?.name || 'Vendor'}!</h2>
              <p className="text-indigo-100 mt-1">Manage your orders and track performance</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-indigo-200">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{onTimeRate}%</p>
                <p className="text-xs text-indigo-200">On-Time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
                <p className="text-xs text-slate-500">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ฿{pendingPayments.reduce((s, p) => s + (p.total_amount || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Pending Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">฿{totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{purchaseOrders.length}</p>
                <p className="text-xs text-slate-500">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Button variant="ghost" size="sm">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {purchaseOrders.slice(0, 5).length > 0 ? (
            <div className="space-y-3">
              {purchaseOrders.slice(0, 5).map((po) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{po.po_number}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {po.order_date && format(new Date(po.order_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">฿{po.total_amount?.toLocaleString()}</p>
                    <Badge
                      className={
                        po.status === 'received'
                          ? 'bg-emerald-100 text-emerald-700'
                          : po.status === 'approved'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }
                    >
                      {po.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No orders yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {last3Months.map((m, idx) => (
              <div key={idx} className="text-center p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">{m.month}</p>
                <p className="text-xl font-bold text-emerald-600">฿{m.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
