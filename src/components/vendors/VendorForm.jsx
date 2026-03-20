import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Scale,
  Clock,
  Star,
  Truck,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  CalendarDays,
  CreditCard,
  CheckCircle,
  Info,
  Loader2,
  Sparkles,
  TrendingUp,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const vendorTypes = [
  {
    value: 'cargo_carrier',
    label: 'Cargo Carrier',
    icon: Truck,
    description: 'Transport services',
  },
  { value: 'supplier', label: 'Supplier', icon: Package, description: 'Product supplier' },
  { value: 'packaging', label: 'Packaging', icon: Building2, description: 'Packaging materials' },
  {
    value: 'customs_broker',
    label: 'Customs Broker',
    icon: FileText,
    description: 'Customs clearance',
  },
  { value: 'warehouse', label: 'Warehouse', icon: Building2, description: 'Storage facility' },
];

const paymentTermOptions = [
  { value: 'immediate', label: 'Immediate', description: 'Payment on delivery' },
  { value: 'net_15', label: 'Net 15', description: 'Payment within 15 days' },
  { value: 'net_30', label: 'Net 30', description: 'Payment within 30 days' },
  { value: 'net_60', label: 'Net 60', description: 'Payment within 60 days' },
];

const statusOptions = [
  { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-slate-100 text-slate-800' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
];

export default function VendorForm({ vendor, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    vendor_type: 'supplier',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    services: '',
    contract_start: '',
    contract_end: '',
    payment_terms: 'net_30',
    status: 'active',
    notes: '',
    // Pricing tiers
    cost_per_kg: 0,
    cost_per_kg_express: 0,
    cost_per_kg_bulk: 0,
    bulk_threshold_kg: 100,
    // Capacity
    monthly_capacity_kg: 0,
    current_month_allocated_kg: 0,
    min_order_kg: 0,
    lead_time_days: 3,
    // Preferred status
    is_preferred: false,
    rating: 5,
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name || '',
        vendor_type: vendor.vendor_type || 'supplier',
        contact_name: vendor.contact_name || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        services: vendor.services || '',
        contract_start: vendor.contract_start || '',
        contract_end: vendor.contract_end || '',
        payment_terms: vendor.payment_terms || 'net_30',
        status: vendor.status || 'active',
        notes: vendor.notes || '',
        cost_per_kg: vendor.cost_per_kg || 0,
        cost_per_kg_express: vendor.cost_per_kg_express || 0,
        cost_per_kg_bulk: vendor.cost_per_kg_bulk || 0,
        bulk_threshold_kg: vendor.bulk_threshold_kg || 100,
        monthly_capacity_kg: vendor.monthly_capacity_kg || 0,
        current_month_allocated_kg: vendor.current_month_allocated_kg || 0,
        min_order_kg: vendor.min_order_kg || 0,
        lead_time_days: vendor.lead_time_days || 3,
        is_preferred: vendor.is_preferred || false,
        rating: vendor.rating || 5,
      });
    }
  }, [vendor]);

  // Calculations
  const capacityUsedPercent = useMemo(() => {
    return form.monthly_capacity_kg > 0
      ? ((form.current_month_allocated_kg / form.monthly_capacity_kg) * 100).toFixed(1)
      : 0;
  }, [form.monthly_capacity_kg, form.current_month_allocated_kg]);

  const remainingCapacity = useMemo(() => {
    return Math.max(0, form.monthly_capacity_kg - form.current_month_allocated_kg);
  }, [form.monthly_capacity_kg, form.current_month_allocated_kg]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission delay for better UX
    setTimeout(() => {
      onSubmit({
        ...form,
        cost_per_kg: parseFloat(form.cost_per_kg) || 0,
        cost_per_kg_express: parseFloat(form.cost_per_kg_express) || 0,
        cost_per_kg_bulk: parseFloat(form.cost_per_kg_bulk) || 0,
        bulk_threshold_kg: parseFloat(form.bulk_threshold_kg) || 100,
        monthly_capacity_kg: parseFloat(form.monthly_capacity_kg) || 0,
        min_order_kg: parseFloat(form.min_order_kg) || 0,
        lead_time_days: parseInt(form.lead_time_days) || 3,
        rating: parseFloat(form.rating) || 5,
      });
      setIsSubmitting(false);
    }, 300);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedVendorType = vendorTypes.find((t) => t.value === form.vendor_type);
  const VendorTypeIcon = selectedVendorType?.icon || Building2;

  return (
    <Card className="border-0 shadow-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900">
      <CardHeader className="pb-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
              )}
            >
              <VendorTypeIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{vendor ? 'Edit Vendor' : 'Add New Vendor'}</CardTitle>
              <CardDescription>
                {vendor
                  ? 'Update vendor information'
                  : 'Enter vendor details to add to your network'}
              </CardDescription>
            </div>
          </div>
          {form.is_preferred && (
            <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 shadow-lg shadow-amber-500/30">
              <Star className="w-3 h-3 mr-1 fill-white" /> Preferred
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger
                value="basic"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
              >
                <User className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Pricing
              </TabsTrigger>
              <TabsTrigger
                value="capacity"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
              >
                <Scale className="w-4 h-4 mr-2" />
                Capacity
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-5 mt-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Company Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="Enter company name"
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    Vendor Type
                  </Label>
                  <Select
                    value={form.vendor_type}
                    onValueChange={(v) => updateForm('vendor_type', v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorTypes.map((t) => {
                        const TypeIcon = t.icon;
                        return (
                          <SelectItem key={t.value} value={t.value}>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="w-4 h-4 text-slate-500" />
                              <div>
                                <span>{t.label}</span>
                                <span className="text-xs text-slate-400 ml-2">{t.description}</span>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    Status
                  </Label>
                  <Select value={form.status} onValueChange={(v) => updateForm('status', v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={cn('text-xs', s.color)}>{s.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Contact Name
                  </Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => updateForm('contact_name', e.target.value)}
                    placeholder="John Doe"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Phone
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="+66 XX XXX XXXX"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="vendor@company.com"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    Payment Terms
                  </Label>
                  <Select
                    value={form.payment_terms}
                    onValueChange={(v) => updateForm('payment_terms', v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex flex-col">
                            <span>{t.label}</span>
                            <span className="text-xs text-slate-400">{t.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Address
                  </Label>
                  <Input
                    value={form.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="Full address"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    Contract Start
                  </Label>
                  <Input
                    type="date"
                    value={form.contract_start}
                    onChange={(e) => updateForm('contract_start', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    Contract End
                  </Label>
                  <Input
                    type="date"
                    value={form.contract_end}
                    onChange={(e) => updateForm('contract_end', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Services Provided
                  </Label>
                  <Textarea
                    value={form.services}
                    onChange={(e) => updateForm('services', e.target.value)}
                    rows={2}
                    placeholder="Describe the services this vendor provides..."
                  />
                </div>

                {/* Preferred Vendor Toggle */}
                <div className="md:col-span-2 flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                      <Star className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <Label className="text-amber-900 dark:text-amber-200 font-medium">
                        Preferred Vendor
                      </Label>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Get priority recommendations
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.is_preferred}
                    onCheckedChange={(v) => updateForm('is_preferred', v)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Pricing Tiers Tab */}
            <TabsContent value="pricing" className="space-y-5 mt-0 animate-in fade-in duration-300">
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-900">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                      Pricing Tiers
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Configure rates for different service levels
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                      Standard Rate
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">฿</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cost_per_kg}
                        onChange={(e) => updateForm('cost_per_kg', e.target.value)}
                        placeholder="0.00"
                        className="text-lg font-semibold"
                      />
                      <span className="text-slate-400">/kg</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800">
                    <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                      <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
                      Express Rate
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 font-medium">฿</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cost_per_kg_express}
                        onChange={(e) => updateForm('cost_per_kg_express', e.target.value)}
                        placeholder="0.00"
                        className="text-lg font-semibold"
                      />
                      <span className="text-slate-400">/kg</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                      <TrendingUp className="w-3 h-3 inline mr-1 text-emerald-500" />
                      Bulk Rate
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-medium">฿</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cost_per_kg_bulk}
                        onChange={(e) => updateForm('cost_per_kg_bulk', e.target.value)}
                        placeholder="0.00"
                        className="text-lg font-semibold"
                      />
                      <span className="text-slate-400">/kg</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-white dark:bg-slate-800 rounded-xl">
                  <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                    Bulk Threshold (kg)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.bulk_threshold_kg}
                    onChange={(e) => updateForm('bulk_threshold_kg', e.target.value)}
                    placeholder="Minimum kg for bulk pricing"
                    className="max-w-xs"
                  />
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Orders above this weight qualify for bulk pricing
                  </p>
                </div>
              </div>

              {/* Pricing Summary */}
              {(form.cost_per_kg > 0 ||
                form.cost_per_kg_express > 0 ||
                form.cost_per_kg_bulk > 0) && (
                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Pricing Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl">
                      <p className="text-slate-500 text-sm">Standard</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ฿{parseFloat(form.cost_per_kg || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">/kg</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <p className="text-amber-600 text-sm">Express</p>
                      <p className="text-2xl font-bold text-amber-600">
                        ฿{parseFloat(form.cost_per_kg_express || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-amber-500">/kg</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <p className="text-emerald-600 text-sm">
                        Bulk ({form.bulk_threshold_kg}+ kg)
                      </p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ฿{parseFloat(form.cost_per_kg_bulk || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-500">/kg</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Capacity Tab */}
            <TabsContent
              value="capacity"
              className="space-y-5 mt-0 animate-in fade-in duration-300"
            >
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <Scale className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">
                      Capacity Management
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Set monthly limits and requirements
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Capacity (kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.monthly_capacity_kg}
                      onChange={(e) => updateForm('monthly_capacity_kg', e.target.value)}
                      placeholder="Max kg per month"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Order (kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.min_order_kg}
                      onChange={(e) => updateForm('min_order_kg', e.target.value)}
                      placeholder="Minimum order weight"
                      className="h-11"
                    />
                  </div>
                </div>

                {vendor && form.monthly_capacity_kg > 0 && (
                  <div className="mt-5 p-4 bg-white dark:bg-slate-800 rounded-xl">
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-slate-600 dark:text-slate-400">
                        Current Month Usage
                      </span>
                      <span className="font-semibold">
                        {form.current_month_allocated_kg} / {form.monthly_capacity_kg} kg
                      </span>
                    </div>
                    <Progress
                      value={parseFloat(capacityUsedPercent)}
                      className={cn('h-3', parseFloat(capacityUsedPercent) > 80 && 'bg-rose-100')}
                    />
                    <div className="flex justify-between mt-2 text-xs">
                      <span
                        className={cn(
                          'font-medium',
                          parseFloat(capacityUsedPercent) > 80
                            ? 'text-rose-600'
                            : parseFloat(capacityUsedPercent) > 50
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        )}
                      >
                        {capacityUsedPercent}% capacity used
                      </span>
                      <span className="text-slate-500">{remainingCapacity} kg available</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl border border-purple-100 dark:border-purple-900">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-900 dark:text-purple-200">
                      Lead Time & Performance
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-400">
                      Track vendor reliability
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lead Time (days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.lead_time_days}
                      onChange={(e) => updateForm('lead_time_days', e.target.value)}
                      placeholder="Average days"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Rating
                      <span className="text-xs text-slate-400">(1-5)</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={form.rating}
                        onChange={(e) => updateForm('rating', e.target.value)}
                        className="h-11"
                      />
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'w-4 h-4',
                              star <= Math.round(form.rating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Notes
                </Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes about this vendor..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {vendor ? 'Update Vendor' : 'Add Vendor'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
