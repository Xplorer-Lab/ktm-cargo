import { useState, useEffect } from 'react';
import { roundMoney } from '@/domains/shipments/calculations';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Calculator,
  Package,
  Truck,
  Plane,
  ShoppingBag,
  Clock,
  Zap,
  Scale,
  DollarSign,
  ArrowRightLeft,
  TrendingUp,
  Copy,
  Printer,
  RotateCcw,
  Bookmark,
  History,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_TYPE_DEFAULTS } from '@/lib/defaults';

// Map icon + description for PriceCalculator display
const ICON_MAP = {
  cargo_small: Package,
  cargo_medium: Package,
  cargo_large: Package,
  shopping_small: ShoppingBag,
  shopping_fashion: ShoppingBag,
  shopping_bulk: ShoppingBag,
  express: Zap,
  standard: Truck,
};

const DESCRIPTION_MAP = {
  cargo_small: 'Small packages',
  cargo_medium: 'Medium packages',
  cargo_large: 'Large shipments',
  shopping_small: 'Personal shopping',
  shopping_fashion: 'Fashion & Electronics',
  shopping_bulk: 'Bulk orders',
  express: 'Fastest delivery',
  standard: 'Regular service',
};

const DEFAULT_SERVICE_TYPES = SERVICE_TYPE_DEFAULTS.map((st) => ({
  ...st,
  icon: ICON_MAP[st.value] || Package,
  description: DESCRIPTION_MAP[st.value] || '',
}));
export default function PriceCalculator() {
  const [weight, setWeight] = useState('');
  const [serviceType, setServiceType] = useState('cargo_medium');
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [includePacking, setIncludePacking] = useState(false);
  const [productCost, setProductCost] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);
  const [exchangeRate, setExchangeRate] = useState(78);
  const [showMMK, setShowMMK] = useState(true);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });
  const [useVolumetric, setUseVolumetric] = useState(false);

  const [calculation, setCalculation] = useState(null);

  // Fetch pricing from database if available
  const { data: servicePricing = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => db.servicePricing.filter({ is_active: true }),
  });

  const { data: surcharges = [] } = useQuery({
    queryKey: ['surcharges'],
    queryFn: () => db.surcharges.filter({ is_active: true }),
  });

  // Merge database pricing with defaults
  const serviceTypes = DEFAULT_SERVICE_TYPES.map((defaultService) => {
    const dbPricing = servicePricing.find((p) => p.service_type === defaultService.value);
    if (dbPricing) {
      return {
        ...defaultService,
        costBasis: dbPricing.cost_per_kg || defaultService.costBasis,
        price: dbPricing.price_per_kg || defaultService.price,
        label: dbPricing.display_name || defaultService.label,
        insuranceRate: dbPricing.insurance_rate || 3,
        packagingFee: dbPricing.packaging_fee || 0,
      };
    }
    return defaultService;
  });

  // Calculate volumetric weight
  const volumetricWeight =
    dimensions.length && dimensions.width && dimensions.height
      ? (parseFloat(dimensions.length) *
          parseFloat(dimensions.width) *
          parseFloat(dimensions.height)) /
        5000
      : 0;

  const actualWeight = parseFloat(weight) || 0;
  const chargeableWeight =
    useVolumetric && volumetricWeight > actualWeight ? volumetricWeight : actualWeight;

  useEffect(() => {
    const service = serviceTypes.find((s) => s.value === serviceType);
    if (!service) return;

    const w = chargeableWeight;
    const pCost = parseFloat(productCost) || 0;

    const shippingCost = service.price * w;
    const baseCost = service.costBasis * w;
    const insuranceRate = service.insuranceRate || 3;
    const insuranceFee = includeInsurance ? shippingCost * (insuranceRate / 100) : 0;
    const packagingFee = includePacking
      ? service.packagingFee || (w < 5 ? 50 : w < 15 ? 100 : 200)
      : 0;
    const commission = serviceType.startsWith('shopping') ? pCost * (commissionRate / 100) : 0;

    // Apply surcharges
    let surchargeTotal = 0;
    surcharges.forEach((s) => {
      if (
        s.applies_to === 'all' ||
        (s.applies_to === 'cargo' && serviceType.startsWith('cargo')) ||
        (s.applies_to === 'shopping' && serviceType.startsWith('shopping')) ||
        (s.applies_to === 'express' && serviceType === 'express')
      ) {
        surchargeTotal += s.surcharge_type === 'fixed' ? s.amount : (shippingCost * s.amount) / 100;
      }
    });

    const totalCustomer =
      pCost + shippingCost + insuranceFee + packagingFee + commission + surchargeTotal;
    const totalCost = pCost + baseCost;
    const profit = totalCustomer - totalCost;
    const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;
    const totalMMK = totalCustomer * exchangeRate;

    setCalculation({
      shippingCost: roundMoney(shippingCost),
      insuranceFee: roundMoney(insuranceFee),
      packagingFee: roundMoney(packagingFee),
      commission: roundMoney(commission),
      surchargeTotal: roundMoney(surchargeTotal),
      totalCustomer: roundMoney(totalCustomer),
      totalMMK: roundMoney(totalMMK),
      profit: roundMoney(profit),
      margin: roundMoney(margin, 1),
      chargeableWeight: roundMoney(w, 3),
      deliveryTime: service.value === 'express' ? '1-2 days' : '3-5 days',
    });
  }, [
    weight,
    serviceType,
    includeInsurance,
    includePacking,
    productCost,
    commissionRate,
    exchangeRate,
    chargeableWeight,
    servicePricing,
    surcharges,
  ]);

  const selectedService = serviceTypes.find((s) => s.value === serviceType);
  const isShopping = serviceType.startsWith('shopping');

  const handleReset = () => {
    setWeight('');
    setProductCost('');
    setIncludeInsurance(false);
    setIncludePacking(false);
    setDimensions({ length: '', width: '', height: '' });
    setUseVolumetric(false);
    setServiceType('cargo_medium');
  };

  const handleSaveQuote = () => {
    if (!calculation || !weight) return;
    const quote = {
      id: Date.now(),
      date: new Date().toISOString(),
      serviceType: selectedService?.label,
      weight: chargeableWeight,
      total: calculation.totalCustomer,
      totalMMK: calculation.totalMMK,
    };
    setSavedQuotes((prev) => [quote, ...prev].slice(0, 5));
    toast.success('Quote saved!');
  };

  const handleCopyQuote = () => {
    if (!calculation) return;
    const text = `Quote: ${selectedService?.label}
Weight: ${chargeableWeight} kg
Shipping: ฿${calculation.shippingCost.toLocaleString()}
${includeInsurance ? `Insurance: ฿${calculation.insuranceFee.toLocaleString()}\n` : ''}${includePacking ? `Packing: ฿${calculation.packagingFee.toLocaleString()}\n` : ''}Total: ฿${calculation.totalCustomer.toLocaleString()}${showMMK ? ` (${calculation.totalMMK.toLocaleString()} MMK)` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Quote copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Price Calculator</h1>
              <p className="text-slate-600">Bangkok → Yangon Shipping Rates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = '/')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveQuote}
              disabled={!calculation || !weight}
            >
              <Bookmark className="w-4 h-4 mr-1" /> Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyQuote} disabled={!calculation}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="hidden md:flex">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Type Selection */}
              <div className="space-y-3">
                <Label>Service Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {serviceTypes.map((service) => {
                    const Icon = service.icon;
                    const isSelected = serviceType === service.value;
                    return (
                      <button
                        key={service.value}
                        onClick={() => setServiceType(service.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                          />
                          <span
                            className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}
                          >
                            {service.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">฿{service.price}/kg</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weight Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-slate-400" />
                    Weight (kg)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={useVolumetric} onCheckedChange={setUseVolumetric} />
                    <span className="text-xs text-slate-500">Volumetric</span>
                  </div>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Enter actual weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="text-lg"
                />

                {useVolumetric && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                    <p className="text-xs font-medium text-slate-600">Dimensions (cm)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        placeholder="L"
                        value={dimensions.length}
                        onChange={(e) => setDimensions({ ...dimensions, length: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="W"
                        value={dimensions.width}
                        onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="H"
                        value={dimensions.height}
                        onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })}
                      />
                    </div>
                    {volumetricWeight > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Volumetric weight:</span>
                        <span className="font-medium">{volumetricWeight.toFixed(2)} kg</span>
                      </div>
                    )}
                    {chargeableWeight > 0 && chargeableWeight !== actualWeight && (
                      <Badge className="bg-amber-100 text-amber-800">
                        Chargeable: {chargeableWeight.toFixed(2)} kg (higher of actual/volumetric)
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Product Cost (for shopping) */}
              {isShopping && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    Product Cost (THB)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter product cost"
                    value={productCost}
                    onChange={(e) => setProductCost(e.target.value)}
                    className="text-lg"
                  />
                  <div className="flex items-center gap-4 mt-2">
                    <Label className="text-sm text-slate-500">Commission:</Label>
                    <Select
                      value={commissionRate.toString()}
                      onValueChange={(v) => setCommissionRate(parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="15">15%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Add-ons */}
              <div className="space-y-4 pt-4 border-t">
                <Label>Add-on Services</Label>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Insurance (3%)</p>
                    <p className="text-sm text-slate-500">Protect your shipment</p>
                  </div>
                  <Switch checked={includeInsurance} onCheckedChange={setIncludeInsurance} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Professional Packing</p>
                    <p className="text-sm text-slate-500">฿50-200 based on size</p>
                  </div>
                  <Switch checked={includePacking} onCheckedChange={setIncludePacking} />
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                    Exchange Rate (THB → MMK)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={showMMK} onCheckedChange={setShowMMK} />
                    <span className="text-sm text-slate-500">Show MMK</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 whitespace-nowrap">1 THB =</span>
                  <Input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                    className="w-24 text-center font-medium"
                  />
                  <span className="text-sm text-slate-500">MMK</span>
                </div>
                <Slider
                  value={[exchangeRate]}
                  onValueChange={(v) => setExchangeRate(v[0])}
                  min={50}
                  max={120}
                  step={0.5}
                  className="mt-2"
                />
                <p className="text-xs text-slate-400 text-center">
                  Adjust slider or input for current market rate
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Price Summary */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Price Summary</span>
                </div>

                {weight && calculation ? (
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm">
                      {isShopping && productCost && (
                        <div className="flex justify-between">
                          <span className="text-blue-200">Product Cost</span>
                          <span>฿{parseFloat(productCost).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-blue-200">
                          Shipping ({calculation.chargeableWeight?.toFixed(1)} kg × ฿
                          {selectedService?.price})
                        </span>
                        <span>฿{calculation.shippingCost.toLocaleString()}</span>
                      </div>
                      {isShopping && calculation.commission > 0 && (
                        <div className="flex justify-between">
                          <span className="text-blue-200">Commission ({commissionRate}%)</span>
                          <span>฿{calculation.commission.toLocaleString()}</span>
                        </div>
                      )}
                      {includeInsurance && (
                        <div className="flex justify-between">
                          <span className="text-blue-200">Insurance</span>
                          <span>฿{calculation.insuranceFee.toLocaleString()}</span>
                        </div>
                      )}
                      {includePacking && (
                        <div className="flex justify-between">
                          <span className="text-blue-200">Packing</span>
                          <span>฿{calculation.packagingFee.toLocaleString()}</span>
                        </div>
                      )}
                      {calculation.surchargeTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-blue-200">Surcharges</span>
                          <span>฿{calculation.surchargeTotal.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-blue-500">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Total (THB)</span>
                        <span className="text-3xl font-bold">
                          ฿{calculation.totalCustomer.toLocaleString()}
                        </span>
                      </div>
                      {showMMK && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-500/50">
                          <span className="text-blue-200 flex items-center gap-1">
                            <ArrowRightLeft className="w-3 h-3" />
                            Total (MMK)
                          </span>
                          <span className="text-xl font-semibold text-blue-100">
                            {calculation.totalMMK.toLocaleString()} K
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-blue-200">
                    <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Enter weight to see pricing</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profit Calculator (for business) */}
            {weight && calculation && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                    <TrendingUp className="w-5 h-5" />
                    Profit Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">Est. Profit</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      ฿{calculation.profit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Margin</span>
                    <Badge className="bg-emerald-100 text-emerald-800 text-lg px-3">
                      {calculation.margin.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Info */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Estimated Delivery</p>
                    <p className="text-sm text-slate-500">
                      {serviceType === 'express' ? '1-2 business days' : '3-5 business days'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Route Info */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-full">
                      <Plane className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">Bangkok</span>
                  </div>
                  <div className="flex-1 mx-4 border-t-2 border-dashed border-slate-300" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Yangon</span>
                    <div className="p-1.5 bg-emerald-100 rounded-full">
                      <Package className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saved Quotes */}
            {savedQuotes.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-400" />
                    Recent Quotes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {savedQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">{quote.serviceType}</span>
                        <span className="text-slate-400 mx-2">•</span>
                        <span className="text-slate-500">{quote.weight} kg</span>
                      </div>
                      <span className="font-bold text-blue-600">
                        ฿{quote.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Compare */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Quick Compare
            </CardTitle>
            <CardDescription>See pricing across all service types for your weight</CardDescription>
          </CardHeader>
          <CardContent>
            {chargeableWeight > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {serviceTypes.map((service) => {
                  const Icon = ICON_MAP[service.value] || Package;
                  const total = service.price * chargeableWeight;
                  const isSelected = service.value === serviceType;
                  return (
                    <button
                      key={service.value}
                      onClick={() => setServiceType(service.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon
                          className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                        />
                        <span className="text-xs font-medium text-slate-600">{service.label}</span>
                      </div>
                      <p
                        className={`text-lg font-bold ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}
                      >
                        ฿{total.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {service.value === 'express' ? '1-2 days' : '3-5 days'}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-6">Enter weight to compare prices</p>
            )}
          </CardContent>
        </Card>

        {/* Pricing Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Full Pricing Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Service Type</th>
                    <th className="text-center py-3 px-4">Price/kg</th>
                    <th className="text-center py-3 px-4">Commission</th>
                    <th className="text-center py-3 px-4">Margin</th>
                    <th className="text-center py-3 px-4">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceTypes.map((service) => {
                    const margin = (
                      ((service.price - service.costBasis) / service.price) *
                      100
                    ).toFixed(0);
                    return (
                      <tr key={service.value} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium">{service.label}</td>
                        <td className="text-center py-3 px-4">฿{service.price}</td>
                        <td className="text-center py-3 px-4">
                          {service.value.startsWith('shopping') ? '8-15%' : '-'}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge className="bg-emerald-100 text-emerald-800">{margin}%</Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          {service.value === 'express' ? '1-2 days' : '3-5 days'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
