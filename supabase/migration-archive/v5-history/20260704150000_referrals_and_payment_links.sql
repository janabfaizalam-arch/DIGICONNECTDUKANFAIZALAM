-- ============================================================================
-- REFERRAL SHARING & PAYMENT LINK ENGINE — MIGRATION
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-07-04
-- ============================================================================

-- ── 1. SERVICE REFERRALS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.agency_partners(id) ON DELETE CASCADE,
  service_slug text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_referrals_partner_service_unique UNIQUE (partner_id, service_slug)
);

CREATE INDEX IF NOT EXISTS idx_referrals_token ON public.service_referrals(token);
CREATE INDEX IF NOT EXISTS idx_referrals_partner ON public.service_referrals(partner_id);

-- ── 2. REFERRAL CLICKS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.service_referrals(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  device_type text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clicks_referral ON public.referral_clicks(referral_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.referral_clicks(created_at DESC);

-- ── 3. PARTNER CONVERSION LOGS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_conversion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.service_referrals(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.agency_partners(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  click_id uuid REFERENCES public.referral_clicks(id) ON DELETE SET NULL,
  commission_status text NOT NULL DEFAULT 'pending' 
    CHECK (commission_status IN ('pending', 'earned', 'approved', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversions_partner ON public.partner_conversion_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_conversions_app ON public.partner_conversion_logs(application_id);

-- ── 4. PAYMENT LINKS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.agency_partners(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  razorpay_order_id text,
  razorpay_payment_id text
);

CREATE INDEX IF NOT EXISTS idx_payment_links_code ON public.payment_links(code);
CREATE INDEX IF NOT EXISTS idx_payment_links_app ON public.payment_links(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_partner ON public.payment_links(partner_id);

-- ── 5. ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────

ALTER TABLE public.service_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_conversion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- ── 6. POLICIES: SERVICE REFERRALS ──────────────────────────────────────────

DROP POLICY IF EXISTS "Public select referrals" ON public.service_referrals;
CREATE POLICY "Public select referrals" ON public.service_referrals
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "AP manage own referrals" ON public.service_referrals;
CREATE POLICY "AP manage own referrals" ON public.service_referrals
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.agency_partners ap
      WHERE ap.id = partner_id
      AND (ap.user_id = auth.uid() OR ap.created_by_user_id = auth.uid())
    )
  );

-- ── 7. POLICIES: REFERRAL CLICKS ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Public insert clicks" ON public.referral_clicks;
CREATE POLICY "Public insert clicks" ON public.referral_clicks
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "AP read own referrals clicks" ON public.referral_clicks;
CREATE POLICY "AP read own referrals clicks" ON public.referral_clicks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.service_referrals ref
      JOIN public.agency_partners ap ON ap.id = ref.partner_id
      WHERE ref.id = referral_id
      AND (ap.user_id = auth.uid() OR ap.created_by_user_id = auth.uid())
    )
  );

-- ── 8. POLICIES: PARTNER CONVERSION LOGS ─────────────────────────────────────

DROP POLICY IF EXISTS "AP read own conversions" ON public.partner_conversion_logs;
CREATE POLICY "AP read own conversions" ON public.partner_conversion_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.agency_partners ap
      WHERE ap.id = partner_id
      AND (ap.user_id = auth.uid() OR ap.created_by_user_id = auth.uid())
    )
  );

-- ── 9. POLICIES: PAYMENT LINKS ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Public select pending active payment links" ON public.payment_links;
CREATE POLICY "Public select pending active payment links" ON public.payment_links
  FOR SELECT TO public USING (status = 'pending' AND expires_at > now());

DROP POLICY IF EXISTS "AP manage own payment links" ON public.payment_links;
CREATE POLICY "AP manage own payment links" ON public.payment_links
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.agency_partners ap
      WHERE ap.id = partner_id
      AND (ap.user_id = auth.uid() OR ap.created_by_user_id = auth.uid())
    )
  );
