-- Phase 3: Walk-in application foundation (hardened SECURITY DEFINER)
-- Additive only. Does not rewrite existing application rows.
--
-- PRIVILEGE BOUNDARY
-- - create_walk_in_application_core is SECURITY DEFINER with search_path = ''.
-- - All relations are schema-qualified (public.*).
-- - EXECUTE is revoked from PUBLIC, anon, authenticated.
-- - EXECUTE is granted only to service_role (Next.js getSupabaseAdmin).
-- - Application layer MUST authenticate the admin and enforce CRM capabilities
--   before calling this RPC. The RPC re-validates customer + active service from
--   the database and does not trust caller-supplied fee/title/ownership blobs.
-- - Idempotency keys are actor-scoped: another user cannot replay/discover another
--   actor's response by guessing a client UUID alone.
--
-- PRE-DEPLOY
-- - Confirm public.applications has customer_id, assigned_agent_id, source_channel.
-- - Confirm public.agent_services exists with is_active + customer_fee.
-- - Confirm public.is_admin_role() exists (three-role hardening).
-- - Production customers use `name` (not full_name) and have no customers.user_id.
-- - Auth linkage for applications.user_id is customers.id == auth.users.id when present.
-- - Do NOT apply to production without explicit approval.
--
-- ROLLBACK / MITIGATION (non-destructive to business rows)
-- 1. revoke execute on function ... from service_role;
-- 2. drop function public.create_walk_in_application_core(...);
-- 3. drop trigger + function for assignment history append-only guard;
-- 4. drop table if exists public.application_assignment_history;
-- 5. drop table if exists public.crm_idempotency_keys;
-- 6. drop index if exists public.applications_unassigned_queue_idx;
-- Do not delete applications created while the feature was live.

-- ---------------------------------------------------------------------------
-- Idempotency store (actor-scoped client keys)
-- ---------------------------------------------------------------------------
create table if not exists public.crm_idempotency_keys (
  key text primary key,
  operation text not null,
  actor_id uuid references auth.users(id) on delete set null,
  client_key text not null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint crm_idempotency_keys_client_key_len check (char_length(client_key) >= 8)
);

-- Additive column if an earlier draft of this migration already created the table.
alter table public.crm_idempotency_keys
  add column if not exists client_key text;

update public.crm_idempotency_keys
set client_key = coalesce(nullif(client_key, ''), key)
where client_key is null or client_key = '';

do $$
begin
  alter table public.crm_idempotency_keys
    alter column client_key set not null;
exception
  when others then
    null;
end $$;

create unique index if not exists crm_idempotency_keys_actor_op_client_uidx
  on public.crm_idempotency_keys (actor_id, operation, client_key);

create index if not exists crm_idempotency_keys_created_idx
  on public.crm_idempotency_keys (created_at desc);

alter table public.crm_idempotency_keys enable row level security;

drop policy if exists "Admins manage crm idempotency keys" on public.crm_idempotency_keys;
drop policy if exists "Admins select crm idempotency keys" on public.crm_idempotency_keys;
create policy "Admins select crm idempotency keys" on public.crm_idempotency_keys
  for select using (public.is_admin_role());
-- No insert/update/delete policies for authenticated roles: only service_role / definer writes.

-- ---------------------------------------------------------------------------
-- Append-only assignment history
-- ---------------------------------------------------------------------------
create table if not exists public.application_assignment_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  assigned_user_id uuid references auth.users(id) on delete set null,
  assigned_role text,
  assignment_reason text not null,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_by_system boolean not null default false,
  previous_assigned_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists application_assignment_history_app_idx
  on public.application_assignment_history (application_id, created_at desc);

create index if not exists application_assignment_history_assignee_idx
  on public.application_assignment_history (assigned_user_id, created_at desc)
  where assigned_user_id is not null;

alter table public.application_assignment_history enable row level security;

drop policy if exists "Admins manage assignment history" on public.application_assignment_history;
drop policy if exists "Admins select assignment history" on public.application_assignment_history;
drop policy if exists "Admins insert assignment history" on public.application_assignment_history;
create policy "Admins select assignment history" on public.application_assignment_history
  for select using (public.is_admin_role());
create policy "Admins insert assignment history" on public.application_assignment_history
  for insert with check (public.is_admin_role());
-- Intentionally no UPDATE/DELETE policies for admin/partner roles.

drop policy if exists "Partners read own assignment history" on public.application_assignment_history;
create policy "Partners read own assignment history" on public.application_assignment_history
  for select
  using (
    exists (
      select 1
      from public.applications a
      where a.id = application_assignment_history.application_id
        and (
          a.agency_partner_id = auth.uid()
          or a.agent_id = auth.uid()
          or a.assigned_agent_id = auth.uid()
          or a.created_by = auth.uid()
        )
    )
  );

