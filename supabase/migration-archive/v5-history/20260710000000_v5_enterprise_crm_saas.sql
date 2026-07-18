-- Migration: V5 Enterprise CRM, SaaS Multi-Tenant & Branch Wallet Ledger
-- Date: 2026-07-07

-- 1. Create SaaS Tenants Table
CREATE TABLE IF NOT EXISTS public.saas_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#4f46e5', -- Tailwind Indigo
  secondary_color text DEFAULT '#06b6d4', -- Tailwind Cyan
  contact_email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create SaaS Custom Domains Table
CREATE TABLE IF NOT EXISTS public.saas_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  domain text UNIQUE NOT NULL,
  is_verified boolean DEFAULT false,
  ssl_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Create CRM Leads Pipeline Table
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.saas_tenants(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_mobile text NOT NULL,
  pipeline_stage text DEFAULT 'lead' CHECK (pipeline_stage IN ('lead', 'opportunity', 'negotiation', 'won', 'lost')),
  lead_score integer DEFAULT 50 CHECK (lead_score >= 0 AND lead_score <= 100),
  estimated_clv numeric(12, 2) DEFAULT 0.00,
  notes text,
  follow_up_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create Branch Wallet Accounts Table
CREATE TABLE IF NOT EXISTS public.branch_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL,
  current_balance numeric(12, 2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_wallets ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Admins manage SaaS tenants" ON public.saas_tenants;
CREATE POLICY "Admins manage SaaS tenants" ON public.saas_tenants
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins manage SaaS domains" ON public.saas_domains;
CREATE POLICY "Admins manage SaaS domains" ON public.saas_domains
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins manage CRM leads" ON public.crm_leads;
CREATE POLICY "Admins manage CRM leads" ON public.crm_leads
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin', 'operator')
    )
  );

DROP POLICY IF EXISTS "Admins manage branch wallets" ON public.branch_wallets;
CREATE POLICY "Admins manage branch wallets" ON public.branch_wallets
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'admin')
    )
  );
