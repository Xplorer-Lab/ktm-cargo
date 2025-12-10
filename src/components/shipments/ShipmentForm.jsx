import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shipmentSchema } from '@/lib/schemas';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Package,
  Truck,
  Check,
  ChevronsUpDown,
  AlertCircle,
  User,
  Phone,
  MapPin,
  CalendarDays,
  Shield,
  DollarSign,
  TrendingUp,
  Info,
  Loader2,
  Zap,
  Scale,
  Box,
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import VendorCapacityAlert from '@/components/shared/VendorCapacityAlert';

const serviceTypes = [
  { value: 'cargo_small', label: 'Cargo (1-5kg)', costBasis: 90, price: 120, icon: Package },
  { value: 'cargo_medium', label: 'Cargo (6-15kg)', costBasis: 75, price: 95, icon: Package },
  { value: 'cargo_large', label: 'Cargo (16-30kg)', costBasis: 55, price: 70, icon: Package },
  { value: 'shopping_small', label: 'Shopping + Small Items', costBasis: 80, price: 110, icon: Package },
  { value: 'shopping_fashion', label: 'Shopping + Fashion/Electronics', costBasis: 85, price: 115, icon: Package },
  { value: 'shopping_bulk', label: 'Shopping + Bulk Order', costBasis: 70, price: 90, icon: Package },
  { value: 'express', label: 'Express (1-2 days)', costBasis: 100, price: 150, icon: Zap },
  { value: 'standard', label: 'Standard (3-5 days)', costBasis: 75, price: 95, icon: Truck },
];

