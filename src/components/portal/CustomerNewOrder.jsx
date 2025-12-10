import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { shipmentSchema } from '@/lib/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Truck,
  Zap,
  ShoppingBag,
  MapPin,
  Scale,
  Shield,
  Box,
  CheckCircle,
  Loader2,
  Calculator,
  ArrowRight,
  ArrowLeft,
  Info,
  Sparkles,
  Clock,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

const SERVICE_TYPES = [
  {
    value: 'cargo_small',
    label: 'Cargo (1-5kg)',
    price: 120,
    icon: Package,
    delivery: '3-5 days',
    description: 'Small packages and documents',
    color: 'from-blue-500 to-blue-600',
  },
  {
    value: 'cargo_medium',
    label: 'Cargo (6-15kg)',
    price: 95,
    icon: Package,
    delivery: '3-5 days',
    description: 'Medium boxes and parcels',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    value: 'cargo_large',
    label: 'Cargo (16-30kg)',
    price: 70,
    icon: Package,
    delivery: '3-5 days',
    description: 'Large cargo shipments',
    color: 'from-purple-500 to-purple-600',
  },
  {
    value: 'express',
    label: 'Express Delivery',
    price: 150,
    icon: Zap,
    delivery: '1-2 days',
    description: 'Priority handling & fast delivery',
    color: 'from-amber-500 to-orange-500',
  },
  {
    value: 'standard',
    label: 'Standard',
    price: 95,
    icon: Truck,
    delivery: '3-5 days',
    description: 'Reliable standard shipping',
    color: 'from-emerald-500 to-emerald-600',
  },
];

const PACKAGING_OPTIONS = [
  { value: '0', label: 'No packaging needed', description: 'Customer provides packaging' },
  { value: '50', label: 'Basic (฿50)', description: 'Standard bubble wrap' },
  { value: '100', label: 'Standard (฿100)', description: 'Bubble wrap + box' },
  { value: '200', label: 'Premium (฿200)', description: 'Double protection + fragile care' },
];

const STEPS = [
  { id: 1, name: 'Service', icon: Package },
  { id: 2, name: 'Details', icon: Scale },
  { id: 3, name: 'Confirm', icon: CheckCircle },
];

