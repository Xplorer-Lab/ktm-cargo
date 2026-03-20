import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportTicketSchema } from '@/domains/core/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { db } from '@/api/db';
import { sendMessengerNotification } from '@/api/integrations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  Clock,
  HelpCircle,
  AlertTriangle,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ISSUE_TYPES = [
  { value: 'tracking', label: 'Tracking Issue', icon: HelpCircle },
  { value: 'delivery', label: 'Delivery Problem', icon: AlertTriangle },
  { value: 'payment', label: 'Payment Question', icon: FileQuestion },
  { value: 'damage', label: 'Damaged Package', icon: AlertTriangle },
  { value: 'other', label: 'Other', icon: MessageSquare },
];

export default function CustomerSupport({ customer, user }) {
  const queryClient = useQueryClient();
  const { handleError, handleValidationError } = useErrorHandler();
  
  const form = useForm({
    resolver: zodResolver(supportTicketSchema.partial()),
    defaultValues: {
      category: '',
      comment: '',
    },
  });
  
  const [issueType, setIssueType] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets', customer?.id, user?.email],
    queryFn: async () => {
      if (customer?.id) {
        return db.supportTickets.filter({ customer_id: customer.id }, '-created_date');
      } else if (user?.email) {
        return db.supportTickets.filter({ customer_email: user.email }, '-created_date');
      }
      return [];
    },
    enabled: !!(customer?.id || user?.email),
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      try {
        const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

        // Validate data
        const ticketData = {
          customer_id: customer?.id,
          customer_name: customer?.name || user?.full_name,
          customer_email: customer?.email || user?.email,
          category: issueType,
          message: `${trackingNumber ? `Tracking: ${trackingNumber}\n\n` : ''}${message}`,
          subject,
          priority: issueType === 'delivery' ? 'high' : 'medium',
          status: 'pending',
          source: 'portal',
        };
        
        const validatedData = supportTicketSchema.partial().parse(ticketData);

        // Create support ticket
        await db.supportTickets.create({
          ...validatedData,
          ticket_number: ticketNumber,
        });

      // Send notification email
      try {
        await sendMessengerNotification({
          to: customer?.email || user?.email,
          message: `Support Ticket Created: ${ticketNumber}\n\nWe received your request.\nIssue: ${ISSUE_TYPES.find((t) => t.value === issueType)?.label}\nSubject: ${subject}\n\nWe will respond within 24 hours.`,
          platform: 'line'
        });
      } catch (_e) {
        console.error('Failed to send confirmation email', _e);
      }

        return ticketNumber;
      } catch (error) {
        if (error.name === 'ZodError') {
          throw error; // Let onError handle it
        }
        throw error;
      }
    },
    onSuccess: (ticketNumber) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success(`Ticket created: ${ticketNumber}`);
      setIssueType('');
      setSubject('');
      setMessage('');
      setTrackingNumber('');
      form.reset();
    },
    onError: (error) => {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Support Ticket');
      } else {
        handleError(error, 'Failed to create ticket', {
          component: 'CustomerSupport',
          action: 'createTicket',
        });
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!issueType || !subject || !message) {
      toast.error('Please fill in all required fields');
      return;
    }
    createTicketMutation.mutate();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* New Ticket Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Submit a Request
          </CardTitle>
          <CardDescription>Our team typically responds within 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label>Issue Type *</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tracking Number (if applicable)</Label>
              <Input
                placeholder="TRK-XXXXXX"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Please describe your issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={createTicketMutation.isPending}
            >
              {createTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Request
            </Button>
          </form>

          {/* Contact Info */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3">Other Ways to Reach Us</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>+66 81 234 5678</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>support@bkk-ygn-cargo.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Mon-Sat: 9:00 AM - 6:00 PM</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previous Tickets */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 border rounded-xl hover:bg-slate-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {ticket.ticket_number || `TKT-${ticket.id?.slice(-6)}`}
                      </p>
                      <p className="font-medium mt-1">{ticket.subject}</p>
                    </div>
                    <Badge
                      className={
                        ticket.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : ticket.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }
                    >
                      {ticket.status === 'resolved'
                        ? 'Resolved'
                        : ticket.status === 'in_progress'
                          ? 'In Progress'
                          : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{ticket.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {format(new Date(ticket.created_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No support tickets yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
