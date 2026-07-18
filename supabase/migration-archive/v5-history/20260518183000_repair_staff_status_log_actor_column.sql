-- Repair for staff status-log policies on databases where application_status_logs uses actor_id.
-- This is additive and safe to run after a failed attempt of 20260518173000.

alter table public.application_status_logs
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists actor_role text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() = 'staff'; $$;

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
