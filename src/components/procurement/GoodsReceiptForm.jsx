import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PackageCheck,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  User,
  Package,
  Truck,
  Info,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goodsReceiptSchema } from '@/domains/core/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const conditionOptions = [
  {
    value: 'good',
    label: 'Good',
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    value: 'damaged',
    label: 'Damaged',
    icon: AlertTriangle,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
];

export default function GoodsReceiptForm({ purchaseOrder, onSubmit, onCancel }) {
  const { handleError, handleValidationError } = useErrorHandler();

  const form = useForm({
    resolver: zodResolver(goodsReceiptSchema.partial()),
    defaultValues: {
      received_by: '',
      notes: '',
      discrepancy_notes: '',
      quality_status: 'passed',
      items_received: '[]',
    },
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (purchaseOrder?.items) {
      try {
        const poItems = JSON.parse(purchaseOrder.items);
        const initialItems = poItems.map((item) => ({
          item_name: item.name,
          ordered_qty: item.quantity,
          received_qty: item.quantity,
          condition: 'good',
          unit_price: item.unit_price,
        }));
        setItems(initialItems);
      } catch {
        setItems([]);
      }
    }
  }, [purchaseOrder]);

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Calculations
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + (item.received_qty || 0) * (item.unit_price || 0), 0),
    [items]
  );

  const hasDiscrepancy = useMemo(
    () => items.some((item) => item.received_qty !== item.ordered_qty || item.condition !== 'good'),
    [items]
  );

  const receiptStats = useMemo(() => {
    const good = items.filter((i) => i.condition === 'good').length;
    const damaged = items.filter((i) => i.condition === 'damaged').length;
    const rejected = items.filter((i) => i.condition === 'rejected').length;
    const totalOrdered = items.reduce((sum, i) => sum + i.ordered_qty, 0);
    const totalReceived = items.reduce((sum, i) => sum + i.received_qty, 0);
    const fulfillmentRate = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
    return { good, damaged, rejected, totalOrdered, totalReceived, fulfillmentRate };
  }, [items]);

  const handleFormSubmit = async (formData) => {
    try {
      const receiptNumber = `GR-${Date.now().toString(36).toUpperCase()}`;
      const qualityStatus = items.every((i) => i.condition === 'good')
        ? 'passed'
        : items.every((i) => i.condition === 'rejected')
          ? 'rejected'
          : 'partial_reject';

      const finalData = {
        ...formData,
        receipt_number: receiptNumber,
        po_id: purchaseOrder.id,
        po_number: purchaseOrder.po_number,
        vendor_id: purchaseOrder.vendor_id,
        vendor_name: purchaseOrder.vendor_name,
        received_date: new Date().toISOString().split('T')[0],
        items_received: JSON.stringify(items),
        total_value: totalValue,
        quality_status: qualityStatus,
        discrepancy_notes: hasDiscrepancy ? formData.discrepancy_notes : '',
      };

      await onSubmit(finalData);
    } catch (error) {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Goods Receipt');
      } else {
        handleError(error, 'Failed to submit goods receipt', {
          component: 'GoodsReceiptForm',
          action: 'submit',
        });
      }
    }
  };

  if (!purchaseOrder) return null;

  return (
    <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Receive Goods</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {purchaseOrder.po_number || 'N/A'}
              </Badge>
              <span>•</span>
              <span>{purchaseOrder.vendor_name}</span>
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{items.length}</p>
              <p className="text-xs text-slate-500">Line Items</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-center">
              <p className="text-2xl font-bold text-emerald-600">{receiptStats.good}</p>
              <p className="text-xs text-emerald-600">Good</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-center">
              <p className="text-2xl font-bold text-amber-600">{receiptStats.damaged}</p>
              <p className="text-xs text-amber-600">Damaged</p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-center">
              <p className="text-2xl font-bold text-rose-600">{receiptStats.rejected}</p>
              <p className="text-xs text-rose-600">Rejected</p>
            </div>
          </div>

          {/* Fulfillment Progress */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">Fulfillment Rate</span>
              <span className="font-semibold">{receiptStats.fulfillmentRate.toFixed(1)}%</span>
            </div>
            <Progress
              value={receiptStats.fulfillmentRate}
              className={cn('h-2', receiptStats.fulfillmentRate < 100 && 'bg-amber-100')}
            />
            <p className="text-xs text-slate-500 mt-2">
              {receiptStats.totalReceived} of {receiptStats.totalOrdered} items received
            </p>
          </div>

          {/* Received By */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Received By <span className="text-rose-500">*</span>
            </Label>
            <Input {...form.register('received_by')} placeholder="Your name" className="h-11" />
            {form.formState.errors.received_by && (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {form.formState.errors.received_by.message}
              </p>
            )}
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Item
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 w-24">
                    Ordered
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 w-28">
                    Received
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 w-36">
                    Condition
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 w-20">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isMatch =
                    item.received_qty === item.ordered_qty && item.condition === 'good';
                  const conditionOption = conditionOptions.find((c) => c.value === item.condition);
                  const ConditionIcon = conditionOption?.icon || CheckCircle;

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        'border-t border-slate-100 dark:border-slate-700 transition-colors',
                        !isMatch && 'bg-amber-50/50 dark:bg-amber-950/20'
                      )}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.item_name}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono">
                        {item.ordered_qty}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          max={item.ordered_qty}
                          value={item.received_qty}
                          onChange={(e) =>
                            updateItem(idx, 'received_qty', parseInt(e.target.value) || 0)
                          }
                          className={cn(
                            'text-center h-9',
                            item.received_qty !== item.ordered_qty &&
                              'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                          )}
                        />
                      </td>
                      <td className="p-3">
                        <Select
                          value={item.condition}
                          onValueChange={(v) => updateItem(idx, 'condition', v)}
                        >
                          <SelectTrigger className={cn('text-sm h-9', conditionOption?.color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionOptions.map((opt) => {
                              const OptIcon = opt.icon;
                              return (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <OptIcon className={cn('w-4 h-4', opt.color.split(' ')[0])} />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        {isMatch ? (
                          <div className="flex justify-center">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Discrepancy Notes */}
          {hasDiscrepancy && (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Discrepancy Detected</span>
              </div>
              <Textarea
                {...form.register('discrepancy_notes')}
                placeholder="Please describe any discrepancies, damages, or issues found..."
                rows={3}
                className="bg-white dark:bg-slate-800"
              />
              {form.formState.errors.discrepancy_notes && (
                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {form.formState.errors.discrepancy_notes.message}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Notes
            </Label>
            <Textarea
              {...form.register('notes')}
              placeholder="Additional notes about this receipt..."
              rows={2}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">Total Value:</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                ฿{totalValue.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 min-w-[150px]"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4 mr-2" />
                    Confirm Receipt
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
