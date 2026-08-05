-- Phase 5B: CRM automation events, rules executions, ops alerts, daily summaries
-- Additive after 20260805160000. Production unchanged until explicitly applied.
-- Cron schedules NOT registered here.

-- ---------------------------------------------------------------------------
-- Automation events
-- ---------------------------------------------------------------------------
create table if not exists public.crm_automation_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_origin text not null default 'system'
    check (actor_origin in ('system', 'admin', 'agency_partner', 'customer', 'webhook', 'cron')),
  source_history_id uuid,
  source_history_table text,
  correlation_id text,
  safe_metadata jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  idempotency_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'retryable', 'failed', 'cancelled', 'suppressed')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz,
  processing_lease_until timestamptz,
  processing_owner text,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create index if not exists crm_automation_events_claim_idx
  on public.crm_automation_events (status, next_attempt_at, created_at)
  where status in ('pending', 'retryable');

create index if not exists crm_automation_events_entity_idx
  on public.crm_automation_events (entity_type, entity_id, created_at desc);

create index if not exists crm_automation_events_type_idx
  on public.crm_automation_events (event_type, created_at desc);

alter table public.crm_automation_events enable row level security;
drop policy if exists "Admins select automation events" on public.crm_automation_events;
create policy "Admins select automation events" on public.crm_automation_events
  for select using (public.is_admin_role());

comment on table public.crm_automation_events is
  'Canonical automation events. Append-only for ordinary roles. No PIN/OTP/secrets/document content in safe_metadata.';

-- ---------------------------------------------------------------------------
-- Automation rule executions (history) — rules themselves are code-defined in app
-- ---------------------------------------------------------------------------
create table if not exists public.crm_automation_executions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.crm_automation_events(id) on delete cascade,
  rule_key text not null,
  rule_version integer not null default 1,
  action_type text not null
    check (action_type in (
      'enqueue_communication',
      'create_admin_alert',
      'create_staff_alert',
      'schedule_internal_followup_alert',
      'record_activity'
    )),
  target_entity_type text,
  target_entity_id uuid,
  idempotency_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped', 'failed', 'suppressed')),
  attempt_count integer not null default 0,
  result_code text,
  failure_code text,
  correlation_id text,
  actor_origin text not null default 'system',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create index if not exists crm_automation_executions_event_idx
  on public.crm_automation_executions (event_id, created_at desc);

alter table public.crm_automation_executions enable row level security;
drop policy if exists "Admins select automation executions" on public.crm_automation_executions;
create policy "Admins select automation executions" on public.crm_automation_executions
  for select using (public.is_admin_role());

-- Forbid DELETE only (service_role may complete status on insert/upsert; no client deletes)
create or replace function public.forbid_crm_automation_executions_delete()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'automation_executions_append_only' using errcode = 'P0001';
end;
$$;
drop trigger if exists trg_forbid_crm_automation_executions_mutation on public.crm_automation_executions;
drop trigger if exists trg_forbid_crm_automation_executions_delete on public.crm_automation_executions;
create trigger trg_forbid_crm_automation_executions_delete
  before delete on public.crm_automation_executions
  for each row execute function public.forbid_crm_automation_executions_delete();

revoke all on function public.forbid_crm_automation_executions_delete() from public;
revoke all on function public.forbid_crm_automation_executions_delete() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ops alerts (distinct from legacy admin_notifications inbox)
-- ---------------------------------------------------------------------------
create table if not exists public.crm_ops_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'critical')),
  title text not null,
  safe_summary text not null,
  related_entity_type text,
  related_entity_id uuid,
  source_event_id uuid references public.crm_automation_events(id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved')),
  idempotency_key text not null,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create index if not exists crm_ops_alerts_status_idx
  on public.crm_ops_alerts (status, created_at desc);

alter table public.crm_ops_alerts enable row level security;
drop policy if exists "Admins manage ops alerts" on public.crm_ops_alerts;
create policy "Admins manage ops alerts" on public.crm_ops_alerts
  for all using (public.is_admin_role()) with check (public.is_admin_role());

-- ---------------------------------------------------------------------------
-- Daily operational summaries (aggregates only)
-- ---------------------------------------------------------------------------
create table if not exists public.crm_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  timezone text not null default 'Asia/Kolkata',
  idempotency_key text not null,
  metrics jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'disabled'
    check (delivery_status in ('disabled', 'ready', 'sent', 'failed')),
  generated_at timestamptz not null default timezone('utc', now()),
  generated_by text not null default 'system',
  unique (idempotency_key),
  unique (business_date, timezone)
);

