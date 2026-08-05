-- Phase 4: Canonical lead ops on public.leads (additive, non-destructive)
-- Does NOT drop crm_leads or rewrite historical lead rows.
-- Compatibility: crm_leads remains readable as a prototype adapter target.
--
-- PRE-DEPLOY: confirm public.leads exists; backup not required for additive DDL.
-- ROLLBACK: drop new tables/columns/indexes listed below; do not delete lead rows.

-- ---------------------------------------------------------------------------
-- Additive columns on public.leads
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists lead_source text,
  add column if not exists pipeline_stage text,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists lost_reason text,
  add column if not exists stage_reason text,
  add column if not exists converted_customer_id uuid,
  add column if not exists converted_at timestamptz,
  add column if not exists ingestion_key text,
  add column if not exists external_ref text,
  add column if not exists campaign_attribution text,
  add column if not exists mobile_normalized text,
  add column if not exists email text,
  add column if not exists referral_code text,
  add column if not exists partner_id uuid,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists last_activity_at timestamptz;

-- Backfill normalized mobile / source without changing business meaning.
update public.leads
set mobile_normalized = right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 10)
where mobile_normalized is null
  and coalesce(mobile, '') <> '';

update public.leads
set lead_source = coalesce(nullif(lead_source, ''), nullif(source, ''), 'website')
where lead_source is null;

update public.leads
set pipeline_stage = case
  when lower(coalesce(status, '')) in ('converted', 'won', 'completed') then 'won'
  when lower(coalesce(status, '')) in ('closed', 'lost', 'cancelled', 'rejected') then 'lost'
  when lower(coalesce(status, '')) in ('contacted') then 'contacted'
  when lower(coalesce(status, '')) in ('qualified') then 'qualified'
  else 'new'
end
where pipeline_stage is null;

update public.leads
set assigned_to = coalesce(assigned_to, agent_id)
where assigned_to is null
  and agent_id is not null;

update public.leads
set last_activity_at = coalesce(last_activity_at, updated_at, created_at)
where last_activity_at is null;

create unique index if not exists leads_ingestion_key_uidx
  on public.leads (ingestion_key)
  where ingestion_key is not null;

create index if not exists leads_mobile_normalized_idx
  on public.leads (mobile_normalized, created_at desc);

create index if not exists leads_lead_source_idx
  on public.leads (lead_source, created_at desc);

create index if not exists leads_pipeline_stage_idx
  on public.leads (pipeline_stage, created_at desc);

create index if not exists leads_partner_id_idx
  on public.leads (partner_id, created_at desc)
  where partner_id is not null;

create index if not exists leads_assigned_to_follow_up_idx
  on public.leads (assigned_to, next_follow_up_at)
  where assigned_to is not null;

create index if not exists leads_unassigned_queue_idx
  on public.leads (created_at desc)
  where assigned_to is null
    and coalesce(pipeline_stage, 'new') not in ('won', 'lost');

create index if not exists leads_overdue_follow_up_idx
  on public.leads (next_follow_up_at)
  where next_follow_up_at is not null
    and coalesce(pipeline_stage, 'new') not in ('won', 'lost');

create index if not exists leads_external_ref_idx
  on public.leads (external_ref)
  where external_ref is not null;

-- ---------------------------------------------------------------------------
-- Append-only stage history
-- ---------------------------------------------------------------------------
create table if not exists public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_system boolean not null default false,
  note text default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_stage_history_lead_idx
  on public.lead_stage_history (lead_id, created_at desc);

alter table public.lead_stage_history enable row level security;

drop policy if exists "Admins select lead stage history" on public.lead_stage_history;
create policy "Admins select lead stage history" on public.lead_stage_history
  for select using (public.is_admin_role());

drop policy if exists "Admins insert lead stage history" on public.lead_stage_history;
create policy "Admins insert lead stage history" on public.lead_stage_history
  for insert with check (public.is_admin_role());

drop policy if exists "Partners select own lead stage history" on public.lead_stage_history;
create policy "Partners select own lead stage history" on public.lead_stage_history
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_stage_history.lead_id
        and (l.agent_id = auth.uid() or l.assigned_to = auth.uid() or l.partner_id = auth.uid())
    )
  );

create or replace function public.forbid_lead_stage_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'lead_stage_history_append_only' using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_forbid_lead_stage_history_mutation on public.lead_stage_history;
create trigger trg_forbid_lead_stage_history_mutation
  before update or delete on public.lead_stage_history
  for each row execute function public.forbid_lead_stage_history_mutation();

