-- Repair admin application detail workflow: document metadata, final documents, notes, and statuses.

alter table public.application_documents
  alter column user_id drop not null,
  alter column file_name drop not null,
  alter column file_url drop not null,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists uploaded_by_role text not null default 'customer',
  add column if not exists is_final boolean not null default false,
  add column if not exists status text not null default 'pending',
  add column if not exists rejection_reason text,
  add column if not exists storage_path text,
  add column if not exists uploaded_at timestamptz not null default now();

alter table public.application_documents drop constraint if exists application_documents_uploaded_by_role_check;
alter table public.application_documents
  add constraint application_documents_uploaded_by_role_check check (uploaded_by_role in ('admin', 'agent', 'customer'));

alter table public.application_documents drop constraint if exists application_documents_status_check;
alter table public.application_documents
  add constraint application_documents_status_check check (status in ('pending', 'approved', 'accepted', 'rejected', 'reupload_required', 'completed'));

alter table public.application_documents drop constraint if exists application_documents_review_status_check;
alter table public.application_documents
  add constraint application_documents_review_status_check check (review_status in ('pending','accepted','approved','rejected','reupload_required','completed'));

update public.application_documents
set uploaded_at = coalesce(uploaded_at, created_at),
    document_type = coalesce(nullif(document_type, ''), case when is_final then 'final_document' else 'customer_document' end),
    file_name = coalesce(file_name, document_name, 'document'),
    file_url = coalesce(file_url, ''),
    status = case when status = 'accepted' then 'approved' else coalesce(status, 'pending') end,
    review_status = case when review_status = 'accepted' then 'approved' else coalesce(review_status, status, 'pending') end;

alter table public.applications
  add column if not exists admin_note text,
  add column if not exists customer_note text,
  add column if not exists completed_document_url text,
  add column if not exists completed_document_storage_path text,
  add column if not exists completed_at timestamptz;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check check (
    status in (
      'draft','payment_pending','payment_success','submitted','documents_required',
      'documents_verified','assigned_to_agent','in_process','in_progress','document_pending',
      'documents_pending','objection','completed','delivered','cancelled','rejected','refunded',
      'new','payment_failed','lead_submitted','payment_verified','documents_under_review',
      'application_processing','submitted_to_department','under_government_review'
    )
  );

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do update set public = false;

create index if not exists application_documents_application_final_idx
  on public.application_documents(application_id, is_final, uploaded_at desc);
