-- DigiConnect Dukan: canonical three-role security model.
-- Roles are now admin, agent, customer. Historical staff/super_admin data is normalized.

create extension if not exists pgcrypto;

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    alter type public.app_role add value if not exists 'admin';
    alter type public.app_role add value if not exists 'agent';
    alter type public.app_role add value if not exists 'customer';
  else
    create type public.app_role as enum ('admin', 'agent', 'customer');
  end if;
end $$;

alter table public.users drop constraint if exists users_role_check;
alter table public.users alter column role type text using role::text;
alter table public.users alter column role set default 'customer';
update public.users set role = 'admin' where role in ('super_admin', 'staff');
alter table public.users
  add constraint users_role_check check (role in ('admin', 'agent', 'customer'));

alter table public.profiles
  alter column role type text using role::text,
  alter column role set default 'customer',
  add column if not exists kyc_status text not null default 'pending',
  add column if not exists shop_name text,
  add column if not exists shop_address text,
  add column if not exists pincode text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists aadhaar_number text,
  add column if not exists pan_number text,
  add column if not exists gst_number text,
  add column if not exists kyc_documents jsonb not null default '[]'::jsonb,
  add column if not exists commission_rules jsonb not null default '{}'::jsonb;

update public.profiles set role = 'admin' where role in ('super_admin', 'staff');
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'agent', 'customer'));
alter table public.profiles drop constraint if exists profiles_kyc_status_check;
alter table public.profiles
  add constraint profiles_kyc_status_check check (kyc_status in ('pending', 'approved', 'rejected'));

alter table public.customers
  add column if not exists pincode text default '',
  add column if not exists state text default '';

alter table public.applications
  add column if not exists customer_email text,
  add column if not exists customer_mobile text,
  add column if not exists assigned_agent_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by_agent_id uuid references auth.users(id) on delete set null,
  add column if not exists final_document_path text;

update public.applications
set created_by_agent_id = coalesce(created_by_agent_id, agent_id, created_by)
where created_by_agent_id is null
  and submitted_by_role = 'agent';

update public.applications
set customer_email = coalesce(
    nullif(customer_email, ''),
    nullif(customer_details->>'email', ''),
    nullif(form_data->>'email', '')
  ),
  customer_mobile = regexp_replace(coalesce(
    nullif(customer_mobile, ''),
    nullif(customer_details->>'mobile', ''),
    nullif(form_data->>'mobile', '')
  ), '\D', '', 'g')
where customer_email is null or customer_mobile is null;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check check (
    status in (
      'draft','payment_pending','payment_success','submitted','documents_required',
      'documents_verified','assigned_to_agent','in_process','objection','completed',
      'delivered','cancelled','rejected',
      'new','documents_pending','payment_failed','in_progress','lead_submitted',
      'payment_verified','documents_under_review','application_processing',
      'submitted_to_department','under_government_review'
    )
  );

create table if not exists public.agents (
  id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  mobile text not null default '',
  shop_name text,
  shop_address text,
  address text,
  pincode text,
  city text,
  state text,
  aadhaar_number text,
  pan_number text,
  gst_number text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  upi_id text,
  kyc_status text not null default 'pending' check (kyc_status in ('pending', 'approved', 'rejected')),
  kyc_documents jsonb not null default '[]'::jsonb,
  commission_rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  agent_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  note text default '',
  created_at timestamptz not null default now(),
  unique(application_id, agent_id)
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  transaction_id text,
  payout_date date,
  notes text default ''
);

create table if not exists public.application_status_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  old_status text,
  new_status text not null,
  note text default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.application_status_logs (application_id, actor_id, old_status, new_status, note, created_at)
select application_id, changed_by, old_status, new_status, note, created_at
from public.status_logs
on conflict do nothing;

create index if not exists applications_customer_claim_idx
  on public.applications (lower(customer_email), customer_mobile)
  where customer_id is null;
