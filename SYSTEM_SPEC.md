# KTM Cargo Express System Spec

## 1. Purpose

KTM Cargo Express is the operating system for the cargo business. It supports
shopping proxy orders, cargo shipments, procurement, invoicing, customer and
vendor portals, and the internal staff workflow that connects all of them.

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

| Route                 | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `/`                   | Landing page and lead capture                  |
| `/PriceCalculator`    | Public price estimate and quote entry          |
| `/ClientPortal`       | Customer and vendor portal login and dashboard |
| `/VendorRegistration` | Vendor onboarding / registration               |

### Staff operations

| Route / module                     | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `/Operations`                      | Canonical staff landing page and workflow hub               |
| `/Dashboard`                       | Legacy staff dashboard entry point                          |
| `/Shipments`                       | Shipment lifecycle, transit, and tracking                   |
| `/ShoppingOrders`                  | Shopping proxy orders and fulfillment intake                |
| `/Procurement`                     | Purchase orders, vendor coordination, receipts, and AP flow |
| `/Invoices`                        | Customer invoices and vendor bill management                |
| `/Customers`                       | Customer records and segmentation                           |
| `/Vendors`                         | Vendor records, capacity, and onboarding                    |
| `/Inventory`                       | Inventory and stock movement views                          |
| `/Reports`                         | Operational and profitability reporting                     |
| `/Tasks`                           | Staff tasks and work queue                                  |
| `/ShipmentDocuments`               | Document generation and shipping paperwork                  |
| `/Feedback` / `/FeedbackAnalytics` | Delivery feedback capture and analysis                      |
| `/Settings`                        | Business settings, templates, staff, and feature flags      |

### Shared technical boundaries

| Area                            | Source of truth                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Routing and layout bypass rules | `src/pages/index.jsx`, `src/pages/layoutRouteGuards.js`, `src/pages/Layout.jsx` |
| Auth and profile self-heal      | `src/api/auth.js`, `src/components/auth/UserContext.jsx`                        |
| Table access                    | `src/api/db.js`                                                                 |
| Validation and enums            | `src/domains/core/schemas.js`                                                   |
| Notifications and feedback      | `src/components/notifications/*`, `src/components/feedback/*`                   |
| Invoice services                | `src/components/invoices/*`, `src/components/procurement/InvoiceService.jsx`    |
| Procurement workflow            | `src/components/procurement/*`                                                  |
| Portal UX                       | `src/components/portal/*`, `src/pages/ClientPortal.jsx`                         |
| Documents                       | `src/components/documents/*`, `src/domains/documents/*`                         |

## 4. Data and Contract Rules

- `order_journeys` and `journey_events` are the canonical workflow spine.
- Existing operational tables link to the journey spine with nullable `journey_id` columns.
- `customer_invoices` is a shared invoice table for both customer invoices and vendor bills.
- Invoice behavior is distinguished by `invoice_type`, not by separate tables.
- Customer invoices are created by staff when needed; vendor bills are recorded manually when received.
- Route access is role-aware:
  - guests can use the public pages and the client portal entry
  - staff/admin users are routed into `/Operations`
  - unauthorized users are redirected back to the portal entry
- Profile creation is self-healing for new auth users, so a missing profile does not block first sign-in.

## 5. Role Usage Notes

### Customer

- Track shipments and shopping orders from the client portal
- Review invoices and order history
- Submit support requests and delivery feedback

### Vendor

- Use the client portal for vendor-side orders, invoices, and performance views
- Work through procurement and approval flows through staff-managed records

### Staff / Admin

- Start in `/Operations`
- Use Shopping Orders for intake, Procurement for POs and receipts, Shipments for transit, Invoices for billing, and Reports for reconciliation
- Keep the workflow moving from inquiry to delivery and after-sales

## 6. Usage Rules

- Keep public routing simple: landing page, price calculator, client portal, and vendor registration are the only intentional public entry points.
- Do not treat `Dashboard` as the canonical business hub; it is a legacy alias.
- Keep invoice creation manual unless a service explicitly says otherwise.
- Use the migration runbook for schema changes; do not guess table state from UI behavior.

## 7. Supporting Docs

- [README.md](./README.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [migrations/README.md](./migrations/README.md)
- [scripts/playwright/README.md](./scripts/playwright/README.md)
