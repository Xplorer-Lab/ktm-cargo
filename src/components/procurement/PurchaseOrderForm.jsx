import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  FileText,
  X,
  Star,
  Zap,
  Package,
  Truck,
  CalendarDays,
  DollarSign,
  Scale,
  Calculator,
  Info,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseOrderSchema } from '@/lib/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function PurchaseOrderForm({ vendors = [], existingPO, onSubmit, onCancel }) {
  const { handleError, handleValidationError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vendor_id: existingPO?.vendor_id || '',
    vendor_name: existingPO?.vendor_name || '',
    order_date: existingPO?.order_date || new Date().toISOString().split('T')[0],
    expected_delivery: existingPO?.expected_delivery || '',
    notes: existingPO?.notes || '',
    tax_amount: existingPO?.tax_amount || 0,
    shipping_cost: existingPO?.shipping_cost || 0,
    total_weight_kg: existingPO?.total_weight_kg || 0,
    cost_per_kg: existingPO?.cost_per_kg || 0,
  });

  const [items, setItems] = useState(() => {
    if (existingPO?.items) {
      try {
        return JSON.parse(existingPO.items);
      } catch {
        return [];
      }
    }
    return [{ name: '', quantity: 1, unit_price: 0, total: 0 }];
  });

  // Get recommended vendors (cargo carriers sorted by score)
  const recommendedVendors = useMemo(() => {
    return vendors
      .filter((v) => v.status === 'active' && v.vendor_type === 'cargo_carrier')
      .map((v) => {
        let score = 0;
        if (v.is_preferred) score += 30;
        score += (v.on_time_rate || 100) * 0.4;
        score += (v.rating || 5) * 6;
        if (v.cost_per_kg > 0) score += Math.max(0, 30 - v.cost_per_kg * 0.3);
        return { ...v, score: Math.min(100, score).toFixed(0) };
      })
      .sort((a, b) => b.score - a.score);
  }, [vendors]);

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total =
        (parseFloat(updated[index].quantity) || 0) * (parseFloat(updated[index].unit_price) || 0);
    }
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calculations
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.total || 0), 0), [items]);
  const total = useMemo(() => (
    subtotal + (parseFloat(formData.tax_amount) || 0) + (parseFloat(formData.shipping_cost) || 0)
  ), [subtotal, formData.tax_amount, formData.shipping_cost]);

  const estimatedCargoCost = useMemo(() => (
    formData.total_weight_kg > 0 && formData.cost_per_kg > 0
      ? formData.total_weight_kg * formData.cost_per_kg
      : 0
  ), [formData.total_weight_kg, formData.cost_per_kg]);

  const handleVendorChange = (vendorId) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    const suggestedCostPerKg = vendor?.cost_per_kg || formData.cost_per_kg;
    setFormData({
      ...formData,
      vendor_id: vendorId,
      vendor_name: vendor?.name || '',
      cost_per_kg: suggestedCostPerKg,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.vendor_id || items.every((i) => !i.name)) {
        toast.error('Please select a vendor and add at least one item');
        setIsSubmitting(false);
        return;
      }

      const poNumber = existingPO?.po_number || `PO-${Date.now().toString(36).toUpperCase()}`;

      const data = {
        ...formData,
        po_number: poNumber,
        items: JSON.stringify(items),
        subtotal,
        total_amount: total,
        total_weight_kg: parseFloat(formData.total_weight_kg) || 0,
        cost_per_kg: parseFloat(formData.cost_per_kg) || 0,
        remaining_weight_kg: parseFloat(formData.total_weight_kg) || 0,
        allocated_weight_kg: existingPO?.allocated_weight_kg || 0,
        status: existingPO?.status || 'draft',
      };

      const validatedData = purchaseOrderSchema.partial().parse(data);
      await onSubmit(validatedData);
    } catch (error) {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Purchase Order');
      } else {
        handleError(error, 'Failed to submit purchase order', {
          component: 'PurchaseOrderForm',
          action: 'submit',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVendor = vendors.find((v) => v.id === formData.vendor_id);

  return (
    <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{existingPO ? 'Edit Purchase Order' : 'New Purchase Order'}</CardTitle>
            <CardDescription>
              {existingPO ? `Editing ${existingPO.po_number}` : 'Create a new vendor purchase order'}
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vendor Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                Vendor <span className="text-rose-500">*</span>
              </Label>
              <Select value={formData.vendor_id} onValueChange={handleVendorChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {recommendedVendors.length > 0 && (
                    <>
                      <div className="px-2 py-2 text-xs font-semibold text-slate-500 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Recommended Carriers
                      </div>
                      {recommendedVendors.slice(0, 3).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            {v.is_preferred && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            <span className="font-medium">{v.name}</span>
                            {v.cost_per_kg > 0 && (
                              <span className="text-xs text-slate-400">฿{v.cost_per_kg}/kg</span>
                            )}
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                              {v.score} pts
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <div className="px-2 py-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800">
                        All Vendors
                      </div>
                    </>
                  )}
                  {vendors
                    .filter((v) => !recommendedVendors.slice(0, 3).find((r) => r.id === v.id))
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          {v.is_preferred && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          <span>{v.name}</span>
                          {v.cost_per_kg > 0 && (
                            <span className="text-xs text-slate-400">฿{v.cost_per_kg}/kg</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedVendor?.is_preferred && (
                <Badge className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-xs">
                  <Star className="w-3 h-3 mr-1 fill-amber-500" /> Preferred Vendor
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Order Date
              </Label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Expected Delivery
              </Label>
              <Input
                type="date"
                value={formData.expected_delivery}
                onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                className="h-11"
              />
            </div>
          </div>

          {/* Cargo Weight & Cost per KG */}
          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Scale className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-blue-900 dark:text-blue-200 font-semibold">Cargo Weight & Pricing</Label>
                <p className="text-sm text-blue-700 dark:text-blue-400">Set weight and cost parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Cargo Weight (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.total_weight_kg}
                  onChange={(e) => setFormData({ ...formData, total_weight_kg: parseFloat(e.target.value) || 0 })}
                  placeholder="Total weight in kg"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost per kg (฿)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_per_kg}
                  onChange={(e) => setFormData({ ...formData, cost_per_kg: parseFloat(e.target.value) || 0 })}
                  placeholder="Vendor cost per kg"
                  className="h-11"
                />
              </div>
            </div>

            {estimatedCargoCost > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center">
                <span className="text-blue-700 dark:text-blue-300 font-medium">Estimated Cargo Cost:</span>
                <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  ฿{estimatedCargoCost.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                Order Items
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Item Description</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 w-24">Qty</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 w-32">Unit Price</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-600 dark:text-slate-300 w-32">Total</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          placeholder="Item name or description"
                          className="border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="text-center border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="text-center border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="p-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                        ฿{item.total.toLocaleString()}
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-medium">฿{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500">Tax:</span>
                <Input
                  type="number"
                  min="0"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
                  className="w-28 text-right h-9"
                />
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500">Shipping:</span>
                <Input
                  type="number"
                  min="0"
                  value={formData.shipping_cost}
                  onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })}
                  className="w-28 text-right h-9"
                />
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t border-slate-200 dark:border-slate-700">
                <span>Total:</span>
                <span className="text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ฿{total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Notes
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or instructions..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 min-w-[140px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {existingPO ? 'Update Order' : 'Create Order'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