export default function ShipmentForm({
  shipment,
  onSubmit,
  onCancel,
  purchaseOrders = [],
  vendors = [],
  customers = [],
}) {
  const [openCombobox, setOpenCombobox] = useState(false);
  const [poWeightStatus, setPoWeightStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      service_type: 'cargo_medium',
      weight_kg: '',
      items_description: '',
      pickup_address: '',
      delivery_address: '',
      estimated_delivery: '',
      insurance_opted: false,
      packaging_fee: 0,
      notes: '',
      vendor_po_id: '',
      vendor_po_number: '',
      vendor_id: '',
      vendor_name: '',
      vendor_cost_per_kg: 0,
      customer_id: '',
      ...shipment,
    },
  });

  const watchedValues = watch();

  // Filter POs that are approved/received and have remaining weight
  const availablePOs = useMemo(() => (
    purchaseOrders.filter(
      (po) =>
        ['approved', 'sent', 'partial_received', 'received'].includes(po.status) &&
        (po.remaining_weight_kg > 0 || !po.total_weight_kg)
    )
  ), [purchaseOrders]);

  // Calculation Logic
  const calculated = useMemo(() => {
    const service = serviceTypes.find((s) => s.value === watchedValues.service_type);
    const weight = parseFloat(watchedValues.weight_kg) || 0;
    const packaging = parseFloat(watchedValues.packaging_fee) || 0;

    if (service && weight > 0) {
      const vendorCostPerKg = parseFloat(watchedValues.vendor_cost_per_kg) || service.costBasis;
      const vendorCost = vendorCostPerKg * weight;
      const price = service.price * weight;
      const insurance = watchedValues.insurance_opted ? price * 0.03 : 0;
      const total = price + insurance + packaging;
      const profit = total - vendorCost - insurance;
      const margin = total > 0 ? ((profit / total) * 100).toFixed(1) : 0;

      return {
        cost: vendorCost,
        price,
        profit,
        total,
        insurance,
        vendorCost,
        vendorCostPerKg,
        margin,
      };
    }

    return {
      cost: 0,
      price: 0,
      profit: 0,
      total: 0,
      insurance: 0,
      vendorCost: 0,
      margin: 0,
    };
  }, [
    watchedValues.service_type,
    watchedValues.weight_kg,
    watchedValues.insurance_opted,
    watchedValues.packaging_fee,
    watchedValues.vendor_cost_per_kg,
  ]);

  // Update PO weight status
  useEffect(() => {
    const weight = parseFloat(watchedValues.weight_kg) || 0;

    if (watchedValues.vendor_po_id && weight > 0) {
      const po = purchaseOrders.find((p) => p.id === watchedValues.vendor_po_id);
      if (po && po.total_weight_kg) {
        const remaining = po.remaining_weight_kg || 0;
        const isOverLimit = weight > remaining;
        const percentUsed = Math.min(
          100,
          (((po.allocated_weight_kg || 0) + weight) / po.total_weight_kg) * 100
        );

        setPoWeightStatus({
          remaining,
          isOverLimit,
          percentUsed,
          total: po.total_weight_kg,
        });
      } else {
        setPoWeightStatus(null);
      }
    } else {
      setPoWeightStatus(null);
    }
  }, [watchedValues.vendor_po_id, watchedValues.weight_kg, purchaseOrders]);

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

  const handleCustomerSelect = (customerName) => {
    const customer = customers.find((c) => c.name === customerName);
    if (customer) {
      setValue('customer_name', customer.name);
      setValue('customer_phone', customer.phone || '');
      setValue('delivery_address', customer.address_yangon || customer.address || '');
      setValue('customer_id', customer.id);
    } else {
      setValue('customer_name', customerName);
      setValue('customer_id', '');
    }
    setOpenCombobox(false);
  };

  const onFormSubmit = async (data) => {
    if (poWeightStatus?.isOverLimit) {
      toast.error('Weight exceeds available PO capacity!');
      return;
    }

    setIsSubmitting(true);
    const service = serviceTypes.find((s) => s.value === data.service_type);

    const enhancedData = {
      ...data,
      cost_basis: data.vendor_cost_per_kg || service?.costBasis,
      price_per_kg: service?.price,
      vendor_total_cost: calculated.vendorCost || 0,
      total_amount: calculated.total,
      profit: calculated.profit,
      insurance_amount: calculated.insurance || 0,
      tracking_number: data.tracking_number || shipment?.tracking_number || `BKK${Date.now().toString(36).toUpperCase()}`,
      origin: 'Bangkok',
      destination: 'Yangon',
    };

    try {
      await onSubmit(enhancedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = serviceTypes.find((s) => s.value === watchedValues.service_type);
  const ServiceIcon = selectedService?.icon || Package;

  return (
    <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="border-b bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
            <ServiceIcon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{shipment ? 'Edit Shipment' : 'New Shipment'}</CardTitle>
            <CardDescription>
              {shipment ? `Editing ${shipment.tracking_number}` : 'Create a new cargo shipment'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Customer Selection */}
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
                    className={cn("w-full justify-between h-11", errors.customer_name && "border-rose-500")}
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
                                watchedValues.customer_name === customer.name ? 'opacity-100' : 'opacity-0'
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
                className={cn("h-11", errors.customer_phone && "border-rose-500")}
              />
              {errors.customer_phone && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {errors.customer_phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Vendor PO Linkage */}
          {availablePOs.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <Label className="text-blue-800 dark:text-blue-200 font-medium">Link to Vendor Purchase Order</Label>
              </div>
              <Controller
                name="vendor_po_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={handlePOChange}>
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                      <SelectValue placeholder="Select vendor PO (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No PO Linked (use default pricing)</SelectItem>
                      {availablePOs.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{po.po_number}</span>
                            <span className="text-slate-500">-</span>
                            <span>{po.vendor_name}</span>
                            {po.cost_per_kg && (
                              <Badge variant="secondary" className="text-xs">฿{po.cost_per_kg}/kg</Badge>
                            )}
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

              {/* Vendor Cost Info */}
              {watchedValues.vendor_po_id && (
                <div className="flex items-center gap-2 text-sm animate-in fade-in duration-300">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    <Package className="w-3 h-3 mr-1" />
                    {watchedValues.vendor_name}
                  </Badge>
                  <span className="text-blue-600 font-medium">Cost: ฿{watchedValues.vendor_cost_per_kg}/kg</span>
                </div>
              )}
            </div>
          )}

          {/* Vendor Capacity Alert - Real-time visualization */}
          {watchedValues.vendor_po_id && parseFloat(watchedValues.weight_kg) > 0 && (
            <VendorCapacityAlert
              purchaseOrder={purchaseOrders.find(po => po.id === watchedValues.vendor_po_id)}
              requestedWeight={parseFloat(watchedValues.weight_kg) || 0}
            />
          )}

          {/* Service Type & Weight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                Service Type <span className="text-rose-500">*</span>
              </Label>
              <Controller
                name="service_type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <SelectTrigger className={cn("h-11", errors.service_type && "border-rose-500")}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((s) => {
                        const Icon = s.icon;
                        return (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-slate-500" />
                              <span>{s.label}</span>
                              <Badge variant="secondary" className="text-xs">฿{s.price}/kg</Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.service_type && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {errors.service_type.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-slate-400" />
                Weight (kg) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                {...register('weight_kg')}
                placeholder="Enter weight"
                className={cn(
                  "h-11",
                  poWeightStatus?.isOverLimit && 'border-rose-500 focus-visible:ring-rose-500',
                  errors.weight_kg && "border-rose-500"
                )}
              />
              {errors.weight_kg && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {errors.weight_kg.message}
                </p>
              )}
            </div>
          </div>

          {/* Items Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Box className="w-4 h-4 text-slate-400" />
              Items Description <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              {...register('items_description')}
              placeholder="Describe the items being shipped..."
              rows={2}
              className={cn(errors.items_description && "border-rose-500")}
            />
            {errors.items_description && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.items_description.message}
              </p>
            )}
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                Pickup Address (Bangkok)
              </Label>
              <Input
                {...register('pickup_address')}
                placeholder="Bangkok address"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                Delivery Address (Yangon)
              </Label>
              <Input
                {...register('delivery_address')}
                placeholder="Yangon address"
                className="h-11"
              />
            </div>
          </div>

          {/* Date, Packaging, Insurance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Estimated Date
              </Label>
              <Input
                type="date"
                {...register('estimated_delivery')}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Box className="w-4 h-4 text-slate-400" />
                Packaging Fee (THB)
              </Label>
              <Input
                type="number"
                min="0"
                {...register('packaging_fee')}
                placeholder="0"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                Insurance (3%)
              </Label>
              <div className="flex items-center gap-3 h-11 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <Controller
                  control={control}
                  name="insurance_opted"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {watchedValues.insurance_opted
                    ? `฿${calculated.insurance?.toFixed(0) || 0}`
                    : 'Not included'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...register('notes')}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Pricing Summary */}
          {watchedValues.weight_kg > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-slate-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Price Calculation</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Vendor Cost</p>
                  <p className="font-bold text-rose-600 text-lg">
                    ฿{calculated.vendorCost?.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {watchedValues.vendor_po_id
                      ? `PO: ฿${watchedValues.vendor_cost_per_kg}/kg`
                      : `Default: ฿${calculated.vendorCostPerKg}/kg`}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Customer Price</p>
                  <p className="font-bold text-lg">฿{calculated.price?.toLocaleString()}</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Insurance</p>
                  <p className="font-bold text-lg">฿{(calculated.insurance || 0).toLocaleString()}</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-700 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Packaging</p>
                  <p className="font-bold text-lg">
                    ฿{parseFloat(watchedValues.packaging_fee || 0).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                  <p className="text-blue-100 text-xs mb-1">Total</p>
                  <p className="font-bold text-xl">
                    ฿{calculated.total?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">
                      Profit: ฿{calculated.profit?.toLocaleString()}
                    </span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {calculated.margin}% margin
                  </Badge>
                </div>
                {watchedValues.vendor_po_id && (
                  <Badge className="bg-blue-100 text-blue-700">
                    Linked to {watchedValues.vendor_po_number}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
              disabled={poWeightStatus?.isOverLimit || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                shipment ? 'Update Shipment' : 'Create Shipment'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
