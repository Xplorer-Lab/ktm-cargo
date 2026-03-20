import { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Loader2,
  Shield,
  Box,
  Zap,
  CheckCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const SERVICE_TYPES = [
  { value: 'cargo_small', label: 'Cargo Small', icon: Package },
  { value: 'cargo_medium', label: 'Cargo Medium', icon: Package },
  { value: 'cargo_large', label: 'Cargo Large', icon: Package },
  { value: 'shopping_small', label: 'Shopping Small', icon: Box },
  { value: 'shopping_fashion', label: 'Shopping Fashion', icon: Box },
  { value: 'shopping_bulk', label: 'Shopping Bulk', icon: Box },
  { value: 'express', label: 'Express', icon: Zap },
  { value: 'standard', label: 'Standard', icon: Package },
];

const pricingFormSchema = z.object({
  service_type: z.string().min(1, 'Service type is required'),
  display_name: z.string().optional(),
  cost_per_kg: z.preprocess((val) => parseFloat(val) || 0, z.number().min(0)),
  price_per_kg: z.preprocess((val) => parseFloat(val) || 0, z.number().min(0)),
  min_weight: z.preprocess((val) => parseFloat(val) || 0, z.number().min(0)),
  max_weight: z.preprocess((val) => (val === '' ? null : parseFloat(val)), z.number().nullable()),
  insurance_rate: z.preprocess((val) => parseFloat(val) || 0, z.number().min(0).max(100)),
  packaging_fee: z.preprocess((val) => parseFloat(val) || 0, z.number().min(0)),
  is_active: z.boolean().default(true),
});

const surchargeFormSchema = z.object({
  name: z.string().min(1, 'Surcharge name is required'),
  surcharge_type: z.enum(['fixed', 'percentage']),
  amount: z.preprocess((val) => parseFloat(val) || 0, z.number().min(0)),
  applies_to: z.enum(['all', 'cargo', 'shopping', 'express']),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export default function PricingManager() {
  const { handleError } = useErrorHandler();
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [showSurchargeForm, setShowSurchargeForm] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [editingSurcharge, setEditingSurcharge] = useState(null);
  const [pricingToDelete, setPricingToDelete] = useState(null);
  const [surchargeToDelete, setSurchargeToDelete] = useState(null);

  const queryClient = useQueryClient();

  const { data: servicePricing = [], isLoading: loadingPricing } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => db.servicePricing.list(),
  });

  const { data: surcharges = [], isLoading: loadingSurcharges } = useQuery({
    queryKey: ['surcharges'],
    queryFn: () => db.surcharges.list(),
  });

  const createPricingMutation = useMutation({
    mutationFn: (data) => db.servicePricing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setShowPricingForm(false);
      toast.success('Service pricing added successfully');
    },
    onError: (error) => {
      handleError(error, 'Failed to add pricing', {
        component: 'PricingManager',
        action: 'createPricing',
      });
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: ({ id, data }) => db.servicePricing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setShowPricingForm(false);
      setEditingPricing(null);
      toast.success('Pricing updated successfully');
    },
    onError: (error) => {
      handleError(error, 'Failed to update pricing', {
        component: 'PricingManager',
        action: 'updatePricing',
      });
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: (id) => db.servicePricing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setPricingToDelete(null);
      toast.success('Pricing deleted');
    },
    onError: (error) => {
      handleError(error, 'Failed to delete pricing', {
        component: 'PricingManager',
        action: 'deletePricing',
      });
    },
  });

  const createSurchargeMutation = useMutation({
    mutationFn: (data) => db.surcharges.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharges'] });
      setShowSurchargeForm(false);
      toast.success('Surcharge added successfully');
    },
    onError: (error) => {
      handleError(error, 'Failed to add surcharge', {
        component: 'PricingManager',
        action: 'createSurcharge',
      });
    },
  });

  const updateSurchargeMutation = useMutation({
    mutationFn: ({ id, data }) => db.surcharges.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharges'] });
      setShowSurchargeForm(false);
      setEditingSurcharge(null);
      toast.success('Surcharge updated successfully');
    },
    onError: (error) => {
      handleError(error, 'Failed to update surcharge', {
        component: 'PricingManager',
        action: 'updateSurcharge',
      });
    },
  });

  const deleteSurchargeMutation = useMutation({
    mutationFn: (id) => db.surcharges.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharges'] });
      setSurchargeToDelete(null);
      toast.success('Surcharge deleted');
    },
    onError: (error) => {
      handleError(error, 'Failed to delete surcharge', {
        component: 'PricingManager',
        action: 'deleteSurcharge',
      });
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
  const avgMargin =
    profitMargins.length > 0
      ? (
          profitMargins.reduce((sum, p) => sum + parseFloat(p.margin), 0) / profitMargins.length
        ).toFixed(1)
      : 0;

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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-blue-100 font-medium">Active Services</p>
                <p className="text-3xl font-bold">
                  {servicePricing.filter((s) => s.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-amber-100 font-medium">Active Surcharges</p>
                <p className="text-3xl font-bold">{totalActiveSurcharges}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-emerald-100 font-medium">Avg Margin</p>
                <p className="text-3xl font-bold">{avgMargin}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger
            value="services"
            className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
          >
            <Package className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger
            value="surcharges"
            className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
          >
            <Percent className="w-4 h-4" />
            Surcharges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Service Pricing
                </CardTitle>
                <CardDescription>Configure pricing for each service type</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingPricing(null);
                  setShowPricingForm(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Service
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {loadingPricing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : servicePricing.length > 0 ? (
                <div className="space-y-3">
                  {servicePricing.map((pricing) => {
                    const margin =
                      pricing.price_per_kg > 0
                        ? (
                            ((pricing.price_per_kg - pricing.cost_per_kg) / pricing.price_per_kg) *
                            100
                          ).toFixed(1)
                        : 0;
                    const serviceType = SERVICE_TYPES.find((s) => s.value === pricing.service_type);
                    const ServiceIcon = serviceType?.icon || Package;

                    return (
                      <div
                        key={pricing.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-xl group-hover:scale-105 transition-transform">
                            <ServiceIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {pricing.display_name || pricing.service_type?.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <span className="text-rose-500">Cost:</span> ฿{pricing.cost_per_kg}
                                /kg
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="text-blue-500">Price:</span> ฿
                                {pricing.price_per_kg}/kg
                              </span>
                              <span>•</span>
                              <span
                                className={cn(
                                  'font-medium',
                                  margin > 20
                                    ? 'text-emerald-600'
                                    : margin > 10
                                      ? 'text-amber-600'
                                      : 'text-rose-600'
                                )}
                              >
                                {margin}% margin
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              'font-medium',
                              pricing.is_active !== false
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            )}
                          >
                            {pricing.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPricing(pricing);
                              setShowPricingForm(true);
                            }}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          >
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            onClick={() => setPricingToDelete(pricing)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full inline-block mb-4">
                    <Package className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 mb-4">No service pricing configured</p>
                  <Button onClick={() => setShowPricingForm(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Service
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surcharges" className="mt-4">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="w-5 h-5 text-amber-600" />
                  Surcharges & Fees
                </CardTitle>
                <CardDescription>Additional charges applied to orders</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSurcharge(null);
                  setShowSurchargeForm(true);
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Surcharge
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {loadingSurcharges ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : surcharges.length > 0 ? (
                <div className="space-y-3">
                  {surcharges.map((surcharge) => (
                    <div
                      key={surcharge.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-xl group-hover:scale-105 transition-transform">
                          <Percent className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {surcharge.name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="font-semibold text-amber-600">
                              {surcharge.surcharge_type === 'fixed'
                                ? `฿${surcharge.amount}`
                                : `${surcharge.amount}%`}
                            </span>
                            <span>•</span>
                            <span className="capitalize">Applies to: {surcharge.applies_to}</span>
                            {surcharge.description && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400">{surcharge.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            'font-medium',
                            surcharge.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          )}
                        >
                          {surcharge.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingSurcharge(surcharge);
                            setShowSurchargeForm(true);
                          }}
                          className="hover:bg-amber-50 dark:hover:bg-amber-900/30"
                        >
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          onClick={() => setSurchargeToDelete(surcharge)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full inline-block mb-4">
                    <Percent className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 mb-4">No surcharges configured</p>
                  <Button onClick={() => setShowSurchargeForm(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Surcharge
                  </Button>
                </div>
              )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {editingPricing ? 'Edit Service Pricing' : 'Add Service Pricing'}
            </DialogTitle>
            <DialogDescription>Configure pricing for a service type</DialogDescription>
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
            isSubmitting={createPricingMutation.isPending || updatePricingMutation.isPending}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-600" />
              {editingSurcharge ? 'Edit Surcharge' : 'Add Surcharge'}
            </DialogTitle>
            <DialogDescription>Configure additional fees and surcharges</DialogDescription>
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
            isSubmitting={createSurchargeMutation.isPending || updateSurchargeMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Pricing Confirmation Dialog */}
      <AlertDialog open={!!pricingToDelete} onOpenChange={() => setPricingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Pricing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the pricing for "
              {pricingToDelete?.display_name || pricingToDelete?.service_type}". This action cannot
              be undone.
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
            <AlertDialogTitle>Delete Surcharge?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the surcharge "{surchargeToDelete?.name}". This action
              cannot be undone.
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

function PricingForm({ pricing, onSubmit, onCancel, isSubmitting }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      service_type: pricing?.service_type || 'cargo_medium',
      display_name: pricing?.display_name || '',
      cost_per_kg: pricing?.cost_per_kg || 0,
      price_per_kg: pricing?.price_per_kg || 0,
      min_weight: pricing?.min_weight || 0,
      max_weight: pricing?.max_weight || '',
      insurance_rate: pricing?.insurance_rate || 2,
      packaging_fee: pricing?.packaging_fee || 0,
      is_active: pricing?.is_active !== false,
    },
  });

  const watchedValues = watch();

  const margin =
    watchedValues.price_per_kg > 0
      ? (
          ((watchedValues.price_per_kg - watchedValues.cost_per_kg) / watchedValues.price_per_kg) *
          100
        ).toFixed(1)
      : 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service Type</Label>
          <Controller
            name="service_type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          {t.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input {...register('display_name')} placeholder="e.g. Standard Cargo" className="h-11" />
        </div>
      </div>

      <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Cost per kg
              <span className="text-xs text-slate-400">(฿)</span>
            </Label>
            <Input type="number" step="0.01" {...register('cost_per_kg')} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Price per kg
              <span className="text-xs text-slate-400">(฿)</span>
            </Label>
            <Input type="number" step="0.01" {...register('price_per_kg')} className="h-11" />
          </div>
        </div>

        {watchedValues.price_per_kg > 0 && (
          <div
            className={cn(
              'mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-center',
              margin > 20 ? 'text-emerald-600' : margin > 10 ? 'text-amber-600' : 'text-rose-600'
            )}
          >
            <span className="text-sm font-medium">Profit Margin: </span>
            <span className="text-lg font-bold">{margin}%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Min Weight
            <span className="text-xs text-slate-400">(kg)</span>
          </Label>
          <Input type="number" step="0.1" {...register('min_weight')} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Max Weight
            <span className="text-xs text-slate-400">(kg)</span>
          </Label>
          <Input
            type="number"
            step="0.1"
            {...register('max_weight')}
            placeholder="No limit"
            className="h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            Insurance Rate (%)
          </Label>
          <Input type="number" step="0.1" {...register('insurance_rate')} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Box className="w-4 h-4 text-slate-400" />
            Packaging Fee (฿)
          </Label>
          <Input type="number" step="1" {...register('packaging_fee')} className="h-11" />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <Label className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-400" />
          Active
        </Label>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function SurchargeForm({ surcharge, onSubmit, onCancel, isSubmitting }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(surchargeFormSchema),
    defaultValues: {
      name: surcharge?.name || '',
      surcharge_type: surcharge?.surcharge_type || 'fixed',
      amount: surcharge?.amount || 0,
      applies_to: surcharge?.applies_to || 'all',
      description: surcharge?.description || '',
      is_active: surcharge?.is_active !== false,
    },
  });

  const watchedValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
      <div className="space-y-2">
        <Label>
          Surcharge Name <span className="text-rose-500">*</span>
        </Label>
        <Input
          {...register('name')}
          placeholder="e.g. Fuel Surcharge"
          className={cn('h-11', errors.name && 'border-rose-500')}
        />
        {errors.name && (
          <p className="text-xs text-rose-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Controller
            name="surcharge_type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount (฿)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="flex items-center gap-2">
            <Input type="number" step="0.01" {...register('amount')} className="h-11" />
            <span className="text-slate-500 font-medium w-8">
              {watchedValues.surcharge_type === 'fixed' ? '฿' : '%'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Applies To</Label>
        <Controller
          name="applies_to"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="cargo">Cargo Only</SelectItem>
                <SelectItem value="shopping">Shopping Only</SelectItem>
                <SelectItem value="express">Express Only</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input {...register('description')} placeholder="Optional description" className="h-11" />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <Label className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-400" />
          Active
        </Label>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </form>
  );
}
