import React, { useState } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  FileText,
  Search,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  CreditCard,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-800', icon: FileText },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-rose-100 text-rose-800', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600', icon: FileText },
};

import { Skeleton } from '@/components/ui/skeleton';

// ... other imports ...

export default function InvoiceList({ invoices = [], onMarkPaid, isLoading }) {
  const { handleError } = useErrorHandler();
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payConfirm, setPayConfirm] = useState({ open: false, invoice: null });

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.po_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalPending = invoices
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* ... (Summary cards logic remains, maybe add skeletons there too? For now focusing on list) ... */}
        {/* Actually, summary stats depend on data. If loading, they will be 0. It's better to show skeletons or just let them be 0 for now as they are less intrusive than "No invoices yet" */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{invoices.length}</p>}
                <p className="text-xs text-slate-500">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">฿{totalPending.toLocaleString()}</p>}
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">฿{totalOverdue.toLocaleString()}</p>}
                <p className="text-xs text-slate-500">{isLoading ? '' : `${overdueCount} Overdue`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{invoices.filter((i) => i.status === 'paid').length}</p>}
                <p className="text-xs text-slate-500">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Invoices</CardTitle>
              <CardDescription>Auto-generated from goods receipts</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => {
                const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                const daysUntilDue = invoice.due_date
                  ? differenceInDays(new Date(invoice.due_date), new Date())
                  : 0;

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                        <StatusIcon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invoice.invoice_number}</span>
                          <Badge className={config.color}>{config.label}</Badge>
                          {invoice.status === 'pending' &&
                            daysUntilDue <= 3 &&
                            daysUntilDue >= 0 && (
                              <Badge className="bg-amber-100 text-amber-800">Due Soon</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {invoice.vendor_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            PO: {invoice.po_number}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due:{' '}
                            {invoice.due_date
                              ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ฿{invoice.total_amount?.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {invoice.payment_terms?.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {['pending', 'overdue'].includes(invoice.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600"
                            onClick={() => setPayConfirm({ open: true, invoice })}
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No invoices yet</p>
              <p className="text-sm text-slate-400">
                Invoices are auto-generated when goods are received
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceDetail
              invoice={selectedInvoice}
              onMarkPaid={onMarkPaid}
              onClose={() => setSelectedInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog
        open={payConfirm.open}
        onOpenChange={(open) => setPayConfirm({ open, invoice: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
              <CreditCard className="w-5 h-5" />
              Mark Invoice as Paid
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark invoice{' '}
              <span className="font-semibold">{payConfirm.invoice?.invoice_number}</span> for{' '}
              <span className="font-semibold">
                ฿{payConfirm.invoice?.total_amount?.toLocaleString()}
              </span>{' '}
              as paid?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                try {
                  await onMarkPaid?.(payConfirm.invoice?.id);
                  setPayConfirm({ open: false, invoice: null });
                } catch (error) {
                  handleError(error, 'Failed to mark invoice as paid', {
                    component: 'InvoiceList',
                    action: 'markPaid',
                  });
                }
              }}
            >
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InvoiceDetail({ invoice, onMarkPaid, onClose }) {
  const { handleError } = useErrorHandler();
  const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
  let items = [];
  try {
    items = JSON.parse(invoice.items || '[]');
  } catch (e) {
    items = [];
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{invoice.invoice_number}</h3>
          <p className="text-sm text-slate-500">{invoice.vendor_name}</p>
        </div>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">PO Number</p>
          <p className="font-medium">{invoice.po_number}</p>
        </div>
        <div>
          <p className="text-slate-500">GR Number</p>
          <p className="font-medium">{invoice.receipt_number}</p>
        </div>
        <div>
          <p className="text-slate-500">Invoice Date</p>
          <p className="font-medium">
            {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM d, yyyy') : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Due Date</p>
          <p className="font-medium">
            {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Price</th>
                <th className="text-right p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  <td className="p-2 text-right">฿{item.unit_price?.toLocaleString()}</td>
                  <td className="p-2 text-right">฿{item.total?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>฿{invoice.subtotal?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax ({invoice.tax_rate}%)</span>
          <span>฿{invoice.tax_amount?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>฿{invoice.shipping_cost?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold pt-2 border-t">
          <span>Total</span>
          <span>฿{invoice.total_amount?.toLocaleString()}</span>
        </div>
      </div>

      {['pending', 'overdue'].includes(invoice.status) && (
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={async () => {
            try {
              await onMarkPaid?.(invoice.id);
              onClose?.();
            } catch (error) {
              handleError(error, 'Failed to mark invoice as paid', {
                component: 'InvoiceDetail',
                action: 'markPaid',
              });
            }
          }}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Mark as Paid
        </Button>
      )}
    </div>
  );
}
