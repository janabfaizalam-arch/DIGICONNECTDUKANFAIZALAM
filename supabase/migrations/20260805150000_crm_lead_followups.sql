-- Phase 4: auditable lead follow-up lifecycle (additive)
-- Ordering: after 20260805140000_crm_lead_conversion_rpc.sql
--
-- Reuses leads.next_follow_up_at as the current scheduled pointer for queue indexes.
-- Historical rows live in lead_follow_ups (scheduled/completed/cancelled/rescheduled).
-- No reminder scheduler in this phase.
--
-- Partner complete/cancel/reschedule: authorized Next.js routes use service_role
-- (getSupabaseAdmin) after actor + lead-scope checks. Partners do NOT need a
-- direct UPDATE policy; client/authenticated cannot mutate follow-ups via RLS.
-- Immutable lead_* history tables remain append-only for ordinary roles.
--
-- ROLLBACK: drop table lead_follow_ups / policies. Do not delete leads.

create table if not exists public.lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  reason text,
  note text,
  replaces_follow_up_id uuid references public.lead_follow_ups(id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists lead_follow_ups_idempotency_uidx
  on public.lead_follow_ups (idempotency_key)
  where idempotency_key is not null;

create index if not exists lead_follow_ups_lead_scheduled_idx
  on public.lead_follow_ups (lead_id, scheduled_at desc);

create index if not exists lead_follow_ups_status_scheduled_idx
  on public.lead_follow_ups (status, scheduled_at)
  where status = 'scheduled';

create index if not exists lead_follow_ups_assignee_scheduled_idx
  on public.lead_follow_ups (assignee_id, scheduled_at)
  where status = 'scheduled';

alter table public.lead_follow_ups enable row level security;

drop policy if exists "Admins manage lead follow ups" on public.lead_follow_ups;
create policy "Admins manage lead follow ups" on public.lead_follow_ups
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Partners select own lead follow ups" on public.lead_follow_ups;
create policy "Partners select own lead follow ups" on public.lead_follow_ups
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.agent_id = auth.uid()
          or l.assigned_to = auth.uid()
          or l.partner_id = auth.uid()
        )
    )
  );

drop policy if exists "Partners insert own lead follow ups" on public.lead_follow_ups;
create policy "Partners insert own lead follow ups" on public.lead_follow_ups
  for insert with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.agent_id = auth.uid()
          or l.assigned_to = auth.uid()
          or l.partner_id = auth.uid()
        )
    )
  );

comment on table public.lead_follow_ups is
  'Auditable lead follow-up lifecycle. leads.next_follow_up_at mirrors current scheduled row.';
