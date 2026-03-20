import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorSchema } from '@/domains/core/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { db } from '@/api/db';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Phone, Mail, CreditCard, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorProfile({ vendor, onUpdate }) {
  const { handleError, handleValidationError } = useErrorHandler();

  const form = useForm({
    resolver: zodResolver(vendorSchema.partial()),
    defaultValues: {
      name: vendor?.name || '',
      vendor_type: vendor?.vendor_type || 'supplier',
      contact_name: vendor?.contact_name || '',
      phone: vendor?.phone || '',
      email: vendor?.email || '',
      address: vendor?.address || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const validatedData = vendorSchema.partial().parse(data);
      return db.vendors.update(vendor.id, validatedData);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      onUpdate?.();
    },
    onError: (error) => {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Vendor Profile');
      } else {
        handleError(error, 'Failed to update profile', {
          component: 'VendorProfile',
          action: 'update',
        });
      }
    },
  });

  const handleFormSubmit = async (data) => {
    try {
      updateMutation.mutate(data);
    } catch (error) {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Vendor Profile');
      } else {
        handleError(error, 'Failed to submit form', {
          component: 'VendorProfile',
          action: 'submit',
        });
      }
    }
  };

  if (!vendor?.id) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="font-medium text-slate-900 mb-2">Profile Not Available</h3>
            <p className="text-slate-500">Your vendor profile is being set up.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{vendor?.name}</p>
                <p className="text-sm text-slate-500">{vendor?.vendor_type?.replace('_', ' ')}</p>
              </div>
            </div>
            <Badge
              className={
                vendor?.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : vendor?.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
              }
            >
              {vendor?.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input {...form.register('name')} placeholder="Company name" />
                {form.formState.errors.name && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Vendor Type</Label>
                <Select
                  value={form.watch('vendor_type') || 'supplier'}
                  onValueChange={(v) => form.setValue('vendor_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cargo_carrier">Cargo Carrier</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="customs_broker">Customs Broker</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.vendor_type && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.vendor_type.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Address</Label>
              <Textarea {...form.register('address')} rows={2} />
              {form.formState.errors.address && (
                <p className="text-xs text-rose-600 mt-1">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input {...form.register('tax_id')} />
              {form.formState.errors.tax_id && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.tax_id.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input {...form.register('contact_name')} />
              {form.formState.errors.contact_name && (
                <p className="text-xs text-rose-600 mt-1">
                  {form.formState.errors.contact_name.message}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Phone
                </Label>
                <Input {...form.register('phone')} />
                {form.formState.errors.phone && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email
                </Label>
                <Input type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Banking Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input {...form.register('bank_name')} />
              {form.formState.errors.bank_name && (
                <p className="text-xs text-rose-600 mt-1">
                  {form.formState.errors.bank_name.message}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input {...form.register('bank_account_number')} />
                {form.formState.errors.bank_account_number && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.bank_account_number.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input {...form.register('bank_account_name')} />
                {form.formState.errors.bank_account_name && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.bank_account_name.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select
                value={form.watch('payment_terms') || 'net_30'}
                onValueChange={(v) => form.setValue('payment_terms', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="net_15">Net 15 Days</SelectItem>
                  <SelectItem value="net_30">Net 30 Days</SelectItem>
                  <SelectItem value="net_60">Net 60 Days</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.payment_terms && (
                <p className="text-xs text-rose-600 mt-1">
                  {form.formState.errors.payment_terms.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea {...form.register('services')} rows={3} />
            {form.formState.errors.services && (
              <p className="text-xs text-rose-600 mt-1">{form.formState.errors.services.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
