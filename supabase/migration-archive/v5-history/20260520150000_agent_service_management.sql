create extension if not exists pgcrypto;

create table if not exists public.agent_services (
  id uuid primary key default gen_random_uuid(),
  service_id uuid,
  slug text unique not null,
  title text not null,
  description text,
  category text,
  customer_fee numeric(10, 2) not null default 0,
  agent_payout numeric(10, 2) not null default 0,
  payout_type text not null default 'fixed' check (payout_type in ('fixed', 'percentage')),
  payout_percentage numeric(5, 2) not null default 0,
  required_documents text,
  processing_time text,
  instructions text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  visibility_type text not null default 'all' check (visibility_type in ('all', 'selected_agents', 'selected_groups')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_service_assignments (
  id uuid primary key default gen_random_uuid(),
  agent_service_id uuid not null references public.agent_services(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(agent_service_id, agent_id)
);

alter table public.applications
  add column if not exists agent_service_id uuid references public.agent_services(id) on delete set null,
  add column if not exists agent_payout_snapshot numeric(10, 2),
  add column if not exists agent_payout_type_snapshot text,
  add column if not exists customer_fee_snapshot numeric(10, 2);

alter table public.commissions
  add column if not exists agent_service_id uuid references public.agent_services(id) on delete set null,
  add column if not exists payout_type_snapshot text,
  add column if not exists payout_percentage_snapshot numeric(5, 2),
  add column if not exists customer_fee_snapshot numeric(10, 2);

create index if not exists agent_services_active_sort_idx on public.agent_services (is_active, sort_order, title);
create index if not exists agent_services_slug_idx on public.agent_services (slug);
create index if not exists agent_service_assignments_agent_idx on public.agent_service_assignments (agent_id, agent_service_id);
create index if not exists applications_agent_service_idx on public.applications (agent_service_id, created_at desc);

insert into public.agent_services (
  service_id,
  slug,
  title,
  description,
  customer_fee,
  agent_payout,
  payout_type,
  payout_percentage,
  required_documents,
  is_active,
  sort_order
)
select
  sc.id,
  sc.slug,
  sc.name,
  sc.description,
  coalesce(sc.amount, 0),
  coalesce(sc.commission_amount, 0),
  case when coalesce(sc.commission_rate, 0) > 0 then 'percentage' else 'fixed' end,
  coalesce(sc.commission_rate, 0),
  array_to_string(coalesce(sc.required_documents, '{}'::text[]), E'\n'),
  coalesce(sc.active, true),
  row_number() over (order by sc.name)::int
from public.service_catalog sc
where not exists (
  select 1 from public.agent_services existing where existing.slug = sc.slug
)
on conflict (slug) do nothing;

alter table public.agent_services enable row level security;
alter table public.agent_service_assignments enable row level security;

drop policy if exists "Admins manage agent services" on public.agent_services;
create policy "Admins manage agent services" on public.agent_services
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents read visible agent services" on public.agent_services;
create policy "Agents read visible agent services" on public.agent_services
  for select using (
    is_active = true
    and (
      visibility_type = 'all'
      or exists (
        select 1
        from public.agent_service_assignments asa
        where asa.agent_service_id = agent_services.id
          and asa.agent_id = auth.uid()
      )
    )
  );

drop policy if exists "Admins manage agent service assignments" on public.agent_service_assignments;
create policy "Admins manage agent service assignments" on public.agent_service_assignments
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Agents read own service assignments" on public.agent_service_assignments;
create policy "Agents read own service assignments" on public.agent_service_assignments
  for select using (agent_id = auth.uid());
