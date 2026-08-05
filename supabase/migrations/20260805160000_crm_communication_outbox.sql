-- Phase 5A: extend whatsapp_messages as canonical communication outbox (additive)
-- Ordering: after Phase 4 migrations (20260805150000+)
--
-- Reuses public.whatsapp_messages — does NOT create a competing outbox.
-- Legacy notification_queue remains untouched (mock/legacy).
--
-- PRIVILEGE: claim/process RPCs service_role only; search_path ''.
-- ROLLBACK: drop new tables/functions/columns; do not delete message history.
-- Production unchanged until explicitly applied. Cron schedule NOT activated here.
--
-- LEGACY STATUSES WRITTEN BY PRODUCTION-COMPATIBLE CODE (pre-5A):
--   queued | sent | delivered | read | failed
-- (see application-notify.ts / admin ops). New statuses are additive.

-- ---------------------------------------------------------------------------
-- Preflight: fail safely on unknown/null statuses (no silent rewrite)
-- Run the reporting queries in CRM_DATABASE_CHANGES.md on staging first.
-- ---------------------------------------------------------------------------
do $$
declare
  v_unknown integer;
  v_nullish integer;
begin
  select count(*) into v_nullish
  from public.whatsapp_messages
  where status is null or btrim(coalesce(status, '')) = '';

  if v_nullish > 0 then
    raise exception
      'whatsapp_messages_status_preflight_failed: % row(s) have null/blank status. Remediate before apply — see CRM_DATABASE_CHANGES.md Phase 5A preflight. No automatic rewrite.',
      v_nullish
      using errcode = 'P0001';
  end if;

  select count(*) into v_unknown
  from public.whatsapp_messages
  where status not in (
    'queued', 'sent', 'delivered', 'read', 'failed',
    -- allow re-run / partial apply of this migration's vocabulary
    'processing', 'submitted', 'retryable', 'cancelled', 'configuration_required', 'suppressed'
  );

  if v_unknown > 0 then
    raise exception
      'whatsapp_messages_status_preflight_failed: % row(s) have unknown status values outside the approved set. Remediate before apply — see CRM_DATABASE_CHANGES.md. No automatic rewrite or delete.',
      v_unknown
      using errcode = 'P0001';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Expand status vocabulary (keep all legacy values)
-- ---------------------------------------------------------------------------
alter table public.whatsapp_messages
  drop constraint if exists whatsapp_messages_status_check;

alter table public.whatsapp_messages
  add constraint whatsapp_messages_status_check
  check (status in (
    'queued',
    'processing',
    'submitted',
    'sent',
    'delivered',
    'read',
    'retryable',
    'failed',
    'cancelled',
    'configuration_required',
    'suppressed'
  ));

alter table public.whatsapp_messages
  add column if not exists provider text not null default 'aisensy',
  add column if not exists purpose text,
  add column if not exists lead_id uuid references public.leads(id) on delete set null,
  add column if not exists payment_id uuid,
  add column if not exists follow_up_id uuid,
  add column if not exists classification text not null default 'transactional'
    check (classification in ('transactional', 'promotional')),
  add column if not exists consent_basis text,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists provider_status text,
  add column if not exists failure_code text,
  add column if not exists failure_summary text,
  add column if not exists correlation_id text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancel_reason text,
  add column if not exists processing_lease_until timestamptz,
  add column if not exists processing_owner text,
  add column if not exists safe_metadata jsonb not null default '{}'::jsonb;

comment on column public.whatsapp_messages.safe_metadata is
  'Restricted non-secret metadata only. Never store API keys, auth headers, webhook secrets, or full rendered PII dumps.';

comment on column public.whatsapp_messages.provider_status is
  'Raw/safe provider status string. HTTP API accept is typically recorded as outbox status=sent with provider_status=submitted. Delivered/read require webhook correlation.';

-- Claim helpers: non-unique indexes only (no unique on provider_message_id — legacy duplicates possible)
create index if not exists whatsapp_messages_outbox_claim_idx
  on public.whatsapp_messages (status, next_attempt_at, created_at)
  where status in ('queued', 'retryable');

create index if not exists whatsapp_messages_provider_msg_idx
  on public.whatsapp_messages (provider_message_id)
  where provider_message_id is not null;

create index if not exists whatsapp_messages_lead_idx
  on public.whatsapp_messages (lead_id, created_at desc)
  where lead_id is not null;

create index if not exists whatsapp_messages_correlation_idx
  on public.whatsapp_messages (correlation_id)
  where correlation_id is not null;

-- ---------------------------------------------------------------------------
-- Delivery webhook events (idempotent ingest)
-- ---------------------------------------------------------------------------
create table if not exists public.communication_delivery_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'aisensy',
  provider_event_id text,
  provider_message_id text not null,
  outbox_id uuid references public.whatsapp_messages(id) on delete set null,
  raw_status text,
  normalized_status text,
  failure_code text,
  failure_summary text,
  received_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);

create index if not exists communication_delivery_events_msg_idx
  on public.communication_delivery_events (provider_message_id, received_at desc);

