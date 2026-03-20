import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Package,
  TrendingDown,
  Zap,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * VendorCapacityAlert - Real-time visual display of vendor's available cargo capacity
 * Shows capacity status with animations, color coding, and clear visual feedback
 */
export default function VendorCapacityAlert({ purchaseOrder, requestedWeight = 0, className }) {
  const capacityData = useMemo(() => {
    if (!purchaseOrder || !purchaseOrder.total_weight_kg) {
      return null;
    }
    const total = purchaseOrder.total_weight_kg || 0;
    const allocated = purchaseOrder.allocated_weight_kg || 0;
    const remaining = purchaseOrder.remaining_weight_kg || total - allocated;
    const afterRequest = remaining - requestedWeight;
    const percentUsed = total > 0 ? (allocated / total) * 100 : 0;
    const percentAfterRequest = total > 0 ? ((allocated + requestedWeight) / total) * 100 : 0;

    // Status determination
    let status = 'available';
    let statusLabel = 'Available';
    let statusColor = 'emerald';

    if (requestedWeight > remaining) {
      status = 'over_capacity';
      statusLabel = 'Over Capacity';
      statusColor = 'rose';
    } else if (percentAfterRequest > 90) {
      status = 'nearly_full';
      statusLabel = 'Nearly Full';
      statusColor = 'amber';
    } else if (percentAfterRequest > 70) {
      status = 'filling_up';
      statusLabel = 'Filling Up';
      statusColor = 'yellow';
    }

    return {
      total,
      allocated,
      remaining,
      afterRequest,
      percentUsed,
      percentAfterRequest: Math.min(100, percentAfterRequest),
      status,
      statusLabel,
      statusColor,
      isOverCapacity: requestedWeight > remaining,
    };
  }, [purchaseOrder, requestedWeight]);

  if (!capacityData) {
    return null;
  }

  const StatusIcon =
    capacityData.status === 'over_capacity'
      ? XCircle
      : capacityData.status === 'nearly_full'
        ? AlertTriangle
        : CheckCircle;

  const colorClasses = {
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      textMuted: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
      progress: 'bg-emerald-500',
      icon: 'text-emerald-600',
      glow: 'shadow-emerald-500/20',
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-300',
      textMuted: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      progress: 'bg-yellow-500',
      icon: 'text-yellow-600',
      glow: 'shadow-yellow-500/20',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      textMuted: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      progress: 'bg-amber-500',
      icon: 'text-amber-600',
      glow: 'shadow-amber-500/20',
    },
    rose: {
      bg: 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40',
      border: 'border-rose-300 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300',
      textMuted: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
      progress: 'bg-rose-500',
      icon: 'text-rose-600',
      glow: 'shadow-rose-500/20',
    },
  };

  const colors = colorClasses[capacityData.statusColor];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-500 animate-in fade-in slide-in-from-top-2',
        colors.bg,
        colors.border,
        capacityData.isOverCapacity && 'animate-pulse',
        className
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-lg',
              colors.glow
            )}
          >
            <Gauge className={cn('w-5 h-5', colors.icon)} />
          </div>
          <div>
            <h4 className={cn('font-semibold', colors.text)}>Vendor Cargo Capacity</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {purchaseOrder.vendor_name}
              {purchaseOrder.po_number && (
                <span className="font-mono text-xs ml-1">({purchaseOrder.po_number})</span>
              )}
            </p>
          </div>
        </div>
        <Badge className={cn('text-sm font-semibold flex items-center gap-1.5', colors.badge)}>
          <StatusIcon className="w-4 h-4" />
          {capacityData.statusLabel}
        </Badge>
      </div>

      {/* Capacity Visualization */}
      <div className="relative space-y-3">
        {/* Main Progress Bar */}
        <div className="relative">
          <div className="h-6 bg-slate-200/70 dark:bg-slate-700/70 rounded-full overflow-hidden backdrop-blur-sm">
            {/* Already allocated (gray) */}
            <div
              className="absolute inset-y-0 left-0 bg-slate-400/50 dark:bg-slate-600/50 transition-all duration-700"
              style={{ width: `${capacityData.percentUsed}%` }}
            />
            {/* Current request (colored) */}
            <div
              className={cn(
                'absolute inset-y-0 transition-all duration-700',
                capacityData.isOverCapacity
                  ? 'bg-gradient-to-r from-rose-400 to-rose-500 animate-pulse'
                  : colors.progress
              )}
              style={{
                left: `${capacityData.percentUsed}%`,
                width: `${Math.min(100 - capacityData.percentUsed, (requestedWeight / capacityData.total) * 100)}%`,
              }}
            />
          </div>
          {/* Percentage Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-md">
              {capacityData.percentAfterRequest.toFixed(0)}% used
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
              <Package className="w-3 h-3" />
              Total Capacity
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {capacityData.total.toLocaleString()} kg
            </p>
          </div>

          <div className="p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
              <Scale className="w-3 h-3" />
              Your Request
            </div>
            <p
              className={cn(
                'text-lg font-bold',
                capacityData.isOverCapacity ? 'text-rose-600' : 'text-blue-600'
              )}
            >
              {requestedWeight.toLocaleString()} kg
            </p>
          </div>

          <div
            className={cn(
              'p-3 rounded-xl backdrop-blur-sm text-center',
              capacityData.isOverCapacity
                ? 'bg-rose-100/80 dark:bg-rose-900/40'
                : 'bg-white/60 dark:bg-slate-800/60'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center gap-1 text-xs mb-1',
                capacityData.isOverCapacity ? 'text-rose-600' : 'text-slate-500'
              )}
            >
              <TrendingDown className="w-3 h-3" />
              After Booking
            </div>
            <p
              className={cn(
                'text-lg font-bold',
                capacityData.afterRequest < 0
                  ? 'text-rose-600'
                  : capacityData.afterRequest < 10
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              )}
            >
              {capacityData.afterRequest.toLocaleString()} kg
            </p>
          </div>
        </div>

        {/* Warning/Info Message */}
        {capacityData.isOverCapacity ? (
          <div className="flex items-center gap-2 p-3 bg-rose-100 dark:bg-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 animate-pulse">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Insufficient Capacity!</p>
              <p className="text-sm text-rose-600 dark:text-rose-400">
                You need {(requestedWeight - capacityData.remaining).toFixed(1)} kg more than
                available. Please reduce weight or select a different vendor PO.
              </p>
            </div>
          </div>
        ) : capacityData.status === 'nearly_full' ? (
          <div className="flex items-center gap-2 p-3 bg-amber-100/80 dark:bg-amber-900/30 rounded-xl text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Almost full!</span> Only{' '}
              {capacityData.afterRequest.toFixed(1)} kg will remain after this booking.
            </p>
          </div>
        ) : requestedWeight > 0 ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-100/80 dark:bg-emerald-900/30 rounded-xl text-emerald-700 dark:text-emerald-300">
            <Zap className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Looking good!</span> Capacity available for your
              shipment.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
