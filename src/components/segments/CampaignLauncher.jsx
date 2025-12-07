import React, { useState } from 'react';
import { db } from '@/api/db';
import { sendMessengerNotification } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mail, Send, Megaphone, Percent, Gift, Users, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CampaignLauncher({ targetCustomers, segment, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [form, setForm] = useState({
    name: segment?.name ? `${segment.name} Campaign` : '',
    description: '',
    campaign_type: 'promotion',
    discount_percentage: 10,
    discount_code: '',
    message_template: '',
    channel: 'email',
    send_immediately: true,
  });

  const customersWithEmail = targetCustomers.filter((c) => c.email);

  const generateDiscountCode = () => {
    const code = `PROMO${Date.now().toString(36).toUpperCase()}`;
    setForm({ ...form, discount_code: code });
  };

  const handleSendCampaign = async () => {
    setSending(true);
    let sent = 0;

    try {
      // Create campaign record
      // Validate campaign data before creating
      const { campaignSchema } = await import('@/lib/schemas');
      const campaignData = {
        name: form.name,
        description: form.description,
        campaign_type: form.campaign_type,
        target_segment: segment?.name || 'custom',
        discount_percentage: form.discount_percentage,
        discount_code: form.discount_code,
        message_template: form.message_template,
        channel: form.channel,
        // Note: status field doesn't exist in database
      };
      const validatedData = campaignSchema.parse(campaignData);
      const campaign = await db.campaigns.create(validatedData);

      // Send emails
      for (const customer of customersWithEmail) {
        try {
          const personalizedMessage = form.message_template
            .replace('{name}', customer.name || 'Valued Customer')
            .replace('{code}', form.discount_code)
            .replace('{discount}', form.discount_percentage);

          await sendMessengerNotification({
            to: customer.email,
            message: `${form.name}\n\n${personalizedMessage} ${form.discount_code ? `\n\nCode: ${form.discount_code} (${form.discount_percentage}% OFF)` : ''}`,
            platform: 'line'
          });
          sent++;
          setSentCount(sent);
        } catch (e) {
          console.error('Failed to send to', customer.email);
        }
      }

      // Note: sent_count field doesn't exist in database, track locally instead

      toast.success(`Campaign sent to ${sent} customers!`);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-500" />
          Launch Campaign
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sending ? (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto" />
            <p className="text-lg font-medium">Sending campaign...</p>
            <Progress value={(sentCount / customersWithEmail.length) * 100} className="h-2" />
            <p className="text-slate-500">
              {sentCount} of {customersWithEmail.length} emails sent
            </p>
          </div>
        ) : sentCount > 0 ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <p className="text-xl font-bold text-emerald-600">Campaign Sent!</p>
            <p className="text-slate-500">{sentCount} customers received your campaign</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Target Info */}
            <div className="p-4 bg-purple-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Target Audience</p>
                  <p className="text-sm text-purple-600">{segment?.name || 'Custom Selection'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-900">{targetCustomers.length}</p>
                <p className="text-xs text-purple-600">{customersWithEmail.length} with email</p>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Summer Sale 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select
                    value={form.campaign_type}
                    onValueChange={(v) => setForm({ ...form, campaign_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Discount Offer</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="referral">Referral Program</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="loyalty">Loyalty Reward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(form.campaign_type === 'discount' || form.campaign_type === 'promotion') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Discount %</Label>
                      <Input
                        type="number"
                        value={form.discount_percentage}
                        onChange={(e) =>
                          setForm({ ...form, discount_percentage: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={form.discount_code}
                          onChange={(e) =>
                            setForm({ ...form, discount_code: e.target.value.toUpperCase() })
                          }
                          placeholder="SUMMER20"
                        />
                        <Button type="button" variant="outline" onClick={generateDiscountCode}>
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)}>Next: Message</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Message *</Label>
                  <Textarea
                    value={form.message_template}
                    onChange={(e) => setForm({ ...form, message_template: e.target.value })}
                    placeholder="Write your message here. Use {name} for customer name, {code} for discount code, {discount} for discount percentage."
                    rows={6}
                  />
                  <p className="text-xs text-slate-500">
                    Available variables: {'{name}'}, {'{code}'}, {'{discount}'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSendCampaign}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={
                      !form.name || !form.message_template || customersWithEmail.length === 0
                    }
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to {customersWithEmail.length} customers
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