create or replace function public.forbid_application_assignment_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'assignment_history_append_only'
    using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_forbid_assignment_history_mutation on public.application_assignment_history;
create trigger trg_forbid_assignment_history_mutation
  before update or delete on public.application_assignment_history
  for each row
  execute function public.forbid_application_assignment_history_mutation();

revoke all on function public.forbid_application_assignment_history_mutation() from public;
revoke all on function public.forbid_application_assignment_history_mutation() from anon, authenticated;

-- Unassigned admin queue helper index (additive).
create index if not exists applications_unassigned_queue_idx
  on public.applications (created_at desc)
  where assigned_agent_id is null
    and coalesce(status, '') <> 'completed';

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER create core
-- ---------------------------------------------------------------------------
-- Drop prior signatures from earlier Phase 3 drafts if present.
drop function if exists public.create_walk_in_application_core(
  uuid, text, uuid, uuid, jsonb, numeric, numeric, boolean, text, text, text, uuid, text, boolean, jsonb, jsonb, text, text, text
);
drop function if exists public.create_walk_in_application_core(
  uuid, text, uuid, uuid, text, uuid, text, boolean, numeric, text, text
);
drop function if exists public.create_walk_in_application_core(
  uuid, text, uuid, uuid, text, uuid, text, boolean, numeric, text, text, uuid
);

