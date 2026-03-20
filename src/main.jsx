import ReactDOM from 'react-dom/client';
import '@/index.css';
import * as Sentry from '@sentry/react';
import LogRocket from 'logrocket';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const hasSupabaseEnv =
  supabaseUrl &&
  supabaseAnonKey &&
  (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://')) &&
  !supabaseUrl.includes('your_project_url') &&
  !supabaseAnonKey.includes('your_anon_key');

function SetupRequired() {
  return (
    <div
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 560,
        margin: '40px auto',
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ marginBottom: 16, color: '#1e293b' }}>Setup required</h1>
      <p style={{ color: '#475569', marginBottom: 16 }}>
        Missing Supabase credentials. The app needs them to connect to your database and auth.
      </p>
      <ol style={{ color: '#475569', paddingLeft: 20, marginBottom: 16 }}>
        <li>
          Copy{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            .env.example
          </code>{' '}
          to{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>.env</code>{' '}
          in the project root.
        </li>
        <li>
          Open your{' '}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#2563eb' }}
          >
            Supabase Dashboard
          </a>{' '}
          → Project Settings → API.
        </li>
        <li>
          Set{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            VITE_SUPABASE_URL
          </code>{' '}
          to your Project URL and{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          to your anon public key in{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>.env</code>.
        </li>
        <li>
          Restart the dev server or run{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            npm run build
          </code>{' '}
          then{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            npm run preview
          </code>{' '}
          again.
        </li>
      </ol>
      <p style={{ color: '#64748b', fontSize: 14 }}>
        Keep{' '}
        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>.env</code> out
        of version control (it is usually in{' '}
        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
          .gitignore
        </code>
        ).
      </p>
    </div>
  );
}

// Initialize Sentry
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && !sentryDsn.includes('your_sentry_dsn_here')) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Initialize LogRocket (only in production; often blocked by ad blockers in dev)
const logRocketAppId = import.meta.env.VITE_LOGROCKET_APP_ID;
if (
  import.meta.env.PROD &&
  logRocketAppId &&
  !logRocketAppId.includes('your_logrocket_app_id_here')
) {
  try {
    LogRocket.init(logRocketAppId);
    if (sentryDsn && !sentryDsn.includes('your_sentry_dsn_here')) {
      LogRocket.getSessionURL((sessionURL) => {
        Sentry.getCurrentScope().setExtra('sessionURL', sessionURL);
      });
    }
  } catch {
    // LogRocket may fail when blocked by extensions; avoid breaking the app
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

if (!hasSupabaseEnv) {
  root.render(<SetupRequired />);
} else {
  import('@/App.jsx').then(({ default: App }) => {
    root.render(<App />);
  });
}
