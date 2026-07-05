-- ============================================================================
-- PRODUCTION HARDENING & RELIABILITY SCHEMAS
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-07-05
-- ============================================================================

-- ── 1. REFERRAL ATTRIBUTION TABLE ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_token text NOT NULL,
  partner_id uuid NOT NULL REFERENCES public.agency_partners(id) ON DELETE CASCADE,
  customer_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text,
  first_click_at timestamptz NOT NULL DEFAULT now(),
  last_click_at timestamptz NOT NULL DEFAULT now(),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_token ON public.referral_attributions(referral_token);
CREATE INDEX IF NOT EXISTS idx_attribution_partner ON public.referral_attributions(partner_id);

-- Enable RLS for referral_attributions
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AP read own referral attributions" ON public.referral_attributions;
CREATE POLICY "AP read own referral attributions" ON public.referral_attributions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.agency_partners ap
      WHERE ap.id = partner_id
      AND (ap.user_id = auth.uid() OR ap.created_by_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins read all referral attributions" ON public.referral_attributions;
CREATE POLICY "Admins read all referral attributions" ON public.referral_attributions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin', 'staff')
    )
  );

-- ── 2. CLEAN UP & HARDEN AP COMMISSIONS UNIQUE CONSTRAINT ───────────────────

-- Clean up duplicate commissions if any
DELETE FROM public.ap_commissions a USING public.ap_commissions b
WHERE a.id > b.id AND a.application_id = b.application_id;

-- Add UNIQUE constraint on ap_commissions(application_id)
ALTER TABLE public.ap_commissions
  DROP CONSTRAINT IF EXISTS unique_ap_commissions_application_id,
  ADD CONSTRAINT unique_ap_commissions_application_id UNIQUE (application_id);

-- Clean up duplicate conversions if any
DELETE FROM public.partner_conversion_logs a USING public.partner_conversion_logs b
WHERE a.id > b.id AND a.application_id = b.application_id;

-- Add UNIQUE constraint on partner_conversion_logs(application_id)
ALTER TABLE public.partner_conversion_logs
  DROP CONSTRAINT IF EXISTS unique_partner_conversion_logs_application_id,
  ADD CONSTRAINT unique_partner_conversion_logs_application_id UNIQUE (application_id);

-- ── 3. UPDATE CHECK CONSTRAINTS ──────────────────────────────────────────────

-- Update payment_links status check constraint
ALTER TABLE public.payment_links
  DROP CONSTRAINT IF EXISTS payment_links_status_check;

ALTER TABLE public.payment_links
  ADD CONSTRAINT payment_links_status_check CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'failed'));

-- Update ap_commissions status check constraint
ALTER TABLE public.ap_commissions
  DROP CONSTRAINT IF EXISTS ap_commissions_status_check;

ALTER TABLE public.ap_commissions
  ADD CONSTRAINT ap_commissions_status_check CHECK (status IN ('pending', 'reserved', 'completed', 'released', 'paid', 'cancelled', 'reversed', 'adjusted', 'earned', 'approved'));

-- ── 4. COMMISSION AUDIT LOGS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commission_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.ap_commissions(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_commission_audit_logs_comm ON public.commission_audit_logs(commission_id);

ALTER TABLE public.commission_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AP read own commission audit logs" ON public.commission_audit_logs;
CREATE POLICY "AP read own commission audit logs" ON public.commission_audit_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ap_commissions c
      JOIN public.agency_partners ap ON ap.id = c.agency_partner_id
      WHERE c.id = commission_id
      AND (ap.user_id = auth.uid() OR ap.created_by_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins read all commission audit logs" ON public.commission_audit_logs;
CREATE POLICY "Admins read all commission audit logs" ON public.commission_audit_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'admin', 'staff')
    )
  );
