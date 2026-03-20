import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { auth } from '@/api/auth';
import { useUser } from '@/components/auth/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { STAFF_HOME_PATH, getStaffDestinationFromSearch } from '@/lib/staffAuthRouting';
import { appendE2EFixture } from '@/lib/e2e';

function isStaffAccount(user) {
  return user?.role === 'staff' || user?.role === 'admin';
}

export default function StaffLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, refreshUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const nextPath = useMemo(
    () => appendE2EFixture(getStaffDestinationFromSearch(location.search), location.search),
    [location.search]
  );
  const alreadySignedIn = isStaffAccount(user);
  const signedInButNotStaff = !loading && user && !alreadySignedIn;

  useEffect(() => {
    if (!loading && alreadySignedIn) {
      navigate(nextPath, { replace: true });
    }
  }, [alreadySignedIn, loading, navigate, nextPath]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      await auth.login(email, password);
      const currentUser = await auth.me();
      await refreshUser();

      if (isStaffAccount(currentUser)) {
        navigate(nextPath, { replace: true });
        return;
      }

      setErrorMessage('This account is not configured for staff operations.');
    } catch (error) {
      const message = String(error?.message || '');
      if (/invalid login credentials/i.test(message)) {
        setErrorMessage('Invalid email or password.');
      } else {
        setErrorMessage('Could not sign in right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (signedInButNotStaff) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
        <div className="mx-auto max-w-xl">
          <Card className="border-amber-400/20 bg-slate-900/80 shadow-2xl shadow-slate-950/40">
            <CardHeader className="space-y-3">
              <Badge className="w-fit border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/10">
                Staff access required
              </Badge>
              <CardTitle className="flex items-center gap-3 text-2xl text-white">
                <AlertTriangle className="h-6 w-6 text-amber-300" />
                Account Not Configured
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-300">
                This account is signed in, but it is not configured for staff modules like
                shipments, procurement, or invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p>
                  Use a staff or admin account to continue to{' '}
                  <span className="font-medium text-white">{nextPath}</span>.
                </p>
              </div>
              {errorMessage && (
                <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {errorMessage}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link to={appendE2EFixture('/', location.search)}>Back Home</Link>
                </Button>
                <Button onClick={() => auth.logout()} className="bg-blue-600 hover:bg-blue-700">
                  Sign Out and Switch Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),transparent_30%),linear-gradient(180deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_100%)]" />

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-6">
          <Badge className="border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/10">
            Internal access
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Staff operations run through one secured workflow.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Use your KTM staff account to manage shopping intake, cargo shipments, procurement,
              invoicing, and after-sales work from the operations console.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Operations Console', 'Start from /Operations after sign in.'],
              ['Route-safe', 'Protected routes redirect here with the page you requested.'],
              ['Role-aware', 'Only staff and admin accounts can enter the internal workflow.'],
              ['Back office only', 'Customers stay on the public brochure and feedback pages.'],
            ].map(([title, text]) => (
              <Card key={title} className="border-white/10 bg-white/5 shadow-none">
                <CardContent className="p-4">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="border-white/10 bg-slate-900/80 shadow-2xl shadow-slate-950/40">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-500/15 p-3 ring-1 ring-cyan-400/20">
                <ShieldCheck className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Staff Login</CardTitle>
                <CardDescription className="text-slate-300">
                  Continue to {nextPath === STAFF_HOME_PATH ? 'Operations' : nextPath}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="staff-email" className="text-slate-200">
                  Email
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="staff@ktmcargo.com"
                  className="h-11 border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password" className="text-slate-200">
                  Password
                </Label>
                <Input
                  id="staff-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-11 border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  required
                />
              </div>

              {errorMessage && (
                <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In
                  </>
                ) : (
                  <>
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">Need access?</p>
              <p className="mt-1 leading-6">
                Ask your KTM administrator to create a staff account and assign the correct
                `staff_role` in the profile record.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link to={appendE2EFixture('/', location.search)}>Back Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
