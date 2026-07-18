-- Rebuild Services Management V4 Migration
-- Adds created_by and updated_by columns to public.services
-- Creates public.service_audit_logs to track actions and diffs

-- 1. Add columns to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Create service_audit_logs table
CREATE TABLE IF NOT EXISTS public.service_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'create', 'edit', 'duplicate', 'archive', 'restore', 'enable', 'disable', 'bulk_update', etc.
  changes jsonb NOT NULL DEFAULT '{}'::jsonb, -- records the old vs new values diff
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add index for faster reads
CREATE INDEX IF NOT EXISTS service_audit_logs_service_id_idx ON public.service_audit_logs(service_id, created_at DESC);

-- 4. Enable RLS and add policies
ALTER TABLE public.service_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage service audit logs" ON public.service_audit_logs;
CREATE POLICY "Admins manage service audit logs" ON public.service_audit_logs
  FOR ALL USING (public.is_admin_role()) WITH CHECK (public.is_admin_role());
