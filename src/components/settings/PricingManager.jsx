import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Package,
  Percent,
  TrendingUp,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_TYPES = [
  { value: 'cargo_small', label: 'Cargo Small' },
  { value: 'cargo_medium', label: 'Cargo Medium' },
  { value: 'cargo_large', label: 'Cargo Large' },
  { value: 'shopping_small', label: 'Shopping Small' },
  { value: 'shopping_fashion', label: 'Shopping Fashion' },
  { value: 'shopping_bulk', label: 'Shopping Bulk' },
  { value: 'express', label: 'Express' },
  { value: 'standard', label: 'Standard' },
];

export default function PricingManager() {
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [showSurchargeForm, setShowSurchargeForm] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [editingSurcharge, setEditingSurcharge] = useState(null);
  const [pricingToDelete, setPricingToDelete] = useState(null);
  const [surchargeToDelete, setSurchargeToDelete] = useState(null);

  const queryClient = useQueryClient();

  const { data: servicePricing = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => db.servicePricing.list(),
  });

  const { data: surcharges = [] } = useQuery({
    queryKey: ['surcharges'],
    queryFn: () => db.surcharges.list(),
  });

  const createPricingMutation = useMutation({
    mutationFn: (data) => db.servicePricing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setShowPricingForm(false);
      toast.success('Service pricing added');
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: ({ id, data }) => db.servicePricing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setShowPricingForm(false);
      setEditingPricing(null);
      toast.success('Pricing updated');
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: (id) => db.servicePricing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setPricingToDelete(null);
      toast.success('Pricing deleted');
    },
  });

  const createSurchargeMutation = useMutation({
    mutationFn: (data) => db.surcharges.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharges'] });
      setShowSurchargeForm(false);
      toast.success('Surcharge added');
    },
  });

  const updateSurchargeMutation = useMutation({
    mutationFn: ({ id, data }) => db.surcharges.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharges'] });
      setShowSurchargeForm(false);
      setEditingSurcharge(null);
      toast.success('Surcharge updated');
    },
  });

  const deleteSurchargeMutation = useMutation({
    mutationFn: (id) => db.surcharges.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharges'] });
      setSurchargeToDelete(null);
      toast.success('Surcharge deleted');
    },
  });

  // Calculate profit margins
  const profitMargins = servicePricing.map((p) => ({
    ...p,
    margin:
      p.price_per_kg > 0
        ? (((p.price_per_kg - p.cost_per_kg) / p.price_per_kg) * 100).toFixed(1)
        : 0,
  }));

  const totalActiveSurcharges = surcharges.filter((s) => s.is_active).length;

  const handleDeletePricing = () => {
    if (pricingToDelete) {
      deletePricingMutation.mutate(pricingToDelete.id);
    }
  };

  const handleDeleteSurcharge = () => {
    if (surchargeToDelete) {
      deleteSurchargeMutation.mutate(surchargeToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-xs text-blue-600 uppercase font-medium">Active Services</p>
                <p className="text-2xl font-bold text-blue-900">
                  {servicePricing.filter((s) => s.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Percent className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-xs text-amber-600 uppercase font-medium">Active Surcharges</p>
                <p className="text-2xl font-bold text-amber-900">{totalActiveSurcharges}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-xs text-emerald-600 uppercase font-medium">Avg Margin</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {profitMargins.length > 0
                    ? (
                      profitMargins.reduce((sum, p) => sum + parseFloat(p.margin), 0) /
                      profitMargins.length
                    ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList>
          <TabsTrigger value="services" className="gap-2">
            <Package className="w-4 h-4" /> Services
          </TabsTrigger>
          <TabsTrigger value="surcharges" className="gap-2">
            <Percent className="w-4 h-4" /> Surcharges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          {/* Service Pricing */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Service Pricing</CardTitle>
                <CardDescription>Configure pricing for each service type</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingPricing(null);
                  setShowPricingForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Service
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {servicePricing.length > 0 ? (
                  servicePricing.map((pricing) => {
                    const margin =
                      pricing.price_per_kg > 0
                        ? (
                          ((pricing.price_per_kg - pricing.cost_per_kg) / pricing.price_per_kg) *
                          100
                        ).toFixed(1)
                        : 0;
                    return (
                      <div
                        key={pricing.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {pricing.display_name || pricing.service_type?.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                              <span>Cost: ฿{pricing.cost_per_kg}/kg</span>
                              <span>•</span>
                              <span>Price: ฿{pricing.price_per_kg}/kg</span>
                              <span>•</span>
                              <span
                                className={
                                  margin > 20
                                    ? 'text-emerald-600'
                                    : margin > 10
                                      ? 'text-amber-600'
                                      : 'text-rose-600'
                                }
                              >
                                {margin}% margin
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              pricing.is_active !== false
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }
                          >
                            {pricing.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingPricing(pricing);
                              setShowPricingForm(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setPricingToDelete(pricing)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No service pricing configured</p>
                    <Button size="sm" className="mt-4" onClick={() => setShowPricingForm(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add First Service
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surcharges" className="mt-4">
          {/* Surcharges */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Surcharges & Fees</CardTitle>
                <CardDescription>Additional charges applied to orders</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSurcharge(null);
                  setShowSurchargeForm(true);
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Surcharge
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {surcharges.length > 0 ? (
                  surcharges.map((surcharge) => (
                    <div
                      key={surcharge.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Percent className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{surcharge.name}</p>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="font-medium text-amber-600">
                              {surcharge.surcharge_type === 'fixed'
                                ? `฿${surcharge.amount}`
                                : `${surcharge.amount}%`}
                            </span>
                            <span>•</span>
                            <span className="capitalize">Applies to: {surcharge.applies_to}</span>
                            {surcharge.description && (
                              <>
                                <span>•</span>
                                <span>{surcharge.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            surcharge.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }
                        >
                          {surcharge.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingSurcharge(surcharge);
                            setShowSurchargeForm(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setSurchargeToDelete(surcharge)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Percent className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No surcharges configured</p>
                    <Button size="sm" className="mt-4" onClick={() => setShowSurchargeForm(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add First Surcharge
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pricing Form Dialog */}
      <Dialog
        open={showPricingForm}
        onOpenChange={(v) => {
          setShowPricingForm(v);
          if (!v) setEditingPricing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPricing ? 'Edit Service Pricing' : 'Add Service Pricing'}
            </DialogTitle>
          </DialogHeader>
          <PricingForm
            pricing={editingPricing}
            onSubmit={(data) => {
              if (editingPricing) {
                updatePricingMutation.mutate({ id: editingPricing.id, data });
              } else {
                createPricingMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowPricingForm(false);
              setEditingPricing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Surcharge Form Dialog */}
      <Dialog
        open={showSurchargeForm}
        onOpenChange={(v) => {
          setShowSurchargeForm(v);
          if (!v) setEditingSurcharge(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSurcharge ? 'Edit Surcharge' : 'Add Surcharge'}</DialogTitle>
          </DialogHeader>
          <SurchargeForm
            surcharge={editingSurcharge}
            onSubmit={(data) => {
              if (editingSurcharge) {
                updateSurchargeMutation.mutate({ id: editingSurcharge.id, data });
              } else {
                createSurchargeMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowSurchargeForm(false);
              setEditingSurcharge(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Pricing Confirmation Dialog */}
      <AlertDialog open={!!pricingToDelete} onOpenChange={() => setPricingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the pricing for "
              {pricingToDelete?.display_name || pricingToDelete?.service_type}" and remove it from
              our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePricing}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Surcharge Confirmation Dialog */}
      <AlertDialog open={!!surchargeToDelete} onOpenChange={() => setSurchargeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the surcharge "
              {surchargeToDelete?.name}" and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSurcharge}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PricingForm({ pricing, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    service_type: pricing?.service_type || 'cargo_medium',
    display_name: pricing?.display_name || '',
    cost_per_kg: pricing?.cost_per_kg || 0,
    price_per_kg: pricing?.price_per_kg || 0,
    min_weight: pricing?.min_weight || 0,
    max_weight: pricing?.max_weight || '',
    insurance_rate: pricing?.insurance_rate || 2,
    packaging_fee: pricing?.packaging_fee || 0,
    is_active: pricing?.is_active !== false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service Type</Label>
          <Select
            value={form.service_type}
            onValueChange={(v) => setForm({ ...form, service_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="e.g. Standard Cargo"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cost per kg (฿)</Label>
          <Input
            type="number"
            value={form.cost_per_kg}
            onChange={(e) => setForm({ ...form, cost_per_kg: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Price per kg (฿)</Label>
          <Input
            type="number"
            value={form.price_per_kg}
            onChange={(e) => setForm({ ...form, price_per_kg: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Min Weight (kg)</Label>
          <Input
            type="number"
            value={form.min_weight}
            onChange={(e) => setForm({ ...form, min_weight: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Weight (kg)</Label>
          <Input
            type="number"
            value={form.max_weight}
            onChange={(e) => setForm({ ...form, max_weight: parseFloat(e.target.value) || '' })}
            placeholder="No limit"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Insurance Rate (%)</Label>
          <Input
            type="number"
            value={form.insurance_rate}
            onChange={(e) => setForm({ ...form, insurance_rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Packaging Fee (฿)</Label>
          <Input
            type="number"
            value={form.packaging_fee}
            onChange={(e) => setForm({ ...form, packaging_fee: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
        <Label>Active</Label>
        <Switch
          checked={form.is_active}
          onCheckedChange={(v) => setForm({ ...form, is_active: v })}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
          Save
        </Button>
      </div>
    </form>
  );
}

function SurchargeForm({ surcharge, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: surcharge?.name || '',
    surcharge_type: surcharge?.surcharge_type || 'fixed',
    amount: surcharge?.amount || 0,
    applies_to: surcharge?.applies_to || 'all',
    description: surcharge?.description || '',
    is_active: surcharge?.is_active !== false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Surcharge Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Fuel Surcharge"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={form.surcharge_type}
            onValueChange={(v) => setForm({ ...form, surcharge_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Amount (฿)</SelectItem>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Applies To</Label>
        <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="cargo">Cargo Only</SelectItem>
            <SelectItem value="shopping">Shopping Only</SelectItem>
            <SelectItem value="express">Express Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional description"
        />
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
        <Label>Active</Label>
        <Switch
          checked={form.is_active}
          onCheckedChange={(v) => setForm({ ...form, is_active: v })}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
          Save
        </Button>
      </div>
    </form>
  );
}
