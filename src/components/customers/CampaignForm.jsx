import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { campaignSchema } from '@/domains/core/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Megaphone,
  Gift,
  Users,
  Percent,
  Tag,
  CalendarDays,
  Mail,
  MessageSquare,
  Send,
  Info,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Facebook,
  Phone,
  Zap,
  CheckCircle,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const campaignTypes = [
  {
    value: 'discount',
    label: 'Discount Offer',
    icon: Percent,
    color: 'from-emerald-500 to-teal-500',
    description: 'Percentage or fixed discount',
    template: 'Get {discount}% off your next shipment with code {code}! Valid until {end_date}.',
  },
  {
    value: 'referral',
    label: 'Referral Program',
    icon: Users,
    color: 'from-blue-500 to-indigo-500',
    description: 'Reward customer referrals',
    template:
      'Refer a friend and both of you get {discount}% off! Share code {code} with your friends.',
  },
  {
    value: 'promotion',
    label: 'Special Promotion',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    description: 'Limited time offers',
    template:
      '🎉 Special Promotion! {discount}% off all shipments. Use code {code} before {end_date}!',
  },
  {
    value: 'announcement',
    label: 'Announcement',
    icon: Megaphone,
    color: 'from-amber-500 to-orange-500',
    description: 'Service updates & news',
    template: '📢 Important Update: {message}',
  },
  {
    value: 'loyalty',
    label: 'Loyalty Reward',
    icon: Gift,
    color: 'from-rose-500 to-red-500',
    description: 'Reward loyal customers',
    template: 'Thank you for being a valued customer! Enjoy {discount}% off with code {code}. 💝',
  },
];

const targetSegments = [
  { value: 'all', label: 'All Customers', description: 'Everyone in your database' },
  { value: 'new', label: 'New Customers', description: 'Customers with < 3 orders' },
  { value: 'inactive', label: 'Inactive Customers', description: 'No orders in 30+ days' },
  { value: 'vip', label: 'VIP Customers', description: '10+ orders or high spend' },
  { value: 'online_shoppers', label: 'Online Shoppers', description: 'Shopping assistance users' },
  { value: 'cargo_users', label: 'Cargo Users', description: 'Direct cargo shippers' },
];

const channels = [
  { value: 'all', label: 'All Channels', icon: Send },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'line', label: 'LINE', icon: MessageSquare },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'sms', label: 'SMS', icon: Phone },
];

