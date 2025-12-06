import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PackageCheck, X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goodsReceiptSchema } from '@/lib/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';

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
    }
  });

  // Local state for items array management (easier than field array for this complex logic)
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

  const totalValue = items.reduce(
    (sum, item) => sum + (item.received_qty || 0) * (item.unit_price || 0),
    0
  );

  const hasDiscrepancy = items.some(
    (item) => item.received_qty !== item.ordered_qty || item.condition !== 'good'
  );

  const handleFormSubmit = async (formData) => {
    try {
      const receiptNumber = `GR-${Date.now().toString(36).toUpperCase()}`;
      const qualityStatus = items.every((i) => i.condition === 'good')
        ? 'passed'
        : items.every((i) => i.condition === 'rejected')
          ? 'rejected'
          : 'partial_reject';

      // Manually construct the final payload
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
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            Receive Goods
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            PO: {purchaseOrder.po_number || 'N/A'} • {purchaseOrder.vendor_name}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Received By *</Label>
            <Input
              {...form.register('received_by')}
              placeholder="Your name"
            />
            {form.formState.errors.received_by && (
              <p className="text-xs text-rose-600 mt-1">{form.formState.errors.received_by.message}</p>
            )}
          </div>

          {/* Items Table - Managed via local state for UI responsiveness */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Item</th>
                  <th className="text-center p-3 text-sm font-medium w-24">Ordered</th>
                  <th className="text-center p-3 text-sm font-medium w-28">Received</th>
                  <th className="text-center p-3 text-sm font-medium w-32">Condition</th>
                  <th className="text-center p-3 text-sm font-medium w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isMatch =
                    item.received_qty === item.ordered_qty && item.condition === 'good';
                  return (
                    <tr key={idx} className="border-t">
                      <td className="p-3 font-medium">{item.item_name}</td>
                      <td className="p-3 text-center text-slate-500">{item.ordered_qty}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          max={item.ordered_qty}
                          value={item.received_qty}
                          onChange={(e) =>
                            updateItem(idx, 'received_qty', parseInt(e.target.value) || 0)
                          }
                          className="text-center"
                        />
                      </td>
                      <td className="p-3">
                        <Select
                          value={item.condition}
                          onValueChange={(v) => updateItem(idx, 'condition', v)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        {isMatch ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasDiscrepancy && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Discrepancy Detected</span>
              </div>
              <Textarea
                {...form.register('discrepancy_notes')}
                placeholder="Please describe any discrepancies..."
                rows={2}
                className="bg-white"
              />
              {form.formState.errors.discrepancy_notes && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.discrepancy_notes.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...form.register('notes')}
              placeholder="Additional notes about this receipt..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <span className="text-slate-500">Total Value:</span>
              <span className="ml-2 text-xl font-bold text-emerald-600">
                ฿{totalValue.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PackageCheck className="w-4 h-4 mr-2" />
                )}
                Confirm Receipt
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
