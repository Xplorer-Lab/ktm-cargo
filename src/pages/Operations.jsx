import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { useUser } from '@/components/auth/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Users, FileText, TrendingUp, Clock, Truck, Plus } from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const ORDER_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  purchasing: 'bg-blue-100 text-blue-800',
  purchased: 'bg-blue-100 text-blue-800',
  received: 'bg-purple-100 text-purple-800',
  in_transit: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function Operations() {
  const { user } = useUser();

  const { data: orders = [] } = useQuery({
    queryKey: ['shopping-orders'],
    queryFn: () => db.shoppingOrders.list('-created_date'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: () => db.customerInvoices.list('-created_date'),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list(),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date'),
  });

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeOrders = orders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.status)
    ).length;

    const revenue = orders
      .filter((o) => new Date(o.created_date) >= monthStart)
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const pendingInvoices = invoices.filter(
      (inv) => !['paid', 'void'].includes(inv.status)
    ).length;

    const vendorCount = {};
    shipments.forEach((s) => {
      if (s.vendor_id) vendorCount[s.vendor_id] = (vendorCount[s.vendor_id] || 0) + 1;
    });
    const topVendorId = Object.entries(vendorCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topVendor = vendors.find((v) => v.id === topVendorId)?.name || '—';

    return { activeOrders, revenue, pendingInvoices, topVendor };
  }, [orders, invoices, vendors, shipments]);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold">Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              Good {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Here's what's happening with your business today.
            </p>
          </div>
          <Link to={createPageUrl('ShoppingOrders')}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Active Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.activeOrders}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Revenue This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-slate-900">
                  ฿{stats.revenue.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Pending Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.pendingInvoices}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Top 3PL Partner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-600" />
                <span className="text-lg font-bold text-slate-900 truncate">{stats.topVendor}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link to={createPageUrl('ShoppingOrders')}>
            <Button variant="outline">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Orders
            </Button>
          </Link>
          <Link to={createPageUrl('Customers')}>
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </Button>
          </Link>
          <Link to={createPageUrl('Vendors')}>
            <Button variant="outline">
              <Truck className="w-4 h-4 mr-2" />
              Logistics
            </Button>
          </Link>
          <Link to={createPageUrl('Invoices')}>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Invoices
            </Button>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Recent Orders</CardTitle>
            <Link to={createPageUrl('ShoppingOrders')}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No orders yet. Create your first one!</p>
                <Link to={createPageUrl('ShoppingOrders')}>
                  <Button className="mt-4" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Order
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {order.customer_name || 'Unknown Client'}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {order.order_number} · {String(order.product_details || 'No description').substring(0, 50)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        className={`text-xs ${ORDER_STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}
                      >
                        {(order.status || 'unknown').replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700">
                        ฿{(order.total_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
