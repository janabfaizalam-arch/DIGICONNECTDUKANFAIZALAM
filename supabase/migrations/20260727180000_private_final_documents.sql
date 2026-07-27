-- ============================================================================
-- Private final-document bucket + storage policies + canonical final_document_id
-- DigiConnect Dukan / RNOS India Pvt. Ltd.
-- ADDITIVE / STAGING-SAFE. Do NOT apply to production without explicit approval.
--
-- Does NOT:
--   - delete objects from legacy `documents` bucket
--   - rewrite storage paths automatically
--   - drop public read on legacy customer documents
-- ============================================================================

-- Canonical pointer on applications (document row is source of truth)
alter table if exists public.applications
  add column if not exists final_document_id uuid;

comment on column public.applications.final_document_id is
  'Canonical FK-like pointer to application_documents.id for the active final document. Prefer this over legacy final_document_url/path.';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'final_document_url'
  ) then
    execute $c$comment on column public.applications.final_document_url is
      'DEPRECATED: do not write signed/public URLs. Kept for legacy reads.'$c$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'final_document_path'
  ) then
    execute $c$comment on column public.applications.final_document_path is
      'DEPRECATED for client exposure: server-only legacy path. New finals use application_documents.storage_path + storage_bucket.'$c$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'completed_document_url'
  ) then
    execute $c$comment on column public.applications.completed_document_url is
      'DEPRECATED: do not write signed/public URLs.'$c$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'completed_document_storage_path'
  ) then
    execute $c$comment on column public.applications.completed_document_storage_path is
      'DEPRECATED: prefer application_documents.storage_path for finals.'$c$;
  end if;
end $$;

alter table if exists public.application_documents
  add column if not exists storage_bucket text;

comment on column public.application_documents.storage_bucket is
  'Storage bucket id. Final docs use application-final-documents.';

-- Mark existing finals for migration (paths stay; bucket may still be legacy)
update public.application_documents
set
  customer_visible = false,
  partner_visible = false,
  storage_bucket = coalesce(storage_bucket, 'documents')
where coalesce(is_final, false) = true
   or document_type = 'final_document';

-- Private final-document bucket (NOT public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-final-documents',
  'application-final-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No anon/authenticated policies = only service_role (and other bypass roles) can access.
-- Explicit deny-style documentation via absence of SELECT policies for public/authenticated.
drop policy if exists "Public read application-final-documents" on storage.objects;
drop policy if exists "Authenticated read application-final-documents" on storage.objects;
drop policy if exists "Customers read application-final-documents" on storage.objects;
drop policy if exists "Partners read application-final-documents" on storage.objects;

-- Optionally tighten legacy public SELECT on `documents` so final-documents/ prefix is excluded.
-- This reduces path-guess risk for NEW legacy finals without deleting historical objects.
drop policy if exists "Public can read documents bucket" on storage.objects;
create policy "Public can read documents bucket" on storage.objects
  for select
  to public
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] is distinct from 'final-documents'
    and position('/final/' in name) = 0
  );

-- Agency partner / agent document SELECT: ownership + partner_visible + never finals
-- (Reinforces 20260727120000; safe to re-run via drop/create)
drop policy if exists "Partners read own partner-visible documents" on public.application_documents;
create policy "Partners read own partner-visible documents" on public.application_documents
  for select
  using (
    coalesce(partner_visible, true) = true
    and coalesce(is_final, false) = false
    and coalesce(document_type, '') <> 'final_document'
    and exists (
      select 1
      from public.applications a
      left join public.agency_partners ap on ap.id = a.agency_partner_id
      where a.id = application_documents.application_id
        and (
          a.agent_id = auth.uid()
          or a.assigned_agent_id = auth.uid()
          or a.created_by = auth.uid()
          or a.created_by_agent_id = auth.uid()
          or ap.user_id = auth.uid()
        )
    )
  );

-- Index for final document lookups
create index if not exists application_documents_final_bucket_idx
  on public.application_documents (application_id, is_final)
  where coalesce(is_final, false) = true;

create index if not exists applications_final_document_id_idx
  on public.applications (final_document_id)
  where final_document_id is not null;
