import { useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  partially_paid: { label: 'Partially Paid', color: 'bg-blue-100 text-blue-700', icon: Clock },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: AlertTriangle },
};

/**
 * Generate a printable HTML invoice and open it in a new window for print / save-as-PDF.
 */
function openPrintableInvoice(invoice, companySettings) {
  const companyName = companySettings?.company_name || 'KTM Cargo Express';
  const companyAddress = companySettings?.address || '';
  const companyPhone = companySettings?.phone || '';
  const companyEmail = companySettings?.email || '';

  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  const lineItemsHtml =
    lineItems.length > 0
      ? lineItems
          .map(
            (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${item.description || item.label || '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">฿${Number(item.amount || 0).toLocaleString()}</td>
        </tr>
      `
          )
          .join('')
      : `<tr><td colspan="2" style="padding:8px;text-align:center;color:#94a3b8;">No line items</td></tr>`;

  // Payment info from company settings or sensible fallback
  const bankName = companySettings?.bank_name;
  const bankAccount = companySettings?.bank_account;
  const promptPayId = companySettings?.promptpay_id;

  let paymentHtml = '';
  if (bankName || bankAccount || promptPayId) {
    const lines = [];
    if (promptPayId) lines.push(`PromptPay: ${promptPayId}`);
    if (bankName && bankAccount) lines.push(`${bankName}: ${bankAccount}`);
    lines.push('Cash on pickup');
    paymentHtml = `<div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px;">
      <p style="font-weight:600;color:#1e40af;margin:0 0 8px 0;">Payment Methods</p>
      <ul style="list-style:none;padding:0;margin:0;color:#1e40af;font-size:14px;">
        ${lines.map((l) => `<li style="margin-bottom:4px;">${l}</li>`).join('')}
      </ul>
    </div>`;
  } else {
    paymentHtml = `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;">
      <p style="color:#64748b;margin:0;">Please contact us for payment details.</p>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:40px; color:#1e293b; max-width:700px; margin:0 auto; }
    @media print { body { padding:20px; } .no-print { display:none; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
    <div>
      <h1 style="margin:0;font-size:28px;">${companyName}</h1>
      ${companyAddress ? `<p style="color:#64748b;margin:4px 0;">${companyAddress}</p>` : ''}
      ${companyPhone ? `<p style="color:#64748b;margin:2px 0;">Tel: ${companyPhone}</p>` : ''}
      ${companyEmail ? `<p style="color:#64748b;margin:2px 0;">${companyEmail}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <h2 style="margin:0;font-size:24px;color:#2563eb;">INVOICE</h2>
      <p style="font-family:monospace;font-size:16px;margin:4px 0;">${invoice.invoice_number}</p>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:24px;font-size:14px;">
    <div>
      <p style="color:#64748b;margin:0;">Invoice Date</p>
      <p style="font-weight:600;margin:2px 0;">${invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMMM d, yyyy') : '—'}</p>
    </div>
    <div>
      <p style="color:#64748b;margin:0;">Due Date</p>
      <p style="font-weight:600;margin:2px 0;">${invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : '—'}</p>
    </div>
    <div>
      <p style="color:#64748b;margin:0;">Status</p>
      <p style="font-weight:600;margin:2px 0;text-transform:uppercase;">${invoice.status || 'pending'}</p>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:10px 8px;text-align:left;font-weight:600;">Description</th>
        <th style="padding:10px 8px;text-align:right;font-weight:600;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td style="padding:12px 8px;font-weight:700;font-size:16px;border-top:2px solid #1e293b;">Total</td>
        <td style="padding:12px 8px;font-weight:700;font-size:16px;text-align:right;border-top:2px solid #1e293b;color:#2563eb;">฿${Number(invoice.total_amount || 0).toLocaleString()}</td>
      </tr>
    </tfoot>
  </table>

  ${invoice.notes ? `<p style="font-size:13px;color:#64748b;margin-top:8px;">Notes: ${invoice.notes}</p>` : ''}

  ${paymentHtml}

  <div class="no-print" style="margin-top:32px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Print / Save PDF</button>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

const INVOICES_PAGE_SIZE = 20;

export default function CustomerInvoices({ customer, companySettings }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [page, setPage] = useState(0);

  // Fetch real invoices from the customer_invoices table
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['customer-invoices', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      return db.customerInvoices.filter({ customer_id: customer.id }, '-invoice_date');
    },
    enabled: !!customer?.id,
  });

  // Derive status for display (respect DB status, add overdue check)
  const invoicesWithStatus = invoices.map((inv) => {
    let displayStatus = inv.status || 'pending';
    if (displayStatus === 'pending' && inv.due_date && new Date(inv.due_date) < new Date()) {
      displayStatus = 'overdue';
    }
    return { ...inv, displayStatus };
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(invoicesWithStatus.length / INVOICES_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedInvoices = invoicesWithStatus.slice(
    currentPage * INVOICES_PAGE_SIZE,
    (currentPage + 1) * INVOICES_PAGE_SIZE
  );

  const pendingTotal = invoicesWithStatus
    .filter((i) => i.displayStatus !== 'paid' && i.displayStatus !== 'cancelled')
    .reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
  const paidTotal = invoicesWithStatus
    .filter((i) => i.displayStatus === 'paid')
    .reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  // Payment details from company settings
  const bankName = companySettings?.bank_name;
  const bankAccount = companySettings?.bank_account;
  const promptPayId = companySettings?.promptpay_id;

  const hasPaymentDetails = !!(bankName || bankAccount || promptPayId);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">฿{pendingTotal.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Pending Payment</p>
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
                <p className="text-2xl font-bold">฿{paidTotal.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoicesWithStatus.length}</p>
                <p className="text-xs text-slate-500">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : paginatedInvoices.length > 0 ? (
            <div className="space-y-3">
              {paginatedInvoices.map((invoice) => {
                const status = STATUS_CONFIG[invoice.displayStatus] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${status.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-mono font-medium">{invoice.invoice_number}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {invoice.invoice_date
                            ? format(new Date(invoice.invoice_date), 'MMM d, yyyy')
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">
                          ฿{Number(invoice.total_amount || 0).toLocaleString()}
                        </p>
                        {invoice.displayStatus === 'partially_paid' && invoice.balance_due > 0 && (
                          <p className="text-xs text-rose-600 font-medium">
                            Due: ฿{Number(invoice.balance_due).toLocaleString()}
                          </p>
                        )}
                        <Badge className={`mt-1 ${status.color}`}>{status.label}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPrintableInvoice(invoice, companySettings)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No invoices yet</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <p className="text-sm text-slate-500">
                Showing {currentPage * INVOICES_PAGE_SIZE + 1}–
                {Math.min((currentPage + 1) * INVOICES_PAGE_SIZE, invoicesWithStatus.length)} of{' '}
                {invoicesWithStatus.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <span className="text-sm text-slate-600 px-2">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="font-mono text-xl font-bold">{selectedInvoice.invoice_number}</p>
                <Badge className={STATUS_CONFIG[selectedInvoice.displayStatus]?.color}>
                  {STATUS_CONFIG[selectedInvoice.displayStatus]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Invoice Date</p>
                  <p className="font-medium">
                    {selectedInvoice.invoice_date
                      ? format(new Date(selectedInvoice.invoice_date), 'MMM d, yyyy')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Due Date</p>
                  <p className="font-medium">
                    {selectedInvoice.due_date
                      ? format(new Date(selectedInvoice.due_date), 'MMM d, yyyy')
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              {Array.isArray(selectedInvoice.line_items) &&
                selectedInvoice.line_items.length > 0 && (
                  <div className="border-t pt-4 space-y-2 text-sm">
                    {selectedInvoice.line_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-slate-500">
                          {item.description || item.label || '—'}
                        </span>
                        <span>฿{Number(item.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal</span>
                  <span>฿{Number(selectedInvoice.total_amount || 0).toLocaleString()}</span>
                </div>
                {selectedInvoice.amount_paid > 0 && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span>Already Paid</span>
                    <span>-฿{Number(selectedInvoice.amount_paid).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-medium">Balance Due</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ฿
                    {(selectedInvoice.balance_due !== undefined
                      ? Number(selectedInvoice.balance_due)
                      : Number(selectedInvoice.total_amount || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <p className="text-sm text-slate-500">Notes: {selectedInvoice.notes}</p>
              )}

              {selectedInvoice.displayStatus !== 'paid' && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-medium text-blue-800 mb-2">Payment Methods</p>
                  {hasPaymentDetails ? (
                    <ul className="text-sm text-blue-700 space-y-1">
                      {promptPayId && <li>PromptPay: {promptPayId}</li>}
                      {bankName && bankAccount && (
                        <li>
                          Bank Transfer: {bankName} {bankAccount}
                        </li>
                      )}
                      <li>Cash on pickup</li>
                    </ul>
                  ) : (
                    <p className="text-sm text-blue-700">Please contact us for payment details.</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openPrintableInvoice(selectedInvoice, companySettings)}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openPrintableInvoice(selectedInvoice, companySettings)}
                >
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