export default function CustomerNewOrder({ customer, user, onOrderCreated }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    service_type: 'cargo_medium',
    weight_kg: '',
    items_description: '',
    pickup_address: customer?.address_bangkok || '',
    delivery_address: customer?.address_yangon || '',
    insurance_opted: false,
    packaging_fee: 0,
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const selectedService = SERVICE_TYPES.find((s) => s.value === form.service_type);

  // Calculations with memoization for performance
  const calculations = useMemo(() => {
    const weight = parseFloat(form.weight_kg) || 0;
    const shippingCost = (selectedService?.price || 0) * weight;
    const insuranceFee = form.insurance_opted ? shippingCost * 0.03 : 0;
    const packagingFee = form.packaging_fee || 0;
    const totalAmount = shippingCost + insuranceFee + packagingFee;
    const estimatedDelivery = addDays(new Date(), selectedService?.value === 'express' ? 2 : 5);

    return { weight, shippingCost, insuranceFee, packagingFee, totalAmount, estimatedDelivery };
  }, [form.weight_kg, form.insurance_opted, form.packaging_fee, selectedService]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const trackingNumber = 'TRK' + Date.now().toString(36).toUpperCase();

      const dataToValidate = {
        ...data,
        customer_id: customer?.id || '',
        customer_name: customer?.name || user?.full_name || 'Customer',
        customer_phone: customer?.phone || '',
        tracking_number: trackingNumber,
        price_per_kg: selectedService?.price,
        cost_basis: selectedService?.price * 0.7,
        total_amount: calculations.totalAmount,
        profit: calculations.totalAmount - selectedService?.price * 0.7 * calculations.weight,
        insurance_amount: calculations.insuranceFee,
        status: 'pending',
        payment_status: 'unpaid',
        estimated_delivery: calculations.estimatedDelivery.toISOString().split('T')[0],
      };

      const validatedData = shipmentSchema.parse(dataToValidate);
      const shipment = await db.shipments.create(validatedData);

      // Update customer stats if customer exists
      if (customer?.id) {
        try {
          await db.customers.update(customer.id, {
            total_shipments: (customer.total_shipments || 0) + 1,
            total_spent: (customer.total_spent || 0) + calculations.totalAmount,
          });
        } catch (e) {
          console.error('Failed to update customer stats', e);
        }
      }

      return shipment;
    },
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['customer-shipments'] });
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Order Created Successfully!</span>
          <span className="text-sm opacity-90">Tracking: {shipment.tracking_number}</span>
        </div>
      );
      onOrderCreated?.();
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create order');
    },
  });

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 2) {
      if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) {
        newErrors.weight_kg = 'Please enter a valid weight';
      }
      if (!form.items_description?.trim()) {
        newErrors.items_description = 'Please describe your items';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    createMutation.mutate(form);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Progress Stepper */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, idx) => {
            const StepIcon = s.icon;
            const isActive = step >= s.id;
            const isComplete = step > s.id;

            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  disabled={step < s.id}
                  className={cn(
                    "relative w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-300",
                    isComplete && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
                    isActive && !isComplete && "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30",
                    !isActive && "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                  {isActive && !isComplete && (
                    <span className="absolute -inset-1 rounded-full bg-blue-400/20 animate-ping" />
                  )}
                </button>
                <span
                  className={cn(
                    "hidden md:block text-sm font-medium transition-colors",
                    isActive ? "text-slate-900 dark:text-white" : "text-slate-400"
                  )}
                >
                  {s.name}
                </span>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-3 transition-colors duration-300",
                      isComplete ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Service Selection */}
      {step === 1 && (
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
          <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 rounded-xl text-white">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Select Service Type</CardTitle>
                <CardDescription>Choose the shipping service that fits your needs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 gap-3">
              {SERVICE_TYPES.map((service) => {
                const Icon = service.icon;
                const isSelected = form.service_type === service.value;

                return (
                  <button
                    key={service.value}
                    onClick={() => updateForm('service_type', service.value)}
                    className={cn(
                      "relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group overflow-hidden",
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {isSelected && (
                      <div className={cn("absolute top-0 right-0 w-20 h-20 opacity-10 bg-gradient-to-bl rounded-full -translate-y-1/2 translate-x-1/2", service.color)} />
                    )}
                    <div className="flex items-center gap-4 relative">
                      <div
                        className={cn(
                          "p-3 rounded-xl transition-all",
                          isSelected
                            ? `bg-gradient-to-br ${service.color} text-white shadow-lg`
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white">{service.label}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{service.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {service.delivery}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-2xl font-bold",
                          isSelected ? "text-blue-600" : "text-slate-700 dark:text-slate-300"
                        )}>
                          ฿{service.price}
                        </p>
                        <p className="text-xs text-slate-400">/kg</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-500 absolute top-0 right-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleNext}
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Shipment Details */}
      {step === 2 && (
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
          <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500 rounded-xl text-white">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Shipment Details</CardTitle>
                <CardDescription>Provide information about your package</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Scale className="w-4 h-4 text-slate-400" />
                  Weight (kg) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Enter weight"
                  value={form.weight_kg}
                  onChange={(e) => updateForm('weight_kg', e.target.value)}
                  className={cn(
                    "h-12 text-lg",
                    errors.weight_kg && "border-rose-500 focus-visible:ring-rose-500"
                  )}
                />
                {errors.weight_kg && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {errors.weight_kg}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Box className="w-4 h-4 text-slate-400" />
                  Packaging
                </Label>
                <Select
                  value={form.packaging_fee.toString()}
                  onValueChange={(v) => updateForm('packaging_fee', parseInt(v))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-slate-500">{opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Item Description <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe your items (e.g., Electronics, Clothing, Documents)"
                value={form.items_description}
                onChange={(e) => updateForm('items_description', e.target.value)}
                rows={2}
                className={cn(
                  errors.items_description && "border-rose-500 focus-visible:ring-rose-500"
                )}
              />
              {errors.items_description && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {errors.items_description}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Pickup Address (Bangkok)
                </Label>
                <Textarea
                  placeholder="Enter pickup address"
                  value={form.pickup_address}
                  onChange={(e) => updateForm('pickup_address', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  Delivery Address (Yangon)
                </Label>
                <Textarea
                  placeholder="Enter delivery address"
                  value={form.delivery_address}
                  onChange={(e) => updateForm('delivery_address', e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Insurance Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Shipment Insurance</p>
                  <p className="text-sm text-slate-500">3% of shipping cost • Full protection</p>
                </div>
              </div>
              <Switch
                checked={form.insurance_opted}
                onCheckedChange={(v) => updateForm('insurance_opted', v)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Special Instructions</Label>
              <Textarea
                placeholder="Any special handling instructions..."
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30"
              >
                Review Order
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
          <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Order Summary</CardTitle>
                <CardDescription>Review your order before submitting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Service Summary */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                {selectedService && (
                  <div className={cn("p-3 rounded-xl bg-gradient-to-br text-white", selectedService.color)}>
                    <selectedService.icon className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedService?.label}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>Estimated delivery: {format(calculations.estimatedDelivery, 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {selectedService?.delivery}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-slate-500">Weight</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{form.weight_kg} kg</p>
                </div>
                <div>
                  <p className="text-slate-500">Items</p>
                  <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{form.items_description}</p>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-slate-500" />
                <span className="font-semibold text-slate-900 dark:text-white">Price Breakdown</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Shipping ({calculations.weight} kg × ฿{selectedService?.price})
                  </span>
                  <span className="font-medium">฿{calculations.shippingCost.toLocaleString()}</span>
                </div>
                {form.insurance_opted && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      <Shield className="w-4 h-4 inline mr-1 text-blue-500" />
                      Insurance (3%)
                    </span>
                    <span className="font-medium">฿{calculations.insuranceFee.toLocaleString()}</span>
                  </div>
                )}
                {calculations.packagingFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      <Box className="w-4 h-4 inline mr-1 text-purple-500" />
                      Packaging
                    </span>
                    <span className="font-medium">฿{calculations.packagingFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 text-lg">
                  <span className="font-bold text-slate-900 dark:text-white">Total</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    ฿{calculations.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-200">Payment Options</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    PromptPay • Bank Transfer • Cash on Pickup
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 min-w-[160px]"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Place Order
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
