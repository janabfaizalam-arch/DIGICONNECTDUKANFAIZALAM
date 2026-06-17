-- Final three-role architecture cleanup: admin, agent, customer only.
-- Historical role values are normalized before constraints are tightened.

update public.profiles
set role = 'admin', updated_at = now()
where lower(coalesce(role, '')) in ('super_admin', 'staff', 'team', 'employee', 'processor');

update public.profiles
set role = 'customer', updated_at = now()
where lower(coalesce(role, '')) not in ('admin', 'agent', 'customer');

update public.users
set role = 'admin', updated_at = now()
where lower(coalesce(role, '')) in ('super_admin', 'staff', 'team', 'employee', 'processor');

update public.users
set role = 'customer', updated_at = now()
where lower(coalesce(role, '')) not in ('admin', 'agent', 'customer');

update auth.users
set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"', true)
where lower(coalesce(raw_user_meta_data ->> 'role', '')) in ('super_admin', 'staff', 'team', 'employee', 'processor');

update auth.users
set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"', true)
where lower(coalesce(raw_app_meta_data ->> 'role', '')) in ('super_admin', 'staff', 'team', 'employee', 'processor');

update public.application_documents
set uploaded_by_role = 'admin'
where lower(coalesce(uploaded_by_role, '')) in ('super_admin', 'staff', 'team', 'employee', 'processor');

update public.application_documents
set uploaded_by_role = 'customer'
where uploaded_by_role is not null
  and lower(uploaded_by_role) not in ('admin', 'agent', 'customer');

do $$
begin
  if to_regclass('public.application_status_logs') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'application_status_logs'
         and column_name = 'actor_role'
     ) then
    update public.application_status_logs
    set actor_role = 'admin'
    where lower(coalesce(actor_role, '')) in ('super_admin', 'staff', 'team', 'employee', 'processor');

    update public.application_status_logs
    set actor_role = 'customer'
    where actor_role is not null
      and lower(actor_role) not in ('admin', 'agent', 'customer');
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'agent', 'customer'));

alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'agent', 'customer'));

alter table public.application_documents drop constraint if exists application_documents_uploaded_by_role_check;
alter table public.application_documents
  add constraint application_documents_uploaded_by_role_check
  check (uploaded_by_role is null or uploaded_by_role in ('admin', 'agent', 'customer'));

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(coalesce(
      (select p.role from public.profiles p where p.id = auth.uid()),
      (select u.role from public.users u where u.id = auth.uid()),
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      'customer'
    )) in ('super_admin', 'staff', 'team', 'employee', 'processor') then 'admin'
    when lower(coalesce(
      (select p.role from public.profiles p where p.id = auth.uid()),
      (select u.role from public.users u where u.id = auth.uid()),
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      'customer'
    )) in ('admin', 'agent', 'customer') then lower(coalesce(
      (select p.role from public.profiles p where p.id = auth.uid()),
      (select u.role from public.users u where u.id = auth.uid()),
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      'customer'
    ))
    else 'customer'
  end;
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() = 'admin'; $$;

create or replace function public.is_agent_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() in ('admin', 'agent'); $$;

drop policy if exists "Staff read assigned applications" on public.applications;
drop policy if exists "Staff update assigned applications" on public.applications;
drop policy if exists "Staff read assigned documents" on public.application_documents;
drop policy if exists "Staff read assigned application documents" on public.application_documents;
drop policy if exists "Staff upload final assigned documents" on public.application_documents;
drop policy if exists "Staff read assigned payments" on public.payments;
drop policy if exists "Staff read assigned invoices" on public.invoices;
drop policy if exists "Staff insert assigned status logs" on public.status_logs;
drop policy if exists "Staff read assigned status logs" on public.status_logs;
drop policy if exists "Staff read assigned application status logs" on public.application_status_logs;
drop policy if exists "Staff insert assigned application status logs" on public.application_status_logs;

drop function if exists public.is_staff_role() cascade;

comment on function public.current_app_role() is 'Returns the normalized final platform role: admin, agent, or customer.';
comment on function public.is_admin_role() is 'True only for the final admin role.';
comment on function public.is_agent_or_admin() is 'True for admin and agent access checks.';
