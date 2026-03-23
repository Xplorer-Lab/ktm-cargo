import { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { shipmentSchema } from '@/domains/core/schemas';
import { DEFAULT_SHOPPING_PRICE_PER_KG } from '@/lib/defaults';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { cn } from '@/lib/utils';

import { CARGO_STEPS, SHOPPING_STEPS, SERVICE_TYPES } from './pricingMaps';
import OrderTypeSelection from './customerNewOrder/OrderTypeSelection';
import StepCargoService from './customerNewOrder/StepCargoService';
import StepCargoDetails from './customerNewOrder/StepCargoDetails';
import StepCargoConfirmation from './customerNewOrder/StepCargoConfirmation';
import StepShoppingProduct from './customerNewOrder/StepShoppingProduct';
import StepShoppingShipping from './customerNewOrder/StepShoppingShipping';
import StepShoppingConfirmation from './customerNewOrder/StepShoppingConfirmation';

const DEFAULT_CARGO_FORM = (customer) => ({
  service_type: 'cargo_medium',
  weight_kg: '',
  items_description: '',
  pickup_address: customer?.address_bangkok || '',
  delivery_address: customer?.address_yangon || '',
  insurance_opted: false,
  packaging_fee: 0,
  notes: '',
});

const DEFAULT_SHOP_FORM = (customer) => ({
  product_links: '',
  product_details: '',
  estimated_product_cost: '',
  estimated_weight: '',
  delivery_address: customer?.address_yangon || '',
  notes: '',
});

export default function CustomerNewOrder({ customer, user, onOrderCreated }) {
  const queryClient = useQueryClient();

  const [orderType, setOrderType] = useState(null);
  const [step, setStep] = useState(1);

  const [cargoForm, setCargoForm] = useState(() => DEFAULT_CARGO_FORM(customer));
  const [cargoErrors, setCargoErrors] = useState({});

  const [shopForm, setShopForm] = useState(() => DEFAULT_SHOP_FORM(customer));
  const [shopErrors, setShopErrors] = useState({});

  // ---- Cargo calculations ----
  const selectedService = SERVICE_TYPES.find((s) => s.value === cargoForm.service_type);
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const cargoCalc = useMemo(() => {
    const weight = parseFloat(cargoForm.weight_kg) || 0;
    const shippingCost = (selectedService?.price || 0) * weight;
    const insuranceFee = cargoForm.insurance_opted ? shippingCost * 0.03 : 0;
    const packagingFee = cargoForm.packaging_fee || 0;
    const totalAmount = shippingCost + insuranceFee + packagingFee;
    const estimatedDelivery = addDays(new Date(), selectedService?.value === 'express' ? 2 : 5);
    return { weight, shippingCost, insuranceFee, packagingFee, totalAmount, estimatedDelivery };
  }, [cargoForm.weight_kg, cargoForm.insurance_opted, cargoForm.packaging_fee, cargoForm.service_type]);

  // ---- Shopping calculations ----
  const shopCalc = useMemo(() => {
    const productCost = parseFloat(shopForm.estimated_product_cost) || 0;
    const weight = parseFloat(shopForm.estimated_weight) || 0;
    const commissionRate = 10;
    const commission = productCost * (commissionRate / 100);
    const shippingCost = weight * DEFAULT_SHOPPING_PRICE_PER_KG;
    const total = productCost + commission + shippingCost;
    return { productCost, weight, commission, shippingCost, total, commissionRate };
  }, [shopForm.estimated_product_cost, shopForm.estimated_weight]);

  // ---- Cargo mutation ----
  const cargoMutation = useMutation({
    mutationFn: async (data) => {
      const trackingNumber = 'TRK' + Date.now().toString(36).toUpperCase();
      const selectedService = SERVICE_TYPES.find((s) => s.value === cargoForm.service_type);
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
      setOrderType(null);
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
        <OrderTypeSelection onSelect={setOrderType} />
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
                    isActive && !isComplete && 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30',
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
          {step === 1 && (
            <StepCargoService
              form={cargoForm}
              onUpdate={updateCargoForm}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 2 && (
            <StepCargoDetails
              form={cargoForm}
              errors={cargoErrors}
              onUpdate={updateCargoForm}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 3 && (
            <StepCargoConfirmation
              form={cargoForm}
              calc={cargoCalc}
              isPending={isPending}
              onSubmit={handleCargoSubmit}
              onBack={handleBack}
            />
          )}
        </>
      )}

      {/* ======================= SHOPPING WIZARD ======================= */}
      {orderType === 'shopping' && (
        <>
          {step === 1 && (
            <StepShoppingProduct
              form={shopForm}
              errors={shopErrors}
              onUpdate={updateShopForm}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 2 && (
            <StepShoppingShipping
              form={shopForm}
              errors={shopErrors}
              onUpdate={updateShopForm}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 3 && (
            <StepShoppingConfirmation
              form={shopForm}
              calc={shopCalc}
              isPending={isPending}
              onSubmit={handleShopSubmit}
              onBack={handleBack}
            />
          )}
        </>
      )}
    </div>
  );
}
