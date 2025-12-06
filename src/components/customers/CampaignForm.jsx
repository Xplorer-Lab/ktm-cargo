import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { campaignSchema } from '@/lib/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Megaphone, Users, Gift, Mail, MessageSquare } from 'lucide-react';

const segmentOptions = [
  { value: 'all', label: 'All Customers', description: 'Target everyone' },
  { value: 'individual', label: 'Individuals', description: 'Personal shippers' },
  { value: 'online_shopper', label: 'Online Shoppers', description: 'Shopping service users' },
  { value: 'sme_importer', label: 'SME Importers', description: 'Business customers' },
  { value: 'high_value', label: 'High Value', description: 'Top spending customers' },
  { value: 'inactive', label: 'Inactive', description: 'No orders in 30+ days' },
  { value: 'new_customers', label: 'New Customers', description: 'First-time users' },
];

const campaignTypes = [
  { value: 'discount', label: 'Discount Offer', icon: Gift },
  { value: 'referral', label: 'Referral Program', icon: Users },
  { value: 'promotion', label: 'General Promotion', icon: Megaphone },
  { value: 'announcement', label: 'Announcement', icon: MessageSquare },
  { value: 'loyalty', label: 'Loyalty Reward', icon: Gift },
];

const channels = [
  { value: 'all', label: 'All Channels' },
  { value: 'email', label: 'Email' },
  { value: 'line', label: 'LINE' },
  { value: 'facebook', label: 'Facebook Messenger' },
  { value: 'sms', label: 'SMS' },
];

const messageTemplates = {
  discount: `🎉 Special Offer for You!

Get {discount}% OFF your next shipment!
Use code: {code}

Valid until {end_date}

Book now: [link]`,
  referral: `📦 Share & Earn!

Refer a friend and BOTH get ฿50 off!
Your referral code: {code}

Share with friends today!`,
  promotion: `✨ Bangkok-Yangon Cargo

Fast & reliable shipping from Bangkok to Yangon.
Starting at just ฿95/kg!

📱 Contact us: [phone]`,
  announcement: `📢 Important Update

Dear valued customer,

{message}

Thank you for choosing us!`,
  loyalty: `⭐ Thank You for Being Loyal!

As one of our top customers, enjoy:
- {discount}% off all shipments
- Priority handling
- Free packaging

Code: {code}`,
};

export default function CampaignForm({ campaign, targetCount, onSubmit, onCancel }) {
  const { handleError, handleValidationError } = useErrorHandler();

  const form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: campaign?.name || '',
      description: campaign?.description || '',
      target_segment: campaign?.target_segment || 'all',
      campaign_type: campaign?.campaign_type || 'promotion',
      discount_percentage: campaign?.discount_percentage || 10,
      discount_code: campaign?.discount_code || '',
      message_template: campaign?.message_template || messageTemplates.promotion,
      channel: campaign?.channel || 'all',
      start_date: campaign?.start_date || '',
      end_date: campaign?.end_date || '',
      budget: campaign?.budget || 0,
    },
  });

  const handleTypeChange = (type) => {
    form.setValue('campaign_type', type);
    form.setValue('message_template', messageTemplates[type] || form.getValues('message_template'));
  };

  const handleFormSubmit = async (data) => {
    try {
      const validatedData = campaignSchema.parse({
        ...data,
        target_count: targetCount,
        discount_code: data.discount_code || `PROMO${Date.now().toString(36).toUpperCase()}`,
      });
      await onSubmit(validatedData);
    } catch (error) {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Campaign');
      } else {
        handleError(error, 'Failed to submit campaign', {
          component: 'CampaignForm',
          action: 'submit',
        });
      }
    }
  };

  const watchedValues = form.watch();
  const selectedSegment = segmentOptions.find((s) => s.value === watchedValues.target_segment);

  return (
    <Card className="border-0 shadow-xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between border-b sticky top-0 bg-white z-10">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-blue-600" />
          {campaign ? 'Edit Campaign' : 'Create Campaign'}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Campaign Name & Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                {...form.register('name')}
                placeholder="e.g., New Year Promotion"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                {...form.register('description')}
                placeholder="Brief description of the campaign"
              />
              {form.formState.errors.description && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Target Segment */}
          <div className="space-y-3">
            <Label>Target Segment</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {segmentOptions.map((segment) => (
                <button
                  key={segment.value}
                  type="button"
                  onClick={() => form.setValue('target_segment', segment.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${watchedValues.target_segment === segment.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-200'
                    }`}
                >
                  <p className="font-medium text-sm">{segment.label}</p>
                  <p className="text-xs text-slate-500">{segment.description}</p>
                </button>
              ))}
            </div>
            {form.formState.errors.target_segment && (
              <p className="text-xs text-rose-600 mt-1">{form.formState.errors.target_segment.message}</p>
            )}
            {targetCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  <strong>{targetCount}</strong> customers will receive this campaign
                </span>
              </div>
            )}
          </div>

          {/* Campaign Type */}
          <div className="space-y-3">
            <Label>Campaign Type</Label>
            <div className="flex flex-wrap gap-2">
              {campaignTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${watchedValues.campaign_type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-blue-200'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.campaign_type && (
              <p className="text-xs text-rose-600 mt-1">{form.formState.errors.campaign_type.message}</p>
            )}
          </div>

          {/* Discount Settings */}
          {(watchedValues.campaign_type === 'discount' || watchedValues.campaign_type === 'loyalty') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Percentage</Label>
                <Select
                  value={watchedValues.discount_percentage?.toString() || '10'}
                  onValueChange={(v) => form.setValue('discount_percentage', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.discount_percentage && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.discount_percentage.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Discount Code</Label>
                <Input
                  {...form.register('discount_code')}
                  placeholder="Auto-generated if empty"
                  onChange={(e) => {
                    form.setValue('discount_code', e.target.value.toUpperCase());
                  }}
                />
                {form.formState.errors.discount_code && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.discount_code.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Channel */}
          <div className="space-y-2">
            <Label>Distribution Channel</Label>
            <Select
              value={watchedValues.channel || 'all'}
              onValueChange={(v) => form.setValue('channel', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.channel && (
              <p className="text-xs text-rose-600 mt-1">{form.formState.errors.channel.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                {...form.register('start_date')}
              />
              {form.formState.errors.start_date && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                {...form.register('end_date')}
              />
              {form.formState.errors.end_date && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Message Template */}
          <div className="space-y-2">
            <Label>Message Template</Label>
            <Textarea
              {...form.register('message_template')}
              rows={6}
              className="font-mono text-sm"
            />
            {form.formState.errors.message_template && (
              <p className="text-xs text-rose-600 mt-1">{form.formState.errors.message_template.message}</p>
            )}
            <p className="text-xs text-slate-500">
              Use {'{discount}'}, {'{code}'}, {'{end_date}'} as placeholders
            </p>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label>Budget (THB)</Label>
            <Input
              type="number"
              {...form.register('budget', {
                valueAsNumber: true,
              })}
              placeholder="Optional"
            />
            {form.formState.errors.budget && (
              <p className="text-xs text-rose-600 mt-1">{form.formState.errors.budget.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              {campaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
