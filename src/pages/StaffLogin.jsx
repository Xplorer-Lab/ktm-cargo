import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/api/auth';
import { db } from '@/api/db';
import { useUser } from '@/components/auth/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STAFF_HOME_PATH, getStaffDestinationFromSearch } from '@/lib/staffAuthRouting';
import { appendE2EFixture } from '@/lib/e2e';

/* ── Brand tokens (mirrored from ClientPortal) ─────────────────────────── */
const GOLD_GRADIENT = 'linear-gradient(160deg, #F7E17A 0%, #D4A63A 48%, #9A6E10 100%)';
const GOLD_BTN_GRADIENT = 'linear-gradient(135deg, #E8C968 0%, #C9A030 50%, #9A6E10 100%)';
const GOLD_TEXT_STYLE = {
  background: GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

function SpeedMark({ size = 'md' }) {
  const bars =
    size === 'sm'
      ? [
          { w: 14, h: 3 },
          { w: 11, h: 3 },
          { w: 8, h: 3 },
        ]
      : [
          { w: 22, h: 4.5 },
          { w: 17, h: 4.5 },
          { w: 12, h: 4.5 },
        ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: size === 'sm' ? 3 : 5 }}>
      {bars.map((b, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: b.w,
            height: b.h,
            borderRadius: 2,
            transform: 'skewX(-18deg)',
            background: GOLD_GRADIENT,
            boxShadow: '0 2px 8px rgba(212,166,58,0.35)',
          }}
        />
      ))}
    </div>
  );
}

function KtmMark({ size = 'md' }) {
  const fontSize = size === 'sm' ? 22 : size === 'lg' ? 42 : 32;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 6 : 10 }}>
      <SpeedMark size={size} />
      <div>
        <div
          style={{
            fontFamily: "'Oswald', 'Bebas Neue', Impact, sans-serif",
            fontSize,
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            ...GOLD_TEXT_STYLE,
          }}
        >
          KTM
        </div>
        <div
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: size === 'sm' ? 7 : 9,
            fontWeight: 500,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: '#9A7A30',
            marginTop: 3,
          }}
        >
          CARGO EXPRESS
        </div>
      </div>
    </div>
  );
}

