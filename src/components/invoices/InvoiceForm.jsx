import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Package,
  ShoppingBag,
  Check,
  ChevronsUpDown,
  Calculator,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { generateInvoiceNumber, calculateDueDate } from './InvoiceService';

const SERVICE_TYPES = [
  { value: 'cargo_small', label: 'Cargo (1-5kg)', price: 120 },
  { value: 'cargo_medium', label: 'Cargo (6-15kg)', price: 95 },
  { value: 'cargo_large', label: 'Cargo (16-30kg)', price: 70 },
  { value: 'shopping_small', label: 'Shopping + Small Items', price: 110 },
  { value: 'shopping_fashion', label: 'Shopping + Fashion/Electronics', price: 115 },
  { value: 'express', label: 'Express (1-2 days)', price: 150 },
  { value: 'standard', label: 'Standard (3-5 days)', price: 95 },
];

const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Due Immediately', days: 0 },
  { value: 'net_7', label: 'Net 7 Days', days: 7 },
  { value: 'net_15', label: 'Net 15 Days', days: 15 },
  { value: 'net_30', label: 'Net 30 Days', days: 30 },
];

export default function InvoiceForm({
  invoice,
  onSubmit,
  onCancel,
  customers = [],
  shipments = [],
  shoppingOrders = [],
}) {
  const [openCustomerSelect, setOpenCustomerSelect] = useState(false);
  const [openSourceSelect, setOpenSourceSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      invoice_number: invoice?.invoice_number || generateInvoiceNumber(),
      invoice_type: invoice?.invoice_type || 'shipment',
      customer_id: invoice?.customer_id || '',
      customer_name: invoice?.customer_name || '',
      customer_email: invoice?.customer_email || '',
      customer_phone: invoice?.customer_phone || '',
      customer_address: invoice?.customer_address || '',
      shipment_id: invoice?.shipment_id || '',
      tracking_number: invoice?.tracking_number || '',
      order_id: invoice?.order_id || '',
      order_number: invoice?.order_number || '',
      invoice_date: invoice?.invoice_date || format(new Date(), 'yyyy-MM-dd'),
      payment_terms: invoice?.payment_terms || 'net_7',
      due_date: invoice?.due_date || calculateDueDate(new Date(), 'net_7'),
      service_type: invoice?.service_type || '',
      weight_kg: invoice?.weight_kg || 0,
      price_per_kg: invoice?.price_per_kg || 0,
      shipping_amount: invoice?.shipping_amount || 0,
      insurance_amount: invoice?.insurance_amount || 0,
      packaging_fee: invoice?.packaging_fee || 0,
      product_cost: invoice?.product_cost || 0,
      commission_amount: invoice?.commission_amount || 0,
      discount_amount: invoice?.discount_amount || 0,
      tax_rate: invoice?.tax_rate || 0,
      notes: invoice?.notes || '',
      ...invoice,
    },
  });

  const watchedValues = watch();

  // Calculate totals
  const calculated = useMemo(() => {
    const shipping = parseFloat(watchedValues.shipping_amount) || 0;
    const insurance = parseFloat(watchedValues.insurance_amount) || 0;
    const packaging = parseFloat(watchedValues.packaging_fee) || 0;
    const product = parseFloat(watchedValues.product_cost) || 0;
    const commission = parseFloat(watchedValues.commission_amount) || 0;
    const discount = parseFloat(watchedValues.discount_amount) || 0;
    const taxRate = parseFloat(watchedValues.tax_rate) || 0;

    const subtotal = shipping + insurance + packaging + product + commission;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + taxAmount - discount;

    return { subtotal, taxAmount, total };
  }, [
    watchedValues.shipping_amount,
    watchedValues.insurance_amount,
    watchedValues.packaging_fee,
    watchedValues.product_cost,
    watchedValues.commission_amount,
    watchedValues.discount_amount,
    watchedValues.tax_rate,
  ]);

  // Update due date when payment terms change
  useEffect(() => {
    const terms = PAYMENT_TERMS.find((t) => t.value === watchedValues.payment_terms);
    if (terms && watchedValues.invoice_date) {
      const dueDate = format(addDays(new Date(watchedValues.invoice_date), terms.days), 'yyyy-MM-dd');
      setValue('due_date', dueDate);
    }
  }, [watchedValues.payment_terms, watchedValues.invoice_date, setValue]);

  // Auto-calculate shipping when weight and price change
  useEffect(() => {
    const weight = parseFloat(watchedValues.weight_kg) || 0;
    const pricePerKg = parseFloat(watchedValues.price_per_kg) || 0;
    if (weight > 0 && pricePerKg > 0) {
      setValue('shipping_amount', weight * pricePerKg);
    }
  }, [watchedValues.weight_kg, watchedValues.price_per_kg, setValue]);

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setValue('customer_id', customer.id);
      setValue('customer_name', customer.name);
      setValue('customer_email', customer.email || '');
      setValue('customer_phone', customer.phone || '');
      setValue('customer_address', customer.address_yangon || customer.address_bangkok || '');
    }
    setOpenCustomerSelect(false);
  };

  const handleSourceSelect = (sourceId) => {
    if (watchedValues.invoice_type === 'shipment') {
      const shipment = shipments.find((s) => s.id === sourceId);
      if (shipment) {
        setValue('shipment_id', shipment.id);
        setValue('tracking_number', shipment.tracking_number || '');
        setValue('customer_name', shipment.customer_name);
        setValue('customer_phone', shipment.customer_phone || '');
        setValue('service_type', shipment.service_type || '');
        setValue('weight_kg', shipment.weight_kg || 0);
        setValue('price_per_kg', shipment.price_per_kg || 0);
        setValue('shipping_amount', shipment.total_amount || 0);
        setValue('insurance_amount', shipment.insurance_amount || 0);
        setValue('packaging_fee', shipment.packaging_fee || 0);
        setValue('notes', `Shipment: ${shipment.tracking_number}\nItems: ${shipment.items_description || ''}`);
      }
    } else {
      const order = shoppingOrders.find((o) => o.id === sourceId);
      if (order) {
        setValue('order_id', order.id);
        setValue('order_number', order.order_number || '');
        setValue('customer_name', order.customer_name);
        setValue('product_cost', order.actual_product_cost || order.estimated_product_cost || 0);
        setValue('commission_amount', order.commission_amount || 0);
        setValue('shipping_amount', order.shipping_cost || 0);
        setValue('weight_kg', order.actual_weight || order.estimated_weight || 0);
        setValue('notes', `Shopping Order: ${order.order_number}\nProducts: ${order.product_details || ''}`);
      }
    }
    setOpenSourceSelect(false);
  };

  const onFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        subtotal: calculated.subtotal,
        tax_amount: calculated.taxAmount,
        total_amount: calculated.total,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available sources based on invoice type
  const availableSources = useMemo(() => {
    if (watchedValues.invoice_type === 'shipment') {
      return shipments.filter((s) => s.status === 'delivered' || s.status === 'in_transit');
    }
    return shoppingOrders.filter((o) => o.status === 'delivered' || o.status === 'shipped');
  }, [watchedValues.invoice_type, shipments, shoppingOrders]);

  return (
    <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="border-b bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{invoice ? 'Edit Invoice' : 'Create Invoice'}</CardTitle>
            <CardDescription>
              {invoice ? `Editing ${invoice.invoice_number}` : 'Create a new customer invoice'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Invoice Type & Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                {...register('invoice_number')}
                readOnly
                className="bg-slate-50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Type</Label>
              <Controller
                name="invoice_type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shipment">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Shipment Invoice
                        </div>
                      </SelectItem>
                      <SelectItem value="shopping_order">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4" />
                          Shopping Order Invoice
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Link to Source (Shipment or Order) */}
          {availableSources.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
              <Label className="text-blue-800 dark:text-blue-200">
                Link to {watchedValues.invoice_type === 'shipment' ? 'Shipment' : 'Shopping Order'} (Optional)
              </Label>
              <Popover open={openSourceSelect} onOpenChange={setOpenSourceSelect}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-white">
                    {watchedValues.tracking_number || watchedValues.order_number || 'Select source...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                      <CommandEmpty>No items found.</CommandEmpty>
                      <CommandGroup>
                        {availableSources.map((source) => (
                          <CommandItem
                            key={source.id}
                            value={source.id}
                            onSelect={() => handleSourceSelect(source.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                (watchedValues.shipment_id === source.id || watchedValues.order_id === source.id)
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-mono">
                                {source.tracking_number || source.order_number}
                              </span>
                              <span className="text-xs text-slate-500">
                                {source.customer_name} - ฿{(source.total_amount || 0).toLocaleString()}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Customer <span className="text-rose-500">*</span>
              </Label>
              <Popover open={openCustomerSelect} onOpenChange={setOpenCustomerSelect}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-11">
                    {watchedValues.customer_name || 'Select customer...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={() => handleCustomerSelect(customer.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                watchedValues.customer_id === customer.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              <span className="text-xs text-slate-500">{customer.phone}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Email
              </Label>
              <Input {...register('customer_email')} type="email" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Phone
              </Label>
              <Input {...register('customer_phone')} />
            </div>
          </div>

          {/* Dates & Payment Terms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Invoice Date
              </Label>
              <Input type="date" {...register('invoice_date')} />
            </div>

            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Controller
                name="payment_terms"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Line Items
            </Label>

            {/* Weight-based shipping */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" {...register('weight_kg')} />
              </div>
              <div className="space-y-2">
                <Label>Price per kg (฿)</Label>
                <Input type="number" {...register('price_per_kg')} />
              </div>
              <div className="space-y-2">
                <Label>Shipping Amount (฿)</Label>
                <Input type="number" {...register('shipping_amount')} />
              </div>
            </div>

            {/* Other charges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Insurance (฿)</Label>
                <Input type="number" {...register('insurance_amount')} />
              </div>
              <div className="space-y-2">
                <Label>Packaging (฿)</Label>
                <Input type="number" {...register('packaging_fee')} />
              </div>
              <div className="space-y-2">
                <Label>Product Cost (฿)</Label>
                <Input type="number" {...register('product_cost')} />
              </div>
              <div className="space-y-2">
                <Label>Commission (฿)</Label>
                <Input type="number" {...register('commission_amount')} />
              </div>
            </div>

            {/* Discount & Tax */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount (฿)</Label>
                <Input type="number" {...register('discount_amount')} />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input type="number" step="0.1" {...register('tax_rate')} />
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-slate-600" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">Invoice Total</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>฿{calculated.subtotal.toLocaleString()}</span>
              </div>
              {calculated.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax ({watchedValues.tax_rate}%)</span>
                  <span>฿{calculated.taxAmount.toLocaleString()}</span>
                </div>
              )}
              {parseFloat(watchedValues.discount_amount) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span>-฿{parseFloat(watchedValues.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-bold text-lg">
                <span>Total</span>
                <span className="text-blue-600">฿{calculated.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...register('notes')}
              placeholder="Additional notes for the invoice..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : invoice ? (
                'Update Invoice'
              ) : (
                'Create Draft Invoice'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
