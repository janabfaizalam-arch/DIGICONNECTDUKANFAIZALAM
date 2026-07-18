-- ============================================================================
-- APPLICATION SOURCE TRACKING — MIGRATION
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-07-06
-- ============================================================================

-- 1. Extend Applications Table with precise tracking fields
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS application_source text,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS referral_token text,
  ADD COLUMN IF NOT EXISTS payment_link_id uuid REFERENCES public.payment_links(id) ON DELETE SET NULL;

-- 2. Backfill existing source tracking based on current constraints
UPDATE public.applications
SET application_source = CASE 
    WHEN source_channel = 'agency_partner' THEN 'partner_assisted'
    WHEN source_channel = 'online' THEN 'customer_self'
    ELSE 'customer_self'
  END
WHERE application_source IS NULL;

-- 3. Create indexes for analytical queries
CREATE INDEX IF NOT EXISTS idx_applications_application_source ON public.applications(application_source) WHERE application_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_referral_token ON public.applications(referral_token) WHERE referral_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_payment_link_id ON public.applications(payment_link_id) WHERE payment_link_id IS NOT NULL;
