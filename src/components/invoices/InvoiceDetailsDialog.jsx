import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle, Ban, Send, FileText, CreditCard } from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-800' },
  issued: { label: 'Issued', color: 'bg-blue-100 text-blue-800' },
  sent: { label: 'Sent', color: 'bg-purple-100 text-purple-800' },
  partially_paid: { label: 'Partial', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  void: { label: 'Void', color: 'bg-rose-100 text-rose-800' },
};

const TYPE_CONFIG = {
  shipment: { label: 'Shipment', color: 'bg-blue-100 text-blue-800' },
  shopping_order: { label: 'Shopping Order', color: 'bg-purple-100 text-purple-800' },
};

function deriveLineItems(invoice) {
  if (invoice.items?.length) return invoice.items;
  const items = [];
  if (invoice.shipping_amount > 0)
    items.push({ description: 'Cargo Shipping', quantity: 1, unit_price: invoice.shipping_amount });
  if (invoice.product_cost > 0)
    items.push({ description: 'Product Cost', quantity: 1, unit_price: invoice.product_cost });
  if (invoice.commission_amount > 0)
    items.push({
      description: 'Service Commission',
      quantity: 1,
      unit_price: invoice.commission_amount,
    });
  if (invoice.insurance_amount > 0)
    items.push({ description: 'Insurance', quantity: 1, unit_price: invoice.insurance_amount });
  if (invoice.packaging_fee > 0)
    items.push({ description: 'Packaging', quantity: 1, unit_price: invoice.packaging_fee });
  return items;
}

export default function InvoiceDetailsDialog({ invoice, companySettings, onPrint, onAction }) {
  const typeConfig = TYPE_CONFIG[invoice.invoice_type] || TYPE_CONFIG.shipment;
  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const lineItems = deriveLineItems(invoice);
  const isOverdue =
    invoice.due_date &&
    new Date(invoice.due_date) < new Date() &&
    invoice.status !== 'paid' &&
    invoice.status !== 'void';

  return (
    <div className="space-y-6 mt-4">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900">{invoice.invoice_number}</h2>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            {isOverdue && <Badge className="bg-rose-100 text-rose-800">Overdue</Badge>}
          </div>
          <p className="text-sm font-medium text-slate-900">{invoice.customer_name}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-2xl font-bold text-slate-900">
            ฿{(invoice.total_amount || 0).toLocaleString()}
          </p>
          <p className="text-sm text-slate-500">
            Due: {invoice.due_date ? format(parseISO(invoice.due_date), 'MMM d, yyyy') : '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg text-sm">
        <div>
          <p className="text-slate-500 mb-1">Type</p>
          <Badge className={typeConfig.color} variant="outline">
            {typeConfig.label}
          </Badge>
        </div>
        <div>
          <p className="text-slate-500 mb-1">Date</p>
          <p className="font-medium">
            {invoice.invoice_date
              ? format(parseISO(invoice.invoice_date), 'MMM d, yyyy')
              : invoice.created_at
                ? format(parseISO(invoice.created_at), 'MMM d, yyyy')
                : '-'}
          </p>
        </div>
        {invoice.tracking_number && (
          <div>
            <p className="text-slate-500 mb-1">Tracking Number</p>
            <p className="font-medium">{invoice.tracking_number}</p>
          </div>
        )}
        {invoice.order_number && (
          <div>
            <p className="text-slate-500 mb-1">Order Number</p>
            <p className="font-medium">{invoice.order_number}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Line Items</h3>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Description</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Qty</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Rate</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-slate-900">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    ฿{item.unit_price?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    ฿{(item.quantity * item.unit_price)?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-medium text-slate-700">
                  Subtotal
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">
                  ฿{(invoice.subtotal || invoice.total_amount || 0).toLocaleString()}
                </td>
              </tr>
              {invoice.tax_amount > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-medium text-slate-700">
                    Tax ({invoice.tax_rate}%)
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    ฿{invoice.tax_amount.toLocaleString()}
                  </td>
                </tr>
              )}
              {invoice.discount_amount > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-medium text-rose-600">
                    Discount
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600 font-medium">
                    -฿{invoice.discount_amount.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-right font-bold text-slate-900 text-lg border-t"
                >
                  Total Due
                </td>
                <td className="px-4 py-3 text-right font-bold text-blue-700 text-lg border-t">
                  ฿{(invoice.total_amount || 0).toLocaleString()}
                </td>
              </tr>
              {/* Payment Info */}
              {invoice.status !== 'draft' && invoice.status !== 'void' && (
                <>
                  <tr className="border-t border-slate-200">
                    <td colSpan={3} className="px-4 py-2 text-right font-medium text-slate-600">
                      Amount Paid
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                      ฿{(invoice.amount_paid || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-slate-100">
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-900">
                      Balance Due
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      ฿{(invoice.balance_due ?? invoice.total_amount).toLocaleString()}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {invoice.notes && (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
          <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
            Notes
          </h4>
          <p className="text-sm text-amber-900 whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-4 border-t flex flex-wrap gap-2 justify-end">
        {invoice.status === 'draft' && (
          <Button
            onClick={() => onAction('issue', invoice)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Issue Invoice
          </Button>
        )}
        {['issued', 'sent', 'partially_paid'].includes(invoice.status) && (
          <>
            {invoice.status === 'issued' && (
              <Button
                onClick={() => onAction('send', invoice)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Mark as Sent
              </Button>
            )}
            <Button
              onClick={() => onAction('pay', invoice)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </>
        )}
        {invoice.status !== 'paid' && invoice.status !== 'void' && (
          <Button
            variant="outline"
            className="text-rose-600 border-rose-200"
            onClick={() => onAction('void', invoice)}
          >
            <Ban className="w-4 h-4 mr-2" />
            Void Invoice
          </Button>
        )}
        <Button variant="outline" onClick={onPrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print / PDF
        </Button>
      </div>
    </div>
  );
}
