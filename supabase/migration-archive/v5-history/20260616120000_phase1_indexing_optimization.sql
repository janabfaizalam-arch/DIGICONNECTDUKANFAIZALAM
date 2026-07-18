-- Migration: Phase 1 Indexing and Uniqueness optimizations
-- 2026-06-16

-- 1. Uniqueness constraints to enforce idempotency
-- Ensures an application can only have one commission record
CREATE UNIQUE INDEX IF NOT EXISTS ap_commissions_application_uniq_idx ON public.ap_commissions (application_id);

-- Ensures an application can only have one commission transaction
CREATE UNIQUE INDEX IF NOT EXISTS commission_transactions_application_uniq_idx ON public.commission_transactions (application_id);

-- Ensures ledger records cannot be duplicated for a given reference transaction
CREATE UNIQUE INDEX IF NOT EXISTS ap_wallet_ledger_ref_uniq_idx ON public.ap_wallet_ledger (reference_type, reference_id) WHERE reference_id IS NOT NULL;

-- 2. Performance indexes
-- Speeds up status checks and customer history views by mobile
CREATE INDEX IF NOT EXISTS idx_applications_mobile_status ON public.applications (customer_mobile_normalized, status);

-- Speeds up reference lookup in append-only ledger
CREATE INDEX IF NOT EXISTS idx_ap_wallet_ledger_ref ON public.ap_wallet_ledger (reference_type, reference_id);

-- Speeds up print job lookup by customer mobile
CREATE INDEX IF NOT EXISTS idx_print_jobs_mobile ON public.print_jobs (customer_mobile);
