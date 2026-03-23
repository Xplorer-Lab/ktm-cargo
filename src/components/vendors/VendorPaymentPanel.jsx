import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Calendar,
  FileText,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-rose-100 text-rose-800', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-800', icon: FileText },
};

export default function VendorPaymentPanel({ payments, onMarkPaid, onProcess }) {
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');

  const today = new Date();
  const pendingPayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'scheduled'
  );
  const overduePayments = payments.filter((p) => p.status === 'overdue');
  const totalPending = pendingPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalOverdue = overduePayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const handlePayClick = (payment) => {
    setSelectedPayment(payment);
    setPaymentMethod('bank_transfer');
    setReferenceNumber('');
    setShowPayDialog(true);
  };

  const handleConfirmPayment = () => {
    if (selectedPayment) {
      onMarkPaid(selectedPayment.id, paymentMethod, referenceNumber);
      setShowPayDialog(false);
      setSelectedPayment(null);
    }
  };

  const getDaysInfo = (payment) => {
    if (!payment.due_date) return null;
    const days = differenceInDays(new Date(payment.due_date), today);
    if (days < 0) return { text: `${Math.abs(days)} days overdue`, urgent: true };
    if (days === 0) return { text: 'Due today', urgent: true };
    if (days <= 3) return { text: `Due in ${days} days`, urgent: true };
    return { text: `Due in ${days} days`, urgent: false };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-sm text-slate-500">Pending Payments</p>
                <p className="text-2xl font-bold">฿{totalPending.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{pendingPayments.length} payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
              <div>
                <p className="text-sm text-rose-700">Overdue</p>
                <p className="text-2xl font-bold text-rose-900">฿{totalOverdue.toLocaleString()}</p>
                <p className="text-xs text-rose-600">{overduePayments.length} payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-center">
            <Button onClick={onProcess} variant="outline" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Process Unpaid Orders
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments
                .filter((p) => p.status !== 'paid')
                .map((payment) => {
                  const config = statusConfig[payment.status];
                  const StatusIcon = config?.icon || Clock;
                  const daysInfo = getDaysInfo(payment);

                  return (
                    <div
                      key={payment.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        payment.status === 'overdue'
                          ? 'border-rose-200 bg-rose-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${config?.color || 'bg-slate-100'}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.vendor_name}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>{payment.payment_terms?.replace('_', ' ')}</span>
                            {daysInfo && (
                              <span className={daysInfo.urgent ? 'text-rose-600 font-medium' : ''}>
                                • {daysInfo.text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            ฿{payment.total_amount?.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">Due: {payment.due_date}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handlePayClick(payment)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Pay
                        </Button>
                      </div>
                    </div>
                  );
                })}

              {/* Paid payments (collapsed) */}
              {payments.filter((p) => p.status === 'paid').length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">Recently Paid</p>
                  {payments
                    .filter((p) => p.status === 'paid')
                    .slice(0, 5)
                    .map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-2"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm">{payment.vendor_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">
                            ฿{payment.total_amount?.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            {payment.payment_date}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No payments scheduled</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedPayment.vendor_name}</p>
                <p className="text-2xl font-bold text-blue-600">
                  ฿{selectedPayment.total_amount?.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction ID or check number"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPayDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
