do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    alter type public.app_role add value if not exists 'staff';
  end if;
end
$$;

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check check (role in ('super_admin', 'admin', 'agent', 'staff', 'customer'));

alter table public.applications
  add column if not exists assigned_staff_id uuid references auth.users (id) on delete set null,
  add column if not exists staff_note text,
  add column if not exists customer_message text,
  add column if not exists final_document_url text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists applications_assigned_staff_idx
  on public.applications (assigned_staff_id, created_at desc);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role::text from public.profiles p where p.id = auth.uid()),
    (select u.role from public.users u where u.id = auth.uid()),
    'customer'
  );
$$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'staff';
$$;

drop policy if exists "Staff read assigned applications" on public.applications;
create policy "Staff read assigned applications" on public.applications
  for select using (auth.uid() = assigned_staff_id);

drop policy if exists "Staff update assigned applications" on public.applications;
create policy "Staff update assigned applications" on public.applications
  for update using (auth.uid() = assigned_staff_id)
  with check (auth.uid() = assigned_staff_id);

drop policy if exists "Staff read assigned documents" on public.application_documents;
create policy "Staff read assigned documents" on public.application_documents
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff read assigned invoices" on public.invoices;
create policy "Staff read assigned invoices" on public.invoices
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff insert assigned status logs" on public.status_logs;
create policy "Staff insert assigned status logs" on public.status_logs
  for insert with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff read assigned status logs" on public.status_logs;
create policy "Staff read assigned status logs" on public.status_logs
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and a.assigned_staff_id = auth.uid()
    )
  );
