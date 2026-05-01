-- DigiConnect Dukan CRM + Agent POS + Commission System
-- Safe to run after the existing schema.sql. It keeps legacy tables/flows working.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('super_admin', 'admin', 'agent', 'staff', 'customer');
  end if;
  if not exists (select 1 from pg_type where typname = 'application_source') then
    create type public.application_source as enum ('online', 'offline', 'agent_pos');
  end if;
  if not exists (select 1 from pg_type where typname = 'commission_status') then
    create type public.commission_status as enum ('pending', 'approved', 'paid', 'rejected');
  end if;
end
$$;

alter table public.profiles
  add column if not exists mobile text default '',
  add column if not exists role public.app_role not null default 'customer',
  add column if not exists commission_rate numeric(5, 2),
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  alter column role type text using role::text,
  alter column role set default 'customer';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_role_check') then
    alter table public.users
      add constraint users_role_check check (role in ('super_admin', 'admin', 'agent', 'staff', 'customer'));
  end if;
end
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  assigned_agent_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  mobile text not null,
  email text default '',
  city text default '',
  address text default '',
  notes text default '',
  source public.application_source not null default 'offline',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_mobile_idx on public.customers (mobile);
create index if not exists customers_agent_idx on public.customers (created_by, assigned_agent_id);

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  amount numeric(10, 2) not null default 0,
  commission_amount numeric(10, 2) not null default 0,
  commission_rate numeric(5, 2),
  required_documents text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications
  alter column user_id drop not null,
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists assigned_agent_id uuid references auth.users (id) on delete set null,
  add column if not exists service_id uuid references public.service_catalog (id) on delete set null,
  add column if not exists source public.application_source not null default 'online',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_screenshot_url text,
  add column if not exists payment_screenshot_path text,
  add column if not exists commission_amount numeric(10, 2) not null default 0,
  add column if not exists submitted_by_role text default 'customer';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'applications_payment_status_check') then
    alter table public.applications
      add constraint applications_payment_status_check check (payment_status in ('pending', 'verified', 'failed'));
  end if;
end
$$;

create index if not exists applications_customer_idx on public.applications (customer_id, created_at desc);
create index if not exists applications_agent_idx on public.applications (created_by, assigned_agent_id, created_at desc);
create index if not exists applications_payment_status_idx on public.applications (payment_status);

alter table public.application_documents
  alter column user_id drop not null,
  add column if not exists uploaded_by uuid references auth.users (id) on delete set null;

alter table public.payments
  alter column user_id drop not null,
  add column if not exists payment_screenshot_required boolean not null default true;

alter table public.invoices
  alter column user_id drop not null,
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists customer_mobile text default '';

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  agent_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references public.service_catalog (id) on delete set null,
  amount numeric(10, 2) not null default 0,
  status public.commission_status not null default 'pending',
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, agent_id)
);

create index if not exists commissions_agent_idx on public.commissions (agent_id, status, created_at desc);

create table if not exists public.status_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  old_status text,
  new_status text not null,
  note text default '',
  created_at timestamptz not null default now()
);

create index if not exists status_logs_application_idx on public.status_logs (application_id, created_at desc);

insert into public.service_catalog (slug, name, description, amount, commission_amount, required_documents)
select slug, name, description, amount, greatest(round(amount * 0.2), 25), '{}'::text[]
from public.services
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  amount = excluded.amount,
  updated_at = now();

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

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('super_admin', 'admin');
$$;

create or replace function public.is_agent_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('super_admin', 'admin', 'agent');
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.service_catalog enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.invoices enable row level security;
alter table public.commissions enable row level security;
alter table public.status_logs enable row level security;

drop policy if exists "Profiles self or admin read" on public.profiles;
create policy "Profiles self or admin read" on public.profiles
  for select using (id = auth.uid() or public.is_admin_role());

drop policy if exists "Profiles self or admin update" on public.profiles;
create policy "Profiles self or admin update" on public.profiles
  for update using (id = auth.uid() or public.is_admin_role())
  with check (id = auth.uid() or public.is_admin_role());

drop policy if exists "Admins manage service catalog" on public.service_catalog;
create policy "Admins manage service catalog" on public.service_catalog
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Authenticated read active service catalog" on public.service_catalog;
create policy "Authenticated read active service catalog" on public.service_catalog
  for select using (active = true or public.is_admin_role());

drop policy if exists "Admins manage customers" on public.customers;
create policy "Admins manage customers" on public.customers
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents manage own customers" on public.customers;
create policy "Agents manage own customers" on public.customers
  for all using (auth.uid() = created_by or auth.uid() = assigned_agent_id)
  with check (auth.uid() = created_by or auth.uid() = assigned_agent_id);

drop policy if exists "Customers read own customer profile" on public.customers;
create policy "Customers read own customer profile" on public.customers
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage applications" on public.applications;
create policy "Admins manage applications" on public.applications
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents manage own applications" on public.applications;
create policy "Agents manage own applications" on public.applications
  for all using (auth.uid() = created_by or auth.uid() = assigned_agent_id)
  with check (auth.uid() = created_by or auth.uid() = assigned_agent_id);

drop policy if exists "Customers read own applications" on public.applications;
create policy "Customers read own applications" on public.applications
  for select using (auth.uid() = user_id);

drop policy if exists "Customers create own applications" on public.applications;
create policy "Customers create own applications" on public.applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admins manage documents" on public.application_documents;
create policy "Admins manage documents" on public.application_documents
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents manage own documents" on public.application_documents;
create policy "Agents manage own documents" on public.application_documents
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (a.created_by = auth.uid() or a.assigned_agent_id = auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (a.created_by = auth.uid() or a.assigned_agent_id = auth.uid())
    )
  );

drop policy if exists "Customers read own documents" on public.application_documents;
create policy "Customers read own documents" on public.application_documents
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage invoices" on public.invoices;
create policy "Admins manage invoices" on public.invoices
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents read own invoices" on public.invoices;
create policy "Agents read own invoices" on public.invoices
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (a.created_by = auth.uid() or a.assigned_agent_id = auth.uid())
    )
  );

drop policy if exists "Customers read own invoices" on public.invoices;
create policy "Customers read own invoices" on public.invoices
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage commissions" on public.commissions;
create policy "Admins manage commissions" on public.commissions
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents read own commissions" on public.commissions;
create policy "Agents read own commissions" on public.commissions
  for select using (auth.uid() = agent_id);

drop policy if exists "Admins manage status logs" on public.status_logs;
create policy "Admins manage status logs" on public.status_logs
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents read own status logs" on public.status_logs;
create policy "Agents read own status logs" on public.status_logs
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (a.created_by = auth.uid() or a.assigned_agent_id = auth.uid())
    )
  );

drop policy if exists "Customers read own status logs" on public.status_logs;
create policy "Customers read own status logs" on public.status_logs
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and a.user_id = auth.uid()
    )
  );
