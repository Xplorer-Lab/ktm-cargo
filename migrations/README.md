# Database Migrations

This directory now uses a canonical 3-file migration chain instead of the old
34-script repair pile.

## Run order

1. `00_baseline.sql`
2. `01_seed_data.sql`
3. `02_incremental_001.sql`

The old one-off repair migrations are preserved under `migrations/archived/`
for audit and historical reference.

## What each file does

### `00_baseline.sql`

Creates the clean schema foundation:

- core reference tables
- customer, vendor, purchase order, shipment, shopping order, invoice, and journey tables
- support and admin tables
- canonical money columns as `DECIMAL`
- baseline indexes, checks, and foreign keys

### `01_seed_data.sql`

Contains only seed rows:

- company settings default row
- pricing tiers
- surcharge rows

### `02_incremental_001.sql`

Adds behavior and hardening on top of the baseline:

- RLS policies
- portal identity helpers
- auth-linked customer/vendor ownership
- profile self-insert and self-escalation protection
- numbering helpers and triggers
- status/type normalization
- legacy feedback to support-ticket sync
- shipment / purchase-order transactional RPCs

## Notes

- The old migration scripts are archived, but they are no longer the recommended
  path for new environments.
- The baseline is intentionally idempotent where practical, but the intended
  setup flow is still to run the files in order on a fresh database.
- Money-related columns use `DECIMAL`, not `TEXT`.
