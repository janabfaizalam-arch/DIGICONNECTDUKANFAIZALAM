-- Create sequence for friendly print job numbers
CREATE SEQUENCE IF NOT EXISTS public.print_job_number_seq START WITH 10001;

-- Create print_printers table
CREATE TABLE IF NOT EXISTS public.print_printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create print_agent_sessions table
CREATE TABLE IF NOT EXISTS public.print_agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  token text NOT NULL,
  ip_address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);

-- Create print_jobs table
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text UNIQUE NOT NULL DEFAULT ('PJ-' || nextval('public.print_job_number_seq')::text),
  customer_mobile text NOT NULL,
  copies integer NOT NULL DEFAULT 1 CHECK (copies > 0),
  pages integer NOT NULL DEFAULT 1 CHECK (pages > 0),
  paper_size text NOT NULL DEFAULT 'A4',
  color_mode text NOT NULL DEFAULT 'mono' CHECK (color_mode IN ('mono', 'color')),
  price numeric(10, 2) NOT NULL DEFAULT 0.00,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  print_status text NOT NULL DEFAULT 'pending' CHECK (print_status IN ('pending', 'queued', 'claiming', 'printing', 'printed', 'failed')),
  printer_id uuid REFERENCES public.print_printers(id) ON DELETE SET NULL,
  claimed_by uuid REFERENCES public.print_agent_sessions(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create print_job_files table
CREATE TABLE IF NOT EXISTS public.print_job_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.print_jobs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create print_job_logs table
CREATE TABLE IF NOT EXISTS public.print_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.print_jobs(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS print_jobs_created_at_idx ON public.print_jobs(created_at desc);
CREATE INDEX IF NOT EXISTS print_jobs_status_idx ON public.print_jobs(print_status, payment_status);
CREATE INDEX IF NOT EXISTS print_job_files_job_id_idx ON public.print_job_files(job_id);
CREATE INDEX IF NOT EXISTS print_job_logs_job_id_idx ON public.print_job_logs(job_id);

-- Trigger for updating print_jobs.updated_at
CREATE OR REPLACE FUNCTION public.set_print_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS print_jobs_updated_at ON public.print_jobs;
CREATE TRIGGER print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_print_jobs_updated_at();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.print_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_job_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Admins have full access)
DROP POLICY IF EXISTS "Admins manage print printers" ON public.print_printers;
CREATE POLICY "Admins manage print printers" ON public.print_printers
  FOR ALL USING (public.is_admin_role()) WITH CHECK (public.is_admin_role());

DROP POLICY IF EXISTS "Admins manage print agent sessions" ON public.print_agent_sessions;
CREATE POLICY "Admins manage print agent sessions" ON public.print_agent_sessions
  FOR ALL USING (public.is_admin_role()) WITH CHECK (public.is_admin_role());

DROP POLICY IF EXISTS "Admins manage print jobs" ON public.print_jobs;
CREATE POLICY "Admins manage print jobs" ON public.print_jobs
  FOR ALL USING (public.is_admin_role()) WITH CHECK (public.is_admin_role());

DROP POLICY IF EXISTS "Admins manage print job files" ON public.print_job_files;
CREATE POLICY "Admins manage print job files" ON public.print_job_files
  FOR ALL USING (public.is_admin_role()) WITH CHECK (public.is_admin_role());

DROP POLICY IF EXISTS "Admins manage print job logs" ON public.print_job_logs;
CREATE POLICY "Admins manage print job logs" ON public.print_job_logs
  FOR ALL USING (public.is_admin_role()) WITH CHECK (public.is_admin_role());

-- Private storage bucket for print jobs
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-jobs', 'print-jobs', false)
ON CONFLICT (id) DO NOTHING;
