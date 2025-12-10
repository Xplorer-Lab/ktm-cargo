import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  FileText,
  Package,
  ShoppingBag,
  Calendar as CalendarIcon,
  DollarSign,
  User,
  Printer,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Plus,
  AlertTriangle,
  Edit,
  Ban,
  CreditCard,
} from 'lucide-react';
import { format, parseISO, isWithinInterval, subDays } from 'date-fns';
import { toast } from 'sonner';
import { printDocument } from '@/utils/documentPrinter';
import InvoiceTemplate from '@/components/documents/templates/InvoiceTemplate';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import {
  createCustomerInvoice,
  issueInvoice,
  markInvoiceSent,
  recordPayment,
  voidInvoice,
  getInvoiceStats,
} from '@/components/invoices/InvoiceService';

import { useErrorHandler } from '@/hooks/useErrorHandler';

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
    label: 'Shopping',
    color: 'bg-purple-100 text-purple-800',
    icon: ShoppingBag,
  },
};

export default function Invoices() {
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 365),
    to: new Date(),
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, action: null, invoice: null });

  // Data fetching
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: () => db.customerInvoices.list('-created_date'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.list(),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date'),
  });

  const { data: shoppingOrders = [] } = useQuery({
    queryKey: ['shopping-orders'],
    queryFn: () => db.shoppingOrders.list('-created_date'),
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const list = await db.companySettings.list();
      return list[0] || null;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => createCustomerInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      setShowForm(false);
      toast.success('Invoice created as draft');
    },
    onError: (err) => handleError(err, 'Failed to create invoice'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.customerInvoices.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      setShowForm(false);
      setEditingInvoice(null);
      toast.success('Invoice updated');
    },
    onError: (err) => handleError(err, 'Failed to update invoice'),
  });

  const issueMutation = useMutation({
    mutationFn: (id) => issueInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      toast.success('Invoice issued');
    },
    onError: (err) => handleError(err, 'Failed to issue invoice'),
  });

  const sendMutation = useMutation({
    mutationFn: (id) => markInvoiceSent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      toast.success('Invoice marked as sent');
    },
    onError: (err) => handleError(err, 'Failed to update invoice'),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, details }) => recordPayment(id, details),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      toast.success('Payment recorded');
    },
    onError: (err) => handleError(err, 'Failed to record payment'),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }) => voidInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      toast.success('Invoice voided');
    },
    onError: (err) => handleError(err, 'Failed to void invoice'),
  });

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    let draft = 0, issued = 0, sent = 0, paid = 0, overdue = 0;
    let pendingAmount = 0, paidAmount = 0, overdueAmount = 0;

    invoices.forEach((inv) => {
      const amount = inv.total_amount || 0;
      const isOverdue = inv.due_date && new Date(inv.due_date) < today && 
        inv.status !== 'paid' && inv.status !== 'void';

      switch (inv.status) {
        case 'draft': draft++; break;
        case 'issued': 
          issued++; 
          pendingAmount += amount;
          if (isOverdue) { overdue++; overdueAmount += amount; }
          break;
        case 'sent': 
          sent++; 
          pendingAmount += amount;
          if (isOverdue) { overdue++; overdueAmount += amount; }
          break;
        case 'paid': paid++; paidAmount += amount; break;
      }
    });

    return { 
      total: invoices.length, 
      draft, issued, sent, paid, overdue,
      pendingAmount, paidAmount, overdueAmount 
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'shipment' && invoice.invoice_type === 'shopping_order') return false;
        if (typeFilter === 'shopping_order' && invoice.invoice_type !== 'shopping_order') return false;
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

  const handleSubmit = (data) => {
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAction = (action, invoice) => {
    setActionDialog({ open: true, action, invoice });
  };

  const confirmAction = () => {
    const { action, invoice } = actionDialog;
    switch (action) {
      case 'issue':
        issueMutation.mutate(invoice.id);
        break;
      case 'send':
        sendMutation.mutate(invoice.id);
        break;
      case 'pay':
        payMutation.mutate({ id: invoice.id, details: {} });
        break;
      case 'void':
        voidMutation.mutate({ id: invoice.id, reason: '' });
        break;
    }
    setActionDialog({ open: false, action: null, invoice: null });
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetails(true);
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handlePrintInvoice = (invoice) => {
    printDocument(InvoiceTemplate, {
      data: { invoice, customer: { name: invoice.customer_name } },
      settings: companySettings,
    });
  };

  const getActionDialogContent = () => {
    const { action, invoice } = actionDialog;
    if (!action || !invoice) return {};

    const actions = {
      issue: {
        title: 'Issue Invoice',
        description: `Are you sure you want to issue invoice ${invoice.invoice_number}? This will finalize the invoice and set the issue date.`,
        confirmText: 'Issue Invoice',
        confirmClass: 'bg-blue-600 hover:bg-blue-700',
      },
      send: {
        title: 'Mark as Sent',
        description: `Mark invoice ${invoice.invoice_number} as sent to customer?`,
        confirmText: 'Mark as Sent',
        confirmClass: 'bg-purple-600 hover:bg-purple-700',
      },
      pay: {
        title: 'Record Payment',
        description: `Record payment received for invoice ${invoice.invoice_number} (฿${invoice.total_amount?.toLocaleString()})?`,
        confirmText: 'Record Payment',
        confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
      },
      void: {
        title: 'Void Invoice',
        description: `Are you sure you want to void invoice ${invoice.invoice_number}? This action cannot be undone.`,
        confirmText: 'Void Invoice',
        confirmClass: 'bg-rose-600 hover:bg-rose-700',
      },
    };

    return actions[action] || {};
  };

  const dialogContent = getActionDialogContent();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Invoices</h1>
            <p className="text-sm text-slate-500 mt-1">
              Create and manage customer invoices
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingInvoice(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-slate-200 rounded-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-600 font-medium">Draft</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-200 rounded-lg">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Issued/Sent</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">
                    {stats.issued + stats.sent}
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
                  <p className="text-lg sm:text-xl font-bold text-amber-900">
                    ฿{stats.pendingAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {stats.overdue > 0 && (
            <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-rose-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-700" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-rose-600 font-medium">Overdue</p>
                    <p className="text-lg sm:text-xl font-bold text-rose-900">
                      {stats.overdue}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-emerald-600 font-medium">Paid</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-900">
                    ฿{stats.paidAmount.toLocaleString()}
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
                  <Button variant="outline" className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto">
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
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => {
              const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
              const typeConfig = TYPE_CONFIG[invoice.invoice_type] || TYPE_CONFIG.shipment;
              const StatusIcon = statusConfig.icon;
              const TypeIcon = typeConfig.icon;
              const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && 
                invoice.status !== 'paid' && invoice.status !== 'void';

              return (
                <Card
                  key={invoice.id}
                  className={`border-0 shadow-sm hover:shadow-md transition-all ${isOverdue ? 'border-l-4 border-l-rose-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleViewDetails(invoice)}>
                        <div className={`p-3 rounded-xl ${typeConfig.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            {isOverdue && (
                              <Badge className="bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
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

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">
                            ฿{(invoice.total_amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            Due: {invoice.due_date ? format(parseISO(invoice.due_date), 'MMM d, yyyy') : '-'}
                          </p>
                        </div>
                        
                        {/* Action Buttons based on status */}
                        <div className="flex gap-1">
                          {invoice.status === 'draft' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(invoice)} title="Edit">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => handleAction('issue', invoice)} title="Issue">
                                <FileText className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {invoice.status === 'issued' && (
                            <>
                              <Button size="sm" variant="ghost" className="text-purple-600" onClick={() => handleAction('send', invoice)} title="Mark Sent">
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleAction('pay', invoice)} title="Record Payment">
                                <CreditCard className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {invoice.status === 'sent' && (
                            <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleAction('pay', invoice)} title="Record Payment">
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'void' && (
                            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleAction('void', invoice)} title="Void">
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleViewDetails(invoice)} title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePrintInvoice(invoice)} title="Print">
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
              <p className="text-slate-500 mb-6">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first invoice to get started'}
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invoice Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">
              {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
            </DialogTitle>
            <DialogDescription className="sr-only">Invoice form</DialogDescription>
            <InvoiceForm
              invoice={editingInvoice}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingInvoice(null);
              }}
              customers={customers}
              shipments={shipments}
              shoppingOrders={shoppingOrders}
            />
          </DialogContent>
        </Dialog>

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
                onAction={handleAction}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Action Confirmation Dialog */}
        <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction} className={dialogContent.confirmClass}>
                {dialogContent.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function InvoiceDetailsView({ invoice, companySettings, onPrint, onAction }) {
  const typeConfig = TYPE_CONFIG[invoice.invoice_type] || TYPE_CONFIG.shipment;
  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && 
    invoice.status !== 'paid' && invoice.status !== 'void';

  return (
    <div className="space-y-6 mt-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            {isOverdue && (
              <Badge className="bg-rose-100 text-rose-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={onPrint} variant="outline" className="gap-2">
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
          <p className={`font-medium ${isOverdue ? 'text-rose-600' : ''}`}>
            {invoice.due_date ? format(parseISO(invoice.due_date), 'MMM d, yyyy') : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Payment Terms</p>
          <p className="font-medium capitalize">{invoice.payment_terms?.replace('_', ' ') || 'Net 7'}</p>
        </div>
        {invoice.tracking_number && (
          <div>
            <p className="text-xs text-slate-500">Tracking #</p>
            <p className="font-medium">{invoice.tracking_number}</p>
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
            {invoice.shipping_amount > 0 && (
              <tr className="border-t">
                <td className="p-3">
                  Shipping
                  {invoice.weight_kg > 0 && invoice.price_per_kg > 0 && (
                    <span className="text-slate-500 ml-2">
                      ({invoice.weight_kg} kg × ฿{invoice.price_per_kg})
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">฿{invoice.shipping_amount.toLocaleString()}</td>
              </tr>
            )}
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
            <tr className="border-t">
              <td className="p-3">Subtotal</td>
              <td className="p-3 text-right">฿{(invoice.subtotal || 0).toLocaleString()}</td>
            </tr>
            {invoice.tax_amount > 0 && (
              <tr className="border-t">
                <td className="p-3">Tax ({invoice.tax_rate}%)</td>
                <td className="p-3 text-right">฿{invoice.tax_amount.toLocaleString()}</td>
              </tr>
            )}
            {invoice.discount_amount > 0 && (
              <tr className="border-t text-rose-600">
                <td className="p-3">Discount</td>
                <td className="p-3 text-right">-฿{invoice.discount_amount.toLocaleString()}</td>
              </tr>
            )}
            <tr className="border-t bg-slate-50">
              <td className="p-3 font-bold">Total Due</td>
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
            <p className="text-sm text-emerald-600 mt-1 capitalize">
              Payment Method: {invoice.payment_method.replace('_', ' ')}
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        {invoice.status === 'draft' && (
          <Button onClick={() => onAction('issue', invoice)} className="bg-blue-600 hover:bg-blue-700">
            <FileText className="w-4 h-4 mr-2" />
            Issue Invoice
          </Button>
        )}
        {invoice.status === 'issued' && (
          <>
            <Button onClick={() => onAction('send', invoice)} className="bg-purple-600 hover:bg-purple-700">
              <Send className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
            <Button onClick={() => onAction('pay', invoice)} className="bg-emerald-600 hover:bg-emerald-700">
              <CreditCard className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </>
        )}
        {invoice.status === 'sent' && (
          <Button onClick={() => onAction('pay', invoice)} className="bg-emerald-600 hover:bg-emerald-700">
            <CreditCard className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        )}
        {invoice.status !== 'paid' && invoice.status !== 'void' && (
          <Button variant="outline" className="text-rose-600 border-rose-200" onClick={() => onAction('void', invoice)}>
            <Ban className="w-4 h-4 mr-2" />
            Void Invoice
          </Button>
        )}
      </div>
    </div>
  );
}
