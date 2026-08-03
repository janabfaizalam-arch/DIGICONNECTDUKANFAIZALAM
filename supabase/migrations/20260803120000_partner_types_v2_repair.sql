-- ============================================================================
-- PARTNER TYPES V2 REPAIR — DigiConnect Dukan / RNOS India Pvt Ltd
-- 2026-08-03
--
-- Production symptom:
--   new row for relation "agency_partners" violates check constraint
--   agency_partners_partner_type_check
--
-- Cause:
--   App inserts Digi Partner v2 values (business_partner, company_partner,
--   field_executive, office_staff) while some environments still enforce the
--   legacy CHECK (ceo | shop_owner | field_executive) because
--   20260723120000_partner_types_v2.sql swallowed failures with RAISE WARNING.
--
-- This repair:
--   1. Remaps any remaining legacy / unexpected partner_type values
--   2. Forces the canonical CHECK constraint (hard-fail on error — no swallow)
--   3. Sets DEFAULT to business_partner
-- Idempotent and safe to re-run.
-- ============================================================================

-- ── 1. Remap legacy row values BEFORE swapping the constraint ───────────────
UPDATE public.agency_partners
SET
  partner_type = CASE partner_type
    WHEN 'ceo' THEN 'company_partner'
    WHEN 'shop_owner' THEN 'business_partner'
    WHEN 'franchise' THEN 'business_partner'
    WHEN 'consultant' THEN 'business_partner'
    WHEN 'reseller' THEN 'business_partner'
    WHEN 'agent' THEN 'field_executive'
    WHEN 'sub_agent' THEN 'field_executive'
    WHEN 'field_staff' THEN 'field_executive'
    WHEN 'team_member' THEN 'office_staff'
    WHEN 'staff' THEN 'office_staff'
    WHEN 'employee' THEN 'office_staff'
    WHEN 'agency_staff' THEN 'office_staff'
    ELSE partner_type
  END,
  updated_at = now()
WHERE partner_type IN (
  'ceo',
  'shop_owner',
  'franchise',
  'consultant',
  'reseller',
  'agent',
  'sub_agent',
  'field_staff',
  'team_member',
  'staff',
  'employee',
  'agency_staff'
);

-- Catch-all: anything still outside the canonical set → business_partner
UPDATE public.agency_partners
SET
  partner_type = 'business_partner',
  updated_at = now()
WHERE partner_type IS NULL
   OR partner_type NOT IN (
     'business_partner',
     'company_partner',
     'field_executive',
     'office_staff'
   );

-- ── 2. Drop every known legacy check constraint name, then recreate ─────────
ALTER TABLE public.agency_partners
  DROP CONSTRAINT IF EXISTS agency_partners_partner_type_check;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'agency_partners'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%partner_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.agency_partners DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.agency_partners
  ADD CONSTRAINT agency_partners_partner_type_check
  CHECK (
    partner_type IN (
      'business_partner',
      'company_partner',
      'field_executive',
      'office_staff'
    )
  );

ALTER TABLE public.agency_partners
  ALTER COLUMN partner_type SET DEFAULT 'business_partner';

-- ── 3. Ensure team-structure columns exist (non-destructive) ────────────────
ALTER TABLE public.agency_partners
  ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE public.agency_partners
  ADD COLUMN IF NOT EXISTS reporting_to_partner_id uuid
    REFERENCES public.agency_partners(id) ON DELETE SET NULL;

ALTER TABLE public.agency_partners
  ADD COLUMN IF NOT EXISTS territory text;

ALTER TABLE public.agency_partners
  ADD COLUMN IF NOT EXISTS joining_date date;

CREATE INDEX IF NOT EXISTS agency_partners_reporting_to_partner_idx
  ON public.agency_partners(reporting_to_partner_id)
  WHERE reporting_to_partner_id IS NOT NULL;
