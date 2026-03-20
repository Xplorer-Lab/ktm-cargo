# Database Migrations — KTM Cargo Express

> **Runbook:** Apply migrations in the order below when setting up a new
> environment or restoring from backup. Run each file in the
> **Supabase SQL Editor** (Dashboard → SQL Editor → New query).

> **Canonical workflow contract:** The active order-flow spine lives in
> `add_order_journey_spine_and_contract_normalization.sql`. It is part of the
> current system model, not a one-off repair script.

## Migration order (full)

Order matters — later migrations depend on objects created by earlier ones.

### Phase 1 — Schema foundation

| #   | File                                | Purpose                                             |
| --- | ----------------------------------- | --------------------------------------------------- |
| 1   | `create_company_settings.sql`       | Company settings table (pricing defaults, branding) |
| 2   | `create_service_pricing_tables.sql` | Service pricing & surcharges tables                 |
| 3   | `create_audit_logs.sql`             | Audit log table                                     |

### Phase 2 — Schema alignment & fixes

| #   | File                                  | Purpose                                     |
| --- | ------------------------------------- | ------------------------------------------- |
| 4   | `step1_add_columns.sql`               | Add missing columns to core tables          |
| 5   | `step1_part2_missed_columns.sql`      | Additional missed columns                   |
| 6   | `step2_populate_data.sql`             | Seed / backfill data                        |
| 7   | `step3_fix_po_schema.sql`             | Purchase orders schema fixes                |
| 8   | `fix_shipment_schema.sql`             | Shipment table schema corrections           |
| 9   | `fix_shopping_orders_and_enforce.sql` | Shopping orders schema + constraints        |
| 10  | `fix_company_settings_schema.sql`     | Company settings schema fixes               |
| 11  | `add_shipment_origin_destination.sql` | Add origin/destination columns to shipments |
| 12  | `add_insurance_opted_column.sql`      | Add `insurance_opted` boolean to shipments  |
| 13  | `enforce_relationships.sql`           | Foreign key relationships                   |

### Phase 3 — P0 Security & data integrity (CRITICAL)

| #   | File                                       | Purpose                                                                              |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| 14  | `fix_rls_policies.sql`                     | **Enable RLS** on all business tables; create `is_admin_or_director()`               |
| 15  | `fix_profiles_allow_self_insert.sql`       | Allow new users to insert their own profile (auth self-heal)                         |
| 16  | `fix_profiles_prevent_self_escalation.sql` | Trigger blocks non-admins from changing `role`/`staff_role`                          |
| 17  | `add_invoice_number_sequence.sql`          | DB-backed invoice number sequence (`next_invoice_number()` RPC)                      |
| 18  | `add_auto_number_triggers.sql`             | Auto-generate tracking / order numbers via triggers                                  |
| 19  | `add_portal_auth_identity_links.sql`       | Add `auth_user_id` linkage + uniqueness for customers/vendors                        |
| 20  | `add_client_portal_rls.sql`                | **Customer + Vendor portal self-access policies** (required for Client Portal flows) |

### Phase 4 — Workflow spine & contract normalization (CURRENT MODEL)

| #   | File                                                     | Purpose                                                                     |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| 21  | `add_order_journey_spine_and_contract_normalization.sql` | Canonical journey spine, nullable journey links, and contract normalization |
| 22  | `add_shipment_po_allocation_rpcs.sql`                    | Atomic shipment create/update/delete RPCs for PO allocation rebalance       |

### Phase 5 — Monetization (optional, if using Stripe)

| #   | File                          | Purpose                                                                          |
| --- | ----------------------------- | -------------------------------------------------------------------------------- |
| 23  | `add_subscription_fields.sql` | Add `stripe_customer_id`, `subscription_status`, `subscription_tier` to profiles |

### Verification

After applying Phase 3, run:

```bash
node scripts/verify_p0_migrations.mjs
```

This connects to your Supabase project (using `.env` credentials) and confirms
critical P0 objects exist, including portal helpers (`my_customer_id`,
`my_vendor_id`) required by Client Portal RLS.

## Quick setup for a brand-new environment

```bash
# 1. Clone repo and install
git clone <repo> && cd ktm-cargo && npm install

# 2. Copy env and fill in Supabase URL + anon key
cp .env.example .env

# 3. Apply all migrations in order (Supabase SQL Editor)
#    → Paste each .sql file from Phase 1 → 4 in sequence

# 4. Verify P0 migrations
node scripts/verify_p0_migrations.mjs

# 5. Start the app
npm run dev
```

## Notes

- **Never** run migrations with the **anon key** — use the **service_role key** or the SQL Editor.
- Keep `.env` out of version control (`.gitignore` already excludes it).
- After each migration, verify in the Supabase Dashboard that the expected
  tables / functions / triggers exist.
- The shipment allocation RPC migration is the current integrity hardening path for shipment write operations. Apply it before switching the frontend away from client-coordinated PO writes.
- Remaining alignment / audit migrations (`align_db_with_json.sql`,
  `master_schema_alignment.sql`, `complete_schema_fix.sql`, etc.) are
  one-time fixes; apply only if your schema is behind the canonical JSON
  definition or you are recovering an older database.
