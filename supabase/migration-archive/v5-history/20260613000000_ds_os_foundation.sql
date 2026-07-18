-- ============================================================================
-- DIGIPARTNER DS-OS FOUNDATION REFACTOR — MIGRATION
-- 2026-06-13
-- ============================================================================

-- ── 1. EXTEND SERVICES TABLE ────────────────────────────────────────────────
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS base_customer_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tat_hours INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── 2. DYNAMIC FIELD DEFINITIONS (DYNAMIC FORM BUILDER REGISTRY) ────────────
CREATE TABLE IF NOT EXISTS public.service_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'number', 'mobile', 'email', 'date', 'dropdown', 
    'radio', 'checkbox', 'address', 'file_upload', 'aadhaar', 'pan', 'gstin'
  )),
  sort_order INTEGER NOT NULL DEFAULT 0,
  validation_chains JSONB NOT NULL DEFAULT '[]'::jsonb, 
  default_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_service_fields_service ON public.service_fields(service_id, sort_order);

-- ── 3. DYNAMIC STEP WORKFLOWS (WORKFLOW BUILDER STATE MACHINES) ──────────────
CREATE TABLE IF NOT EXISTS public.service_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  allowed_transitions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, step_key)
);
CREATE INDEX IF NOT EXISTS idx_service_workflows_lookup ON public.service_workflows(service_id, sort_order);

-- ── 4. SECURE CUSTOMER VAULT DOCUMENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'aadhaar_front', 'aadhaar_back', 'pan_card', 'photo', 
    'signature', 'marksheet', 'gst_certificate', 'other'
  )),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_customer_doc ON public.customer_vault_documents(customer_id, hash);

-- ── 5. ASYNC OCR QUEUE JOBS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.customer_vault_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  extracted_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON public.vault_ocr_jobs(status);

-- ── 6. EXTEND APPLICATIONS TABLE WITH OS METADATA ───────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS current_step TEXT,
  ADD COLUMN IF NOT EXISTS customer_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── 7. APPLICATION FIELD VALUES (KEY-VALUE PAIR STORAGE) ─────────────────────
CREATE TABLE IF NOT EXISTS public.application_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_app_field_values ON public.application_field_values(application_id);

-- ── 8. EXTEND & CONSOLIDATE COMMISSION SCHEMAS ──────────────────────────────
ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rule_type TEXT CHECK (rule_type IN ('fixed', 'percentage', 'slab', 'partner_tier')),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.commission_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.commission_rules(id) ON DELETE CASCADE,
  min_volume INTEGER NOT NULL,
  max_volume INTEGER,
  commission_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_partner_id UUID NOT NULL REFERENCES public.agency_partners(id) ON DELETE RESTRICT,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE RESTRICT,
  commission_rule_id UUID REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comm_tx_partner ON public.commission_transactions(agency_partner_id);
CREATE INDEX IF NOT EXISTS idx_comm_tx_app ON public.commission_transactions(application_id);

-- ── 9. UNIVERSAL TIMELINE ENGINE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entity_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'application', 'lead', 'ticket', 'wallet')),
  entity_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timeline_entity ON public.entity_timelines(entity_type, entity_id, created_at DESC);

-- ── 10. EVENT BUS ARCHITECTURE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_events_name ON public.system_events(event_name, created_at DESC);

-- ── 11. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────────────
ALTER TABLE public.service_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Dynamic service definitions are publicly readable
DROP POLICY IF EXISTS "Public read service fields" ON public.service_fields;
CREATE POLICY "Public read service fields" ON public.service_fields
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read service workflows" ON public.service_workflows;
CREATE POLICY "Public read service workflows" ON public.service_workflows
  FOR SELECT USING (true);

-- Vault documents: customer_id references public.customers.id (not auth.users).
-- Legacy customers.agent_id does not exist; ownership is customers.user_id.
-- Agent/AP vault access is intentionally omitted (least privilege); app APIs
-- use the service role for partner workflows. Admins use is_admin_role().
DROP POLICY IF EXISTS "Vault access rule" ON public.customer_vault_documents;
CREATE POLICY "Vault access rule" ON public.customer_vault_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_vault_documents.customer_id
        AND c.user_id = auth.uid()
    )
    OR public.is_admin_role()
  );

-- Application field values readable by associated customer or partner
DROP POLICY IF EXISTS "App field values read" ON public.application_field_values;
CREATE POLICY "App field values read" ON public.application_field_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id AND (
        a.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.agency_partners ap
          WHERE ap.id = a.agency_partner_id AND ap.user_id = auth.uid()
        )
      )
    )
  );

-- Transactions and Timelines readable by associated agent / partner
DROP POLICY IF EXISTS "AP read own commission transactions" ON public.commission_transactions;
CREATE POLICY "AP read own commission transactions" ON public.commission_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_partners ap
      WHERE ap.id = agency_partner_id AND ap.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "AP read timelines" ON public.entity_timelines;
CREATE POLICY "AP read timelines" ON public.entity_timelines
  FOR SELECT USING (true);
