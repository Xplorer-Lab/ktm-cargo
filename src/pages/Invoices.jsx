import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  FileText,
  Package,
  ShoppingBag,
  Calendar as CalendarIcon,
  DollarSign,
  User,
  Printer,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  HelpCircle,
} from 'lucide-react';
import { format, parseISO, isWithinInterval, subDays } from 'date-fns';
import { toast } from 'sonner';
import { printDocument } from '@/utils/documentPrinter';
import InvoiceTemplate from '@/components/documents/templates/InvoiceTemplate';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-800', icon: FileText },
  issued: { label: 'Issued', color: 'bg-blue-100 text-blue-800', icon: FileText },
  sent: { label: 'Sent', color: 'bg-purple-100 text-purple-800', icon: Send },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  void: { label: 'Void', color: 'bg-rose-100 text-rose-800', icon: XCircle },
};

const TYPE_CONFIG = {
  shipment: { label: 'Shipment', color: 'bg-blue-100 text-blue-800', icon: Package },
  shopping_order: {
    label: 'Shopping Order',
    color: 'bg-purple-100 text-purple-800',
    icon: ShoppingBag,
  },
};

import { startTour } from '@/components/common/TourGuide';

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 365),
    to: new Date(),
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: () => db.customerInvoices.list('-created_at', 500),
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const list = await db.companySettings.list();
      return list[0] || null;
    },
  });

  // Stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const shipmentInvoices = invoices.filter((i) => i.invoice_type !== 'shopping_order').length;
    const shoppingInvoices = invoices.filter((i) => i.invoice_type === 'shopping_order').length;
    const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
    const pendingAmount = invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'void')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalAmount = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);

    return { total, shipmentInvoices, shoppingInvoices, paidInvoices, pendingAmount, totalAmount };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'shipment' && invoice.invoice_type === 'shopping_order') return false;
        if (typeFilter === 'shopping_order' && invoice.invoice_type !== 'shopping_order')
          return false;
      }

      // Status filter
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;

      // Date range filter
      if (invoice.invoice_date && dateRange.from && dateRange.to) {
        try {
          const invoiceDate = parseISO(invoice.invoice_date);
          if (!isWithinInterval(invoiceDate, { start: dateRange.from, end: dateRange.to }))
            return false;
        } catch {
          // Skip date filtering if date is invalid
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          invoice.invoice_number?.toLowerCase().includes(query) ||
          invoice.customer_name?.toLowerCase().includes(query) ||
          invoice.tracking_number?.toLowerCase().includes(query) ||
          invoice.order_number?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [invoices, typeFilter, statusFilter, dateRange, searchQuery]);

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetails(true);
  };

  const handlePrintInvoice = (invoice) => {
    printDocument(InvoiceTemplate, {
      data: { invoice, customer: { name: invoice.customer_name } }, // Passing minimal customer data as we don't have full object here
      settings: companySettings,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="invoices-header">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Invoices</h1>
              <Button variant="ghost" size="icon" onClick={() => startTour('invoices')} className="text-slate-400 hover:text-blue-600" title="Take a Tour">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage customer invoices for shipments and shopping orders
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" id="invoice-stats">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-200 rounded-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-emerald-600 font-medium">Paid</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                    {stats.paidInvoices}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-200 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-amber-600 font-medium">Pending</p>
                  <p className="text-lg sm:text-2xl font-bold text-amber-900">
                    ฿{stats.pendingAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-200 rounded-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-purple-600 font-medium">Total</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-900">
                    ฿{stats.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by invoice #, customer, tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-28 sm:w-44">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="shipment">Shipment</SelectItem>
                  <SelectItem value="shopping_order">Shopping</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </span>
                    <span className="sm:hidden">Date Range</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange(range);
                      } else if (range?.from) {
                        setDateRange({ from: range.from, to: range.from });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="space-y-3" id="invoice-list">
            {filteredInvoices.map((invoice) => {
              const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.issued;
              const typeConfig = TYPE_CONFIG[invoice.invoice_type] || TYPE_CONFIG.shipment;
              const StatusIcon = statusConfig.icon;
              const TypeIcon = typeConfig.icon;

              return (
                <Card
                  key={invoice.id}
                  className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleViewDetails(invoice)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${typeConfig.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                            <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                          </div>
                          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                            <User className="w-3 h-3" />
                            {invoice.customer_name}
                            {invoice.tracking_number && (
                              <span className="text-slate-400">• {invoice.tracking_number}</span>
                            )}
                            {invoice.order_number && (
                              <span className="text-slate-400">• {invoice.order_number}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">
                            ฿{(invoice.total_amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {invoice.invoice_date
                              ? format(parseISO(invoice.invoice_date), 'MMM d, yyyy')
                              : '-'}
                          </p>
                        </div>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(invoice);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintInvoice(invoice);
                            }}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices found</h3>
              <p className="text-slate-500">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Invoices will appear here when orders are completed'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invoice Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Invoice Details
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <InvoiceDetailsView
                invoice={selectedInvoice}
                companySettings={companySettings}
                onPrint={() => handlePrintInvoice(selectedInvoice)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function InvoiceDetailsView({ invoice, companySettings, onPrint }) {
  const typeConfig = TYPE_CONFIG[invoice.invoice_type] || TYPE_CONFIG.shipment;
  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.issued;

  return (
    <div className="space-y-6 mt-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
        </div>
        <Button onClick={onPrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      {/* Company & Customer Info */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-2">From</p>
          <p className="font-semibold">{companySettings?.company_name || 'BKK-YGN Cargo'}</p>
          <p className="text-sm text-slate-600">{companySettings?.address || ''}</p>
          <p className="text-sm text-slate-600">{companySettings?.phone || ''}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-2">Bill To</p>
          <p className="font-semibold">{invoice.customer_name}</p>
          <p className="text-sm text-slate-600">{invoice.customer_email || ''}</p>
          <p className="text-sm text-slate-600">{invoice.customer_phone || ''}</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-500">Invoice Date</p>
          <p className="font-medium">
            {invoice.invoice_date ? format(parseISO(invoice.invoice_date), 'MMM d, yyyy') : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Due Date</p>
          <p className="font-medium">
            {invoice.due_date ? format(parseISO(invoice.due_date), 'MMM d, yyyy') : '-'}
          </p>
        </div>
        {invoice.tracking_number && (
          <div>
            <p className="text-xs text-slate-500">Tracking #</p>
            <p className="font-medium">{invoice.tracking_number}</p>
          </div>
        )}
        {invoice.order_number && (
          <div>
            <p className="text-xs text-slate-500">Order #</p>
            <p className="font-medium">{invoice.order_number}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500">Service Type</p>
          <p className="font-medium capitalize">{invoice.service_type?.replace('_', ' ') || '-'}</p>
        </div>
        {invoice.weight_kg > 0 && (
          <div>
            <p className="text-xs text-slate-500">Weight</p>
            <p className="font-medium">{invoice.weight_kg} kg</p>
          </div>
        )}
      </div>

      {/* Pricing Breakdown */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-medium">Description</th>
              <th className="text-right p-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.product_cost > 0 && (
              <tr className="border-t">
                <td className="p-3">Product Cost</td>
                <td className="p-3 text-right">฿{invoice.product_cost.toLocaleString()}</td>
              </tr>
            )}
            {invoice.commission_amount > 0 && (
              <tr className="border-t">
                <td className="p-3">Commission</td>
                <td className="p-3 text-right">฿{invoice.commission_amount.toLocaleString()}</td>
              </tr>
            )}
            {invoice.shipping_amount > 0 && (
              <tr className="border-t">
                <td className="p-3">
                  Shipping{' '}
                  {invoice.weight_kg > 0 && invoice.price_per_kg > 0 && (
                    <span className="text-slate-500">
                      ({invoice.weight_kg} kg × ฿{invoice.price_per_kg})
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">฿{invoice.shipping_amount.toLocaleString()}</td>
              </tr>
            )}
            {invoice.insurance_amount > 0 && (
              <tr className="border-t">
                <td className="p-3">Insurance</td>
                <td className="p-3 text-right">฿{invoice.insurance_amount.toLocaleString()}</td>
              </tr>
            )}
            {invoice.packaging_fee > 0 && (
              <tr className="border-t">
                <td className="p-3">Packaging Fee</td>
                <td className="p-3 text-right">฿{invoice.packaging_fee.toLocaleString()}</td>
              </tr>
            )}
            {invoice.tax_amount > 0 && (
              <tr className="border-t">
                <td className="p-3">Tax</td>
                <td className="p-3 text-right">฿{invoice.tax_amount.toLocaleString()}</td>
              </tr>
            )}
            <tr className="border-t bg-slate-50">
              <td className="p-3 font-bold">Total</td>
              <td className="p-3 text-right font-bold text-lg text-blue-600">
                ฿{(invoice.total_amount || 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Info */}
      {invoice.status === 'paid' && invoice.payment_date && (
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              Paid on {format(parseISO(invoice.payment_date), 'MMM d, yyyy')}
            </span>
          </div>
          {invoice.payment_method && (
            <p className="text-sm text-emerald-600 mt-1">
              Payment Method: {invoice.payment_method}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
