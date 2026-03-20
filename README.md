# KTM Cargo Express

KTM Cargo Express is the staff-led logistics operating system for the business. It supports inquiry handling, shopping proxy orders, cargo shipments, procurement, invoicing, after-sales follow-up, and the internal workflow that connects them.

Shipment allocation is currently hardened on the client side with fresh-row reads, mutation-side capacity checks, and rollback helpers. The next integrity step is a Supabase RPC or transaction-based shipment/PO write path.

## Start Here

- [System Spec](./SYSTEM_SPEC.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Database Migrations](./migrations/README.md)
- [Playwright Workflow Smoke Test](./scripts/playwright/README.md)

## Current Stack

- React 19 + Vite 6
- JavaScript/JSX with Tailwind CSS 4
- Supabase for auth and data
- TanStack Query for server state
- Jest and Playwright for tests
- Vercel for preview and production deploys

## What the system does

- Public pages: landing page, price calculator, brochure-style company profile, customer feedback form, vendor registration, and a dedicated staff login entry
- Staff operations: operations hub, shipments, shopping orders, procurement, invoices, customers, vendors, inventory, reports, tasks, shipment documents, feedback queue, feedback analytics, and settings
- Workflow spine: `Inquiry -> Quote -> Confirm -> Buy/Collect -> Consolidate -> Transit -> Deliver -> Reconcile`

## Notes

The canonical workflow and module contract reference is `SYSTEM_SPEC.md`.
