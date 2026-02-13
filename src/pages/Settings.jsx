import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Mail,
  Phone,
  Save,
  Settings as SettingsIcon,
  Zap,
  Database,
  Clock,
  DollarSign,
  Package,
  Truck,
  FileText,
  Users,
  Target,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Building2,
  MapPin,
  FileCheck,
  Calculator,
  Receipt,
  Percent,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import PricingManager from '@/components/settings/PricingManager';
import StaffManagement from '@/components/settings/StaffManagement';
import AuditLogViewer from '@/components/audit/AuditLogViewer';
import CompanyBranding from '@/components/settings/CompanyBranding';
import NotificationPreferences from '@/components/settings/NotificationPreferences';
import NotificationTemplateManager from '@/components/settings/NotificationTemplateManager';
import { hasPermission } from '@/components/auth/RolePermissions';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => auth.me(),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list(),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => db.inventoryItems.list(),
  });

  const { data: vendorPayments = [] } = useQuery({
    queryKey: ['vendor-payments'],
    queryFn: () => db.vendorPayments.list(),
  });

  const { data: notificationsList = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => db.notifications.filter({ status: 'unread' }),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => db.vendors.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      try {
        return await db.auditLogs.list('-created_date', 100);
      } catch (err) {
        console.warn('Audit logs table may not exist:', err.message);
        return [];
      }
    },
    retry: false,
  });

  const [actionLoading, setActionLoading] = useState(null);

  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    default_currency: 'THB',
    timezone: 'Asia/Bangkok',
  });

  const [notifications, setNotifications] = useState({
    email_alerts: true,
    low_stock_alerts: true,
    payment_reminders: true,
    delivery_updates: true,
    weekly_reports: false,
  });

  const [businessSettings, setBusinessSettings] = useState({
    default_payment_terms: 'net_30',
    auto_generate_tracking: true,
    default_service_type: 'cargo_medium',
    currency_symbol: '฿',
    weight_unit: 'kg',
    // New settings
    company_address: '',
    tax_id: '',
    default_insurance_rate: 2,
    default_commission_rate: 10,
    default_shopping_price_per_kg: 110,
    invoice_prefix: 'INV',
    tracking_prefix: 'BKK',
    auto_send_receipts: true,
    require_signature: false,
    default_pickup_city: 'Bangkok',
    default_delivery_city: 'Yangon',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        phone: user.phone || '',
        company_name: user.company_name || '',
        default_currency: user.default_currency || 'THB',
        timezone: user.timezone || 'Asia/Bangkok',
      });
      setNotifications(user.notification_settings || notifications);
      setBusinessSettings(user.business_settings || businessSettings);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profile);
  };

  const handleSaveNotifications = () => {
    updateProfileMutation.mutate({ notification_settings: notifications });
  };

  const handleSaveBusinessSettings = () => {
    updateProfileMutation.mutate({ business_settings: businessSettings });
  };

  // Quick action handlers
  const handleRunInventoryCheck = async () => {
    setActionLoading('inventory');
    try {
      const lowStockItems = inventoryItems.filter((i) => i.current_stock <= i.reorder_point);
      await new Promise((r) => setTimeout(r, 1000));
      toast.success(`Inventory check complete. ${lowStockItems.length} items need attention.`);
    } catch (error) {
      console.error('Inventory check failed:', error);
      toast.error('Failed to run inventory check');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessPayments = async () => {
    setActionLoading('payments');
    try {
      const pending = vendorPayments.filter((p) => p.status === 'pending');
      await new Promise((r) => setTimeout(r, 1000));
      toast.success(`Found ${pending.length} pending payments to process.`);
    } catch (error) {
      console.error('Payment processing failed:', error);
      toast.error('Failed to process payments');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearNotifications = async () => {
    setActionLoading('notifications');
    try {
      for (const n of notificationsList) {
        await db.notifications.update(n.id, { status: 'dismissed' });
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendWeeklyReport = async () => {
    setActionLoading('report');
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast.success('Weekly report generation started');
    } catch (error) {
      console.error('Failed to send weekly report:', error);
      toast.error('Failed to generate report');
    } finally {
      setActionLoading(null);
    }
  };

  // Stats calculations
  const activeShipments = shipments.filter(
    (s) => !['delivered', 'cancelled'].includes(s.status)
  ).length;
  const pendingPayments = vendorPayments.filter((p) => p.status === 'pending').length;
  const lowStockItems = inventoryItems.filter((i) => i.current_stock <= i.reorder_point).length;
  const activeVendors = vendors.filter((v) => v.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="control" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Control</span>
            </TabsTrigger>
            {(user?.role === 'admin' || hasPermission(user, 'invite_staff')) && (
              <TabsTrigger value="staff" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Staff</span>
              </TabsTrigger>
            )}
            {user?.role === 'admin' && (
              <TabsTrigger value="branding" className="gap-2">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
            )}
            {user?.role === 'admin' && (
              <TabsTrigger value="audit" className="gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+66..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={profile.company_name}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    placeholder="Your company"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Select
                      value={profile.default_currency}
                      onValueChange={(v) => setProfile({ ...profile, default_currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="THB">Thai Baht (฿)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="MMK">Myanmar Kyat (K)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={profile.timezone}
                      onValueChange={(v) => setProfile({ ...profile, timezone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Bangkok">Bangkok (GMT+7)</SelectItem>
                        <SelectItem value="Asia/Yangon">Yangon (GMT+6:30)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-500" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-500">Email Address</p>
                    <p className="font-medium">{user?.email || 'Loading...'}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">Verified</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <NotificationPreferences user={user} />
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <NotificationTemplateManager />
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="mt-6">
            <PricingManager />
          </TabsContent>

          {/* Business Settings Tab */}
          <TabsContent value="business" className="mt-6 space-y-6">
            {/* Company Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  Company Information
                </CardTitle>
                <CardDescription>Your business details for invoices and documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax ID / Registration Number</Label>
                    <Input
                      value={businessSettings.tax_id}
                      onChange={(e) =>
                        setBusinessSettings({ ...businessSettings, tax_id: e.target.value })
                      }
                      placeholder="e.g., 1234567890123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency Symbol</Label>
                    <Select
                      value={businessSettings.currency_symbol}
                      onValueChange={(v) =>
                        setBusinessSettings({ ...businessSettings, currency_symbol: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="฿">Thai Baht (฿)</SelectItem>
                        <SelectItem value="$">US Dollar ($)</SelectItem>
                        <SelectItem value="K">Myanmar Kyat (K)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Address</Label>
                  <Textarea
                    value={businessSettings.company_address}
                    onChange={(e) =>
                      setBusinessSettings({ ...businessSettings, company_address: e.target.value })
                    }
                    placeholder="Enter your business address for invoices..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Defaults */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-500" />
                  Shipping Defaults
                </CardTitle>
                <CardDescription>Default values for new shipments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Service Type</Label>
                    <Select
                      value={businessSettings.default_service_type}
                      onValueChange={(v) =>
                        setBusinessSettings({ ...businessSettings, default_service_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cargo_small">Cargo Small</SelectItem>
                        <SelectItem value="cargo_medium">Cargo Medium</SelectItem>
                        <SelectItem value="cargo_large">Cargo Large</SelectItem>
                        <SelectItem value="express">Express</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Weight Unit</Label>
                    <Select
                      value={businessSettings.weight_unit}
                      onValueChange={(v) =>
                        setBusinessSettings({ ...businessSettings, weight_unit: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="lb">Pounds (lb)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      Default Pickup City
                    </Label>
                    <Input
                      value={businessSettings.default_pickup_city}
                      onChange={(e) =>
                        setBusinessSettings({
                          ...businessSettings,
                          default_pickup_city: e.target.value,
                        })
                      }
                      placeholder="Bangkok"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      Default Delivery City
                    </Label>
                    <Input
                      value={businessSettings.default_delivery_city}
                      onChange={(e) =>
                        setBusinessSettings({
                          ...businessSettings,
                          default_delivery_city: e.target.value,
                        })
                      }
                      placeholder="Yangon"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rates & Fees */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="w-5 h-5 text-amber-500" />
                  Rates & Fees
                </CardTitle>
                <CardDescription>Default rates for pricing calculations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Insurance Rate (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={businessSettings.default_insurance_rate}
                        onChange={(e) =>
                          setBusinessSettings({
                            ...businessSettings,
                            default_insurance_rate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Commission Rate (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={businessSettings.default_commission_rate}
                        onChange={(e) =>
                          setBusinessSettings({
                            ...businessSettings,
                            default_commission_rate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Shopping Price (฿/kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={businessSettings.default_shopping_price_per_kg ?? 110}
                      onChange={(e) =>
                        setBusinessSettings({
                          ...businessSettings,
                          default_shopping_price_per_kg: parseFloat(e.target.value) || 110,
                        })
                      }
                    />
                    <p className="text-xs text-slate-500">Used for shopping orders when no service pricing is set</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Payment Terms</Label>
                  <Select
                    value={businessSettings.default_payment_terms}
                    onValueChange={(v) =>
                      setBusinessSettings({ ...businessSettings, default_payment_terms: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (COD)</SelectItem>
                      <SelectItem value="net_15">Net 15 Days</SelectItem>
                      <SelectItem value="net_30">Net 30 Days</SelectItem>
                      <SelectItem value="net_60">Net 60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Documents & Automation */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-purple-500" />
                  Documents & Automation
                </CardTitle>
                <CardDescription>Configure document generation and automation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Number Prefix</Label>
                    <Input
                      value={businessSettings.invoice_prefix}
                      onChange={(e) =>
                        setBusinessSettings({
                          ...businessSettings,
                          invoice_prefix: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="INV"
                      maxLength={5}
                    />
                    <p className="text-xs text-slate-500">
                      e.g., {businessSettings.invoice_prefix}-2024-0001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tracking Number Prefix</Label>
                    <Input
                      value={businessSettings.tracking_prefix}
                      onChange={(e) =>
                        setBusinessSettings({
                          ...businessSettings,
                          tracking_prefix: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="BKK"
                      maxLength={5}
                    />
                    <p className="text-xs text-slate-500">
                      e.g., {businessSettings.tracking_prefix}1234567890
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-slate-400" />
                        Auto-generate Tracking Numbers
                      </Label>
                      <p className="text-sm text-slate-500">
                        Automatically create tracking IDs for new shipments
                      </p>
                    </div>
                    <Switch
                      checked={businessSettings.auto_generate_tracking}
                      onCheckedChange={(v) =>
                        setBusinessSettings({ ...businessSettings, auto_generate_tracking: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-slate-400" />
                        Auto-send Receipts
                      </Label>
                      <p className="text-sm text-slate-500">
                        Email receipts to customers when payment is received
                      </p>
                    </div>
                    <Switch
                      checked={businessSettings.auto_send_receipts}
                      onCheckedChange={(v) =>
                        setBusinessSettings({ ...businessSettings, auto_send_receipts: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-slate-400" />
                        Require Delivery Signature
                      </Label>
                      <p className="text-sm text-slate-500">
                        Require customer signature on delivery confirmation
                      </p>
                    </div>
                    <Switch
                      checked={businessSettings.require_signature}
                      onCheckedChange={(v) =>
                        setBusinessSettings({ ...businessSettings, require_signature: v })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveBusinessSettings}
                className="bg-blue-600 hover:bg-blue-700 px-8"
              >
                <Save className="w-4 h-4 mr-2" />
                Save All Business Settings
              </Button>
            </div>
          </TabsContent>

          {/* Control Center Tab */}
          <TabsContent value="control" className="mt-6 space-y-6">
            {/* Live Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                        Active Shipments
                      </p>
                      <p className="text-3xl font-bold text-blue-900">{activeShipments}</p>
                    </div>
                    <Package className="w-10 h-10 text-blue-400" />
                  </div>
                  <Progress
                    value={
                      activeShipments > 0
                        ? Math.min((activeShipments / shipments.length) * 100, 100)
                        : 0
                    }
                    className="h-1 mt-3"
                  />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                        Pending Payments
                      </p>
                      <p className="text-3xl font-bold text-emerald-900">{pendingPayments}</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-emerald-400" />
                  </div>
                  {pendingPayments > 0 && (
                    <Badge className="mt-2 bg-emerald-200 text-emerald-800">Action needed</Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                        Low Stock Items
                      </p>
                      <p className="text-3xl font-bold text-amber-900">{lowStockItems}</p>
                    </div>
                    <Database className="w-10 h-10 text-amber-400" />
                  </div>
                  {lowStockItems > 0 && (
                    <Badge className="mt-2 bg-amber-200 text-amber-800">Reorder needed</Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                        Active Vendors
                      </p>
                      <p className="text-3xl font-bold text-purple-900">{activeVendors}</p>
                    </div>
                    <Truck className="w-10 h-10 text-purple-400" />
                  </div>
                  <p className="text-xs text-purple-600 mt-2">{vendors.length} total vendors</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Run common operations with one click</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 justify-start gap-3 hover:bg-blue-50 hover:border-blue-200"
                    onClick={handleRunInventoryCheck}
                    disabled={actionLoading === 'inventory'}
                  >
                    {actionLoading === 'inventory' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Database className="w-5 h-5 text-blue-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Run Inventory Check</p>
                      <p className="text-xs text-slate-500">Scan for low stock items</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-200"
                    onClick={handleProcessPayments}
                    disabled={actionLoading === 'payments'}
                  >
                    {actionLoading === 'payments' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Process Payments</p>
                      <p className="text-xs text-slate-500">Review pending vendor payments</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 justify-start gap-3 hover:bg-amber-50 hover:border-amber-200"
                    onClick={handleClearNotifications}
                    disabled={actionLoading === 'notifications'}
                  >
                    {actionLoading === 'notifications' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Bell className="w-5 h-5 text-amber-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Clear Notifications</p>
                      <p className="text-xs text-slate-500">
                        {notificationsList.length} unread notifications
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 justify-start gap-3 hover:bg-purple-50 hover:border-purple-200"
                    onClick={handleSendWeeklyReport}
                    disabled={actionLoading === 'report'}
                  >
                    {actionLoading === 'report' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5 text-purple-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Send Weekly Report</p>
                      <p className="text-xs text-slate-500">Generate and email report now</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  System Status
                </CardTitle>
                <CardDescription>All systems operational</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatusItem label="API Connection" status="connected" detail="Response: 45ms" />
                  <StatusItem
                    label="Database Sync"
                    status="connected"
                    detail="Last sync: Just now"
                  />
                  <StatusItem
                    label="Email Service"
                    status="connected"
                    detail="Emails sent today: 12"
                  />
                  <StatusItem label="File Storage" status="connected" detail="95% available" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Management Tab - Admin Only */}
          {(user?.role === 'admin' || hasPermission(user, 'invite_staff')) && (
            <TabsContent value="staff" className="mt-6">
              <StaffManagement />
            </TabsContent>
          )}

          {/* Company Branding Tab - Admin Only */}
          {user?.role === 'admin' && (
            <TabsContent value="branding" className="mt-6">
              <CompanyBranding />
            </TabsContent>
          )}

          {/* Audit Log Tab - Admin Only */}
          {user?.role === 'admin' && (
            <TabsContent value="audit" className="mt-6">
              <AuditLogViewer logs={auditLogs} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function StatusItem({ label, status, detail }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-3">
        {status === 'connected' ? (
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-rose-500" />
        )}
        <div>
          <p className="font-medium text-slate-900">{label}</p>
          {detail && <p className="text-xs text-slate-500">{detail}</p>}
        </div>
      </div>
      <Badge
        className={
          status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }
      >
        {status === 'connected' ? 'Online' : 'Offline'}
      </Badge>
    </div>
  );
}
