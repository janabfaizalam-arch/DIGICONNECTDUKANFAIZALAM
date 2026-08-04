-- =============================================================================
-- CRM sync idempotency hardening
-- Date: 2026-08-04
-- - At most one pending job per application (prevents duplicate Sheet appends)
-- - Faster recovery of stuck processing rows via updated_at index
-- =============================================================================

-- Collapse duplicate pending jobs (keep oldest) before unique index
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY application_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.crm_sync_jobs
  WHERE status = 'pending'
    AND application_id IS NOT NULL
)
UPDATE public.crm_sync_jobs j
SET
  status = 'success',
  last_error = 'coalesced_duplicate_pending',
  processed_at = timezone('utc'::text, now()),
  updated_at = timezone('utc'::text, now())
FROM ranked r
WHERE j.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS crm_sync_jobs_one_pending_per_application_uidx
  ON public.crm_sync_jobs (application_id)
  WHERE status = 'pending' AND application_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_sync_jobs_processing_updated_idx
  ON public.crm_sync_jobs (updated_at)
  WHERE status = 'processing';
