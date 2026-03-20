import { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { shipmentSchema } from '@/domains/core/schemas';
import { SERVICE_TYPE_DEFAULTS, DEFAULT_SHOPPING_PRICE_PER_KG } from '@/lib/defaults';
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
  Link2,
  FileText,
  DollarSign,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

// Derive cargo service types from centralised defaults
const ICON_MAP = {
  cargo_small: Package,
  cargo_medium: Package,
  cargo_large: Package,
  express: Zap,
  standard: Truck,
};

const COLOR_MAP = {
  cargo_small: 'from-blue-500 to-blue-600',
  cargo_medium: 'from-indigo-500 to-indigo-600',
  cargo_large: 'from-purple-500 to-purple-600',
  express: 'from-amber-500 to-orange-500',
  standard: 'from-emerald-500 to-emerald-600',
};

const DELIVERY_MAP = {
  cargo_small: '3-5 days',
  cargo_medium: '3-5 days',
  cargo_large: '3-5 days',
  express: '1-2 days',
  standard: '3-5 days',
};

const DESC_MAP = {
  cargo_small: 'Small packages and documents',
  cargo_medium: 'Medium boxes and parcels',
  cargo_large: 'Large cargo shipments',
  express: 'Priority handling & fast delivery',
  standard: 'Reliable standard shipping',
};

const SERVICE_TYPES = SERVICE_TYPE_DEFAULTS.filter((s) => !s.value.startsWith('shopping_')).map(
  (s) => ({
    value: s.value,
    label: s.label,
    price: s.price,
    icon: ICON_MAP[s.value] || Package,
    delivery: DELIVERY_MAP[s.value] || '3-5 days',
    description: DESC_MAP[s.value] || s.label,
    color: COLOR_MAP[s.value] || 'from-slate-500 to-slate-600',
  })
);

const PACKAGING_OPTIONS = [
  { value: '0', label: 'No packaging needed', description: 'Customer provides packaging' },
  { value: '50', label: 'Basic (฿50)', description: 'Standard bubble wrap' },
  { value: '100', label: 'Standard (฿100)', description: 'Bubble wrap + box' },
  { value: '200', label: 'Premium (฿200)', description: 'Double protection + fragile care' },
];

const CARGO_STEPS = [
  { id: 1, name: 'Service', icon: Package },
  { id: 2, name: 'Details', icon: Scale },
  { id: 3, name: 'Confirm', icon: CheckCircle },
];

const SHOPPING_STEPS = [
  { id: 1, name: 'Product', icon: ShoppingBag },
  { id: 2, name: 'Shipping', icon: Truck },
  { id: 3, name: 'Confirm', icon: CheckCircle },
];

export default function CustomerNewOrder({ customer, user, onOrderCreated }) {
  const queryClient = useQueryClient();

  // Order type: null = choosing, 'cargo' or 'shopping'
  const [orderType, setOrderType] = useState(null);
  const [step, setStep] = useState(1);

  // ---- Cargo form state ----
  const [cargoForm, setCargoForm] = useState({
    service_type: 'cargo_medium',
    weight_kg: '',
    items_description: '',
    pickup_address: customer?.address_bangkok || '',
    delivery_address: customer?.address_yangon || '',
    insurance_opted: false,
    packaging_fee: 0,
    notes: '',
  });
  const [cargoErrors, setCargoErrors] = useState({});

  // ---- Shopping form state ----
  const [shopForm, setShopForm] = useState({
    product_links: '',
    product_details: '',
    estimated_product_cost: '',
    estimated_weight: '',
    delivery_address: customer?.address_yangon || '',
    notes: '',
  });
  const [shopErrors, setShopErrors] = useState({});

  // ---- Cargo calculations ----
  const selectedService = SERVICE_TYPES.find((s) => s.value === cargoForm.service_type);
  const cargoCalc = useMemo(() => {
    const weight = parseFloat(cargoForm.weight_kg) || 0;
    const shippingCost = (selectedService?.price || 0) * weight;
    const insuranceFee = cargoForm.insurance_opted ? shippingCost * 0.03 : 0;
    const packagingFee = cargoForm.packaging_fee || 0;
    const totalAmount = shippingCost + insuranceFee + packagingFee;
    const estimatedDelivery = addDays(new Date(), selectedService?.value === 'express' ? 2 : 5);
    return { weight, shippingCost, insuranceFee, packagingFee, totalAmount, estimatedDelivery };
  }, [cargoForm.weight_kg, cargoForm.insurance_opted, cargoForm.packaging_fee, selectedService]);

  // ---- Shopping calculations ----
  const shopCalc = useMemo(() => {
    const productCost = parseFloat(shopForm.estimated_product_cost) || 0;
    const weight = parseFloat(shopForm.estimated_weight) || 0;
    const commissionRate = 10; // 10% for portal orders
    const commission = productCost * (commissionRate / 100);
    const shippingCost = weight * DEFAULT_SHOPPING_PRICE_PER_KG;
    const total = productCost + commission + shippingCost;
    return { productCost, weight, commission, shippingCost, total, commissionRate };
  }, [shopForm.estimated_product_cost, shopForm.estimated_weight]);

  // ---- Cargo mutation ----
  const cargoMutation = useMutation({
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
        total_amount: cargoCalc.totalAmount,
        profit: cargoCalc.totalAmount - selectedService?.price * 0.7 * cargoCalc.weight,
        insurance_amount: cargoCalc.insuranceFee,
        status: 'pending',
        payment_status: 'unpaid',
        estimated_delivery: cargoCalc.estimatedDelivery.toISOString().split('T')[0],
      };
      const validatedData = shipmentSchema.parse(dataToValidate);
      const shipment = await db.shipments.create(validatedData);

      if (customer?.id) {
        try {
          await db.customers.update(customer.id, {
            total_shipments: (customer.total_shipments || 0) + 1,
            total_spent: (customer.total_spent || 0) + cargoCalc.totalAmount,
          });
        } catch (_e) {
          console.error('Failed to update customer stats', _e);
        }
      }
      return shipment;
    },
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['customer-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-shipments-track'] });
      queryClient.invalidateQueries({ queryKey: ['customer-order-history'] });
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Shipment Created!</span>
          <span className="text-sm opacity-90">Tracking: {shipment.tracking_number}</span>
        </div>
      );
      onOrderCreated?.();
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create shipment');
    },
  });

  // ---- Shopping mutation ----
  const shopMutation = useMutation({
    mutationFn: async () => {
      const shoppingOrder = {
        customer_id: customer?.id || '',
        customer_name: customer?.name || user?.full_name || 'Customer',
        customer_phone: customer?.phone || '',
        product_links: shopForm.product_links,
        product_details: shopForm.product_details,
        estimated_product_cost: parseFloat(shopForm.estimated_product_cost) || 0,
        estimated_weight: parseFloat(shopForm.estimated_weight) || 0,
        commission_rate: shopCalc.commissionRate,
        commission_amount: shopCalc.commission,
        shipping_cost: shopCalc.shippingCost,
        total_amount: shopCalc.total,
        delivery_address: shopForm.delivery_address,
        notes: shopForm.notes,
        status: 'pending',
        payment_status: 'unpaid',
      };
      return db.shoppingOrders.create(shoppingOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-shipments-track'] });
      queryClient.invalidateQueries({ queryKey: ['customer-shopping-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-order-history'] });
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Shopping Order Created!</span>
          <span className="text-sm opacity-90">We'll start purchasing your items soon.</span>
        </div>
      );
      onOrderCreated?.();
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create shopping order');
    },
  });

  // ---- Validation ----
  const validateCargoStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 2) {
      if (!cargoForm.weight_kg || parseFloat(cargoForm.weight_kg) <= 0) {
        newErrors.weight_kg = 'Please enter a valid weight';
      }
      if (!cargoForm.items_description?.trim()) {
        newErrors.items_description = 'Please describe your items';
      }
    }
    setCargoErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateShopStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!shopForm.product_details?.trim()) {
        newErrors.product_details = 'Please describe the product(s) you want';
      }
      if (!shopForm.estimated_product_cost || parseFloat(shopForm.estimated_product_cost) <= 0) {
        newErrors.estimated_product_cost = 'Please enter an estimated cost';
      }
    }
    if (currentStep === 2) {
      if (!shopForm.estimated_weight || parseFloat(shopForm.estimated_weight) <= 0) {
        newErrors.estimated_weight = 'Please enter an estimated weight';
      }
    }
    setShopErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (orderType === 'cargo') {
      if (validateCargoStep(step)) setStep((prev) => Math.min(prev + 1, 3));
    } else {
      if (validateShopStep(step)) setStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setOrderType(null); // go back to type selection
    } else {
      setStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleCargoSubmit = () => {
    if (!validateCargoStep(2)) {
      setStep(2);
      return;
    }
    cargoMutation.mutate(cargoForm);
  };

  const handleShopSubmit = () => {
    if (!validateShopStep(1) || !validateShopStep(2)) {
      setStep(1);
      return;
    }
    shopMutation.mutate();
  };

  const updateCargoForm = (field, value) => {
    setCargoForm((prev) => ({ ...prev, [field]: value }));
    if (cargoErrors[field]) setCargoErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const updateShopForm = (field, value) => {
    setShopForm((prev) => ({ ...prev, [field]: value }));
    if (shopErrors[field]) setShopErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const steps = orderType === 'shopping' ? SHOPPING_STEPS : CARGO_STEPS;
  const isPending = cargoMutation.isPending || shopMutation.isPending;

  // ---- ORDER TYPE SELECTION ----
  if (!orderType) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 rounded-xl text-white">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create New Order</CardTitle>
                <CardDescription>Choose what you would like to do</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setOrderType('cargo');
                  setStep(1);
                }}
                className="group p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-left transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white w-fit mb-4 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  Cargo Shipment
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Send a package from Bangkok to Yangon. Choose service type, enter weight, and
                  track delivery.
                </p>
                <Badge variant="secondary" className="mt-3">
                  <Clock className="w-3 h-3 mr-1" /> 1-5 days delivery
                </Badge>
              </button>

              <button
                onClick={() => {
                  setOrderType('shopping');
                  setStep(1);
                }}
                className="group p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              >
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white w-fit mb-4 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-shadow">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  Shopping Order
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  We buy products for you in Thailand and ship them to Yangon. Just tell us what you
                  want!
                </p>
                <Badge variant="secondary" className="mt-3">
                  <ShoppingBag className="w-3 h-3 mr-1" /> Buy + Ship
                </Badge>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Progress Stepper */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {steps.map((s, idx) => {
            const StepIcon = s.icon;
            const isActive = step >= s.id;
            const isComplete = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  disabled={step < s.id}
                  className={cn(
                    'relative w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-300',
                    isComplete && 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
                    isActive &&
                      !isComplete &&
                      'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30',
                    !isActive && 'bg-slate-100 dark:bg-slate-800 text-slate-400'
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
                    'hidden md:block text-sm font-medium transition-colors',
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                  )}
                >
                  {s.name}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-3 transition-colors duration-300',
                      isComplete ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================= CARGO WIZARD ======================= */}
      {orderType === 'cargo' && (
        <>
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
                    <CardDescription>
                      Choose the shipping service that fits your needs
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 gap-3">
                  {SERVICE_TYPES.map((service) => {
                    const Icon = service.icon;
                    const isSelected = cargoForm.service_type === service.value;
                    return (
                      <button
                        key={service.value}
                        onClick={() => updateCargoForm('service_type', service.value)}
                        className={cn(
                          'relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group overflow-hidden',
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        )}
                      >
                        {isSelected && (
                          <div
                            className={cn(
                              'absolute top-0 right-0 w-20 h-20 opacity-10 bg-gradient-to-bl rounded-full -translate-y-1/2 translate-x-1/2',
                              service.color
                            )}
                          />
                        )}
                        <div className="flex items-center gap-4 relative">
                          <div
                            className={cn(
                              'p-3 rounded-xl transition-all',
                              isSelected
                                ? `bg-gradient-to-br ${service.color} text-white shadow-lg`
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                            )}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {service.label}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {service.description}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {service.delivery}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p
                              className={cn(
                                'text-2xl font-bold',
                                isSelected ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'
                              )}
                            >
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
                      value={cargoForm.weight_kg}
                      onChange={(e) => updateCargoForm('weight_kg', e.target.value)}
                      className={cn(
                        'h-12 text-lg',
                        cargoErrors.weight_kg && 'border-rose-500 focus-visible:ring-rose-500'
                      )}
                    />
                    {cargoErrors.weight_kg && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {cargoErrors.weight_kg}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Box className="w-4 h-4 text-slate-400" />
                      Packaging
                    </Label>
                    <Select
                      value={cargoForm.packaging_fee.toString()}
                      onValueChange={(v) => updateCargoForm('packaging_fee', parseInt(v))}
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
                    value={cargoForm.items_description}
                    onChange={(e) => updateCargoForm('items_description', e.target.value)}
                    rows={2}
                    className={cn(
                      cargoErrors.items_description && 'border-rose-500 focus-visible:ring-rose-500'
                    )}
                  />
                  {cargoErrors.items_description && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {cargoErrors.items_description}
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
                      value={cargoForm.pickup_address}
                      onChange={(e) => updateCargoForm('pickup_address', e.target.value)}
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
                      value={cargoForm.delivery_address}
                      onChange={(e) => updateCargoForm('delivery_address', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        Shipment Insurance
                      </p>
                      <p className="text-sm text-slate-500">3% of shipping cost</p>
                    </div>
                  </div>
                  <Switch
                    checked={cargoForm.insurance_opted}
                    onCheckedChange={(v) => updateCargoForm('insurance_opted', v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Special Instructions</Label>
                  <Textarea
                    placeholder="Any special handling instructions..."
                    value={cargoForm.notes}
                    onChange={(e) => updateCargoForm('notes', e.target.value)}
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

          {/* Step 3: Cargo Confirmation */}
          {step === 3 && (
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
              <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                    <CardDescription>Review your shipment before submitting</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    {selectedService && (
                      <div
                        className={cn(
                          'p-3 rounded-xl bg-gradient-to-br text-white',
                          selectedService.color
                        )}
                      >
                        <selectedService.icon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {selectedService?.label}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          Est. delivery: {format(cargoCalc.estimatedDelivery, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {selectedService?.delivery}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-slate-500">Weight</p>
                      <p className="font-semibold">{cargoForm.weight_kg} kg</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Items</p>
                      <p className="font-semibold line-clamp-1">{cargoForm.items_description}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-slate-500" />
                    <span className="font-semibold">Price Breakdown</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Shipping ({cargoCalc.weight} kg x ฿{selectedService?.price})
                      </span>
                      <span className="font-medium">
                        ฿{cargoCalc.shippingCost.toLocaleString()}
                      </span>
                    </div>
                    {cargoForm.insurance_opted && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          <Shield className="w-4 h-4 inline mr-1 text-blue-500" />
                          Insurance (3%)
                        </span>
                        <span className="font-medium">
                          ฿{cargoCalc.insuranceFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {cargoCalc.packagingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          <Box className="w-4 h-4 inline mr-1 text-purple-500" />
                          Packaging
                        </span>
                        <span className="font-medium">
                          ฿{cargoCalc.packagingFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 text-lg">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        ฿{cargoCalc.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack} size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleCargoSubmit}
                    disabled={isPending}
                    size="lg"
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 min-w-[160px]"
                  >
                    {isPending ? (
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
        </>
      )}

      {/* ======================= SHOPPING WIZARD ======================= */}
      {orderType === 'shopping' && (
        <>
          {/* Step 1: Product Info */}
          {step === 1 && (
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">What would you like us to buy?</CardTitle>
                    <CardDescription>Tell us about the products you want</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-400" />
                    Product Links (optional)
                  </Label>
                  <Textarea
                    placeholder="Paste product links here (one per line)..."
                    value={shopForm.product_links}
                    onChange={(e) => updateShopForm('product_links', e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-slate-400">Shopee, Lazada, or any Thai store links</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Product Details <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Size, color, quantity, specifications..."
                    value={shopForm.product_details}
                    onChange={(e) => updateShopForm('product_details', e.target.value)}
                    rows={3}
                    className={cn(
                      shopErrors.product_details && 'border-rose-500 focus-visible:ring-rose-500'
                    )}
                  />
                  {shopErrors.product_details && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {shopErrors.product_details}
                    </p>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      Estimated Product Cost (THB) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 1500"
                      value={shopForm.estimated_product_cost}
                      onChange={(e) => updateShopForm('estimated_product_cost', e.target.value)}
                      className={cn(
                        'h-12',
                        shopErrors.estimated_product_cost &&
                          'border-rose-500 focus-visible:ring-rose-500'
                      )}
                    />
                    {shopErrors.estimated_product_cost && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {shopErrors.estimated_product_cost}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-slate-400" />
                      Estimated Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="e.g. 2.5"
                      value={shopForm.estimated_weight}
                      onChange={(e) => updateShopForm('estimated_weight', e.target.value)}
                      className="h-12"
                    />
                    <p className="text-xs text-slate-400">
                      Approximate is fine — we'll weigh it later
                    </p>
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack} size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Shipping & Address */}
          {step === 2 && (
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
              <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500 rounded-xl text-white">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Shipping Details</CardTitle>
                    <CardDescription>Where should we deliver?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-slate-400" />
                    Estimated Weight (kg) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 2.5"
                    value={shopForm.estimated_weight}
                    onChange={(e) => updateShopForm('estimated_weight', e.target.value)}
                    className={cn(
                      'h-12',
                      shopErrors.estimated_weight && 'border-rose-500 focus-visible:ring-rose-500'
                    )}
                  />
                  {shopErrors.estimated_weight && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {shopErrors.estimated_weight}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    Delivery Address (Yangon)
                  </Label>
                  <Textarea
                    placeholder="Enter your Yangon delivery address"
                    value={shopForm.delivery_address}
                    onChange={(e) => updateShopForm('delivery_address', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Special Instructions</Label>
                  <Textarea
                    placeholder="Anything we should know..."
                    value={shopForm.notes}
                    onChange={(e) => updateShopForm('notes', e.target.value)}
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
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30"
                  >
                    Review Order
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Shopping Confirmation */}
          {step === 3 && (
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
              <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                    <CardDescription>Review your shopping order</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Product Summary */}
                <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">Shopping Order</p>
                  </div>
                  <div className="text-sm space-y-2">
                    <div>
                      <p className="text-slate-500 text-xs">Product Details</p>
                      <p className="font-medium line-clamp-3">{shopForm.product_details}</p>
                    </div>
                    {shopForm.product_links && (
                      <div>
                        <p className="text-slate-500 text-xs">Product Links</p>
                        <p className="font-medium line-clamp-2 text-blue-600 break-all">
                          {shopForm.product_links}
                        </p>
                      </div>
                    )}
                    {shopForm.delivery_address && (
                      <div>
                        <p className="text-slate-500 text-xs">Delivery To</p>
                        <p className="font-medium">{shopForm.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-slate-500" />
                    <span className="font-semibold">Estimated Cost Breakdown</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Product Cost</span>
                      <span className="font-medium">฿{shopCalc.productCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        <Percent className="w-4 h-4 inline mr-1 text-emerald-500" />
                        Service Fee ({shopCalc.commissionRate}%)
                      </span>
                      <span className="font-medium">฿{shopCalc.commission.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        <Truck className="w-4 h-4 inline mr-1 text-blue-500" />
                        Shipping ({shopCalc.weight} kg x ฿{DEFAULT_SHOPPING_PRICE_PER_KG})
                      </span>
                      <span className="font-medium">฿{shopCalc.shippingCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 text-lg">
                      <span className="font-bold">Estimated Total</span>
                      <span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ฿{shopCalc.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Final amount may vary based on actual product cost and weight.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack} size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleShopSubmit}
                    disabled={isPending}
                    size="lg"
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 min-w-[160px]"
                  >
                    {isPending ? (
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
        </>
      )}
    </div>
  );
}