function BrandLogo({ logoUrl, companyName, size = 'md' }) {
  if (logoUrl) {
    const px = size === 'sm' ? 32 : 48;
    return (
      <img
        src={logoUrl}
        alt={companyName || 'Logo'}
        style={{ width: px, height: px, objectFit: 'contain' }}
      />
    );
  }
  return <KtmMark size={size} />;
}

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

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      try {
        const list = await db.companySettings.list();
        return list[0] || null;
      } catch {
        return null;
      }
    },
    retry: false,
  });
  const uploadedLogo = companySettings?.logo_url;
  const companyName = companySettings?.company_name || 'KTM Cargo Express';

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

  // ── Rate limiting helpers (localStorage-backed, per-email) ───────────────
  const RATE_LIMIT_KEY = 'staff_login_attempts';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  function getRateLimitData(emailAddr) {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      if (!raw) return {};
      const all = JSON.parse(raw);
      return all[emailAddr] || null;
    } catch {
      return null;
    }
  }

  function isRateLimited(emailAddr) {
    const data = getRateLimitData(emailAddr);
    if (!data) return false;
    const { attempts, firstAttemptAt } = data;
    const windowStart = Date.now() - LOCKOUT_WINDOW_MS;
    if (attempts >= MAX_ATTEMPTS && firstAttemptAt > windowStart) {
      return true;
    }
    return false;
  }

  function recordFailedAttempt(emailAddr) {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      const all = raw ? JSON.parse(raw) : {};
      const existing = all[emailAddr] || { attempts: 0, firstAttemptAt: Date.now() };
      const windowStart = Date.now() - LOCKOUT_WINDOW_MS;
      // Reset window if expired
      const firstAttempt =
        existing.firstAttemptAt > windowStart ? existing.firstAttemptAt : Date.now();
      const attempts = existing.firstAttemptAt > windowStart ? existing.attempts + 1 : 1;
      all[emailAddr] = { attempts, firstAttemptAt: firstAttempt };
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(all));
    } catch {
      // localStorage unavailable — skip rate limiting (fail open for usability)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    // ── Rate limit check ─────────────────────────────────────────────────
    if (isRateLimited(email)) {
      setErrorMessage('Too many failed attempts. Please wait 15 minutes before trying again.');
      setSubmitting(false);
      return;
    }

    try {
      await auth.login(email, password);
      const currentUser = await auth.me();
      await refreshUser();

      if (isStaffAccount(currentUser)) {
        // Clear rate limit on successful login
        try {
          const raw = localStorage.getItem(RATE_LIMIT_KEY);
          if (raw) {
            const all = JSON.parse(raw);
            delete all[email];
            localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(all));
          }
        } catch {
          /* ignore */
        }
        navigate(nextPath, { replace: true });
        return;
      }

      setErrorMessage('This account is not configured for staff operations.');
    } catch (error) {
      recordFailedAttempt(email);
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
      <div
        style={{
          minHeight: '100vh',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#D4A63A' }} />
      </div>
    );
  }

  if (signedInButNotStaff) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ marginBottom: 32 }}>
            <BrandLogo logoUrl={uploadedLogo} companyName={companyName} size="md" />
          </div>
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: 16,
              padding: '32px',
              boxShadow: '0 4px 32px rgba(212,166,58,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AlertTriangle style={{ color: '#D4A63A', width: 22, height: 22, flexShrink: 0 }} />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                Account Not Configured
              </h2>
            </div>
            <div
              style={{
                height: 1,
                background: 'linear-gradient(90deg, #D4A63A 0%, rgba(212,166,58,0.08) 100%)',
                marginBottom: 20,
              }}
            />
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
              This account is signed in, but it is not configured for staff modules.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
              Use a staff or admin account to continue to{' '}
              <span style={{ color: '#111827', fontWeight: 600 }}>{nextPath}</span>.
            </p>
            {errorMessage && (
              <p
                style={{
                  margin: '0 0 16px',
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#991B1B',
                }}
              >
                {errorMessage}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                to={appendE2EFixture('/', location.search)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#6B7280',
                  border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  letterSpacing: '0.03em',
                  transition: 'border-color 0.15s',
                }}
              >
                Back Home
              </Link>
              <button
                onClick={() => auth.logout()}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  color: '#fff',
                  background: GOLD_BTN_GRADIENT,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
                }}
              >
                Switch Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111827' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: '1px solid rgba(201,168,76,0.2)',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link to={appendE2EFixture('/', location.search)} style={{ textDecoration: 'none' }}>
            <BrandLogo logoUrl={uploadedLogo} companyName={companyName} size="sm" />
          </Link>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#9A7A30',
              background: 'rgba(212,166,58,0.08)',
              border: '1px solid rgba(212,166,58,0.2)',
              padding: '4px 10px',
              borderRadius: 4,
            }}
          >
            Staff Access
          </span>
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '64px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 64,
          alignItems: 'center',
        }}
      >
        {/* Left — brand panel */}
        <div>
          <div
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#9A7A30',
              background: 'rgba(212,166,58,0.08)',
              border: '1px solid rgba(212,166,58,0.2)',
              padding: '4px 10px',
              borderRadius: 4,
              marginBottom: 24,
            }}
          >
            Internal access
          </div>

          <h1
            style={{
              margin: '0 0 16px',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: '#111827',
            }}
          >
            Staff operations, <span style={GOLD_TEXT_STYLE}>one secured&nbsp;workflow.</span>
          </h1>

          <div
            style={{
              height: 2,
              width: 48,
              background: GOLD_GRADIENT,
              borderRadius: 2,
              marginBottom: 20,
            }}
          />

          <p
            style={{
              margin: '0 0 40px',
              fontSize: 15,
              lineHeight: 1.7,
              color: '#6B7280',
              maxWidth: 480,
            }}
          >
            Shopping intake, cargo shipments, procurement, invoicing, and after-sales — all managed
            from the KTM operations console.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              ['TH → MM', 'Bangkok မှ Yangon door-to-door logistics'],
              ['Role-aware', 'Staff and admin accounts only'],
              ['Route-safe', 'Protected routes redirect back here'],
            ].map(([label, desc]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: GOLD_GRADIENT,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginRight: 8 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — login card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 16,
            padding: '36px',
            boxShadow: '0 4px 40px rgba(212,166,58,0.07), 0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(212,166,58,0.08)',
                border: '1px solid rgba(212,166,58,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck style={{ width: 22, height: 22, color: '#D4A63A' }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                Staff Login
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                Continue to {nextPath === STAFF_HOME_PATH ? 'Operations' : nextPath}
              </div>
            </div>
          </div>

          <div
            style={{
              height: 1,
              background:
                'linear-gradient(90deg, rgba(212,166,58,0.3) 0%, rgba(212,166,58,0.04) 100%)',
              marginBottom: 24,
            }}
          />

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <Label
                htmlFor="staff-email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Email
              </Label>
              <Input
                id="staff-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@ktmcargo.com"
                className="h-11 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-amber-400/40"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="staff-password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Password
              </Label>
              <Input
                id="staff-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-amber-400/40"
                required
              />
            </div>

            {errorMessage && (
              <p
                style={{
                  margin: 0,
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#991B1B',
                }}
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 4,
                width: '100%',
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#fff',
                background: submitting ? '#C9A030' : GOLD_BTN_GRADIENT,
                border: 'none',
                borderRadius: 8,
                cursor: submitting ? 'not-allowed' : 'pointer',
                clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
                opacity: submitting ? 0.75 : 1,
                transition: 'filter 0.15s, opacity 0.15s',
              }}
            >
              {submitting ? (
                <>
                  <Loader2
                    style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }}
                  />
                  Signing In
                </>
              ) : (
                <>
                  <LockKeyhole style={{ width: 15, height: 15 }} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Need access */}
          <div
            style={{
              marginTop: 20,
              padding: '14px',
              background: 'rgba(212,166,58,0.04)',
              border: '1px solid rgba(212,166,58,0.15)',
              borderRadius: 10,
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#374151' }}>
              Need access?
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
              Ask your KTM administrator to create a staff account and assign the correct{' '}
              <code style={{ fontFamily: 'monospace', color: '#6B7280' }}>staff_role</code> in the
              profile record.
            </p>
          </div>

          <Link
            to={appendE2EFixture('/', location.search)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
              height: 40,
              fontSize: 13,
              color: '#9CA3AF',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 8,
              textDecoration: 'none',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