alter table public.communication_delivery_events enable row level security;
drop policy if exists "Admins select delivery events" on public.communication_delivery_events;
create policy "Admins select delivery events" on public.communication_delivery_events
  for select using (public.is_admin_role());

-- ---------------------------------------------------------------------------
-- Consent / preferences (unknown promotional = not opted in)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_communication_preferences (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  transactional_whatsapp_allowed boolean not null default true,
  promotional_whatsapp_consent boolean not null default false,
  opt_out_promotional boolean not null default false,
  consent_source text,
  consent_at timestamptz,
  consent_actor_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_communication_preference_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  snapshot jsonb not null,
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.customer_communication_preferences enable row level security;
alter table public.customer_communication_preference_history enable row level security;

drop policy if exists "Admins manage communication preferences" on public.customer_communication_preferences;
create policy "Admins manage communication preferences" on public.customer_communication_preferences
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Admins select preference history" on public.customer_communication_preference_history;
create policy "Admins select preference history" on public.customer_communication_preference_history
  for select using (public.is_admin_role());

-- Preference history is append-only for ordinary roles (service_role inserts from app)
create or replace function public.forbid_communication_preference_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'preference_history_append_only' using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_forbid_communication_preference_history_mutation
  on public.customer_communication_preference_history;
create trigger trg_forbid_communication_preference_history_mutation
  before update or delete on public.customer_communication_preference_history
  for each row execute function public.forbid_communication_preference_history_mutation();

revoke all on function public.forbid_communication_preference_history_mutation() from public;
revoke all on function public.forbid_communication_preference_history_mutation() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomic claim for outbox processor (service_role only)
-- configuration_required is NOT auto-claimed (requires authorized retry / config recovery).
-- ---------------------------------------------------------------------------
create or replace function public.claim_communication_outbox(
  p_batch_size integer,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns setof public.whatsapp_messages
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

  -- Expire stuck processing rows that already hit max attempts (no further claim)
  update public.whatsapp_messages w
  set
    status = 'failed',
    failure_code = coalesce(w.failure_code, 'max_attempts'),
    failure_summary = coalesce(w.failure_summary, 'Maximum attempts reached while lease expired.'),
    failed_at = coalesce(w.failed_at, timezone('utc', now())),
    processing_lease_until = null,
    processing_owner = null,
    updated_at = timezone('utc', now())
  where w.status = 'processing'
    and w.processing_lease_until is not null
    and w.processing_lease_until < timezone('utc', now())
    and w.attempt_count >= w.max_attempts;

  return query
  with candidates as (
    select m.id
    from public.whatsapp_messages m
    where m.attempt_count < m.max_attempts
      and (
        (
          m.status in ('queued', 'retryable')
          and (m.next_attempt_at is null or m.next_attempt_at <= timezone('utc', now()))
        )
        or (
          m.status = 'processing'
          and m.processing_lease_until is not null
          and m.processing_lease_until < timezone('utc', now())
        )
      )
      and m.status not in ('cancelled', 'suppressed', 'delivered', 'read', 'sent', 'failed', 'configuration_required')
    order by coalesce(m.next_attempt_at, m.created_at) asc
    limit v_limit
    for update skip locked
  ),
  updated as (
    update public.whatsapp_messages w
    set
      status = 'processing',
      processing_owner = trim(p_worker_id),
      processing_lease_until = timezone('utc', now()) + v_lease,
      last_attempt_at = timezone('utc', now()),
      attempt_count = w.attempt_count + 1,
      updated_at = timezone('utc', now())
    from candidates c
    where w.id = c.id
    returning w.*
  )
  select * from updated;
exception
  when others then
    if sqlerrm = 'worker_required' then
      raise;
    end if;
    raise exception 'claim_failed' using errcode = 'P0001';
end;
$$;

revoke all on function public.claim_communication_outbox(integer, text, integer) from public;
revoke all on function public.claim_communication_outbox(integer, text, integer) from anon, authenticated;
grant execute on function public.claim_communication_outbox(integer, text, integer) to service_role;

comment on function public.claim_communication_outbox is
  'Atomically claim outbox rows (FOR UPDATE SKIP LOCKED + update). service_role only. HTTP to AiSensy must run AFTER this transaction commits. Finalize updates should require matching processing_owner.';

-- ---------------------------------------------------------------------------
-- Manual ops audit (retry / cancel / explicit resend)
-- Retention guidance: keep >= 90 days; purge older rows via scheduled job when approved.
-- Never store secrets, full message body, or identity documents here.
-- ---------------------------------------------------------------------------
create table if not exists public.communication_ops_audit (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.whatsapp_messages(id) on delete set null,
  action text not null check (action in ('retry', 'cancel', 'explicit_resend')),
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  correlation_id text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists communication_ops_audit_outbox_idx
  on public.communication_ops_audit (outbox_id, created_at desc);

alter table public.communication_ops_audit enable row level security;
drop policy if exists "Admins select communication ops audit" on public.communication_ops_audit;
create policy "Admins select communication ops audit" on public.communication_ops_audit
  for select using (public.is_admin_role());

revoke all on table public.communication_ops_audit from public;
grant select on table public.communication_ops_audit to authenticated;
-- Inserts performed via service_role from Next.js admin APIs only.
