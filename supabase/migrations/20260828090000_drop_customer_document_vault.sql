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

-- 1. The stored files.
--
-- The vault shared the `application-documents` bucket with per-application
-- uploads, and is distinguished from them only by its key prefix — the
-- uploader wrote `vault-documents/<user id>/<random>.<ext>`. Deleting by that
-- prefix is what keeps this from touching a filing's own documents, so the
-- predicate is deliberately narrow and matches nothing else in the bucket.
DELETE FROM storage.objects
WHERE bucket_id = 'application-documents'
  AND name LIKE 'vault-documents/%';

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
