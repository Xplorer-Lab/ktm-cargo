import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { supabase } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  FileText,
  CreditCard,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Plane,
  Search,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Download,
  Eye,
  Send,
  Upload,
  History,
  Star,
  HelpCircle,
  Mail,
  Lock,
  Phone,
} from 'lucide-react';
import CustomerPortalDashboard from '@/components/portal/CustomerPortalDashboard';
import CustomerShipmentTracker from '@/components/portal/CustomerShipmentTracker';
import CustomerOrderHistory from '@/components/portal/CustomerOrderHistory';
import CustomerNewOrder from '@/components/portal/CustomerNewOrder';
import CustomerInvoices from '@/components/portal/CustomerInvoices';
import CustomerSupport from '@/components/portal/CustomerSupport';
import CustomerProfile from '@/components/portal/CustomerProfile';
import VendorPortalDashboard from '@/components/portal/VendorPortalDashboard';
import VendorOrders from '@/components/portal/VendorOrders';
import VendorInvoices from '@/components/portal/VendorInvoices';
import VendorProfile from '@/components/portal/VendorProfile';
import VendorPerformance from '@/components/portal/VendorPerformance';
import { toast } from 'sonner';
import ClientNotificationBell from '@/components/portal/ClientNotificationBell';

export default function ClientPortal() {
  const navigate = useNavigate();
  const [portalType, setPortalType] = useState(null); // 'customer' or 'vendor'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const list = await db.companySettings.list();
      return list[0] || null;
    },
  });

  const companyName = companySettings?.company_name || 'BKK-YGN Cargo';
  const companyLogo = companySettings?.logo_url;

  useEffect(() => {
    loadUserAndDeterminePortal();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadUserAndDeterminePortal();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setClientData(null);
        setPortalType(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserAndDeterminePortal = async () => {
    setIsLoading(true);
    setAuthError(false);

    try {
      // Check if authenticated
      const isAuth = await auth.isAuthenticated();
      if (!isAuth) {
        // Not authenticated, stay on login screen
        setIsLoading(false);
        return;
      }

      const currentUser = await auth.me();
      setUser(currentUser);

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Admin users should not have customer records created - they use the admin dashboard
      if (currentUser.role === 'admin') {
        navigate('/Dashboard');
        return;
      }

      // Check if user is a vendor
      const vendors = await db.vendors.filter({ email: currentUser.email });
      if (vendors.length > 0) {
        setPortalType('vendor');
        setClientData(vendors[0]);
        setIsLoading(false);
        return;
      }

      // Check if user is a customer
      const customers = await db.customers.filter({ email: currentUser.email });
      if (customers.length > 0) {
        setPortalType('customer');
        setClientData(customers[0]);
        setIsLoading(false);
        return;
      }

      // Check by phone as fallback for customers
      if (currentUser.phone) {
        const customersByPhone = await db.customers.filter({
          phone: currentUser.phone,
        });
        if (customersByPhone.length > 0) {
          setPortalType('customer');
          setClientData(customersByPhone[0]);
          setIsLoading(false);
          return;
        }
      }

      // Default to customer portal for new users - create customer record only for non-admin users
      setPortalType('customer');

      // Double-check no customer exists with this email before creating
      const existingByEmail = await db.customers.filter({ email: currentUser.email });
      if (existingByEmail.length > 0) {
        setClientData(existingByEmail[0]);
        setIsLoading(false);
        return;
      }

      // Create a new customer record for this user (only non-admin users reach here)
      try {
        const newCustomer = await db.customers.create({
          name: currentUser.full_name || currentUser.email?.split('@')[0] || 'New Customer',
          email: currentUser.email,
          phone: currentUser.phone || '',
          customer_type: 'individual',
        });
        setClientData(newCustomer);
      } catch (createErr) {
        console.error('Failed to create customer', createErr);
        setClientData(null);
      }
    } catch (e) {
      console.error('Failed to load user data', e);
      setAuthError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success('Signed in successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });
      if (error) throw error;
      toast.success('Account created! Please check your email to confirm.');
    } catch (error) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // AUTH SCREEN (Login/Register)
  if (!user) {
    return (
      <div className="min-h-screen flex bg-white">
        {/* Left Side - Visual */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/hero-logistics.png')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-slate-900/90"></div>
          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Plane className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">KTM Cargo</span>
              </div>
              <h1 className="text-4xl font-bold mb-4 leading-tight">
                Manage your shipments <br /> with ease.
              </h1>
              <p className="text-blue-200 text-lg max-w-md">
                Track parcels, manage orders, and view invoices all in one place. Join thousands of
                businesses trusting KTM Cargo.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-bold">5,000+ Users</p>
                  <p className="text-sm text-blue-200">Trust our platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 mt-2">Please enter your details to sign in.</p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isAuthLoading}
                  >
                    {isAuthLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-name"
                        placeholder="John Doe"
                        className="pl-10"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="name@example.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone (Optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="+66 81 234 5678"
                        className="pl-10"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isAuthLoading}
                  >
                    {isAuthLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-slate-500">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PORTAL CONTENT (Authenticated)
  if (!portalType) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
              ) : (
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Plane className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-slate-900">{companyName}</h1>
                <p className="text-xs text-slate-500">
                  {portalType === 'customer' ? 'Customer Portal' : 'Vendor Portal'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ClientNotificationBell user={user} clientData={clientData} />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user?.full_name?.charAt(0) || clientData?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium hidden md:block">
                  {clientData?.name || user?.full_name || 'User'}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {portalType === 'customer' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 md:grid-cols-7 mb-6">
              <TabsTrigger value="dashboard" className="gap-1">
                <Package className="w-4 h-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="track" className="gap-1">
                <MapPin className="w-4 h-4" /> Track
              </TabsTrigger>
              <TabsTrigger value="new-order" className="gap-1">
                <Plus className="w-4 h-4" /> New Order
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1">
                <History className="w-4 h-4" /> History
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1">
                <FileText className="w-4 h-4" /> Invoices
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-1">
                <MessageSquare className="w-4 h-4" /> Support
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1">
                <User className="w-4 h-4" /> Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <CustomerPortalDashboard customer={clientData} user={user} />
            </TabsContent>
            <TabsContent value="track">
              <CustomerShipmentTracker customer={clientData} />
            </TabsContent>
            <TabsContent value="new-order">
              <CustomerNewOrder
                customer={clientData}
                user={user}
                onOrderCreated={() => setActiveTab('track')}
              />
            </TabsContent>
            <TabsContent value="history">
              <CustomerOrderHistory customer={clientData} />
            </TabsContent>
            <TabsContent value="invoices">
              <CustomerInvoices customer={clientData} />
            </TabsContent>
            <TabsContent value="support">
              <CustomerSupport customer={clientData} user={user} />
            </TabsContent>
            <TabsContent value="profile">
              <CustomerProfile customer={clientData} onUpdate={loadUserAndDeterminePortal} />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
              <TabsTrigger value="dashboard" className="gap-1">
                <Package className="w-4 h-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1">
                <Truck className="w-4 h-4" /> Orders
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1">
                <FileText className="w-4 h-4" /> Invoices
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-1">
                <Star className="w-4 h-4" /> Performance
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1">
                <User className="w-4 h-4" /> Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <VendorPortalDashboard vendor={clientData} />
            </TabsContent>
            <TabsContent value="orders">
              <VendorOrders vendor={clientData} />
            </TabsContent>
            <TabsContent value="invoices">
              <VendorInvoices vendor={clientData} />
            </TabsContent>
            <TabsContent value="performance">
              <VendorPerformance vendor={clientData} />
            </TabsContent>
            <TabsContent value="profile">
              <VendorProfile vendor={clientData} onUpdate={loadUserAndDeterminePortal} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
