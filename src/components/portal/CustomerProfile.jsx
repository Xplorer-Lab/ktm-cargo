import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema } from '@/domains/core/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { db } from '@/api/db';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { User, Phone, Mail, MapPin, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerProfile({ customer, onUpdate }) {
  const { handleError, handleValidationError } = useErrorHandler();

  const form = useForm({
    resolver: zodResolver(customerSchema.partial()),
    defaultValues: {
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      address_bangkok: customer?.address_bangkok || '',
      address_yangon: customer?.address_yangon || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (!customer?.id) {
        throw new Error('No customer profile found');
      }
      const validatedData = customerSchema.partial().parse(data);
      return db.customers.update(customer.id, validatedData);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      onUpdate?.();
    },
    onError: (error) => {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Customer Profile');
      } else {
        handleError(error, 'Failed to update profile', {
          component: 'CustomerProfile',
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
        handleValidationError(error, 'Customer Profile');
      } else {
        handleError(error, 'Failed to submit form', {
          component: 'CustomerProfile',
          action: 'submit',
        });
      }
    }
  };

  if (!customer?.id) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="font-medium text-slate-900 mb-2">Profile Not Available</h3>
            <p className="text-slate-500">Your profile is being set up. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            My Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...form.register('name')} placeholder="Your full name" />
              {form.formState.errors.name && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Phone Number
                </Label>
                <Input {...form.register('phone')} placeholder="+66..." />
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
                <Input {...form.register('email')} type="email" placeholder="your@email.com" />
                {form.formState.errors.email && (
                  <p className="text-xs text-rose-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                Default Pickup Address (Bangkok)
              </Label>
              <Textarea
                {...form.register('address_bangkok')}
                placeholder="Your Bangkok address for pickups"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                Default Delivery Address (Yangon)
              </Label>
              <Textarea
                {...form.register('address_yangon')}
                placeholder="Your Yangon address for deliveries"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={updateMutation.isPending || form.formState.isSubmitting}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
