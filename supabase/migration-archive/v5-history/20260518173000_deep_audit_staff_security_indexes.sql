-- Deep audit hardening: restore canonical staff/super_admin compatibility without dropping data.
-- This migration is intentionally additive/conservative. Legacy diagnostics remain available only
-- to super_admin users from the app layer; no tables, columns, policies, or functions are dropped here.

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_role_check'
  ) then
    alter table public.users drop constraint users_role_check;
  end if;

  alter table public.users
    add constraint users_role_check
    check (role in ('super_admin', 'admin', 'staff', 'agent', 'customer'));

  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('super_admin', 'admin', 'staff', 'agent', 'customer'));

  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'application_documents'
      and constraint_name = 'application_documents_uploaded_by_role_check'
  ) then
    alter table public.application_documents drop constraint application_documents_uploaded_by_role_check;
  end if;

  alter table public.application_documents
    add constraint application_documents_uploaded_by_role_check
    check (uploaded_by_role in ('admin', 'staff', 'agent', 'customer'));
end $$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when coalesce((select p.role from public.profiles p where p.id = auth.uid()), (select u.role from public.users u where u.id = auth.uid()), 'customer') = 'super_admin'
        then 'super_admin'
      when coalesce((select p.role from public.profiles p where p.id = auth.uid()), (select u.role from public.users u where u.id = auth.uid()), 'customer') = 'admin'
        then 'admin'
      when coalesce((select p.role from public.profiles p where p.id = auth.uid()), (select u.role from public.users u where u.id = auth.uid()), 'customer') = 'staff'
        then 'staff'
      when coalesce((select p.role from public.profiles p where p.id = auth.uid()), (select u.role from public.users u where u.id = auth.uid()), 'customer') = 'agent'
        then 'agent'
      else 'customer'
    end;
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() in ('super_admin', 'admin'); $$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() = 'staff'; $$;

create index if not exists applications_user_created_idx
  on public.applications (user_id, created_at desc);

create index if not exists applications_customer_created_idx
  on public.applications (customer_id, created_at desc);

create index if not exists applications_status_created_idx
  on public.applications (status, created_at desc);

create index if not exists applications_payment_status_created_idx
  on public.applications (payment_status, created_at desc);

create index if not exists application_documents_application_created_idx
  on public.application_documents (application_id, created_at desc);

create index if not exists payments_application_created_idx
  on public.payments (application_id, created_at desc);

create index if not exists invoices_application_created_idx
  on public.invoices (application_id, created_at desc);

create index if not exists commissions_agent_created_idx
  on public.commissions (agent_id, created_at desc);

alter table public.application_status_logs
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists actor_role text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

drop policy if exists "Staff read assigned applications" on public.applications;
create policy "Staff read assigned applications" on public.applications
  for select
  using (public.is_staff_role() and assigned_staff_id = auth.uid());

drop policy if exists "Staff update assigned applications" on public.applications;
create policy "Staff update assigned applications" on public.applications
  for update
  using (public.is_staff_role() and assigned_staff_id = auth.uid())
  with check (public.is_staff_role() and assigned_staff_id = auth.uid());

drop policy if exists "Staff read assigned application documents" on public.application_documents;
create policy "Staff read assigned application documents" on public.application_documents
  for select
  using (
    public.is_staff_role()
    and exists (
      select 1
      from public.applications a
      where a.id = application_id
        and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff upload final assigned documents" on public.application_documents;
create policy "Staff upload final assigned documents" on public.application_documents
  for insert
  with check (
    public.is_staff_role()
    and uploaded_by = auth.uid()
    and uploaded_by_role = 'staff'
    and exists (
      select 1
      from public.applications a
      where a.id = application_id
        and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff read assigned payments" on public.payments;
create policy "Staff read assigned payments" on public.payments
  for select
  using (
    public.is_staff_role()
    and exists (
      select 1
      from public.applications a
      where a.id = application_id
        and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff read assigned invoices" on public.invoices;
create policy "Staff read assigned invoices" on public.invoices
  for select
  using (
    public.is_staff_role()
    and exists (
      select 1
      from public.applications a
      where a.id = application_id
        and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff read assigned application status logs" on public.application_status_logs;
create policy "Staff read assigned application status logs" on public.application_status_logs
  for select
  using (
    public.is_staff_role()
    and exists (
      select 1
      from public.applications a
      where a.id = application_id
        and a.assigned_staff_id = auth.uid()
    )
  );

drop policy if exists "Staff insert assigned application status logs" on public.application_status_logs;
create policy "Staff insert assigned application status logs" on public.application_status_logs
  for insert
  with check (
    public.is_staff_role()
    and actor_id = auth.uid()
    and exists (
      select 1
      from public.applications a
      where a.id = application_id
        and a.assigned_staff_id = auth.uid()
    )
  );

do $$
begin
  if to_regclass('public.admin_crm_diagnostics') is not null then
    comment on view public.admin_crm_diagnostics is
      'Read-only operational diagnostics. App route is super_admin-only; do not expose in normal admin navigation.';
  end if;

  if to_regclass('public.reward_wallet_diagnostics') is not null then
    comment on view public.reward_wallet_diagnostics is
      'Read-only reward integrity diagnostics. App route is super_admin-only; do not expose in normal admin navigation.';
  end if;
end $$;
