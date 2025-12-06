import React, { useState } from 'react';
import { db } from '@/api/db';
import { shipmentSchema } from '@/lib/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

const SERVICE_TYPES = [
  { value: 'cargo_small', label: 'Cargo (1-5kg)', price: 120, icon: Package, delivery: '3-5 days' },
  {
    value: 'cargo_medium',
    label: 'Cargo (6-15kg)',
    price: 95,
    icon: Package,
    delivery: '3-5 days',
  },
  {
    value: 'cargo_large',
    label: 'Cargo (16-30kg)',
    price: 70,
    icon: Package,
    delivery: '3-5 days',
  },
  { value: 'express', label: 'Express Delivery', price: 150, icon: Zap, delivery: '1-2 days' },
  { value: 'standard', label: 'Standard', price: 95, icon: Truck, delivery: '3-5 days' },
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

  const selectedService = SERVICE_TYPES.find((s) => s.value === form.service_type);
  const weight = parseFloat(form.weight_kg) || 0;
  const shippingCost = (selectedService?.price || 0) * weight;
  const insuranceFee = form.insurance_opted ? shippingCost * 0.03 : 0;
  const packagingFee = form.packaging_fee || 0;
  const totalAmount = shippingCost + insuranceFee + packagingFee;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const trackingNumber = 'TRK' + Date.now().toString(36).toUpperCase();
      const estimatedDelivery = addDays(new Date(), selectedService?.value === 'express' ? 2 : 5);

      const dataToValidate = {
        ...data,
        customer_id: customer?.id || '',
        customer_name: customer?.name || user?.full_name || 'Customer',
        customer_phone: customer?.phone || '',
        tracking_number: trackingNumber,
        price_per_kg: selectedService?.price,
        cost_basis: selectedService?.price * 0.7,
        total_amount: totalAmount,
        profit: totalAmount - selectedService?.price * 0.7 * weight,
        insurance_amount: insuranceFee,
        status: 'pending',
        payment_status: 'unpaid',
        estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
      };

      const validatedData = shipmentSchema.parse(dataToValidate);

      const shipment = await db.shipments.create(validatedData);

      // Update customer stats if customer exists
      if (customer?.id) {
        try {
          await db.customers.update(customer.id, {
            total_shipments: (customer.total_shipments || 0) + 1,
            total_spent: (customer.total_spent || 0) + totalAmount,
          });
        } catch (e) {
          console.error('Failed to update customer stats', e);
        }
      }

      return shipment;
    },
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['customer-shipments'] });
      toast.success(`Order created! Tracking: ${shipment.tracking_number}`);
      onOrderCreated?.();
    },
    onError: () => {
      toast.error('Failed to create order');
    },
  });

  const handleSubmit = () => {
    if (!form.weight_kg || !form.items_description) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate(form);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
            >
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            <span
              className={`hidden md:block text-sm ${step >= s ? 'text-blue-600 font-medium' : 'text-slate-400'}`}
            >
              {s === 1 ? 'Service' : s === 2 ? 'Details' : 'Confirm'}
            </span>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Service Selection */}
      {step === 1 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Select Service Type</CardTitle>
            <CardDescription>Choose the shipping service that fits your needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SERVICE_TYPES.map((service) => {
                const Icon = service.icon;
                const isSelected = form.service_type === service.value;
                return (
                  <button
                    key={service.value}
                    onClick={() => updateForm('service_type', service.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-200'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{service.label}</p>
                        <p className="text-sm text-slate-500">{service.delivery}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">฿{service.price}</p>
                        <p className="text-xs text-slate-400">/kg</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Shipment Details */}
      {step === 2 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
            <CardDescription>Provide information about your package</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-400" />
                  Weight (kg) *
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Enter weight"
                  value={form.weight_kg}
                  onChange={(e) => updateForm('weight_kg', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-slate-400" />
                  Packaging
                </Label>
                <Select
                  value={form.packaging_fee.toString()}
                  onValueChange={(v) => updateForm('packaging_fee', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No packaging needed</SelectItem>
                    <SelectItem value="50">Basic (฿50)</SelectItem>
                    <SelectItem value="100">Standard (฿100)</SelectItem>
                    <SelectItem value="200">Premium (฿200)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Description *</Label>
              <Textarea
                placeholder="Describe your items (e.g., Electronics, Clothing, Documents)"
                value={form.items_description}
                onChange={(e) => updateForm('items_description', e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
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
                <Label className="flex items-center gap-2">
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

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">Shipment Insurance</p>
                  <p className="text-sm text-slate-500">3% of shipping cost</p>
                </div>
              </div>
              <Switch
                checked={form.insurance_opted}
                onCheckedChange={(v) => updateForm('insurance_opted', v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                placeholder="Any special handling instructions..."
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700">
                Review Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Review your order before submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                {selectedService && <selectedService.icon className="w-6 h-6 text-blue-600" />}
                <div>
                  <p className="font-medium">{selectedService?.label}</p>
                  <p className="text-sm text-slate-500">Estimated: {selectedService?.delivery}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                <div>
                  <p className="text-slate-500">Weight</p>
                  <p className="font-medium">{form.weight_kg} kg</p>
                </div>
                <div>
                  <p className="text-slate-500">Items</p>
                  <p className="font-medium">{form.items_description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Shipping ({weight} kg × ฿{selectedService?.price})
                </span>
                <span>฿{shippingCost.toLocaleString()}</span>
              </div>
              {form.insurance_opted && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Insurance (3%)</span>
                  <span>฿{insuranceFee.toLocaleString()}</span>
                </div>
              )}
              {packagingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Packaging</span>
                  <span>฿{packagingFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">฿{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg text-sm text-amber-800">
              <p className="font-medium">Payment</p>
              <p>You can pay via PromptPay, Bank Transfer, or Cash on Pickup</p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Place Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