export default function CampaignForm({ campaign, customers = [], onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      campaign_type: 'discount',
      target_segment: 'all',
      discount_percentage: 10,
      discount_code: '',
      message_template: '',
      channel: 'all',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      budget: '',
      description: '',
      ...campaign,
    },
  });

  const watchedValues = watch();

  // Generate discount code if empty
  useEffect(() => {
    if (!watchedValues.discount_code && watchedValues.campaign_type !== 'announcement') {
      const code = `${watchedValues.campaign_type?.toUpperCase().slice(0, 4) || 'SAVE'}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setValue('discount_code', code);
    }
  }, [watchedValues.campaign_type, watchedValues.discount_code, setValue]);

  // Update message template when campaign type changes
  useEffect(() => {
    const selectedType = campaignTypes.find((t) => t.value === watchedValues.campaign_type);
    if (selectedType && !campaign?.message_template) {
      const template = selectedType.template
        .replace('{discount}', watchedValues.discount_percentage || '10')
        .replace('{code}', watchedValues.discount_code || 'CODE')
        .replace('{end_date}', watchedValues.end_date || 'the end of campaign')
        .replace('{message}', watchedValues.description || 'Check out our latest updates!');
      setValue('message_template', template);
    }
  }, [
    watchedValues.campaign_type,
    watchedValues.discount_percentage,
    watchedValues.discount_code,
    watchedValues.end_date,
    watchedValues.description,
    campaign,
    setValue,
  ]);

  // Calculate targeted customers
  const targetedCustomers = useMemo(() => {
    const segment = watchedValues.target_segment;
    if (!customers.length) return 0;

    switch (segment) {
      case 'new':
        return customers.filter((c) => (c.total_shipments || 0) < 3).length;
      case 'inactive': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return customers.filter(
          (c) => !c.last_order_date || new Date(c.last_order_date) < thirtyDaysAgo
        ).length;
      }
      case 'vip':
        return customers.filter(
          (c) => (c.total_shipments || 0) >= 10 || (c.total_spent || 0) > 50000
        ).length;
      case 'online_shoppers':
        return customers.filter((c) => c.customer_type === 'online_shopper').length;
      case 'cargo_users':
        return customers.filter(
          (c) => c.customer_type === 'individual' || c.customer_type === 'sme_importer'
        ).length;
      default:
        return customers.length;
    }
  }, [customers, watchedValues.target_segment]);

  const selectedCampaignType = campaignTypes.find((t) => t.value === watchedValues.campaign_type);

  const copyDiscountCode = () => {
    navigator.clipboard.writeText(watchedValues.discount_code || '');
    toast.success('Discount code copied!');
  };

  const onFormSubmit = async (data) => {
    await onSubmit(data);
  };

  return (
    <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="border-b bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {campaign ? 'Edit Campaign' : 'Create Campaign'}
            </CardTitle>
            <CardDescription>
              {campaign ? `Editing ${campaign.name}` : 'Design a new marketing campaign'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              Campaign Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              {...register('name')}
              placeholder="Enter campaign name"
              className={cn('h-11', errors.name && 'border-rose-500')}
            />
            {errors.name && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Campaign Type Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-400" />
              Campaign Type
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {campaignTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = watchedValues.campaign_type === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue('campaign_type', type.value)}
                    className={cn(
                      'relative p-4 rounded-xl border-2 text-left transition-all duration-200 group',
                      isSelected
                        ? 'border-transparent bg-gradient-to-br text-white shadow-lg'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                    style={
                      isSelected
                        ? {
                            backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                          }
                        : {}
                    }
                  >
                    <div
                      className={cn(
                        'absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity',
                        type.color
                      )}
                    />
                    {isSelected && (
                      <div
                        className={cn('absolute inset-0 rounded-xl bg-gradient-to-br', type.color)}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    <div className="relative">
                      <Icon
                        className={cn('w-6 h-6 mb-2', isSelected ? 'text-white' : 'text-slate-500')}
                      />
                      <p
                        className={cn(
                          'font-semibold text-sm',
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        )}
                      >
                        {type.label}
                      </p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          isSelected ? 'text-white/80' : 'text-slate-500'
                        )}
                      >
                        {type.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-white" />
                    )}
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register('campaign_type')} />
          </div>

          {/* Target Segment & Reach */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-400" />
                Target Segment
              </Label>
              <Controller
                name="target_segment"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetSegments.map((seg) => (
                        <SelectItem key={seg.value} value={seg.value}>
                          <div className="flex flex-col">
                            <span>{seg.label}</span>
                            <span className="text-xs text-slate-500">{seg.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Estimated Reach</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {targetedCustomers.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">customers will receive this campaign</p>
                </div>
              </div>
            </div>
          </div>

          {/* Discount & Code (hide for announcements) */}
          {watchedValues.campaign_type !== 'announcement' && (
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-4">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Discount Settings
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      {...register('discount_percentage')}
                      className="h-11"
                    />
                    <span className="text-slate-500 font-medium">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Discount Code</Label>
                  <div className="flex gap-2">
                    <Input
                      {...register('discount_code')}
                      placeholder="AUTO-GENERATED"
                      className="h-11 font-mono uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyDiscountCode}
                      className="h-11 w-11"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                Start Date
              </Label>
              <Input type="date" {...register('start_date')} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                End Date
              </Label>
              <Input type="date" {...register('end_date')} className="h-11" />
            </div>
          </div>

          {/* Distribution Channel */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-400" />
              Distribution Channel
            </Label>
            <div className="flex flex-wrap gap-2">
              {channels.map((ch) => {
                const Icon = ch.icon;
                const isSelected = watchedValues.channel === ch.value;

                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setValue('channel', ch.value)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{ch.label}</span>
                    {isSelected && <CheckCircle className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register('channel')} />
          </div>

          {/* Message Template */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Message Template
            </Label>
            <Textarea
              {...register('message_template')}
              placeholder="Your campaign message..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Use {'{discount}'}, {'{code}'}, {'{end_date}'} as placeholders
            </p>
          </div>

          {/* Message Preview */}
          {watchedValues.message_template && (
            <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Preview</p>
              <p className="text-white whitespace-pre-wrap">{watchedValues.message_template}</p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Internal Description</Label>
            <Textarea
              {...register('description')}
              placeholder="Internal notes about this campaign..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                'flex-1 text-white shadow-lg',
                selectedCampaignType
                  ? `bg-gradient-to-r ${selectedCampaignType.color}`
                  : 'bg-gradient-to-r from-amber-500 to-orange-600'
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {campaign ? 'Update Campaign' : 'Create Campaign'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
