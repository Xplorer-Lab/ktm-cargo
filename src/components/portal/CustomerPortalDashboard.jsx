import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  picked_up: { label: 'Picked Up', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  in_transit: { label: 'In Transit', color: 'bg-amber-100 text-amber-700', icon: Truck },
  customs: { label: 'Customs', color: 'bg-purple-100 text-purple-700', icon: AlertTriangle },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export default function CustomerPortalDashboard({ customer, user, onNavigate }) {
  const { data: shipments = [] } = useQuery({
    queryKey: ['customer-shipments', customer?.id, user?.email],
    queryFn: async () => {
      if (customer?.id) {
        return db.shipments.filter({ customer_id: customer.id }, '-created_date', 50);
      } else if (customer?.name) {
        return db.shipments.filter({ customer_name: customer.name }, '-created_date', 50);
      }
      return [];
    },
    enabled: !!(customer?.id || customer?.name),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['customer-notifications', customer?.email, user?.email],
    queryFn: async () => {
      const email = customer?.email || user?.email;
      if (email) {
        return db.notifications.filter(
          { recipient_email: email, status: 'unread' },
          '-created_date',
          10
        );
      }
      return [];
    },
    enabled: !!(customer?.email || user?.email),
  });

  const activeShipments = shipments.filter((s) => !['delivered', 'cancelled'].includes(s.status));
  const recentDelivered = shipments.filter((s) => s.status === 'delivered').slice(0, 3);
  const totalSpent = shipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalShipments = shipments.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome back, {customer?.name || user?.full_name || 'Customer'}!
              </h2>
              <p className="text-blue-100 mt-1">Track your shipments and manage your orders</p>
            </div>
            <div className="flex gap-3">
              <Button
                className="bg-white text-blue-600 hover:bg-blue-50"
                onClick={() => onNavigate?.('new-order')}
              >
                <Package className="w-4 h-4 mr-2" /> New Order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Notifications ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start justify-between p-3 bg-amber-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notif.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {notif.created_date && format(new Date(notif.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeShipments.length}</p>
                <p className="text-xs text-slate-500">Active Shipments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {shipments.filter((s) => s.status === 'delivered').length}
                </p>
                <p className="text-xs text-slate-500">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalShipments}</p>
                <p className="text-xs text-slate-500">Total Orders</p>
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
                <p className="text-2xl font-bold">฿{totalSpent.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Shipments */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Active Shipments</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('history')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {activeShipments.length > 0 ? (
            <div className="space-y-3">
              {activeShipments.slice(0, 5).map((shipment) => {
                const status = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${status.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {shipment.tracking_number || `SHP-${shipment.id?.slice(-6)}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {shipment.items_description || 'Package'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={status.color}>{status.label}</Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {shipment.estimated_delivery &&
                          format(new Date(shipment.estimated_delivery), 'MMM d')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No active shipments</p>
              <Button variant="outline" className="mt-3" onClick={() => onNavigate?.('new-order')}>
                Create New Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      {recentDelivered.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDelivered.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium">
                        {shipment.tracking_number || `SHP-${shipment.id?.slice(-6)}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Delivered{' '}
                        {shipment.actual_delivery &&
                          format(new Date(shipment.actual_delivery), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">฿{shipment.total_amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
