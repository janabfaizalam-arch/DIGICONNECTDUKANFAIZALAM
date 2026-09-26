-- Close anonymous and cross-customer reads on the private `documents` bucket.
--
-- The bucket is private (public = false), but three storage.objects policies
-- still granted access through the Storage API with nothing more than the
-- anon key that ships in every browser bundle:
--
--   • "Public can read documents bucket"        — anon SELECT on every object
--     except final documents: anyone could list and download customer
--     uploads (Aadhaar, PAN, photos, supporting documents).
--   • "Authenticated users can read documents"  — any signed-in account could
--     list and download every other customer's uploads.
--   • "Public can upload lead files"            — anon INSERT into
--     public-leads/, i.e. unauthenticated writes to our storage.
--
-- No browser code reads or writes this bucket: every upload and every signed
-- URL is produced server-side with the service-role client, which bypasses
-- RLS. Dropping these policies therefore removes only the exposure.
--
-- Signed-in users keep the ability to read the objects in their own folder
-- (<auth.uid()>/...), mirroring the existing own-folder INSERT policy.

drop policy if exists "Public can read documents bucket" on storage.objects;
drop policy if exists "Authenticated users can read documents" on storage.objects;
drop policy if exists "Public can upload lead files" on storage.objects;

drop policy if exists "Users read own folder in documents" on storage.objects;
create policy "Users read own folder in documents" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