create or replace function public.create_walk_in_application_core(
  p_actor_id uuid,
  p_client_idempotency_key text,
  p_customer_id uuid,
  p_agent_service_id uuid,
  p_notes text,
  p_assignee_id uuid,
  p_assignment_reason text,
  p_allow_price_override boolean,
  p_override_amount numeric,
  p_override_reason text,
  p_referral_source text,
  p_customer_auth_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation text := 'walk_in_application_create';
  v_scoped_key text;
  v_client_key text;
  v_existing jsonb;
  v_customer record;
  v_service record;
  v_assignee_ok boolean := false;
  v_amount numeric(12,2);
  v_original numeric(12,2);
  v_overridden boolean := false;
  v_override_reason text;
  v_app_id uuid;
  v_work_id text;
  v_status text := 'submitted';
  v_payment_status text := 'pending';
  v_day text := to_char((timezone('utc', now())), 'YYYYMMDD');
  v_mobile text;
  v_name text;
  v_email text;
  v_user_id uuid;
  v_assignment_reason text;
  v_assigned_by_system boolean;
  v_response jsonb;
  v_form_data jsonb;
  v_service_snapshot jsonb;
begin
  if p_actor_id is null then
    raise exception 'actor_required' using errcode = 'P0001';
  end if;

  v_client_key := trim(coalesce(p_client_idempotency_key, ''));
  if char_length(v_client_key) < 8 or char_length(v_client_key) > 120 then
    raise exception 'idempotency_key_required' using errcode = 'P0001';
  end if;

  -- Actor-scoped key prevents cross-user replay of another actor's idempotency token.
  v_scoped_key := v_operation || ':' || p_actor_id::text || ':' || v_client_key;

  if p_customer_id is null then
    raise exception 'customer_required' using errcode = 'P0001';
  end if;
  if p_agent_service_id is null then
    raise exception 'service_required' using errcode = 'P0001';
  end if;

  -- Serialize concurrent submits for the same actor+client key (same transaction).
  perform pg_advisory_xact_lock(hashtext(v_scoped_key));

  select k.response into v_existing
  from public.crm_idempotency_keys k
  where k.key = v_scoped_key;

  if found then
    return v_existing || jsonb_build_object('deduped', true);
  end if;

  -- Re-load customer from DB (production schema: name, no customers.user_id).
  -- Do not trust caller identity fields / browser-supplied auth ids.
  select
    c.id,
    coalesce(nullif(trim(c.name), ''), 'Customer') as customer_name,
    c.mobile,
    c.email
  into v_customer
  from public.customers c
  where c.id = p_customer_id;

  if not found then
    raise exception 'customer_not_found' using errcode = 'P0001';
  end if;

  v_mobile := right(regexp_replace(coalesce(v_customer.mobile, ''), '\D', '', 'g'), 10);
  if v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'customer_mobile_invalid' using errcode = 'P0001';
  end if;

  v_name := coalesce(v_customer.customer_name, 'Customer');
  v_email := nullif(trim(coalesce(v_customer.email, '')), '');
  if v_email is not null and lower(v_email) like '%@customer.rnos.internal' then
    v_email := null;
  end if;

  -- Canonical Auth linkage (production):
  -- - PIN login uses customers.id (customer_sessions), not customers.user_id.
  -- - applications.user_id is nullable FK → auth.users; set only when proven.
  -- - Proven link: customers.id == auth.users.id (same UUID).
  -- - Optional p_customer_auth_user_id is server-resolved only and must equal customer.id.
  if p_customer_auth_user_id is not null then
    if not exists (select 1 from auth.users u where u.id = p_customer_auth_user_id) then
      raise exception 'customer_auth_user_not_found' using errcode = 'P0001';
    end if;
    if p_customer_auth_user_id is distinct from v_customer.id then
      raise exception 'customer_auth_user_mismatch' using errcode = 'P0001';
    end if;
    if p_customer_auth_user_id = p_actor_id then
      raise exception 'customer_auth_user_mismatch' using errcode = 'P0001';
    end if;
    v_user_id := p_customer_auth_user_id;
  else
    select u.id
      into v_user_id
    from auth.users u
    where u.id = v_customer.id;
    -- leaves null when customer has no Auth row (PIN-only / unlinked).
  end if;

  -- Authoritative active service + fee from catalogue (do not trust caller price/title).
  select
    s.id,
    s.service_id,
    s.slug,
    s.title,
    s.category,
    s.customer_fee,
    s.required_documents,
    s.processing_time,
    s.is_active
  into v_service
  from public.agent_services s
  where s.id = p_agent_service_id;

  if not found then
    raise exception 'service_not_found' using errcode = 'P0001';
  end if;
  if coalesce(v_service.is_active, false) is not true then
    raise exception 'inactive_service' using errcode = 'P0001';
  end if;

  v_original := coalesce(v_service.customer_fee, 0)::numeric(12,2);
  v_amount := v_original;
  v_override_reason := null;

  if coalesce(p_allow_price_override, false)
     and p_override_amount is not null
     and p_override_amount is distinct from v_original then
    if p_override_amount < 0 then
      raise exception 'invalid_override_amount' using errcode = 'P0001';
    end if;
    if nullif(trim(coalesce(p_override_reason, '')), '') is null then
      raise exception 'override_reason_required' using errcode = 'P0001';
    end if;
    v_amount := p_override_amount::numeric(12,2);
    v_overridden := true;
    v_override_reason := left(trim(p_override_reason), 240);
  end if;

  -- Assignment: validate assignee exists when provided; never invent an assignee.
  if p_assignee_id is not null then
    select exists(
      select 1 from auth.users u where u.id = p_assignee_id
    ) into v_assignee_ok;
    if not v_assignee_ok then
      raise exception 'assignee_not_found' using errcode = 'P0001';
    end if;
    v_assignment_reason := coalesce(nullif(trim(p_assignment_reason), ''), 'explicit_admin_selection');
    v_assigned_by_system := false;
  else
    v_assignment_reason := 'unassigned_queue';
    v_assigned_by_system := true;
  end if;

  v_form_data := jsonb_build_object(
    'name', v_name,
    'mobile', v_mobile,
    'email', coalesce(v_email, ''),
    'message', left(coalesce(p_notes, ''), 1000),
    'referral_source', nullif(left(trim(coalesce(p_referral_source, '')), 120), ''),
    'walk_in', true,
    'idempotency_key', v_scoped_key,
    'price_override', case when v_overridden then jsonb_build_object(
      'original', v_original,
      'amount', v_amount,
      'reason', v_override_reason,
      'actor_id', p_actor_id
    ) else null end
  );

  v_service_snapshot := jsonb_build_object(
    'agent_service_id', v_service.id,
    'service_id', v_service.service_id,
    'slug', v_service.slug,
    'title', v_service.title,
    'category', v_service.category,
    'customer_fee', v_amount,
    'original_customer_fee', v_original,
    'price_overridden', v_overridden,
    'override_reason', v_override_reason,
    'required_documents', v_service.required_documents,
    'processing_time', v_service.processing_time,
    'source', 'walk_in'
  );

  insert into public.applications (
    customer_id,
    user_id,
    created_by,
    assigned_agent_id,
    agent_id,
    customer_email,
    customer_mobile,
    customer_mobile_normalized,
    service_id,
    agent_service_id,
    service_slug,
    service_name,
    amount,
    total_amount,
    customer_fee_snapshot,
    source_channel,
    source,
    status,
    payment_status,
    submitted_by_role,
    form_data,
    service_snapshot,
    ownership_status
  ) values (
    v_customer.id,
    v_user_id,
    p_actor_id,
    p_assignee_id,
    p_assignee_id,
    v_email,
    v_mobile,
    v_mobile,
    v_service.service_id,
    v_service.id,
    v_service.slug,
    v_service.title,
    v_amount,
    v_amount,
    v_amount,
    'walk_in',
    'offline',
    v_status,
    v_payment_status,
    'admin',
    v_form_data,
    v_service_snapshot,
    'owned'
  )
  returning id into v_app_id;

  v_work_id := 'W-' || v_day || '-' || upper(substr(replace(v_app_id::text, '-', ''), 1, 6));

  begin
    update public.applications set work_id = v_work_id where id = v_app_id;
  exception
    when undefined_column then
      null;
  end;

  insert into public.status_logs (application_id, changed_by, old_status, new_status, note)
  values (
    v_app_id,
    p_actor_id,
    null,
    v_status,
    coalesce(nullif(trim(p_notes), ''), 'Walk-in application created.')
  );

  begin
    insert into public.application_status_logs (
      application_id, actor_id, actor_role, old_status, new_status, note, metadata
    ) values (
      v_app_id,
      p_actor_id,
      'admin',
      null,
      v_status,
      coalesce(nullif(trim(p_notes), ''), 'Walk-in application created.'),
      jsonb_build_object('source', 'walk_in', 'idempotency_key', v_scoped_key)
    );
  exception
    when undefined_table then
      null;
  end;

  insert into public.application_assignment_history (
    application_id,
    assigned_user_id,
    assigned_role,
    assignment_reason,
    assigned_by,
    assigned_by_system,
    previous_assigned_user_id,
    metadata
  ) values (
    v_app_id,
    p_assignee_id,
    case when p_assignee_id is null then 'unassigned' else 'assignee' end,
    v_assignment_reason,
    p_actor_id,
    v_assigned_by_system,
    null,
    jsonb_build_object('source', 'walk_in')
  );

  if p_assignee_id is not null then
    begin
      insert into public.assignments (application_id, agent_id, assigned_by, active, note)
      values (
        v_app_id,
        p_assignee_id,
        p_actor_id,
        true,
        v_assignment_reason
      )
      on conflict (application_id, agent_id) do update
        set active = true,
            assigned_by = excluded.assigned_by,
            note = excluded.note;
    exception
      when undefined_table then
        null;
    end;
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'applicationId', v_app_id,
    'workId', v_work_id,
    'status', v_status,
    'paymentStatus', v_payment_status,
    'amount', v_amount,
    'assigneeId', p_assignee_id,
    'assignmentReason', v_assignment_reason,
    'customerId', v_customer.id,
    'serviceSlug', v_service.slug,
    'serviceName', v_service.title,
    'customerName', v_name,
    'mobileMasked', substr(v_mobile, 1, 2) || '******' || substr(v_mobile, 9, 2),
    'deduped', false
  );

  -- Same transaction as application insert (function body = one transaction).
  insert into public.crm_idempotency_keys (key, operation, actor_id, client_key, response)
  values (v_scoped_key, v_operation, p_actor_id, v_client_key, v_response);

  return v_response;