create index if not exists applications_created_by_agent_idx on public.applications(created_by_agent_id, created_at desc);
create index if not exists applications_assigned_agent_idx on public.applications(assigned_agent_id, created_at desc);
create index if not exists assignments_agent_idx on public.assignments(agent_id, active, created_at desc);
create index if not exists payout_requests_agent_idx on public.payout_requests(agent_id, status, requested_at desc);
create index if not exists application_status_logs_application_idx on public.application_status_logs(application_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do update set public = false;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce((select p.role from public.profiles p where p.id = auth.uid()), (select u.role from public.users u where u.id = auth.uid()), 'customer') = 'agent'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role = 'agent'
          and coalesce(p.active, false) = true
          and coalesce(p.is_active, false) = true
          and p.kyc_status = 'approved'
      )
      then 'agent'
    when coalesce((select p.role from public.profiles p where p.id = auth.uid()), (select u.role from public.users u where u.id = auth.uid()), 'customer') = 'admin'
      then 'admin'
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

create or replace function public.is_active_approved_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() = 'agent'; $$;

create or replace function public.claim_customer_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_mobile text;
  v_customer_id uuid;
  v_claimed integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select lower(coalesce(email, '')), regexp_replace(coalesce(mobile, ''), '\D', '', 'g')
    into v_email, v_mobile
  from public.profiles
  where id = v_user_id and role = 'customer';

  if v_email = '' or v_mobile = '' then
    raise exception 'Verified email and mobile are required';
  end if;

  select id into v_customer_id
  from public.customers
  where user_id = v_user_id
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.customers(user_id, full_name, email, mobile, source)
    select id, coalesce(nullif(full_name, ''), 'Customer'), email, mobile, 'online'
    from public.profiles
    where id = v_user_id
    returning id into v_customer_id;
  end if;

  update public.applications
  set user_id = v_user_id,
      customer_id = v_customer_id,
      updated_at = now()
  where customer_id is null
    and lower(coalesce(customer_email, '')) = v_email
    and regexp_replace(coalesce(customer_mobile, ''), '\D', '', 'g') = v_mobile;

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$$;

alter table public.agents enable row level security;
alter table public.assignments enable row level security;
alter table public.payout_requests enable row level security;
alter table public.application_status_logs enable row level security;
alter table public.profiles enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.commissions enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.admin_notes enable row level security;

drop policy if exists "Admins manage agents" on public.agents;
create policy "Admins manage agents" on public.agents for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read own agent profile" on public.agents;
create policy "Agents read own agent profile" on public.agents for select using (id = auth.uid());

drop policy if exists "Admins manage assignments" on public.assignments;
create policy "Admins manage assignments" on public.assignments for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read own assignments" on public.assignments;
create policy "Agents read own assignments" on public.assignments for select using (agent_id = auth.uid());

drop policy if exists "Admins manage payout requests" on public.payout_requests;
create policy "Admins manage payout requests" on public.payout_requests for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents manage own payout requests" on public.payout_requests;
create policy "Agents manage own payout requests" on public.payout_requests for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

drop policy if exists "Admins full profiles" on public.profiles;
create policy "Admins full profiles" on public.profiles for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Profiles self read" on public.profiles;
create policy "Profiles self read" on public.profiles for select using (id = auth.uid());

drop policy if exists "Admins full users" on public.users;
create policy "Admins full users" on public.users for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile" on public.users for select using (id = auth.uid());

drop policy if exists "Admins manage customers" on public.customers;
create policy "Admins manage customers" on public.customers for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents manage own customers" on public.customers;
create policy "Agents manage own customers" on public.customers for all using (public.is_active_approved_agent() and (auth.uid() = created_by or auth.uid() = assigned_agent_id)) with check (public.is_active_approved_agent() and (auth.uid() = created_by or auth.uid() = assigned_agent_id));
drop policy if exists "Customers read own customer profile" on public.customers;
create policy "Customers read own customer profile" on public.customers for select using (auth.uid() = user_id);

drop policy if exists "Admins manage applications" on public.applications;
create policy "Admins manage applications" on public.applications for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read assigned or created applications" on public.applications;
create policy "Agents read assigned or created applications" on public.applications for select using (
  public.is_active_approved_agent() and (
    auth.uid() = created_by_agent_id or auth.uid() = agent_id or auth.uid() = assigned_agent_id
    or exists(select 1 from public.assignments x where x.application_id = id and x.agent_id = auth.uid() and x.active)
  )
);
drop policy if exists "Agents create own applications" on public.applications;
create policy "Agents create own applications" on public.applications for insert with check (
  public.is_active_approved_agent() and (created_by_agent_id = auth.uid() or created_by = auth.uid() or agent_id = auth.uid())
);
drop policy if exists "Agents update assigned applications" on public.applications;
create policy "Agents update assigned applications" on public.applications for update using (
  public.is_active_approved_agent() and (
    auth.uid() = assigned_agent_id
    or exists(select 1 from public.assignments x where x.application_id = id and x.agent_id = auth.uid() and x.active)
  )
) with check (
  public.is_active_approved_agent() and (
    auth.uid() = assigned_agent_id
    or exists(select 1 from public.assignments x where x.application_id = id and x.agent_id = auth.uid() and x.active)
  )
);
drop policy if exists "Customers read own applications" on public.applications;
create policy "Customers read own applications" on public.applications for select using (auth.uid() = user_id);
drop policy if exists "Customers create own applications" on public.applications;
create policy "Customers create own applications" on public.applications for insert with check (auth.uid() = user_id);

