-- =============================================================================
-- Google Sheets CRM sync queue + durable Work/Customer IDs
-- Date: 2026-08-04
-- Website remains source of truth; Sheets is a live office mirror.
-- =============================================================================

-- Stable CRM Customer ID on customers (reused across works)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_code text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_code_uidx
  ON public.customers (customer_code)
  WHERE customer_code IS NOT NULL;

-- Stable Work ID on applications (Sheets "Work ID")
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS work_id text;

CREATE UNIQUE INDEX IF NOT EXISTS applications_work_id_uidx
  ON public.applications (work_id)
  WHERE work_id IS NOT NULL;

-- Maps Supabase entities → Google Sheet row numbers (1-based)
CREATE TABLE IF NOT EXISTS public.crm_sheet_row_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('customer_work', 'customer_master')),
  entity_key text NOT NULL,
  sheet_name text NOT NULL,
  row_number integer NOT NULL CHECK (row_number >= 2),
  spreadsheet_id text NOT NULL,
  application_id uuid NULL REFERENCES public.applications(id) ON DELETE SET NULL,
  customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (spreadsheet_id, sheet_name, entity_type, entity_key)
);

CREATE INDEX IF NOT EXISTS crm_sheet_row_map_application_idx
  ON public.crm_sheet_row_map (application_id)
  WHERE application_id IS NOT NULL;

-- Async sync queue (never blocks user requests)
CREATE TABLE IF NOT EXISTS public.crm_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  application_id uuid NULL REFERENCES public.applications(id) ON DELETE SET NULL,
  customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  entity_key text NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text NULL,
  next_attempt_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS crm_sync_jobs_pending_idx
  ON public.crm_sync_jobs (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS crm_sync_jobs_application_idx
  ON public.crm_sync_jobs (application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_sync_jobs_created_idx
  ON public.crm_sync_jobs (created_at DESC);

ALTER TABLE public.crm_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sheet_row_map ENABLE ROW LEVEL SECURITY;

-- Service-role only (no public policies)
DROP POLICY IF EXISTS crm_sync_jobs_service_all ON public.crm_sync_jobs;
DROP POLICY IF EXISTS crm_sheet_row_map_service_all ON public.crm_sheet_row_map;