revoke all on function public.forbid_lead_stage_history_mutation() from public;
revoke all on function public.forbid_lead_stage_history_mutation() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Activity timeline
-- ---------------------------------------------------------------------------
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null,
  body text not null default '',
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_idx
  on public.lead_activities (lead_id, created_at desc);

alter table public.lead_activities enable row level security;

drop policy if exists "Admins manage lead activities" on public.lead_activities;
create policy "Admins select lead activities" on public.lead_activities
  for select using (public.is_admin_role());
create policy "Admins insert lead activities" on public.lead_activities
  for insert with check (public.is_admin_role());

drop policy if exists "Partners select own lead activities" on public.lead_activities;
create policy "Partners select own lead activities" on public.lead_activities
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_activities.lead_id
        and (l.agent_id = auth.uid() or l.assigned_to = auth.uid() or l.partner_id = auth.uid())
    )
  );

drop policy if exists "Partners insert own lead activities" on public.lead_activities;
create policy "Partners insert own lead activities" on public.lead_activities
  for insert with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_activities.lead_id
        and (l.agent_id = auth.uid() or l.assigned_to = auth.uid() or l.partner_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Assignment history (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_assignment_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_user_id uuid references auth.users(id) on delete set null,
  previous_assigned_user_id uuid references auth.users(id) on delete set null,
  assignment_reason text not null default 'manual',
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_by_system boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_assignment_history_lead_idx
  on public.lead_assignment_history (lead_id, created_at desc);

alter table public.lead_assignment_history enable row level security;

drop policy if exists "Admins select lead assignment history" on public.lead_assignment_history;
create policy "Admins select lead assignment history" on public.lead_assignment_history
  for select using (public.is_admin_role());
drop policy if exists "Admins insert lead assignment history" on public.lead_assignment_history;
create policy "Admins insert lead assignment history" on public.lead_assignment_history
  for insert with check (public.is_admin_role());

create or replace function public.forbid_lead_assignment_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'lead_assignment_history_append_only' using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_forbid_lead_assignment_history_mutation on public.lead_assignment_history;
create trigger trg_forbid_lead_assignment_history_mutation
  before update or delete on public.lead_assignment_history
  for each row execute function public.forbid_lead_assignment_history_mutation();

revoke all on function public.forbid_lead_assignment_history_mutation() from public;
revoke all on function public.forbid_lead_assignment_history_mutation() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ingestion idempotency (website / WhatsApp / Sheets / manual)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_ingestion_keys (
  key text primary key,
  source text not null,
  lead_id uuid references public.leads(id) on delete set null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_ingestion_keys_created_idx
  on public.lead_ingestion_keys (created_at desc);

alter table public.lead_ingestion_keys enable row level security;

drop policy if exists "Admins select lead ingestion keys" on public.lead_ingestion_keys;
create policy "Admins select lead ingestion keys" on public.lead_ingestion_keys
  for select using (public.is_admin_role());
-- No insert/update/delete for authenticated clients — service_role / app server only.

-- ---------------------------------------------------------------------------
-- Privilege notes (no SECURITY DEFINER RPCs in this foundation migration)
-- ---------------------------------------------------------------------------
-- History forbid_* triggers are SECURITY INVOKER with search_path = ''.
-- EXECUTE revoked from PUBLIC, anon, authenticated.
-- All lead writes go through Next.js APIs using service role after capability checks.
-- Partner isolation for reads is enforced in app queries + RLS on history/activities.
--
-- ROLLBACK / MITIGATION (non-destructive to lead business rows)
-- 1. drop trigger + forbid functions for stage/assignment history
-- 2. drop table if exists lead_ingestion_keys, lead_assignment_history, lead_activities, lead_stage_history
-- 3. drop indexes added above
-- 4. optionally: alter table leads drop column if exists <new columns>
-- Do not DELETE from public.leads or public.crm_leads as part of rollback.

comment on column public.leads.pipeline_stage is
  'Canonical stages: new, contact_attempted, contacted, qualified, service_selected, documents_awaited, application_created, won, lost, follow_up_scheduled. application_created = app linked; won = closed-won / converted commercially.';

comment on column public.leads.lead_source is
  'Canonical sources: website, whatsapp, walk_in, referral, agency_partner, field_executive, manual. Unknown inbound maps to manual in app layer.';

comment on column public.leads.external_ref is
  'Provider-neutral external id (WhatsApp message id, Sheets row key, etc.) for idempotent ingest.';

comment on table public.crm_leads is
  'Prototype Kanban store. Phase 4 canonical operational leads live in public.leads. Do not write new production traffic here.';