drop policy if exists "Admins manage documents" on public.application_documents;
create policy "Admins manage documents" on public.application_documents for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents manage assigned documents" on public.application_documents;
create policy "Agents manage assigned documents" on public.application_documents for all using (
  public.is_active_approved_agent() and exists (
    select 1 from public.applications a
    where a.id = application_id
      and (a.created_by_agent_id = auth.uid() or a.agent_id = auth.uid() or a.assigned_agent_id = auth.uid()
        or exists(select 1 from public.assignments x where x.application_id = a.id and x.agent_id = auth.uid() and x.active))
  )
) with check (
  public.is_active_approved_agent() and exists (
    select 1 from public.applications a
    where a.id = application_id
      and (a.created_by_agent_id = auth.uid() or a.agent_id = auth.uid() or a.assigned_agent_id = auth.uid()
        or exists(select 1 from public.assignments x where x.application_id = a.id and x.agent_id = auth.uid() and x.active))
  )
);
drop policy if exists "Customers read own documents" on public.application_documents;
create policy "Customers read own documents" on public.application_documents for select using (
  exists(select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid())
);

drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments" on public.payments for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read assigned payments" on public.payments;
create policy "Agents read assigned payments" on public.payments for select using (
  public.is_active_approved_agent() and exists(select 1 from public.applications a where a.id = application_id and (a.created_by_agent_id = auth.uid() or a.agent_id = auth.uid() or a.assigned_agent_id = auth.uid()))
);
drop policy if exists "Customers read own payments" on public.payments;
create policy "Customers read own payments" on public.payments for select using (user_id = auth.uid() or exists(select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()));

drop policy if exists "Admins manage invoices" on public.invoices;
create policy "Admins manage invoices" on public.invoices for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read assigned invoices" on public.invoices;
create policy "Agents read assigned invoices" on public.invoices for select using (
  public.is_active_approved_agent() and exists(select 1 from public.applications a where a.id = application_id and (a.created_by_agent_id = auth.uid() or a.agent_id = auth.uid() or a.assigned_agent_id = auth.uid()))
);
drop policy if exists "Customers read own invoices" on public.invoices;
create policy "Customers read own invoices" on public.invoices for select using (user_id = auth.uid() or exists(select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()));

drop policy if exists "Admins manage commissions" on public.commissions;
create policy "Admins manage commissions" on public.commissions for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read own commissions" on public.commissions;
create policy "Agents read own commissions" on public.commissions for select using (agent_id = auth.uid());

drop policy if exists "Admins manage wallet transactions" on public.wallet_transactions;
create policy "Admins manage wallet transactions" on public.wallet_transactions for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read own wallet transactions" on public.wallet_transactions;
create policy "Agents read own wallet transactions" on public.wallet_transactions for select using (user_id = auth.uid());

drop policy if exists "Admins manage application status logs" on public.application_status_logs;
create policy "Admins manage application status logs" on public.application_status_logs for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Agents read assigned application status logs" on public.application_status_logs;
create policy "Agents read assigned application status logs" on public.application_status_logs for select using (
  public.is_active_approved_agent() and exists(select 1 from public.applications a where a.id = application_id and (a.created_by_agent_id = auth.uid() or a.agent_id = auth.uid() or a.assigned_agent_id = auth.uid()))
);
drop policy if exists "Customers read own application status logs" on public.application_status_logs;
create policy "Customers read own application status logs" on public.application_status_logs for select using (
  exists(select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid())
);

drop policy if exists "Admins manage admin notes" on public.admin_notes;
create policy "Admins manage admin notes" on public.admin_notes for all using (public.is_admin_role()) with check (public.is_admin_role());
