import { useState } from 'react';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { sendMessengerNotification } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Send, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorInviteSchema } from '@/domains/core/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';

function generateToken() {
  return 'VND' + crypto.randomUUID().replace(/-/g, '').toUpperCase();
}

export default function VendorInviteForm({ open, onOpenChange, onInviteSent }) {
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const { handleError } = useErrorHandler();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(vendorInviteSchema),
    defaultValues: {
      email: '',
      companyName: '',
    },
  });

  const email = watch('email');

  const onSubmit = async (data) => {
    setSending(true);
    try {
      const token = generateToken();
      const expiresAt = addDays(new Date(), 7);

      // Get current user
      let currentUser = null;
      try {
        currentUser = await auth.me();
      } catch (_e) {
        // Ignore
      }

      // Create invitation record
      await db.vendorInvitations.create({
        email: data.email,
        company_name: data.companyName,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invited_by: currentUser?.email || 'system',
      });

      // Generate invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/VendorRegistration?token=${token}`;
      setInviteLink(link);

      // Send invitation message
      await sendMessengerNotification({
        to: data.email,
        message: `Hello${data.companyName ? ` ${data.companyName}` : ''},\n\nYou have been invited to register as a vendor on our procurement portal.\n\nPlease click the link below to complete your registration:\n${link}\n\nThis invitation expires on ${format(expiresAt, 'MMMM d, yyyy')}.`,
        platform: 'Telegram',
      });

      toast.success('Invitation sent successfully!');
      onInviteSent?.();
    } catch (error) {
      handleError(error, 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copied to clipboard');
  };

  const handleClose = () => {
    reset();
    setInviteLink('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Invite Vendor
          </DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Vendor Email *</Label>
              <Input
                {...register('email')}
                placeholder="vendor@company.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Company Name (Optional)</Label>
              <Input {...register('companyName')} placeholder="Vendor Company Ltd." />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <p>The vendor will receive an email with a registration link valid for 7 days.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Invite
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-emerald-50 rounded-lg text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-emerald-800">Invitation Sent!</p>
              <p className="text-sm text-emerald-600 mt-1">Email sent to {email}</p>
            </div>

            <div className="space-y-2">
              <Label>Registration Link</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button type="button" variant="outline" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">Share this link if the email doesn't arrive</p>
            </div>

            <Button type="button" onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
