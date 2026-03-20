# KTM Cargo Express

KTM Cargo Express is the logistics, shopping proxy, procurement, invoicing, and customer/vendor portal system for the business.

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

- Public intake: landing page, price calculator, client portal, vendor registration
- Staff operations: dashboard, operations hub, shipments, shopping orders, procurement, invoices, customers, vendors, inventory, reports, tasks, shipment documents, feedback, and settings
- Portals: customer and vendor views for tracking, orders, invoices, support, and profile management

## Notes

The master workflow and module contract reference is `SYSTEM_SPEC.md`.
