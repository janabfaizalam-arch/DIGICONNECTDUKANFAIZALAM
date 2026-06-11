-- Alter print_jobs table to add claim recovery columns
ALTER TABLE public.print_jobs 
  ADD COLUMN IF NOT EXISTS claimed_by_agent text,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;
