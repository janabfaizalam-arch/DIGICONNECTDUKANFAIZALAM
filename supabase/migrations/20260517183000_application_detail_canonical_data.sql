-- Canonical application detail data and document metadata for admin/staff detail views.

alter table public.applications
  add column if not exists customer_details jsonb not null default '{}'::jsonb,
  add column if not exists service_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.applications
  alter column form_data set default '{}'::jsonb;

alter table public.application_documents
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists document_name text,
  add column if not exists status text not null default 'pending',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists uploaded_at timestamptz not null default now();

alter table public.application_documents drop constraint if exists application_documents_status_check;
alter table public.application_documents
  add constraint application_documents_status_check check (
    status in ('pending','accepted','rejected','reupload_required')
  );

update public.application_documents
set
  document_name = coalesce(document_name, document_type, file_name),
  uploaded_at = coalesce(uploaded_at, created_at),
  status = coalesce(status, review_status, 'pending')
where document_name is null or uploaded_at is null or status is null;

create index if not exists application_documents_user_time_idx
  on public.application_documents(user_id, uploaded_at desc);

create index if not exists application_documents_customer_time_idx
  on public.application_documents(customer_id, uploaded_at desc);
