# KTM Cargo Express System Spec

## 1. Purpose

KTM Cargo Express is the operating system for the cargo business. It supports
shopping proxy orders, cargo shipments, procurement, invoicing, after-sales
follow-up, and the internal staff workflow that connects all of them. The
public website is brochure-style and does not provide self-service ordering.

This document is the canonical reference for:

- business workflow stages
- route and module ownership
- technical contracts and data boundaries
- role-based usage notes

## 2. Canonical Workflow

The business flow is intentionally end-to-end:

1. Customer inquiry from Facebook, Line, Telegram, or direct contact
2. Quote and confirmation
3. Partial or full payment
4. Thailand-side buying or collection
5. Consolidation and 3rd-party booking
6. Thailand to Myanmar transit
7. Myanmar-side clearance and last-mile delivery
8. Proof of delivery and after-sales follow-up
9. Reconciliation for extra weight, refunds, or outstanding balance

The system supports three operating modes:

| Mode             | Meaning                                           |
| ---------------- | ------------------------------------------------- |
| `cargo_only`     | Cargo-only shipment flow                          |
| `shopping_proxy` | Staff buys the product on behalf of the customer  |
| `hybrid`         | Shopping proxy plus cargo movement in one journey |

## 3. Route and Module Map

### Public entry points

| Route                 | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `/`                   | Landing page and lead capture                               |
| `/PriceCalculator`    | Public price estimate and quote entry                       |
| `/ClientPortal`       | Public company profile / brochure page                      |
| `/Feedback`           | Public delivery-feedback submission page from emailed links |
| `/StaffLogin`         | Dedicated email/password entry for staff and admin users    |
| `/VendorRegistration` | Vendor onboarding / registration                            |

### Staff operations

| Route / module       | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `/Operations`        | Canonical staff landing page and workflow hub               |
| `/Dashboard`         | Legacy alias that redirects into `/Operations`              |
| `/operation`         | Typo alias that redirects into `/Operations`                |
| `/shipment`          | Typo alias that redirects into `/Shipments`                 |
| `/invoice`           | Typo alias that redirects into `/Invoices`                  |
| `/Shipments`         | Shipment lifecycle, transit, and tracking                   |
| `/ShoppingOrders`    | Shopping proxy orders and fulfillment intake                |
| `/Procurement`       | Purchase orders, vendor coordination, receipts, and AP flow |
| `/Invoices`          | Customer invoices and vendor bill management                |
| `/Customers`         | Customer records and segmentation                           |
| `/Vendors`           | Vendor records, capacity, and onboarding                    |
| `/Inventory`         | Inventory and stock movement views                          |
| `/Reports`           | Operational and profitability reporting                     |
| `/Tasks`             | Staff tasks and work queue                                  |
| `/ShipmentDocuments` | Document generation and shipping paperwork                  |
| `/FeedbackQueue`     | Staff queue for delivery feedback follow-up                 |
| `/FeedbackAnalytics` | Delivery feedback trends and analysis                       |
| `/Settings`          | Business settings, templates, staff, and feature flags      |

### Shared technical boundaries

| Area                            | Source of truth                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| Routing and layout bypass rules | `src/pages/index.jsx`, `src/pages/layoutRouteGuards.js`, `src/pages/Layout.jsx`               |
| Auth and profile self-heal      | `src/api/auth.js`, `src/components/auth/UserContext.jsx`                                      |
| Table access                    | `src/api/db.js`                                                                               |
| Validation and enums            | `src/domains/core/schemas.js`                                                                 |
| Notifications and feedback      | `src/components/notifications/*`, `src/components/feedback/*`                                 |
| Invoice services                | `src/components/invoices/*`, `src/components/procurement/InvoiceService.jsx`                  |
| Procurement workflow            | `src/components/procurement/*`                                                                |
| Public brochure + vendor signup | `src/pages/LandingPage.jsx`, `src/pages/ClientPortal.jsx`, `src/pages/VendorRegistration.jsx` |
| Documents                       | `src/components/documents/*`, `src/domains/documents/*`                                       |

## 4. Data and Contract Rules

- `order_journeys` and `journey_events` are the canonical workflow spine.
- Existing operational tables link to the journey spine with nullable `journey_id` columns.
- `customer_invoices` is a shared invoice table for both customer invoices and vendor bills.
- Invoice behavior is distinguished by `invoice_type`, not by separate tables.
- Customer invoices are created by staff when needed; vendor bills are recorded manually when received.
- Procurement invoice views must filter to `invoice_type === 'vendor_bill'`.
- Route access is role-aware:
  - guests can use the public pages, company profile, and feedback form
  - staff/admin users sign in through `/StaffLogin` and are routed into `/Operations`
  - unauthorized staff-route access is redirected into `/StaffLogin?next=...`
- Profile creation is self-healing for new auth users, so a missing profile does not block first sign-in.

## 5. Role Usage Notes

### Customer

- Contact KTM through Facebook, Line, Telegram, or direct support channels
- Receive staff-managed delivery updates
- Submit delivery feedback through the public `/Feedback` link sent after delivery

### Vendor

- Register through vendor onboarding if invited
- Work through procurement and approval flows through staff-managed records

### Staff / Admin

- Start in `/Operations`
- Use Shopping Orders for intake, Procurement for POs and receipts, Shipments for transit, Invoices for billing, Feedback Queue for after-sales follow-up, and Reports for reconciliation
- Keep the workflow moving from inquiry to delivery and after-sales

## 6. Usage Rules

- Keep public routing simple: landing page, price calculator, company profile, feedback form, vendor registration, and staff login are the only intentional public entry points.
- Keep `/StaffLogin` as the only public auth entry for internal staff work.
- Do not treat `Dashboard` as the canonical business hub; it is a legacy alias.
- Keep `FeedbackQueue` staff-only and reserve `/Feedback` for customer submission links.
- Keep invoice creation manual unless a service explicitly says otherwise.
- Use the migration runbook for schema changes; do not guess table state from UI behavior.

## 7. Supporting Docs

- [README.md](./README.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [migrations/README.md](./migrations/README.md)
- [scripts/playwright/README.md](./scripts/playwright/README.md)
