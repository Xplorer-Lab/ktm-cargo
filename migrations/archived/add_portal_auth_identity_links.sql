-- ==============================================================================
-- PORTAL AUTH IDENTITY LINKS (P0 HARDENING)
--
-- Purpose:
--   Move portal ownership from fragile email matching toward stable auth UID
--   linkage. Adds `auth_user_id` to customers/vendors and backfills from
--   profiles where possible.
--
-- Depends on:
--   1) fix_rls_policies.sql
--   2) fix_profiles_allow_self_insert.sql
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1) Add identity-link columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS auth_user_id uuid;

COMMENT ON COLUMN public.customers.auth_user_id IS
  'Linked auth/profiles user id for stable portal ownership';
COMMENT ON COLUMN public.vendors.auth_user_id IS
  'Linked auth/profiles user id for stable vendor portal ownership';

-- ---------------------------------------------------------------------------
-- 2) Optional foreign keys to profiles(id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.customers
      ADD CONSTRAINT fk_customers_auth_user
      FOREIGN KEY (auth_user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TABLE public.vendors
      ADD CONSTRAINT fk_vendors_auth_user
      FOREIGN KEY (auth_user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Backfill from profiles by case-insensitive email match
-- ---------------------------------------------------------------------------
UPDATE public.customers c
SET auth_user_id = p.id
FROM public.profiles p
WHERE c.auth_user_id IS NULL
  AND c.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(c.email) = lower(p.email);

UPDATE public.vendors v
SET auth_user_id = p.id
FROM public.profiles p
WHERE v.auth_user_id IS NULL
  AND v.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(v.email) = lower(p.email);

-- ---------------------------------------------------------------------------
-- 4) Resolve duplicates before adding unique indexes
--    Keep one row per auth_user_id and null out the rest.
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    auth_user_id,
    row_number() OVER (
      PARTITION BY auth_user_id
      ORDER BY id DESC
    ) AS rn
  FROM public.customers
  WHERE auth_user_id IS NOT NULL
)
UPDATE public.customers c
SET auth_user_id = NULL
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    auth_user_id,
    row_number() OVER (
      PARTITION BY auth_user_id
      ORDER BY id DESC
    ) AS rn
  FROM public.vendors
  WHERE auth_user_id IS NOT NULL
)
UPDATE public.vendors v
SET auth_user_id = NULL
FROM ranked r
WHERE v.id = r.id
  AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- 5) Uniqueness + lookup indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_auth_user_id
  ON public.customers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_auth_user_id
  ON public.vendors(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_email_ci
  ON public.customers (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_email_ci
  ON public.vendors (lower(email))
  WHERE email IS NOT NULL;
