import { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bell,
  Package,
  Truck,
  ClipboardList,
  Users,
  Check,
  X,
  CreditCard,
  FileText,
  DollarSign,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const typeIcons = {
  shipment_created: PlusCircle,
  shipment_status: RefreshCw,
  payment_received: CreditCard,
  invoice_generated: FileText,
  low_stock: Package,
  delivery_feedback: Truck,
  task_assigned: ClipboardList,
  segment_alert: Users,
  vendor_payment: DollarSign,
  system: Bell,
};

const typeColors = {
  shipment_created: 'bg-emerald-100 text-emerald-600',
  shipment_status: 'bg-blue-100 text-blue-600',
  payment_received: 'bg-green-100 text-green-600',
  invoice_generated: 'bg-indigo-100 text-indigo-600',
  low_stock: 'bg-amber-100 text-amber-600',
  delivery_feedback: 'bg-cyan-100 text-cyan-600',
  task_assigned: 'bg-purple-100 text-purple-600',
  segment_alert: 'bg-rose-100 text-rose-600',
  vendor_payment: 'bg-orange-100 text-orange-600',
  system: 'bg-slate-100 text-slate-600',
};

const priorityColors = {
  critical: 'border-l-rose-500',
  high: 'border-l-amber-500',
  medium: 'border-l-blue-500',
  low: 'border-l-slate-300',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => db.notifications.filter({ status: 'unread' }, '-created_date', 20),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => db.notifications.update(id, { status: 'read' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => db.notifications.update(id, { status: 'dismissed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = async () => {
    try {
      for (const n of notifications) {
        await db.notifications.update(n.id, { status: 'read' });
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      handleError(error, 'Failed to mark all notifications as read', {
        component: 'NotificationBell',
        action: 'markAllRead',
      });
    }
  };

  const getLink = (notification) => {
    switch (notification.reference_type) {
      case 'inventory':
        return createPageUrl('Inventory');
      case 'shipment':
        return createPageUrl('Shipments');
      case 'task':
        return createPageUrl('Tasks');
      case 'customer':
        return createPageUrl('CustomerSegments');
      case 'invoice':
        return createPageUrl('Shipments');
      case 'payment':
        return createPageUrl('Shipments');
      case 'vendor':
        return createPageUrl('Vendors');
      default:
        return null;
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs"
              disabled={markReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const link = getLink(notification);

              return (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-l-4 ${priorityColors[notification.priority]} hover:bg-slate-50 transition-colors`}
                >
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-lg ${typeColors[notification.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">
                          {notification.created_date &&
                            format(new Date(notification.created_date), 'MMM d, h:mm a')}
                        </span>
                        <div className="flex gap-1">
                          {link && (
                            <Link
                              to={link}
                              onClick={async () => {
                                try {
                                  markReadMutation.mutate(notification.id);
                                  setOpen(false);
                                } catch (error) {
                                  handleError(error, 'Failed to mark notification as read', {
                                    component: 'NotificationBell',
                                    action: 'markRead',
                                  });
                                }
                              }}
                            >
                              <Button variant="ghost" size="sm" className="h-6 text-xs">
                                View
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => dismissMutation.mutate(notification.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No new notifications</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
