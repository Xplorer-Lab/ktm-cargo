import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/components/auth/UserContext';
import { canAccessPage } from './RolePermissions';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/api/auth';
import { appendE2EFixture } from '@/lib/e2e';

export default function ProtectedRoute({ children, pageName }) {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    // Redirect to ClientPortal login, saving the attempted location
    return (
      <Navigate
        to={appendE2EFixture('/ClientPortal', location.search)}
        state={{ from: location }}
        replace
      />
    );
  }

  // If pageName is provided, check permissions
  if (pageName && !canAccessPage(user, pageName)) {
    if (user.role === 'staff' || user.role === 'admin') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Access Not Configured</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your staff account is signed in, but it is missing the required role permissions for
              this module. This stops redirect loops and gives support a stable state to diagnose.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  window.location.assign(appendE2EFixture('/ClientPortal', location.search))
                }
              >
                Back to Portal
              </Button>
              <Button onClick={() => auth.logout()}>Sign Out</Button>
            </div>
          </div>
        </div>
      );
    }

    if (canAccessPage(user, 'Dashboard')) {
      return <Navigate to={appendE2EFixture('/Operations', location.search)} replace />;
    }
    return <Navigate to={appendE2EFixture('/ClientPortal', location.search)} replace />;
  }

  return children;
}
