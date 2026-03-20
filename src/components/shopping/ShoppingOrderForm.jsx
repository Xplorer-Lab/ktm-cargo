import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shoppingOrderSchema } from '@/domains/core/schemas';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChevronsUpDown,
  Check,
  Truck,
  User,
  Phone,
  MapPin,
  Link2,
  FileText,
  DollarSign,
  Scale,
  Percent,
  CreditCard,
  Calculator,
  Info,
  Loader2,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import VendorCapacityAlert from '@/components/shared/VendorCapacityAlert';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { computeShoppingOrderTotals } from '@/domains/shipments/calculations';
import { getShoppingOrderAllocationWeight } from '@/lib/poAllocation';

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  { value: 'purchasing', label: 'Purchasing', color: 'bg-blue-100 text-blue-700' },
  { value: 'purchased', label: 'Purchased', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'received', label: 'Received', color: 'bg-purple-100 text-purple-700' },
  { value: 'shipping', label: 'Shipping', color: 'bg-amber-100 text-amber-700' },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-rose-100 text-rose-700' },
];

const paymentStatusOptions = [
  { value: 'unpaid', label: 'Unpaid', color: 'bg-rose-100 text-rose-700' },
  { value: 'deposit_paid', label: 'Deposit Paid', color: 'bg-amber-100 text-amber-700' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
];

import { DEFAULT_SHOPPING_PRICE_PER_KG } from '@/lib/defaults';

export default function ShoppingOrderForm({
  order,
  onSubmit,
  onCancel,
  customers = [],
  purchaseOrders = [],
}) {
  const [openCombobox, setOpenCombobox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: servicePricing = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => db.servicePricing.filter({ is_active: true }),
  });
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => auth.me(),
  });

  const shoppingPricePerKg = (() => {
    const fromPricing = servicePricing.find((p) => String(p.service_type).startsWith('shopping_'));
    if (fromPricing?.price_per_kg != null && fromPricing.price_per_kg > 0)
      return fromPricing.price_per_kg;
    return user?.business_settings?.default_shopping_price_per_kg ?? DEFAULT_SHOPPING_PRICE_PER_KG;
  })();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(shoppingOrderSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_id: '',
      product_links: '',
      product_details: '',
      estimated_product_cost: '',
      actual_product_cost: '',
      estimated_weight: '',
      actual_weight: '',
      commission_rate: 10,
      delivery_address: '',
      notes: '',
      status: 'pending',
      payment_status: 'unpaid',
      vendor_po_id: '',
      vendor_po_number: '',
      vendor_id: '',
      vendor_name: '',
      vendor_cost_per_kg: 0,
      vendor_cost: 0,
      ...order,
    },
  });

  const watchedValues = watch();
  const currentLinkedWeight =
    order?.vendor_po_id && order.vendor_po_id === watchedValues.vendor_po_id
      ? getShoppingOrderAllocationWeight(order)
      : 0;

  // Calculation Logic (central module for consistency)
  const calculated = useMemo(() => {
    const productCost =
      parseFloat(watchedValues.actual_product_cost || watchedValues.estimated_product_cost) || 0;
    const weight = parseFloat(watchedValues.actual_weight || watchedValues.estimated_weight) || 0;
    const commissionRate = parseFloat(watchedValues.commission_rate) || 0;
    const vendorCostPerKg =
      watchedValues.vendor_po_id && watchedValues.vendor_cost_per_kg
        ? parseFloat(watchedValues.vendor_cost_per_kg)
        : 0;

    const result = computeShoppingOrderTotals({
      productCost,
      weightKg: weight,
      pricePerKg: shoppingPricePerKg,
      vendorCostPerKg,
      commissionRatePercent: commissionRate,
    });

    return {
      productCost: result.productCost,
      commission: result.commission,
      shippingCost: result.shippingCost,
      total: result.total,
      vendorCost: result.vendorCost,
      profit: result.profit,
      margin: String(result.marginPercent),
    };
  }, [
    watchedValues.actual_product_cost,
    watchedValues.estimated_product_cost,
    watchedValues.actual_weight,
    watchedValues.estimated_weight,
    watchedValues.commission_rate,
    watchedValues.vendor_po_id,
    watchedValues.vendor_cost_per_kg,
    shoppingPricePerKg,
  ]);

  // Filter POs
  const availablePOs = useMemo(
    () =>
      purchaseOrders.filter(
        (po) =>
          ['approved', 'sent', 'partial_received', 'received'].includes(po.status) &&
          (po.remaining_weight_kg > 0 || !po.total_weight_kg || po.id === order?.vendor_po_id)
      ),
    [order?.vendor_po_id, purchaseOrders]
  );

  const handleCustomerSelect = (customerName) => {
    const customer = customers.find((c) => c.name === customerName);
    if (customer) {
      setValue('customer_name', customer.name);
      setValue('customer_phone', customer.phone || '');
      setValue('delivery_address', customer.address_yangon || '');
      setValue('customer_id', customer.id);
    } else {
      setValue('customer_name', customerName);
      setValue('customer_id', '');
    }
    setOpenCombobox(false);
  };

  const handlePOChange = (poId) => {
    if (!poId || poId === 'none') {
      setValue('vendor_po_id', '');
      setValue('vendor_po_number', '');
      setValue('vendor_id', '');
      setValue('vendor_name', '');
      setValue('vendor_cost_per_kg', 0);
      return;
    }

    const selectedPO = purchaseOrders.find((po) => po.id === poId);
    if (selectedPO) {
      setValue('vendor_po_id', selectedPO.id);
      setValue('vendor_po_number', selectedPO.po_number);
      setValue('vendor_id', selectedPO.vendor_id);
      setValue('vendor_name', selectedPO.vendor_name);
      setValue('vendor_cost_per_kg', selectedPO.cost_per_kg || 0);
    }
  };

  const onFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formattedData = {
        ...data,
        commission_amount: calculated.commission,
        shipping_cost: calculated.shippingCost,
        total_amount: calculated.total,
        vendor_cost: calculated.vendorCost,
      };
      await onSubmit(formattedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStatus = statusOptions.find((s) => s.value === watchedValues.status);
  const selectedPaymentStatus = paymentStatusOptions.find(
    (s) => s.value === watchedValues.payment_status
  );

  return (
    <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="border-b bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {order ? 'Edit Shopping Order' : 'New Shopping Order'}
            </CardTitle>
            <CardDescription>
              {order
                ? `Editing order for ${order.customer_name}`
                : 'Create a new shopping assistance order'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Customer Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className={cn(
                      'w-full justify-between h-11',
                      errors.customer_name && 'border-rose-500'
                    )}
                  >
                    {watchedValues.customer_name || 'Select customer...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={handleCustomerSelect}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                watchedValues.customer_name === customer.name
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              {customer.phone && (
                                <span className="text-xs text-slate-500">{customer.phone}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.customer_name && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {errors.customer_name.message}
                </p>
              )}
              <input type="hidden" {...register('customer_name')} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Phone Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                {...register('customer_phone')}
                placeholder="+66 or +95"
                className={cn('h-11', errors.customer_phone && 'border-rose-500')}
              />
              {errors.customer_phone && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {errors.customer_phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Delivery Address (Yangon)
            </Label>
            <Input
              {...register('delivery_address')}
              placeholder="Yangon delivery address"
              className="h-11"
            />
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-400" />
                Product Links
              </Label>
              <Textarea
                {...register('product_links')}
                placeholder="Paste product links here (one per line)..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Product Details <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                {...register('product_details')}
                placeholder="Size, color, quantity, specifications..."
                rows={3}
                className={cn(errors.product_details && 'border-rose-500')}
              />
              {errors.product_details && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {errors.product_details.message}
                </p>
              )}
            </div>
          </div>

          {/* Costs & Weights */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-slate-600" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Cost & Weight Estimates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  Estimated Product Cost (THB)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('estimated_product_cost')}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Actual Product Cost (THB)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('actual_product_cost')}
                  placeholder="0.00"
                  className="h-11 border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-400" />
                  Estimated Weight (kg)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  {...register('estimated_weight')}
                  placeholder="0.0"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-500" />
                  Actual Weight (kg)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  {...register('actual_weight')}
                  placeholder="0.0"
                  className="h-11 border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* PO Linkage */}
          {availablePOs.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <Label className="text-blue-800 dark:text-blue-200 font-medium">
                  Link to Vendor Purchase Order (Optional)
                </Label>
              </div>
              <Controller
                name="vendor_po_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={handlePOChange}>
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                      <SelectValue placeholder="Select vendor PO" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No PO Linked</SelectItem>
                      {availablePOs.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{po.po_number}</span>
                            <span>-</span>
                            <span>{po.vendor_name}</span>
                            {po.remaining_weight_kg && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                {po.remaining_weight_kg}kg left
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Vendor Capacity Alert - Real-time visualization */}
          {watchedValues.vendor_po_id &&
            (parseFloat(watchedValues.actual_weight) > 0 ||
              parseFloat(watchedValues.estimated_weight) > 0) && (
              <VendorCapacityAlert
                purchaseOrder={purchaseOrders.find((po) => po.id === watchedValues.vendor_po_id)}
                requestedWeight={
                  parseFloat(watchedValues.actual_weight || watchedValues.estimated_weight) || 0
                }
                currentLinkedWeight={currentLinkedWeight}
              />
            )}

          {/* Status & Commission */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <Badge className={cn('text-xs', opt.color)}>{opt.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-400" />
                Commission Rate (%)
              </Label>
              <Input
                type="number"
                {...register('commission_rate')}
                placeholder="10"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                Payment Status
              </Label>
              <Controller
                name="payment_status"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <Badge className={cn('text-xs', opt.color)}>{opt.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              {...register('notes')}
              placeholder="Internal notes about this order..."
              rows={2}
            />
          </div>

          {/* Calculations Review */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-5 rounded-2xl space-y-4">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />
              Cost Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-slate-500 text-xs mb-1">Product Cost</p>
                <p className="font-bold text-lg">฿{calculated.productCost.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-slate-500 text-xs mb-1">
                  Commission ({watchedValues.commission_rate}%)
                </p>
                <p className="font-bold text-lg text-emerald-600">
                  ฿{calculated.commission.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl">
                <p className="text-slate-500 text-xs mb-1">Shipping Estimate</p>
                <p className="font-bold text-lg">฿{calculated.shippingCost.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
                <p className="text-purple-100 text-xs mb-1">Total to Collect</p>
                <p className="font-bold text-xl">฿{calculated.total.toLocaleString()}</p>
              </div>
            </div>

            {calculated.profit > 0 && (
              <div className="pt-3 border-t border-purple-200 dark:border-purple-800 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">
                    Profit: ฿{calculated.profit.toLocaleString()}
                  </span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {calculated.margin}% margin
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : order ? (
                'Update Order'
              ) : (
                'Create Order'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