exception
  when others then
    -- Map to stable codes only — do not return SQLERRM / row payloads to clients.
    if sqlerrm in (
      'actor_required',
      'idempotency_key_required',
      'customer_required',
      'service_required',
      'customer_not_found',
      'customer_mobile_invalid',
      'customer_auth_user_not_found',
      'customer_auth_user_mismatch',
      'service_not_found',
      'inactive_service',
      'invalid_override_amount',
      'override_reason_required',
      'assignee_not_found',
      'assignment_history_append_only'
    ) then
      raise;
    end if;
    raise exception 'walk_in_application_failed' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_walk_in_application_core(
  uuid, text, uuid, uuid, text, uuid, text, boolean, numeric, text, text, uuid
) from public;

revoke all on function public.create_walk_in_application_core(
  uuid, text, uuid, uuid, text, uuid, text, boolean, numeric, text, text, uuid
) from anon, authenticated;

grant execute on function public.create_walk_in_application_core(
  uuid, text, uuid, uuid, text, uuid, text, boolean, numeric, text, text, uuid
) to service_role;

comment on function public.create_walk_in_application_core is
  'Walk-in atomic application create. SECURITY DEFINER, search_path empty, service_role execute only. Uses customers.name. Sets applications.user_id only when customers.id is a proven auth.users id (or verified p_customer_auth_user_id matching customer.id). Actor-scoped idempotency. No WhatsApp inside this function.';
