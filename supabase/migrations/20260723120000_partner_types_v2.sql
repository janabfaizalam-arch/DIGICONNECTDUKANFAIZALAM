-- ============================================================================
-- PARTNER TYPES V2 — Digi Partner classifications
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-07-23
--
-- Replaces: ceo, shop_owner, field_executive
-- With:     business_partner, company_partner, field_executive, office_staff
--
-- Idempotent and non-destructive: UPDATE rows first, then swap check constraint.
-- Does not delete or recreate partner records. Auth roles / RLS ownership unchanged.
-- ============================================================================

DO $$
DECLARE
  v_ceo_count integer := 0;
  v_shop_count integer := 0;
  v_fe_count integer := 0;
  v_other_legacy integer := 0;
  v_updated integer := 0;
BEGIN
  SELECT count(*) INTO v_ceo_count
  FROM public.agency_partners WHERE partner_type = 'ceo';

  SELECT count(*) INTO v_shop_count
  FROM public.agency_partners WHERE partner_type = 'shop_owner';

  SELECT count(*) INTO v_fe_count
  FROM public.agency_partners WHERE partner_type = 'field_executive';

  SELECT count(*) INTO v_other_legacy
  FROM public.agency_partners
  WHERE partner_type NOT IN (
    'ceo',
    'shop_owner',
    'field_executive',
    'business_partner',
    'company_partner',
    'office_staff'
  );

  RAISE NOTICE
    '[partner_types_v2] before: ceo=%, shop_owner=%, field_executive=%, other_legacy=%',
    v_ceo_count, v_shop_count, v_fe_count, v_other_legacy;

  -- ── 1. Migrate legacy row values BEFORE changing the constraint ───────────
  UPDATE public.agency_partners
  SET
    partner_type = CASE partner_type
      WHEN 'ceo' THEN 'company_partner'
      WHEN 'shop_owner' THEN 'business_partner'
      ELSE partner_type
    END,
    updated_at = now()
  WHERE partner_type IN ('ceo', 'shop_owner');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RAISE NOTICE '[partner_types_v2] mapped legacy rows updated=%', v_updated;

  -- Map any remaining unexpected legacy values safely to business_partner
  UPDATE public.agency_partners
  SET
    partner_type = 'business_partner',
    updated_at = now()
  WHERE partner_type NOT IN (
    'business_partner',
    'company_partner',
    'field_executive',
    'office_staff'
  );

  -- ── 2. Swap check constraint to canonical four values ─────────────────────
  ALTER TABLE public.agency_partners
    DROP CONSTRAINT IF EXISTS agency_partners_partner_type_check;

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

  -- ── 3. Default for new rows ───────────────────────────────────────────────
  ALTER TABLE public.agency_partners
    ALTER COLUMN partner_type SET DEFAULT 'business_partner';

  RAISE NOTICE
    '[partner_types_v2] after: company_partner=%, business_partner=%, field_executive=%, office_staff=%',
    (SELECT count(*) FROM public.agency_partners WHERE partner_type = 'company_partner'),
    (SELECT count(*) FROM public.agency_partners WHERE partner_type = 'business_partner'),
    (SELECT count(*) FROM public.agency_partners WHERE partner_type = 'field_executive'),
    (SELECT count(*) FROM public.agency_partners WHERE partner_type = 'office_staff');
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '[partner_types_v2] constraint already present; continuing';
  WHEN others THEN
    RAISE WARNING '[partner_types_v2] constraint/default step: %', SQLERRM;
END $$;

-- ── 4. Nullable profile columns (non-destructive) ───────────────────────────

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
