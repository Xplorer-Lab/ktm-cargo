import { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { customerSchema } from '@/domains/core/schemas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Users,
  Phone,
  Mail,
  Package,
  DollarSign,
  UserPlus,
  Sparkles,
  Crown,
  AlertTriangle,
  Clock,
  Star,
  Trash2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { sendMessengerNotification } from '@/api/integrations';
import CustomerOnboarding from '@/components/onboarding/CustomerOnboarding';
import {
  segmentCustomers,
  getSegmentSummary,
} from '@/components/customers/CustomerSegmentationEngine';
import CustomerSegmentBadges from '@/components/customers/CustomerSegmentBadges';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useUser } from '@/components/auth/UserContext';
import { hasPermission } from '@/components/auth/RolePermissions';

export default function Customers() {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newCustomer, setNewCustomer] = useState(null);
  const [sendWelcomeMessage, setSendWelcomeMessage] = useState(true);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { user } = useUser();

  const [segmentFilter, setSegmentFilter] = useState('all');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.list('-created_date'),
    onError: (err) => handleError(err, 'Failed to fetch customers'),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date', 500),
    onError: (err) => handleError(err, 'Failed to fetch shipments'),
  });

  // AI-powered customer segmentation
  const analyzedCustomers = useMemo(() => {
    return segmentCustomers(customers, shipments);
  }, [customers, shipments]);

  const segmentSummary = useMemo(() => {
    return getSegmentSummary(analyzedCustomers);
  }, [analyzedCustomers]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check permission before creating
      if (!hasPermission(user, 'manage_customers')) {
        throw new Error('You do not have permission to create customers');
      }
      const customerData = {
        ...data,
        referral_code: data.referral_code || `REF${Date.now().toString(36).toUpperCase()}`,
      };
      // Validate customer data
      const validatedData = customerSchema.parse(customerData);
      const created = await db.customers.create(validatedData);
      return { ...customerData, ...created };
    },
    onSuccess: async (createdCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setNewCustomer(createdCustomer);

      // Send welcome message if option selected
      if (createdCustomer.email && sendWelcomeMessage) {
        toast.promise(
          sendMessengerNotification({
            to: createdCustomer.email, // Using email as identifier for now, or phone if available
            message: `Welcome to BKK-YGN Cargo, ${createdCustomer.name}! Your account has been created.`,
            platform: 'line',
          }),
          {
            loading: 'Sending welcome message...',
            success: 'Welcome message sent!',
            error: 'Failed to send welcome message',
          }
        );
      }

      // Show onboarding modal for new customers
      setShowOnboarding(true);
    },
    onError: (err) => handleError(err, 'Failed to create customer'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const validatedData = customerSchema.partial().parse(data);
      return db.customers.update(id, validatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      toast.success('Customer updated successfully');
    },
    onError: (err) => handleError(err, 'Failed to update customer'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      // Check permission before deleting
      if (!hasPermission(user, 'manage_customers')) {
        throw new Error('You do not have permission to delete customers');
      }
      return db.customers.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      setCustomerToDelete(null);
      toast.success('Customer deleted successfully');
    },
    onError: (err) => handleError(err, 'Failed to delete customer'),
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    customer_type: 'individual',
    address_bangkok: '',
    address_yangon: '',
    notes: '',
    referred_by: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      customer_type: customer.customer_type || 'individual',
      address_bangkok: customer.address_bangkok || '',
      address_yangon: customer.address_yangon || '',
      notes: customer.notes || '',
      referred_by: customer.referred_by || '',
    });
    setShowForm(true);
  };

  const handleDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      customer_type: 'individual',
      address_bangkok: '',
      address_yangon: '',
      notes: '',
      referred_by: '',
    });
    setEditingCustomer(null);
  };

  const filteredCustomers = analyzedCustomers.filter((c) => {
    const matchesType = typeFilter === 'all' || c.customer_type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());

    // Segment filter
    let matchesSegment = segmentFilter === 'all';
    if (segmentFilter === 'vip') matchesSegment = c.valueTier?.key === 'vip';
    if (segmentFilter === 'high') matchesSegment = c.valueTier?.key === 'high';
    if (segmentFilter === 'at_risk') matchesSegment = c.behavioralSegment?.key === 'at_risk';
    if (segmentFilter === 'lapsed') matchesSegment = c.behavioralSegment?.key === 'lapsed';
    if (segmentFilter === 'new') matchesSegment = c.behavioralSegment?.key === 'new';
    if (segmentFilter === 'loyal') matchesSegment = c.behavioralSegment?.key === 'loyal';

    return matchesType && matchesSearch && matchesSegment;
  });

  const typeLabels = {
    individual: 'Individual',
    online_shopper: 'Online Shopper',
    sme_importer: 'SME Importer',
  };

  const typeColors = {
    individual: 'bg-blue-100 text-blue-800',
    online_shopper: 'bg-purple-100 text-purple-800',
    sme_importer: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Clients</h1>
            <p className="text-slate-500 mt-1">Manage your client list</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Segment Summary Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-md ${segmentFilter === 'vip' ? 'border-purple-500 bg-purple-50' : 'border-transparent'}`}
            onClick={() => setSegmentFilter(segmentFilter === 'vip' ? 'all' : 'vip')}
          >
            <CardContent className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500">VIP</p>
                <p className="font-bold text-sm sm:text-base text-slate-900">
                  {segmentSummary.byValueTier.vip.count}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-md ${segmentFilter === 'high' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent'}`}
            onClick={() => setSegmentFilter(segmentFilter === 'high' ? 'all' : 'high')}
          >
            <CardContent className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500">High</p>
                <p className="font-bold text-sm sm:text-base text-slate-900">
                  {segmentSummary.byValueTier.high.count}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-md ${segmentFilter === 'loyal' ? 'border-amber-500 bg-amber-50' : 'border-transparent'}`}
            onClick={() => setSegmentFilter(segmentFilter === 'loyal' ? 'all' : 'loyal')}
          >
            <CardContent className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500">Loyal</p>
                <p className="font-bold text-sm sm:text-base text-slate-900">
                  {segmentSummary.byBehavior.loyal.count}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-md ${segmentFilter === 'new' ? 'border-sky-500 bg-sky-50' : 'border-transparent'}`}
            onClick={() => setSegmentFilter(segmentFilter === 'new' ? 'all' : 'new')}
          >
            <CardContent className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-sky-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500">New</p>
                <p className="font-bold text-sm sm:text-base text-slate-900">
                  {segmentSummary.byBehavior.new.count}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-md ${segmentFilter === 'at_risk' ? 'border-rose-500 bg-rose-50' : 'border-transparent'}`}
            onClick={() => setSegmentFilter(segmentFilter === 'at_risk' ? 'all' : 'at_risk')}
          >
            <CardContent className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500">Risk</p>
                <p className="font-bold text-sm sm:text-base text-slate-900">
                  {segmentSummary.byBehavior.at_risk.count}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-md ${segmentFilter === 'lapsed' ? 'border-gray-500 bg-gray-50' : 'border-transparent'}`}
            onClick={() => setSegmentFilter(segmentFilter === 'lapsed' ? 'all' : 'lapsed')}
          >
            <CardContent className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500">Lapsed</p>
                <p className="font-bold text-sm sm:text-base text-slate-900">
                  {segmentSummary.byBehavior.lapsed.count}
                </p>
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
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="online_shopper">Online Shopper</SelectItem>
                  <SelectItem value="sme_importer">SME Importer</SelectItem>
                </SelectContent>
              </Select>
              {segmentFilter !== 'all' && (
                <Button variant="ghost" onClick={() => setSegmentFilter('all')}>
                  Clear Segment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEdit(customer)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="font-semibold text-slate-600">
                          {customer.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <Badge className={typeColors[customer.customer_type]}>
                          {typeLabels[customer.customer_type]}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Segment Badges */}
                  <div className="mt-2">
                    <CustomerSegmentBadges customer={customer} />
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 mt-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-sm">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        {customer.shipmentCount || 0} shipments
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        ฿{(customer.totalSpent || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No customers found</h3>
              <p className="text-slate-500 mb-6">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first customer to get started'}
              </p>
              {!searchQuery && typeFilter === 'all' && (
                <Button onClick={() => setShowForm(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Customer Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(v) => {
            setShowForm(v);
            if (!v) resetForm();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+66 or +95"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Customer Type</Label>
                  <Select
                    value={form.customer_type}
                    onValueChange={(v) => setForm({ ...form, customer_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="online_shopper">Online Shopper</SelectItem>
                      <SelectItem value="sme_importer">SME Importer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Bangkok Address</Label>
                  <Input
                    value={form.address_bangkok}
                    onChange={(e) => setForm({ ...form, address_bangkok: e.target.value })}
                    placeholder="Pickup address in Bangkok"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Yangon Address</Label>
                  <Input
                    value={form.address_yangon}
                    onChange={(e) => setForm({ ...form, address_yangon: e.target.value })}
                    placeholder="Delivery address in Yangon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referred By (Code)</Label>
                  <Input
                    value={form.referred_by}
                    onChange={(e) => setForm({ ...form, referred_by: e.target.value })}
                    placeholder="Referral code"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Welcome Message Option - only for new customers */}
              {!editingCustomer && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Checkbox
                    id="sendWelcome"
                    checked={sendWelcomeMessage}
                    onCheckedChange={setSendWelcomeMessage}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="sendWelcome"
                      className="text-sm font-medium text-blue-900 cursor-pointer"
                    >
                      Send welcome message
                    </label>
                    <p className="text-xs text-blue-600">
                      Automatically send a welcome message via Messenger
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-blue-500" />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {editingCustomer && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setCustomerToDelete(editingCustomer)}
                    className="px-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the customer "
                {customerToDelete?.name}" and remove their data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Onboarding Modal for New Customers */}
        <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
          <DialogContent className="max-w-2xl p-0 border-0 bg-transparent">
            <DialogHeader>
              <DialogTitle className="sr-only">Customer Onboarding</DialogTitle>
            </DialogHeader>
            <CustomerOnboarding
              customer={newCustomer}
              onComplete={() => {
                setShowOnboarding(false);
                setNewCustomer(null);
                toast.success('Customer onboarding complete!');
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
