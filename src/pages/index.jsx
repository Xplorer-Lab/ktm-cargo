import { Suspense, lazy } from 'react';
import Layout from './Layout.jsx';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Dashboard = lazy(() => import('./Dashboard'));
const Operations = lazy(() => import('./Operations'));
const Shipments = lazy(() => import('./Shipments'));
const Customers = lazy(() => import('./Customers'));
const ShoppingOrders = lazy(() => import('./ShoppingOrders'));
const Tasks = lazy(() => import('./Tasks'));
const Reports = lazy(() => import('./Reports'));
const PriceCalculator = lazy(() => import('./PriceCalculator'));
const CustomerSegments = lazy(() => import('./CustomerSegments'));
const ShipmentDocuments = lazy(() => import('./ShipmentDocuments'));
const Feedback = lazy(() => import('./Feedback'));
const FeedbackAnalytics = lazy(() => import('./FeedbackAnalytics'));
const Inventory = lazy(() => import('./Inventory'));
const Vendors = lazy(() => import('./Vendors'));
const Settings = lazy(() => import('./Settings'));
const Procurement = lazy(() => import('./Procurement'));
const VendorRegistration = lazy(() => import('./VendorRegistration'));
const ClientPortal = lazy(() => import('./ClientPortal'));
const Invoices = lazy(() => import('./Invoices'));
const LandingPage = lazy(() => import('./LandingPage'));
const NotFound = lazy(() => import('./NotFound'));

const PAGES = {
  Dashboard,
  Operations,
  Shipments,
  Customers,
  ShoppingOrders,
  Tasks,
  Reports,
  PriceCalculator,
  CustomerSegments,
  ShipmentDocuments,
  Feedback,
  FeedbackAnalytics,
  Inventory,
  Vendors,
  Settings,
  Procurement,
  VendorRegistration,
  ClientPortal,
  Invoices,
  NotFound,
};

function _getCurrentPage(url) {
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split('/').pop();
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || 'Dashboard';
}

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-[calc(100vh-64px)]">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useUser } from '@/components/auth/UserContext';
import { appendE2EFixture } from '@/lib/e2e';

// Redirects already-authenticated staff/admin users away from login/registration pages
function GuestOnlyRoute({ children }) {
  const { user, loading } = useUser();
  const location = useLocation();
  if (loading) return null;
  if (user && (user.role === 'staff' || user.role === 'admin')) {
    return <Navigate to={appendE2EFixture('/Operations', location.search)} replace />;
  }
  return children;
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/ClientPortal"
            element={
              <GuestOnlyRoute>
                <ClientPortal />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/VendorRegistration"
            element={
              <GuestOnlyRoute>
                <VendorRegistration />
              </GuestOnlyRoute>
            }
          />
          <Route path="/PriceCalculator" element={<PriceCalculator />} />

          {/* Protected Routes */}
          <Route
            path="/Operations"
            element={
              <ProtectedRoute pageName="Dashboard">
                <Operations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Dashboard"
            element={
              <ProtectedRoute pageName="Dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Shipments"
            element={
              <ProtectedRoute pageName="Shipments">
                <Shipments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Customers"
            element={
              <ProtectedRoute pageName="Customers">
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ShoppingOrders"
            element={
              <ProtectedRoute pageName="ShoppingOrders">
                <ShoppingOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Tasks"
            element={
              <ProtectedRoute pageName="Tasks">
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Reports"
            element={
              <ProtectedRoute pageName="Reports">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/CustomerSegments"
            element={
              <ProtectedRoute pageName="CustomerSegments">
                <CustomerSegments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ShipmentDocuments"
            element={
              <ProtectedRoute pageName="ShipmentDocuments">
                <ShipmentDocuments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Feedback"
            element={
              <ProtectedRoute pageName="Feedback">
                <Feedback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/FeedbackAnalytics"
            element={
              <ProtectedRoute pageName="FeedbackAnalytics">
                <FeedbackAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Inventory"
            element={
              <ProtectedRoute pageName="Inventory">
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Vendors"
            element={
              <ProtectedRoute pageName="Vendors">
                <Vendors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Settings"
            element={
              <ProtectedRoute pageName="Settings">
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Procurement"
            element={
              <ProtectedRoute pageName="Procurement">
                <Procurement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Invoices"
            element={
              <ProtectedRoute pageName="Invoices">
                <Invoices />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

import { UserProvider } from '@/components/auth/UserContext';

export default function Pages() {
  return (
    <Router>
      <UserProvider>
        <PagesContent />
      </UserProvider>
    </Router>
  );
}
