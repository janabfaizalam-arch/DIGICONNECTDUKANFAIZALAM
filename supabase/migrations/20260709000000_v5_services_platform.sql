-- Migration: Services Platform V5 Enterprise Schema
-- Date: 2026-07-07
-- Authors: Next.js + PostgreSQL Enterprise Architects

-- 1. Extend public.services table with V5 Enterprise columns
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS color_theme text,
  ADD COLUMN IF NOT EXISTS animation_key text,
  ADD COLUMN IF NOT EXISTS popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trending boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_government boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_financial boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_business boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_personal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_professional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_student boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_senior_citizen boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_women boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_farmer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_business_owner boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_nri boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_price numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_cost numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_payout numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_cashback numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_redeem_allowed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS gst_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gst_percentage numeric(5, 2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS offer_start timestamptz,
  ADD COLUMN IF NOT EXISTS offer_end timestamptz,
  ADD COLUMN IF NOT EXISTS emi_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS enquiry_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_online boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS offline_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS limited_time boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flash_offer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS festival_offer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS who_should_apply jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS who_should_not_apply jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS advantages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS disadvantages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS validity text,
  ADD COLUMN IF NOT EXISTS renewal text,
  ADD COLUMN IF NOT EXISTS penalty text,
  ADD COLUMN IF NOT EXISTS government_fees numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS professional_fees numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_policy text,
  ADD COLUMN IF NOT EXISTS cancellation_policy text,
  ADD COLUMN IF NOT EXISTS support_info jsonb DEFAULT '{"phone": "7007595931", "email": "support@rnos.in", "hours": "9 AM - 6 PM"}'::jsonb,
  ADD COLUMN IF NOT EXISTS checklist_url text,
  ADD COLUMN IF NOT EXISTS download_forms jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sample_certificate_url text,
  ADD COLUMN IF NOT EXISTS government_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS act text,
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS latest_updates jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS news jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blogs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_services jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_packages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_reviews jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ratings numeric(3, 2) DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS success_stories jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_badges jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS statistics jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_content jsonb DEFAULT '{}'::jsonb;

-- 2. Create service_variants table for unlimited dynamic choices per service
CREATE TABLE IF NOT EXISTS public.service_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  original_price numeric(10, 2) DEFAULT 0,
  selling_price numeric(10, 2) DEFAULT 0,
  offer_price numeric(10, 2) DEFAULT 0,
  agent_cost numeric(10, 2) DEFAULT 0,
  partner_payout numeric(10, 2) DEFAULT 0,
  wallet_cashback numeric(10, 2) DEFAULT 0,
  wallet_redeem_allowed boolean DEFAULT true,
  gst_included boolean DEFAULT false,
  gst_percentage numeric(5, 2) DEFAULT 18.00,
  timeline text,
  government_fees numeric(10, 2) DEFAULT 0,
  professional_fees numeric(10, 2) DEFAULT 0,
  required_documents jsonb DEFAULT '[]'::jsonb,
  form_fields jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(service_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_variants_service ON public.service_variants(service_id);
CREATE INDEX IF NOT EXISTS idx_variants_slug ON public.service_variants(slug);

-- 3. Create service_comparisons table for interactive comparison matrices
CREATE TABLE IF NOT EXISTS public.service_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  headers jsonb NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["Feature", "Normal", "Tatkal"]
  rows jsonb NOT NULL DEFAULT '[]'::jsonb, -- e.g., [{"feature": "Time", "v1": "15 days", "v2": "3 days"}]
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comparisons_service ON public.service_comparisons(service_id);

-- 4. Create service_packages table for starter/bundle launch packages
CREATE TABLE IF NOT EXISTS public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- e.g., [{"service_slug": "gst-registration", "variant_slug": "regular"}]
  original_price numeric(10, 2) DEFAULT 0,
  selling_price numeric(10, 2) DEFAULT 0,
  agent_cost numeric(10, 2) DEFAULT 0,
  partner_payout numeric(10, 2) DEFAULT 0,
  wallet_cashback numeric(10, 2) DEFAULT 0,
  wallet_redeem_allowed boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_slug ON public.service_packages(slug);

-- 5. Create service_clicks_log table for tracking views, traffic sources, clicks
CREATE TABLE IF NOT EXISTS public.service_clicks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.service_packages(id) ON DELETE SET NULL,
  click_type text NOT NULL CHECK (click_type IN ('view', 'click', 'apply_click', 'enquiry_click')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clicks_log_service ON public.service_clicks_log(service_id);
CREATE INDEX IF NOT EXISTS idx_clicks_log_created ON public.service_clicks_log(created_at DESC);

-- 6. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.service_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_clicks_log ENABLE ROW LEVEL SECURITY;

-- 7. Policies: Service Variants
DROP POLICY IF EXISTS "Public select variants" ON public.service_variants;
CREATE POLICY "Public select variants" ON public.service_variants
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage variants" ON public.service_variants;
CREATE POLICY "Admins manage variants" ON public.service_variants
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin')
    )
  );

-- 8. Policies: Service Comparisons
DROP POLICY IF EXISTS "Public select comparisons" ON public.service_comparisons;
CREATE POLICY "Public select comparisons" ON public.service_comparisons
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage comparisons" ON public.service_comparisons;
CREATE POLICY "Admins manage comparisons" ON public.service_comparisons
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin')
    )
  );

-- 9. Policies: Service Packages
DROP POLICY IF EXISTS "Public select packages" ON public.service_packages;
CREATE POLICY "Public select packages" ON public.service_packages
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage packages" ON public.service_packages;
CREATE POLICY "Admins manage packages" ON public.service_packages
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin')
    )
  );

-- 10. Policies: Clicks Logs
DROP POLICY IF EXISTS "Public insert clicks log" ON public.service_clicks_log;
CREATE POLICY "Public insert clicks log" ON public.service_clicks_log
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read clicks log" ON public.service_clicks_log;
CREATE POLICY "Admins read clicks log" ON public.service_clicks_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin')
    )
  );
