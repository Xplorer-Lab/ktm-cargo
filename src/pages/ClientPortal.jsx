import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  FileText,
  MessageSquare,
  User,
  LogOut,
  Plane,
  Plus,
  AlertTriangle,
  MapPin,
  History,
  Star,
  Mail,
  Lock,
  Phone,
  ShoppingBag,
} from 'lucide-react';
import CustomerPortalDashboard from '@/components/portal/CustomerPortalDashboard';
import CustomerShipmentTracker from '@/components/portal/CustomerShipmentTracker';
import CustomerOrderHistory from '@/components/portal/CustomerOrderHistory';
import CustomerNewOrder from '@/components/portal/CustomerNewOrder';
import CustomerInvoices from '@/components/portal/CustomerInvoices';
import CustomerSupport from '@/components/portal/CustomerSupport';
import CustomerProfile from '@/components/portal/CustomerProfile';
import CustomerShoppingOrders from '@/components/portal/CustomerShoppingOrders';
import VendorPortalDashboard from '@/components/portal/VendorPortalDashboard';
import VendorOrders from '@/components/portal/VendorOrders';
import VendorInvoices from '@/components/portal/VendorInvoices';
import VendorProfile from '@/components/portal/VendorProfile';
import VendorPerformance from '@/components/portal/VendorPerformance';
import { toast } from 'sonner';
import ClientNotificationBell from '@/components/portal/ClientNotificationBell';
import { resolvePortalDeepLink } from '@/pages/clientPortalDeepLink';
import { appendE2EFixture } from '@/lib/e2e';

