-- Repair and harden customer document visibility for application detail pages.

alter table public.application_documents enable row level security;

alter table public.application_documents
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists document_name text,
  add column if not exists status text not null default 'pending',
  add column if not exists review_status text not null default 'pending',
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists uploaded_by_role text,
  add column if not exists is_final boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists uploaded_at timestamptz not null default now();

update public.application_documents
set
  document_name = coalesce(document_name, document_type, file_name),
  uploaded_at = coalesce(uploaded_at, created_at),
  status = coalesce(status, review_status, 'pending'),
  review_status = coalesce(review_status, status, 'pending')
where document_name is null
   or uploaded_at is null
   or status is null
   or review_status is null;

create index if not exists application_documents_application_created_idx
  on public.application_documents(application_id, created_at desc);

create index if not exists application_documents_application_uploaded_idx
  on public.application_documents(application_id, uploaded_at desc);

drop policy if exists "Admins manage documents" on public.application_documents;
create policy "Admins manage documents" on public.application_documents
  for all
  using (public.is_admin_role())
  with check (public.is_admin_role());

drop policy if exists "Customers read own documents" on public.application_documents;
create policy "Customers read own documents" on public.application_documents
  for select
  using (
    exists (
      select 1
      from public.applications a
      where a.id = application_documents.application_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "Customers insert own documents" on public.application_documents;
create policy "Customers insert own documents" on public.application_documents
  for insert
  with check (
    uploaded_by = auth.uid()
    and user_id = auth.uid()
    and coalesce(uploaded_by_role, 'customer') = 'customer'
    and exists (
      select 1
      from public.applications a
      where a.id = application_documents.application_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "Agents manage assigned documents" on public.application_documents;
create policy "Agents manage assigned documents" on public.application_documents
  for all
  using (
    public.is_active_approved_agent()
    and exists (
      select 1
      from public.applications a
      where a.id = application_documents.application_id
        and (
          a.created_by_agent_id = auth.uid()
          or a.agent_id = auth.uid()
          or a.assigned_agent_id = auth.uid()
          or exists (
            select 1
            from public.assignments x
            where x.application_id = a.id
              and x.agent_id = auth.uid()
              and x.active
          )
        )
    )
  )
  with check (
    public.is_active_approved_agent()
    and exists (
      select 1
      from public.applications a
      where a.id = application_documents.application_id
        and (
          a.created_by_agent_id = auth.uid()
          or a.agent_id = auth.uid()
          or a.assigned_agent_id = auth.uid()
          or exists (
            select 1
            from public.assignments x
            where x.application_id = a.id
              and x.agent_id = auth.uid()
              and x.active
          )
        )
    )
  );
