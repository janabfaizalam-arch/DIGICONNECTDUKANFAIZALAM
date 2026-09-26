-- Close anonymous and cross-account access to private storage.
--
-- Found by replaying every migration into a scratch database and reading the
-- effective policies back out of pg_policies (see
-- src/lib/security/rls.integration.test.ts), not by reading SQL:
--
--   documents bucket (customer uploads: Aadhaar, PAN, photos, certificates)
--   • "Public can read documents bucket"       — anon SELECT on every object
--     except final documents: anyone with the public anon key could list and
--     download customer uploads.
--   • "Authenticated users can read documents" — any signed-in account could
--     list and download every other customer's uploads.
--   • "Public can upload lead files"           — anonymous INSERT.
--   • "Authenticated users can upload documents" — browser uploads into the
--     bucket. No browser code uploads here; every upload goes through a
--     server route with the service role, which validates type and size.
--
--   ap-kyc-documents bucket (DC Partner KYC)
--   • "Admin can read all KYC documents" was `to authenticated using
--     (bucket_id = 'ap-kyc-documents')` — no admin check at all, so every
--     signed-in customer could read every partner's KYC documents.
--
--   Private buckets created with `on conflict do nothing` (credit-reports,
--   ap-kyc-documents, print-jobs) would never be corrected if someone had
--   flipped them public in the dashboard, so their visibility is forced here.
--
-- All document reads and writes in the application are server-side with the
-- service-role key (which bypasses RLS) and are authorised in the route
-- handler, so these drops remove exposure without removing a feature.

-- 1. Private buckets stay private, whatever the dashboard says.
update storage.buckets
set public = false
where id in (
  'documents',
  'application-documents',
  'application-final-documents',
  'kyc-documents',
  'ap-kyc-documents',
  'credit-reports',
  'print-jobs'
);

-- 2. documents: no direct anon or authenticated access at all.
drop policy if exists "Public can read documents bucket" on storage.objects;
drop policy if exists "Authenticated users can read documents" on storage.objects;
drop policy if exists "Public can upload lead files" on storage.objects;
drop policy if exists "Authenticated users can upload documents" on storage.objects;
drop policy if exists "Users read own folder in documents" on storage.objects;

-- 3. ap-kyc-documents: admin read must actually require an admin.
drop policy if exists "Admin can read all KYC documents" on storage.objects;
drop policy if exists "Admins read all partner KYC documents" on storage.objects;
create policy "Admins read all partner KYC documents" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'ap-kyc-documents' and public.is_admin_role());