export default function ClientPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [portalType, setPortalType] = useState(null); // 'customer' or 'vendor'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialTrackingNumber, setInitialTrackingNumber] = useState('');
  const [user, setUser] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [portalSetupNotice, setPortalSetupNotice] = useState('');

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const lastAppliedDeepLinkSearchRef = useRef('');

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
        setActiveTab('dashboard');
        setInitialTrackingNumber('');
        lastAppliedDeepLinkSearchRef.current = '';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !portalType) return;
    if (lastAppliedDeepLinkSearchRef.current === location.search) return;

    const { tab, trackingNumber } = resolvePortalDeepLink({
      search: location.search,
      portalType,
      defaultTab: 'dashboard',
    });

    setActiveTab(tab);
    setInitialTrackingNumber(trackingNumber);
    lastAppliedDeepLinkSearchRef.current = location.search;
  }, [location.search, portalType, user]);

  // Realtime: auto-refresh customer portal data when DB rows change
  useEffect(() => {
    if (!clientData?.id || portalType !== 'customer') return;

    const channel = supabase
      .channel(`portal-shipments-${clientData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `customer_id=eq.${clientData.id}`,
        },
        () => {
          // Invalidate all shipment-related queries so dashboard, tracker, and history auto-refresh
          queryClient.invalidateQueries({ queryKey: ['customer-shipments'] });
          queryClient.invalidateQueries({ queryKey: ['customer-shipments-track'] });
          queryClient.invalidateQueries({ queryKey: ['customer-order-history'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_orders',
          filter: `customer_id=eq.${clientData.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customer-shopping-orders'] });
          queryClient.invalidateQueries({ queryKey: ['customer-order-history'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_invoices',
          filter: `customer_id=eq.${clientData.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientData?.id, portalType, queryClient]);

  const loadUserAndDeterminePortal = async () => {
    setIsLoading(true);
    setAuthError(false);
    setPortalSetupNotice('');

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

      const currentUserId = currentUser.id;
      const normalizedEmail = currentUser.email?.trim() || '';
      const normalizedPhone = currentUser.phone?.trim() || '';

      const buildTemporaryCustomer = () => ({
        id: currentUserId || `temp-${Date.now()}`,
        name: currentUser.full_name || normalizedEmail.split('@')[0] || 'Customer',
        email: normalizedEmail,
        phone: normalizedPhone,
        customer_type: 'individual',
        is_temporary_profile: true,
      });
      let supportsAuthIdentityLink = true;

      try {
        const [{ error: customerHelperError }, { error: vendorHelperError }] = await Promise.all([
          supabase.rpc('my_customer_id'),
          supabase.rpc('my_vendor_id'),
        ]);
        const helperMissing = [customerHelperError, vendorHelperError]
          .filter(Boolean)
          .some((err) => /does not exist|not found|schema cache/i.test(err.message || ''));

        if (helperMissing) {
          supportsAuthIdentityLink = false;
          console.warn(
            'Portal auth identity helpers are missing. Falling back to legacy email/phone matching.'
          );
        }
      } catch (helperProbeErr) {
        console.warn('Could not verify portal auth identity helpers:', helperProbeErr.message);
      }

      const linkAuthIdentity = async (entityType, record) => {
        if (!record?.id || !currentUserId || record.auth_user_id) {
          return record;
        }

        try {
          if (entityType === 'vendor') {
            return await db.vendors.update(record.id, { auth_user_id: currentUserId });
          }
          return await db.customers.update(record.id, { auth_user_id: currentUserId });
        } catch (linkErr) {
          console.warn(
            `Failed to link ${entityType} ${record.id} to auth user ${currentUserId}:`,
            linkErr.message
          );
          return record;
        }
      };

      const findVendorRecord = async () => {
        try {
          if (supportsAuthIdentityLink && currentUserId) {
            const vendorsByUid = await db.vendors.filter({ auth_user_id: currentUserId });
            if (vendorsByUid.length > 0) {
              return vendorsByUid[0];
            }
          }
        } catch (vendorUidErr) {
          console.warn('Vendor UID lookup failed (RLS or network):', vendorUidErr.message);
        }

        try {
          if (normalizedEmail) {
            const vendorsByEmail = await db.vendors.filter({ email: normalizedEmail });
            if (vendorsByEmail.length > 0) {
              return await linkAuthIdentity('vendor', vendorsByEmail[0]);
            }
          }
        } catch (vendorEmailErr) {
          console.warn('Vendor email lookup failed (RLS or network):', vendorEmailErr.message);
        }

        return null;
      };

      const findCustomerRecord = async () => {
        try {
          if (supportsAuthIdentityLink && currentUserId) {
            const customersByUid = await db.customers.filter({ auth_user_id: currentUserId });
            if (customersByUid.length > 0) {
              return customersByUid[0];
            }
          }
        } catch (customerUidErr) {
          console.warn('Customer UID lookup failed (RLS or network):', customerUidErr.message);
        }

        try {
          if (normalizedEmail) {
            const customersByEmail = await db.customers.filter({ email: normalizedEmail });
            if (customersByEmail.length > 0) {
              return await linkAuthIdentity('customer', customersByEmail[0]);
            }
          }
        } catch (customerEmailErr) {
          console.warn('Customer email lookup failed (RLS or network):', customerEmailErr.message);
        }

        if (normalizedPhone) {
          try {
            const customersByPhone = await db.customers.filter({ phone: normalizedPhone });
            if (customersByPhone.length > 0) {
              return await linkAuthIdentity('customer', customersByPhone[0]);
            }
          } catch (phoneErr) {
            console.warn('Customer phone lookup failed (RLS or network):', phoneErr.message);
          }
        }

        return null;
      };

      // Admin / staff users should use the admin dashboard
      if (currentUser.role === 'admin' || currentUser.role === 'staff') {
        navigate(appendE2EFixture('/Operations', location.search), { replace: true });
        return;
      }

      // Prefer UID ownership checks; email/phone fallback will auto-link auth_user_id.
      const vendor = await findVendorRecord();
      if (vendor) {
        setPortalType('vendor');
        setClientData(vendor);
        setIsLoading(false);
        return;
      }

      const customer = await findCustomerRecord();
      if (customer) {
        setPortalType('customer');
        setClientData(customer);
        setIsLoading(false);
        return;
      }

      // Default to customer portal for new users
      setPortalType('customer');

      const existingCustomer = await findCustomerRecord();
      if (existingCustomer) {
        setClientData(existingCustomer);
        setIsLoading(false);
        return;
      }

      // Create a new customer record for this user
      try {
        const newCustomerPayload = {
          name: currentUser.full_name || normalizedEmail.split('@')[0] || 'New Customer',
          email: normalizedEmail,
          phone: normalizedPhone,
          customer_type: 'individual',
        };

        if (supportsAuthIdentityLink && currentUserId) {
          newCustomerPayload.auth_user_id = currentUserId;
        }

        let newCustomer;
        try {
          newCustomer = await db.customers.create(newCustomerPayload);
        } catch (createErr) {
          const isForbiddenInsert = /forbidden|permission denied|row-level|rls/i.test(
            createErr.message || ''
          );
          const missingAuthUserColumn =
            /auth_user_id/i.test(createErr.message || '') &&
            /does not exist|column/i.test(createErr.message || '');

          if (missingAuthUserColumn && newCustomerPayload.auth_user_id) {
            delete newCustomerPayload.auth_user_id;
            supportsAuthIdentityLink = false;
            newCustomer = await db.customers.create(newCustomerPayload);
          } else if (isForbiddenInsert) {
            // Older DB policy setups can block customer self-provisioning.
            // Keep the user in portal with a temporary client profile instead of hard-failing.
            setPortalSetupNotice(
              'Your account is active, but customer provisioning is restricted by database policies. ' +
                'Please ask support/admin to apply portal migrations.'
            );
            newCustomer = buildTemporaryCustomer();
          } else {
            throw createErr;
          }
        }

        setClientData(newCustomer);
      } catch (createErr) {
        console.error('Failed to create customer record:', createErr.message);
        setClientData(null);
      }
    } catch (_e) {
      console.error('Failed to load user data', _e);
      setAuthError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);

    // Client-side validation
    if (!email || !email.trim()) {
      toast.error('Please enter your email address');
      setIsAuthLoading(false);
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      setIsAuthLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message.includes('Invalid login credentials')) {
          throw new Error(
            'Invalid email or password. Please check your credentials and try again.'
          );
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error(
            'Please confirm your email address before signing in. Check your inbox for a confirmation link.'
          );
        }
        throw error;
      }

      toast.success('Signed in successfully');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);

    // Client-side validation
    if (!email || !email.trim()) {
      toast.error('Please enter your email address');
      setIsAuthLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      setIsAuthLoading(false);
      return;
    }

    if (!fullName || !fullName.trim()) {
      toast.error('Please enter your full name');
      setIsAuthLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone?.trim() || '',
          },
        },
      });

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message.includes('Anonymous sign-ins are disabled')) {
          throw new Error(
            'Email signup is not enabled. Please contact the administrator to enable email authentication in Supabase.'
          );
        }
        if (
          error.message.includes('already registered') ||
          error.message.includes('already exists')
        ) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        if (error.message.includes('Password')) {
          throw new Error('Password must be at least 6 characters long.');
        }
        throw error;
      }

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        toast.error('This email is already registered. Please sign in instead.');
        return;
      }

      toast.success('Account created! Please check your email to confirm.');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.trim()) {
      toast.error('Please enter your email address first, then click Forgot Password.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/ClientPortal`,
      });
      if (error) throw error;
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.message || 'Failed to send reset email. Please try again.');
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
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
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
  // If portalType was never determined (e.g. all DB lookups failed due to RLS), show error
  if (!portalType) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Unable to load your portal</h2>
            <p className="text-slate-500 text-sm">
              We had trouble setting up your account. This is usually a temporary issue — please try
              again.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => loadUserAndDeterminePortal()}
                className="bg-blue-600 hover:bg-blue-700 w-full"
              >
                Try Again
              </Button>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard: customer portal loaded but clientData creation failed
  if (portalType === 'customer' && !clientData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="text-slate-500 text-sm">
              We couldn't set up your customer profile. This may be a temporary issue.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => loadUserAndDeterminePortal()}
                className="bg-blue-600 hover:bg-blue-700 w-full"
              >
                Try Again
              </Button>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
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
                <img
                  src={companyLogo}
                  alt={`${companyName} logo`}
                  className="w-10 h-10 object-contain rounded-lg"
                />
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
        {portalType === 'customer' && portalSetupNotice && (
          <Card className="border-amber-300 bg-amber-50 shadow-sm mb-6">
            <CardContent className="py-3 px-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
              <p className="text-sm text-amber-800">{portalSetupNotice}</p>
            </CardContent>
          </Card>
        )}

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
              <TabsTrigger value="shopping-orders" className="gap-1">
                <ShoppingBag className="w-4 h-4" /> Shop Orders
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
              <CustomerPortalDashboard
                customer={clientData}
                user={user}
                onNavigate={setActiveTab}
              />
            </TabsContent>
            <TabsContent value="track">
              <CustomerShipmentTracker
                customer={clientData}
                initialTrackingNumber={initialTrackingNumber}
              />
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
            <TabsContent value="shopping-orders">
              <CustomerShoppingOrders customer={clientData} />
            </TabsContent>
            <TabsContent value="invoices">
              <CustomerInvoices customer={clientData} companySettings={companySettings} />
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
