-- ─────────────────────────────────────────────────────────────────────────────
-- Remove the customer document vault, permanently.
--
-- The vault was a standing store of customers' identity documents — Aadhaar
-- front and back, PAN, photographs, signatures — uploaded once and kept
-- indefinitely so they could be reused on later applications. It has been
-- withdrawn on the owner's instruction, and this migration removes the stored
-- data as well as the tables, deliberately and irreversibly.
--
-- Keeping the rows while the feature is gone would leave the most sensitive
-- personal data the business holds sitting in a table with no product reading
-- it and nobody watching it. Per-application documents are unaffected: those
-- belong to a specific filing that cannot proceed without them, and they live
-- in `application_documents`, which this migration does not touch.
--
-- IRREVERSIBLE. Take a backup first if there is any doubt.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. The stored files are NOT deleted here.
--
-- Supabase refuses a direct DELETE against `storage.objects`: a trigger,
-- `storage.protect_delete()`, raises 42501 "Direct deletion from storage
-- tables is not allowed. Use the Storage API instead." It is guarding against
-- exactly the failure mode a bare SQL delete creates — rows removed while the
-- objects they describe stay in the bucket, orphaned and unreachable.
--
-- So the files go through the Storage API instead:
--
--     node scripts/delete-vault-storage-files.mjs
--
-- Run that BEFORE this migration. Once these tables are dropped, the list of
-- which objects belonged to the vault is gone with them — the script reads
-- `storage_path` from `customer_vault_documents` and falls back to listing the
-- `vault-documents/` prefix, but the first of those is by far the safer of the
-- two, and it only exists until this runs.

-- 2. The tables.
--
-- `vault_ocr_jobs` holds the extracted contents of those documents — names,
-- addresses, PAN numbers parsed out of the images — so it is as sensitive as
-- the files and goes the same way. It references `customer_vault_documents`
-- with ON DELETE CASCADE; dropping it first keeps the order explicit rather
-- than relying on CASCADE to reach it.
DROP TABLE IF EXISTS public.vault_ocr_jobs;
DROP TABLE IF EXISTS public.customer_vault_documents;

COMMIT;
