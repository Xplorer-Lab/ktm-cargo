import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Package, Truck, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
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

const serviceTypes = [
  { value: 'cargo_small', label: 'Cargo (1-5kg)', costBasis: 90, price: 120 },
  { value: 'cargo_medium', label: 'Cargo (6-15kg)', costBasis: 75, price: 95 },
  { value: 'cargo_large', label: 'Cargo (16-30kg)', costBasis: 55, price: 70 },
  { value: 'shopping_small', label: 'Shopping + Small Items', costBasis: 80, price: 110 },
  { value: 'shopping_fashion', label: 'Shopping + Fashion/Electronics', costBasis: 85, price: 115 },
  { value: 'shopping_bulk', label: 'Shopping + Bulk Order', costBasis: 70, price: 90 },
  { value: 'express', label: 'Express (1-2 days)', costBasis: 100, price: 150 },
  { value: 'standard', label: 'Standard (3-5 days)', costBasis: 75, price: 95 },
];

export default function ShipmentForm({
  shipment,
  onSubmit,
  onCancel,
  purchaseOrders = [],
  vendors = [],
  customers = [],
}) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    service_type: 'cargo_medium',
    weight_kg: '',
    items_description: '',
    pickup_address: '',
    delivery_address: '',
    pickup_date: '',
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
  });

  const [calculated, setCalculated] = useState({
    cost: 0,
    price: 0,
    profit: 0,
    total: 0,
    vendorCost: 0,
  });

  const [openCombobox, setOpenCombobox] = useState(false);
  const [poWeightStatus, setPoWeightStatus] = useState(null);

  // Filter POs that are approved/received and have remaining weight
  const availablePOs = purchaseOrders.filter(
    (po) =>
      ['approved', 'sent', 'partial_received', 'received'].includes(po.status) &&
      (po.remaining_weight_kg > 0 || !po.total_weight_kg)
  );

  useEffect(() => {
    const service = serviceTypes.find((s) => s.value === form.service_type);
    if (service && form.weight_kg) {
      const weight = parseFloat(form.weight_kg) || 0;

      // Use vendor cost from PO if linked, otherwise use default service cost
      const vendorCostPerKg = form.vendor_cost_per_kg || service.costBasis;
      const vendorCost = vendorCostPerKg * weight;

      const price = service.price * weight;
      const insurance = form.insurance_opted ? price * 0.03 : 0;
      const packaging = parseFloat(form.packaging_fee) || 0;
      const total = price + insurance + packaging;
      const profit = total - vendorCost - insurance;

      setCalculated({
        cost: vendorCost,
        price,
        profit,
        total,
        insurance,
        vendorCost,
        vendorCostPerKg,
      });

      // Update PO weight status
      if (form.vendor_po_id) {
        const po = purchaseOrders.find((p) => p.id === form.vendor_po_id);
        if (po && po.total_weight_kg) {
          const remaining = po.remaining_weight_kg || 0;
          const isOverLimit = weight > remaining;
          const percentUsed = Math.min(100, ((po.allocated_weight_kg || 0) + weight) / po.total_weight_kg * 100);

          setPoWeightStatus({
            remaining,
            isOverLimit,
            percentUsed,
            total: po.total_weight_kg
          });
        } else {
          setPoWeightStatus(null);
        }
      } else {
        setPoWeightStatus(null);
      }
    } else {
      setPoWeightStatus(null);
    }
  }, [
    form.service_type,
    form.weight_kg,
    form.insurance_opted,
    form.packaging_fee,
    form.vendor_cost_per_kg,
    form.vendor_po_id,
    purchaseOrders
  ]);

  const handlePOChange = (poId) => {
    if (!poId || poId === 'none') {
      setForm({
        ...form,
        vendor_po_id: '',
        vendor_po_number: '',
        vendor_id: '',
        vendor_name: '',
        vendor_cost_per_kg: 0,
      });
      return;
    }

    const selectedPO = purchaseOrders.find((po) => po.id === poId);
    if (selectedPO) {
      setForm({
        ...form,
        vendor_po_id: selectedPO.id,
        vendor_po_number: selectedPO.po_number,
        vendor_id: selectedPO.vendor_id,
        vendor_name: selectedPO.vendor_name,
        vendor_cost_per_kg: selectedPO.cost_per_kg || 0,
      });
    }
  };

  const handleCustomerSelect = (customerName) => {
    const customer = customers.find((c) => c.name === customerName);
    if (customer) {
      setForm({
        ...form,
        customer_name: customer.name,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        customer_id: customer.id,
      });
    } else {
      setForm({ ...form, customer_name: customerName, customer_id: '' });
    }
    setOpenCombobox(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (poWeightStatus?.isOverLimit) {
      return; // Prevent submission if over weight
    }

    const service = serviceTypes.find((s) => s.value === form.service_type);
    const weight = parseFloat(form.weight_kg);

    onSubmit({
      ...form,
      weight_kg: weight,
      cost_basis: form.vendor_cost_per_kg || service?.costBasis,
      price_per_kg: service?.price,
      vendor_cost_per_kg: form.vendor_cost_per_kg || 0,
      vendor_total_cost: calculated.vendorCost || 0,
      total_amount: calculated.total,
      profit: calculated.profit,
      insurance_amount: calculated.insurance || 0,
      tracking_number: form.tracking_number || `BKK${Date.now().toString(36).toUpperCase()}`,
      origin: 'Bangkok',
      destination: 'Yangon',
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b">
        <CardTitle>{shipment ? 'Edit Shipment' : 'New Shipment'}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label>Customer Name *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                  >
                    {form.customer_name || "Select customer..."}
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
                                "mr-2 h-4 w-4",
                                form.customer_name === customer.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {customer.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                placeholder="+66 or +95"
                required
              />
            </div>
          </div>

          {/* Vendor PO Linkage */}
          {availablePOs.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <Label className="text-blue-800 font-medium">Link to Vendor Purchase Order</Label>
              </div>
              <Select value={form.vendor_po_id || 'none'} onValueChange={handlePOChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor PO (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No PO Linked (use default pricing)</SelectItem>
                  {availablePOs.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number} - {po.vendor_name}
                      {po.cost_per_kg ? ` (฿${po.cost_per_kg}/kg)` : ''}
                      {po.remaining_weight_kg ? ` - ${po.remaining_weight_kg}kg available` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {form.vendor_po_id && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        <Package className="w-3 h-3 mr-1" />
                        {form.vendor_name}
                      </Badge>
                      <span className="text-blue-600">Cost: ฿{form.vendor_cost_per_kg}/kg</span>
                    </div>
                    {poWeightStatus && (
                      <span className={cn(
                        "font-medium",
                        poWeightStatus.isOverLimit ? "text-rose-600" : "text-slate-600"
                      )}>
                        {poWeightStatus.remaining}kg remaining
                      </span>
                    )}
                  </div>

                  {poWeightStatus && (
                    <div className="space-y-1">
                      <Progress value={poWeightStatus.percentUsed} className={cn("h-2", poWeightStatus.isOverLimit ? "bg-rose-100" : "")} indicatorClassName={poWeightStatus.isOverLimit ? "bg-rose-500" : "bg-blue-500"} />
                      {poWeightStatus.isOverLimit && (
                        <div className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Weight exceeds available capacity!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Select
                value={form.service_type}
                onValueChange={(v) => setForm({ ...form, service_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label} - ฿{s.price}/kg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight (kg) *</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                placeholder="Enter weight"
                required
                className={cn(poWeightStatus?.isOverLimit && "border-rose-500 focus-visible:ring-rose-500")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items Description</Label>
            <Textarea
              value={form.items_description}
              onChange={(e) => setForm({ ...form, items_description: e.target.value })}
              placeholder="Describe the items being shipped..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Address (Bangkok)</Label>
              <Input
                value={form.pickup_address}
                onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
                placeholder="Bangkok address"
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Address (Yangon)</Label>
              <Input
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                placeholder="Yangon address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pickup Date</Label>
              <Input
                type="date"
                value={form.pickup_date}
                onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Packaging Fee (THB)</Label>
              <Input
                type="number"
                min="0"
                value={form.packaging_fee}
                onChange={(e) => setForm({ ...form, packaging_fee: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Insurance (3%)</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={form.insurance_opted}
                  onCheckedChange={(v) => setForm({ ...form, insurance_opted: v })}
                />
                <span className="text-sm text-slate-600">
                  {form.insurance_opted
                    ? `฿${calculated.insurance?.toFixed(0) || 0}`
                    : 'Not included'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {form.weight_kg && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-slate-700">Price Calculation</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Vendor Cost</p>
                  <p className="font-semibold text-rose-600">
                    ฿{calculated.vendorCost?.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {form.vendor_po_id
                      ? `(PO: ฿${form.vendor_cost_per_kg}/kg)`
                      : `(Default: ฿${calculated.vendorCostPerKg}/kg)`}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Customer Price</p>
                  <p className="font-semibold">฿{calculated.price?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Insurance</p>
                  <p className="font-semibold">฿{(calculated.insurance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Packaging</p>
                  <p className="font-semibold">
                    ฿{parseFloat(form.packaging_fee || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="font-bold text-lg text-blue-600">
                    ฿{calculated.total?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between">
                <p className="text-sm text-emerald-600 font-medium">
                  Est. Profit: ฿{calculated.profit?.toLocaleString()}
                </p>
                {form.vendor_po_id && (
                  <Badge className="bg-blue-100 text-blue-700">
                    Linked to {form.vendor_po_number}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={poWeightStatus?.isOverLimit}
            >
              {shipment ? 'Update Shipment' : 'Create Shipment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