alter table public.crm_daily_summaries enable row level security;
drop policy if exists "Admins select daily summaries" on public.crm_daily_summaries;
create policy "Admins select daily summaries" on public.crm_daily_summaries
  for select using (public.is_admin_role());

-- ---------------------------------------------------------------------------
-- Claim automation events (service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.claim_crm_automation_events(
  p_batch_size integer,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns setof public.crm_automation_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_batch_size, 10), 50));
  v_lease interval := make_interval(secs => greatest(30, least(coalesce(p_lease_seconds, 120), 600)));
begin
  if p_worker_id is null or length(trim(p_worker_id)) < 4 then
    raise exception 'worker_required' using errcode = 'P0001';
  end if;

  update public.crm_automation_events e
  set
    status = 'failed',
    failure_code = coalesce(e.failure_code, 'max_attempts'),
    failure_summary = coalesce(e.failure_summary, 'Maximum attempts reached while lease expired.'),
    failed_at = coalesce(e.failed_at, timezone('utc', now())),
    processing_lease_until = null,
    processing_owner = null,
    updated_at = timezone('utc', now())
  where e.status = 'processing'
    and e.processing_lease_until is not null
    and e.processing_lease_until < timezone('utc', now())
    and e.attempt_count >= e.max_attempts;

  return query
  with candidates as (
    select e.id
    from public.crm_automation_events e
    where e.attempt_count < e.max_attempts
      and (
        (e.status in ('pending', 'retryable')
          and (e.next_attempt_at is null or e.next_attempt_at <= timezone('utc', now())))
        or (e.status = 'processing'
          and e.processing_lease_until is not null
          and e.processing_lease_until < timezone('utc', now()))
      )
      and e.status not in ('completed', 'cancelled', 'suppressed', 'failed')
    order by coalesce(e.next_attempt_at, e.created_at) asc
    limit v_limit
    for update skip locked
  ),
  updated as (
    update public.crm_automation_events e
    set
      status = 'processing',
      processing_owner = trim(p_worker_id),
      processing_lease_until = timezone('utc', now()) + v_lease,
      attempt_count = e.attempt_count + 1,
      updated_at = timezone('utc', now())
    from candidates c
    where e.id = c.id
    returning e.*
  )
  select * from updated;
exception
  when others then
    if sqlerrm = 'worker_required' then raise; end if;
    raise exception 'claim_failed' using errcode = 'P0001';
end;
$$;

revoke all on function public.claim_crm_automation_events(integer, text, integer) from public;
revoke all on function public.claim_crm_automation_events(integer, text, integer) from anon, authenticated;
grant execute on function public.claim_crm_automation_events(integer, text, integer) to service_role;

comment on function public.claim_crm_automation_events is
  'Atomically claim automation events. service_role only. Do not hold open during external HTTP.';

-- ---------------------------------------------------------------------------
-- Ops notes (Phase 5B)
-- Rule executions bind to rule_key + rule_version at first process time.
-- Deploying a new rule version must NOT auto-replay completed events.
-- Retention: keep events/executions/alerts ≥ 90 days; summaries ≥ 400 days.
-- Rollback/disable: set CRM_NOTIFICATION_DELIVERY_MODE=disabled (or unset);
--   revoke cron; do not delete business/history rows. Drop additive objects only if needed.
-- Preflight: if unique(idempotency_key) conflicts on existing dirty data, fail migration
--   safely after investigating — do not silently delete/coerce.
-- ---------------------------------------------------------------------------
