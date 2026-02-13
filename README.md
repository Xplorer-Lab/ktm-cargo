# KTM Cargo Express

A comprehensive logistics and shopping management platform for cargo shipments, shopping orders, customer invoicing, and vendor procurement.

## Overview

KTM Cargo Express supports three user types:

- **Customers** — Place orders, track shipments, and view invoices via the Client Portal.
- **Staff** — Manage dashboard, orders, shipments, invoices, reports, and settings.
- **Vendors** — View purchase orders and update status via the Vendor Portal.

The app handles two main order types: **shopping orders** (product cost + commission + shipping per kg) and **cargo shipments** (weight × rate + insurance + packaging + surcharges). Invoices are created from orders or shipments, with payments recorded in the app.

## Features

- **Customers** — Client portal, order history, shipment tracking, invoices.
- **Shopping orders** — Product cost, commission, per-kg shipping; link to purchase orders.
- **Cargo shipments** — Weight-based pricing, insurance, packaging, surcharges.
- **Invoices & payments** — Generate from orders/shipments, record payments.
- **Procurement** — Purchase orders, vendor management, weight allocation, approvals.
- **Price calculator** — Quotes that can become shopping orders or shipments.
- **Reports** — Analytics, forecasting, export.
- **Settings** — Pricing, company branding, notifications, staff management.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite 6 |
| **UI** | Tailwind CSS, Radix UI, Framer Motion, Lucide icons |
| **Forms & validation** | React Hook Form, Zod, @hookform/resolvers |
| **Data & state** | TanStack React Query, Supabase (JS client) |
| **Backend / DB** | Supabase (PostgreSQL, Auth, optional Edge Functions) |
| **Monitoring** | Sentry, LogRocket, Datadog (browser logs) |
| **Testing** | Jest, React Testing Library |
| **Tooling** | ESLint, Prettier, Snyk (security) |

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account ([supabase.com](https://supabase.com)) for backend and auth

## Setup

### 1. Clone and install

```bash
git clone <repository-url>
cd ktm-cargo-express
npm install
```

### 2. Environment variables

Copy the example env file and add your keys:

```bash
cp .env.example .env
```

Edit `.env` and set:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xxxx.supabase.co`) | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon / publishable key (browser-safe) | Yes |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | No |
| `VITE_LOGROCKET_APP_ID` | LogRocket app ID for session replay | No |

**Getting Supabase keys:** Supabase Dashboard → Project Settings → API. Use **Project URL** for `VITE_SUPABASE_URL` and the **anon public** (or **publishable**) key for `VITE_SUPABASE_ANON_KEY`. Do **not** use the service_role/secret key in the frontend.

> This app uses **Vite**, so env vars must be prefixed with `VITE_`. If the dashboard shows Next.js names (e.g. `NEXT_PUBLIC_SUPABASE_URL`), use the same values but with the `VITE_` names above. See [docs/SUPABASE_VITE_SETUP.md](docs/SUPABASE_VITE_SETUP.md) for details.

### 3. Run the app

```bash
npm run dev
```

Open the URL shown in the terminal (e.g. `http://localhost:5173`). If Supabase credentials are missing, the app will show setup instructions.

### 4. Production build

```bash
npm run build
npm run preview   # serve the built app locally
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier format |
| `npm run format:check` | Prettier check only |
| `npm run test` | Run Jest tests |
| `npm run test:watch` | Jest watch mode |
| `npm run test:coverage` | Jest with coverage |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run analyze` | Bundle visualizer |
| `npm run scan` | Snyk security scan |

## Project Structure

```
src/
├── api/              # Supabase client and API usage
├── components/       # React components (ui, invoices, shipments, portal, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Shared logic, schemas, calculations
├── pages/            # Route-level pages (Dashboard, Invoices, Settings, etc.)
├── utils/            # Utilities (e.g. document printing)
├── index.css         # Global styles
└── main.jsx          # App entry, Sentry/LogRocket, routing
```

Key areas:

- **Backend:** Supabase with RLS; schema via migrations and seed data.
- **Docs:** [docs/APP_OVERVIEW_DIAGRAM.md](docs/APP_OVERVIEW_DIAGRAM.md) for flows and structure; [docs/SUPABASE_VITE_SETUP.md](docs/SUPABASE_VITE_SETUP.md) for env setup.

## Contributing

### Workflow

1. **Fork** the repository (or use a branch if you have write access).
2. **Create a branch** from `main` for your change:
   ```bash
   git checkout -b feature/short-description
   # or: fix/short-description, docs/short-description
   ```
3. **Make changes** and keep commits focused and clear.
4. **Run checks** before pushing:
   ```bash
   npm run lint
   npm run format:check
   npm run test
   ```
5. **Push** your branch and open a **Pull Request** against `main`. Describe what changed and why.
6. Address review feedback; maintainers will merge when ready.

### Code style

- **Linting:** ESLint; run `npm run lint` and `npm run lint:fix` when needed.
- **Formatting:** Prettier; run `npm run format` to format, `npm run format:check` in CI.
- **Tests:** Add or update tests for new behavior; run `npm run test` (and `npm run test:coverage` if applicable).

### Commit messages

- Use present tense and a clear subject (e.g. `Add invoice export`, `Fix shipment weight calculation`).
- Optionally add a short body for non-trivial changes.

### Backend and product rules

- **Supabase:** RLS on all tables; use Edge Functions for complex logic; document schema changes.
- **Monetization:** Design with subscription tiers in mind (see project docs/rules for Stripe and feature gating).

---

For high-level flows and diagrams, see [docs/APP_OVERVIEW_DIAGRAM.md](docs/APP_OVERVIEW_DIAGRAM.md).
