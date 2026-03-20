import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Calendar,
  Loader2,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const PAYMENT_TERMS_DAYS = {
  immediate: 0,
  net_15: 15,
  net_30: 30,
  net_60: 60,
};

export default function PaymentAutomation({
  goodsReceipts = [],
  vendorPayments = [],
  vendors = [],
  onCreatePayment,
  onProcessPayment,
}) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_method: 'bank_transfer',
    reference_number: '',
  });

  // Calculate pending payments from goods receipts
  const pendingReceipts = goodsReceipts.filter((gr) => {
    const existingPayment = vendorPayments.find(
      (p) => p.order_ids?.includes(gr.id) || p.order_ids?.includes(gr.po_id)
    );
    return !existingPayment || existingPayment.status !== 'paid';
  });

  // Group by vendor
  const receiptsByVendor = pendingReceipts.reduce((acc, gr) => {
    if (!acc[gr.vendor_id]) {
      acc[gr.vendor_id] = {
        vendor_id: gr.vendor_id,
        vendor_name: gr.vendor_name,
        receipts: [],
        total: 0,
      };
    }
    acc[gr.vendor_id].receipts.push(gr);
    acc[gr.vendor_id].total += gr.total_value || 0;
    return acc;
  }, {});

  // Calculate due dates based on vendor payment terms
  const calculateDueDate = (receipt) => {
    const vendor = vendors.find((v) => v.id === receipt.vendor_id);
    const terms = vendor?.payment_terms || 'net_30';
    const days = PAYMENT_TERMS_DAYS[terms] || 30;
    return addDays(new Date(receipt.received_date), days);
  };

  // Get payment status based on due date
  const getPaymentUrgency = (receipt) => {
    const dueDate = calculateDueDate(receipt);
    const daysUntilDue = differenceInDays(dueDate, new Date());

    if (daysUntilDue < 0)
      return {
        status: 'overdue',
        color: 'bg-rose-100 text-rose-800',
        days: Math.abs(daysUntilDue),
      };
    if (daysUntilDue <= 3)
      return { status: 'due_soon', color: 'bg-amber-100 text-amber-800', days: daysUntilDue };
    return { status: 'upcoming', color: 'bg-slate-100 text-slate-800', days: daysUntilDue };
  };

  const handleSelectReceipt = (receiptId) => {
    setSelectedReceipts((prev) =>
      prev.includes(receiptId) ? prev.filter((id) => id !== receiptId) : [...prev, receiptId]
    );
  };

  const handleCreateBatchPayment = () => {
    if (selectedReceipts.length === 0) {
      toast.error('Please select at least one receipt');
      return;
    }
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = async () => {
    setProcessingPayment('batch');

    try {
      const selectedReceiptData = pendingReceipts.filter((r) => selectedReceipts.includes(r.id));
      const totalAmount = selectedReceiptData.reduce((sum, r) => sum + (r.total_value || 0), 0);
      const vendorId = selectedReceiptData[0]?.vendor_id;
      const vendorName = selectedReceiptData[0]?.vendor_name;

      await onCreatePayment?.({
        vendor_id: vendorId,
        vendor_name: vendorName,
        order_ids: selectedReceipts.join(','),
        total_amount: totalAmount,
        payment_terms: vendors.find((v) => v.id === vendorId)?.payment_terms || 'net_30',
        due_date: format(calculateDueDate(selectedReceiptData[0]), 'yyyy-MM-dd'),
        status: 'paid',
        payment_method: paymentDetails.payment_method,
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: paymentDetails.reference_number,
      });

      setShowPaymentDialog(false);
      setSelectedReceipts([]);
      toast.success('Payment processed successfully');
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const overdueCount = pendingReceipts.filter(
    (r) => getPaymentUrgency(r).status === 'overdue'
  ).length;
  const dueSoonCount = pendingReceipts.filter(
    (r) => getPaymentUrgency(r).status === 'due_soon'
  ).length;
  const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.total_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-xs text-blue-600 uppercase font-medium">Total Pending</p>
                <p className="text-2xl font-bold text-blue-900">฿{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReceipts.length}</p>
              <p className="text-xs text-slate-500">Pending Payments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dueSoonCount}</p>
              <p className="text-xs text-slate-500">Due Soon</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueCount}</p>
              <p className="text-xs text-slate-500">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Payment Queue</CardTitle>
            <CardDescription>Goods received pending payment</CardDescription>
          </div>
          {selectedReceipts.length > 0 && (
            <Button
              onClick={handleCreateBatchPayment}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Selected ({selectedReceipts.length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {pendingReceipts.length > 0 ? (
            <div className="space-y-3">
              {pendingReceipts.map((receipt) => {
                const urgency = getPaymentUrgency(receipt);
                const dueDate = calculateDueDate(receipt);

                return (
                  <div
                    key={receipt.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      selectedReceipts.includes(receipt.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-slate-50'
                    } hover:border-blue-200 transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedReceipts.includes(receipt.id)}
                        onCheckedChange={() => handleSelectReceipt(receipt.id)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{receipt.vendor_name}</p>
                          <Badge className={urgency.color}>
                            {urgency.status === 'overdue'
                              ? `${urgency.days} days overdue`
                              : urgency.status === 'due_soon'
                                ? `Due in ${urgency.days} days`
                                : `${urgency.days} days left`}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span>GR: {receipt.receipt_number}</span>
                          <span>•</span>
                          <span>PO: {receipt.po_number}</span>
                          <span>•</span>
                          <span>
                            Received: {format(new Date(receipt.received_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        ฿{receipt.total_value?.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        Due: {format(dueDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-500">All payments are up to date!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Items:</span>
                <span className="font-medium">{selectedReceipts.length} receipts</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-emerald-600">
                  ฿
                  {pendingReceipts
                    .filter((r) => selectedReceipts.includes(r.id))
                    .reduce((sum, r) => sum + (r.total_value || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentDetails.payment_method}
                onValueChange={(v) => setPaymentDetails({ ...paymentDetails, payment_method: v })}
              >
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
                value={paymentDetails.reference_number}
                onChange={(e) =>
                  setPaymentDetails({ ...paymentDetails, reference_number: e.target.value })
                }
                placeholder="Transaction/Check number"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={processingPayment === 'batch'}
              >
                {processingPayment === 'batch' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
