-- ============================================================================
-- SIMPLIFY USER HIERARCHY — MIGRATION
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-06-25
--
-- Removes: franchise, consultant, reseller partner types
-- Adds: ceo partner type
-- Adds: created_by_user_id column for CEO team scoping
-- ============================================================================

-- ── 1. ADD created_by_user_id COLUMN ────────────────────────────────────────

ALTER TABLE public.agency_partners
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agency_partners_created_by_user_idx
  ON public.agency_partners(created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;

-- ── 2. MIGRATE DEPRECATED PARTNER TYPES ─────────────────────────────────────

UPDATE public.agency_partners
SET partner_type = 'shop_owner',
    updated_at = now()
WHERE partner_type IN ('franchise', 'consultant', 'reseller');

-- ── 3. UPDATE CHECK CONSTRAINT ──────────────────────────────────────────────

DO $$
BEGIN
  -- Drop the old constraint (name may vary)
  ALTER TABLE public.agency_partners
    DROP CONSTRAINT IF EXISTS agency_partners_partner_type_check;

  -- Add new constraint with simplified types
  ALTER TABLE public.agency_partners
    ADD CONSTRAINT agency_partners_partner_type_check
    CHECK (partner_type IN ('ceo', 'shop_owner', 'field_executive'));
EXCEPTION WHEN others THEN
  RAISE WARNING 'Partner type constraint update skipped or failed: %', SQLERRM;
END $$;

-- ── 4. UPDATE RLS POLICIES FOR CEO TEAM SCOPING ────────────────────────────

-- Drop existing select policy and replace with one that includes CEO team access
DROP POLICY IF EXISTS "AP reads own partner record" ON public.agency_partners;

CREATE POLICY "AP reads own partner record" ON public.agency_partners
  FOR SELECT USING (
    auth.uid() = user_id                    -- own record
    OR created_by_user_id = auth.uid()      -- team member created by this CEO
  );

-- CEO should not be able to update other partners' records (only own)
-- The existing update policy is fine: auth.uid() = user_id

-- ── 5. DONE ─────────────────────────────────────────────────────────────────
-- Migration complete. Partner types are now: ceo, shop_owner, field_executive.
-- CEO team scoping is enforced via created_by_user_id + RLS.
