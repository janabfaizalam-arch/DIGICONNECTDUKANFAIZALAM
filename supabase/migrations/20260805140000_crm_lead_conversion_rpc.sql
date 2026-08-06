-- Phase 4 completion: transactional lead conversion (additive, hardened)
-- Ordering: after 20260805130000_crm_leads_canonical_ops.sql
--
-- PRODUCTION SCHEMA (verified) — align with walk-in / M7 auth-linkage model:
--   customers: id, mobile, name, email, address, ... (NO full_name, user_id,
--              created_by, assigned_agent_id, source)
--   Proven Auth link: customers.id == auth.users.id when Auth row exists
--   applications.customer_id is authoritative ownership
--   applications.user_id nullable; set ONLY when proven Auth link exists
--
-- Conversion does NOT create Supabase Auth users or temporary PINs.
-- New customers get gen_random_uuid(); applications.user_id stays null until
-- a later Auth/PIN linkage exists.
--
-- DEFENSE IN DEPTH
-- App routes MUST authenticate the actor and capability-check before calling.
-- This RPC ALSO validates actor role/ownership/customer/assignee from canonical
-- tables because EXECUTE is granted to service_role (bypasses RLS).
--
-- PRIVILEGE BOUNDARY
-- SECURITY DEFINER, search_path '', schema-qualified objects.
-- EXECUTE revoked from PUBLIC/anon/authenticated; granted to service_role only.
--
-- MOBILE UNIQUENESS DEPENDENCY
-- Uses public.normalize_customer_mobile (same expression as walk-in / lead ingest).
-- Preflight + expression unique index added below. If dirty duplicates exist,
-- migration FAILS with an operator message (does not silently skip).
-- Does NOT drop existing raw unique indexes (customers_mobile_key /
-- customers_mobile_unique_auth_idx). Does NOT rewrite mobile data.
--
-- ROLLBACK / MITIGATION
-- revoke + drop function; drop lead_convert_idempotency / convert_idempotency_key;
-- Do NOT delete converted applications/customers/leads business rows.

-- ---------------------------------------------------------------------------
-- Mobile uniqueness preflight (normalized)
-- ---------------------------------------------------------------------------
do $$
declare
  v_dupes integer;
  v_has_raw_unique boolean;
begin
  if to_regclass('public.customers') is null then
    raise exception 'customers table missing — cannot apply lead conversion migration';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'name'
  ) then
    raise exception 'PRECONDITION FAILED: public.customers.name missing (production display name column)';
  end if;

  select count(*)::integer into v_dupes
  from (
    select public.normalize_customer_mobile(c.mobile) as nm
    from public.customers c
    where public.normalize_customer_mobile(c.mobile) is not null
    group by 1
    having count(*) > 1
  ) d;

  if v_dupes > 0 then
    raise exception
      'PRECONDITION FAILED: % duplicate normalized customer mobile group(s). Resolve with audit query: select public.normalize_customer_mobile(mobile) nm, count(*), array_agg(id) from public.customers where public.normalize_customer_mobile(mobile) is not null group by 1 having count(*) > 1; then re-run migration.',
      v_dupes;
  end if;

  select exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname in ('customers_mobile_unique_auth_idx', 'customers_mobile_key')
  ) into v_has_raw_unique;

  if not v_has_raw_unique then
    begin
      execute $sql$
        create unique index customers_mobile_unique_auth_idx
          on public.customers (mobile)
          where mobile is not null and btrim(mobile) <> ''
      $sql$;
    exception when unique_violation then
      raise exception
        'PRECONDITION FAILED: cannot create customers_mobile_unique_auth_idx due to duplicate raw mobile values. Audit and dedupe before conversion migration.';
    end;
  end if;

  begin
    execute $sql$
      create unique index if not exists customers_mobile_normalized_unique_idx
        on public.customers (public.normalize_customer_mobile(mobile))
        where public.normalize_customer_mobile(mobile) is not null
    $sql$;
  exception when unique_violation then
    raise exception
      'PRECONDITION FAILED: cannot create customers_mobile_normalized_unique_idx. Dedupe normalized mobiles first.';
  end;
end
$$;

comment on index public.customers_mobile_normalized_unique_idx is
  'Guarantees one customer per normalized 10-digit mobile for walk-in and lead conversion. Expression matches public.normalize_customer_mobile.';

alter table public.leads
  add column if not exists convert_idempotency_key text;

create unique index if not exists leads_convert_idempotency_key_uidx
  on public.leads (convert_idempotency_key)
  where convert_idempotency_key is not null;

create table if not exists public.lead_convert_idempotency (
  key text primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.lead_convert_idempotency enable row level security;
drop policy if exists "Admins select lead convert idempotency" on public.lead_convert_idempotency;
create policy "Admins select lead convert idempotency" on public.lead_convert_idempotency
  for select using (public.is_admin_role());

-- ---------------------------------------------------------------------------
-- Actor helpers (invoked only from this SECURITY DEFINER RPC; not granted broadly)
-- ---------------------------------------------------------------------------
create or replace function public.crm_actor_is_admin(p_actor_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and lower(coalesce(p.role::text, '')) in
        ('admin', 'super_admin', 'staff', 'team', 'employee', 'processor')
  )
  or exists (
    select 1
    from public.users u
    where u.id = p_actor_id
      and lower(coalesce(u.role::text, '')) in
        ('admin', 'super_admin', 'staff', 'team', 'employee', 'processor')
  );
$$;

create or replace function public.crm_actor_is_active_partner(p_actor_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.agency_partners ap
    where ap.user_id = p_actor_id
      and ap.status = 'active'
      and ap.kyc_status = 'approved'
  );
$$;

-- Eligible CRM assignees: active admin/staff profile OR active approved partner.
-- Customers and arbitrary auth.users are NOT eligible. Service-skill matching deferred.
create or replace function public.crm_user_is_eligible_assignee(p_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p_user_id is not null
    and (
      public.crm_actor_is_admin(p_user_id)
      or public.crm_actor_is_active_partner(p_user_id)
    )
    and not exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and lower(coalesce(p.role::text, '')) = 'customer'
        and not public.crm_actor_is_admin(p_user_id)
        and not public.crm_actor_is_active_partner(p_user_id)
    );
$$;

-- Partner/customer scope without invented customers.created_by / assigned_agent_id:
-- prior application ownership (created_by / assigned_agent_id / agent_id).
create or replace function public.crm_actor_can_access_customer(p_actor_id uuid, p_customer_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p_actor_id is not null
    and p_customer_id is not null
    and (
      public.crm_actor_is_admin(p_actor_id)
      or exists (
        select 1
        from public.applications a
        where a.customer_id = p_customer_id
          and (
            a.created_by = p_actor_id
            or a.assigned_agent_id = p_actor_id
            or a.agent_id = p_actor_id
          )
      )
    );
$$;

revoke all on function public.crm_actor_is_admin(uuid) from public, anon, authenticated;
revoke all on function public.crm_actor_is_active_partner(uuid) from public, anon, authenticated;
revoke all on function public.crm_user_is_eligible_assignee(uuid) from public, anon, authenticated;
revoke all on function public.crm_actor_can_access_customer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_actor_is_admin(uuid) to service_role;
grant execute on function public.crm_actor_is_active_partner(uuid) to service_role;
grant execute on function public.crm_user_is_eligible_assignee(uuid) to service_role;
grant execute on function public.crm_actor_can_access_customer(uuid, uuid) to service_role;

-- Drop any prior overload of the convert RPC (unapplied / stale local drafts only).
drop function if exists public.convert_lead_to_application_core(
  uuid, text, uuid, uuid, boolean, uuid, text, text, numeric, uuid, text
);

create or replace function public.convert_lead_to_application_core(
  p_actor_id uuid,
  p_client_idempotency_key text,
  p_lead_id uuid,
  p_existing_customer_id uuid,
  p_allow_create_customer boolean,
  p_agent_service_id uuid,
  p_service_slug text,
  p_service_name text,
  p_amount numeric,
  p_assignee_id uuid,
  p_assignment_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation text := 'lead_convert';
  v_scoped_key text;
  v_client_key text;
  v_existing jsonb;
  v_lead record;
  v_customer_id uuid;
  v_user_id uuid;
  v_mobile text;
  v_name text;
  v_email text;
  v_address text;
  v_referral text;
  v_app_id uuid;
  v_work_id text;
  v_day text := to_char((timezone('utc', now())), 'YYYYMMDD');
  v_status text := 'submitted';
  v_amount numeric(12,2);
  v_service_slug text;
  v_service_name text;
  v_response jsonb;
  v_assignee uuid;
  v_assignment_reason text;
  v_is_admin boolean;
  v_is_partner boolean;
  v_lead_owned boolean;
begin
  -- AuthZ in RPC (defense in depth) — do not trust TS-derived role/ownership/price.
  if p_actor_id is null then
    raise exception 'actor_required' using errcode = 'P0001';
  end if;

  v_is_admin := public.crm_actor_is_admin(p_actor_id);
  v_is_partner := public.crm_actor_is_active_partner(p_actor_id);

  if not v_is_admin and not v_is_partner then
    raise exception 'actor_forbidden' using errcode = 'P0001';
  end if;

  v_client_key := trim(coalesce(p_client_idempotency_key, ''));
  if char_length(v_client_key) < 8 then
    raise exception 'idempotency_key_required' using errcode = 'P0001';
  end if;

  -- Lock order: lead-scoped advisory lock THEN row FOR UPDATE (avoids deadlocks;
  -- lead conversion state is the ultimate uniqueness guard across clientKeys).
  perform pg_advisory_xact_lock(hashtext(v_operation || ':' || p_lead_id::text));

  select *
  into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    -- Do not reveal whether the lead exists under another partner.
    raise exception 'lead_forbidden' using errcode = 'P0001';
  end if;

  v_lead_owned :=
    v_is_admin
    or v_lead.agent_id = p_actor_id
    or v_lead.assigned_to = p_actor_id
    or v_lead.partner_id = p_actor_id;

  if not v_lead_owned then
    raise exception 'lead_forbidden' using errcode = 'P0001';
  end if;

  -- Already converted: return prior result only to authorized actor (above).
  if v_lead.converted_application_id is not null then
    return jsonb_build_object(
      'ok', true,
      'deduped', true,
      'leadId', v_lead.id,
      'customerId', v_lead.converted_customer_id,
      'applicationId', v_lead.converted_application_id,
      'alreadyConverted', true
    );
  end if;

  if coalesce(v_lead.pipeline_stage, '') in ('won', 'lost')
     or lower(coalesce(v_lead.status, '')) in ('converted', 'closed', 'lost', 'cancelled', 'rejected') then
    raise exception 'lead_terminal_state' using errcode = 'P0001';
  end if;

  -- Client idempotency (same actor+lead+key) — after lead lock so failed txs leave no record.
  v_scoped_key := v_operation || ':' || p_actor_id::text || ':' || p_lead_id::text || ':' || v_client_key;
  select response into v_existing
  from public.lead_convert_idempotency
  where key = v_scoped_key;
  if found then
    return v_existing || jsonb_build_object('deduped', true);
  end if;

  v_mobile := public.normalize_customer_mobile(coalesce(v_lead.mobile, ''));
  if v_mobile is null or v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'lead_mobile_invalid' using errcode = 'P0001';
  end if;
  v_name := coalesce(nullif(trim(v_lead.name), ''), 'Customer');
  v_email := nullif(trim(coalesce(v_lead.email, '')), '');
  if v_email is not null and lower(v_email) like '%@customer.rnos.internal' then
    v_email := null;
  end if;
  v_address := nullif(trim(coalesce(v_lead.address, '')), '');
  v_referral := nullif(trim(coalesce(v_lead.referral_code, '')), '');

  if p_existing_customer_id is not null then
    select c.id
    into v_customer_id
    from public.customers c
    where c.id = p_existing_customer_id;

    if not found then
      raise exception 'customer_forbidden' using errcode = 'P0001';
    end if;

    if not public.crm_actor_can_access_customer(p_actor_id, v_customer_id) then
      raise exception 'customer_forbidden' using errcode = 'P0001';
    end if;

    -- Proven Auth linkage only: customers.id == auth.users.id. Never actor id.
    select u.id
      into v_user_id
    from auth.users u
    where u.id = v_customer_id;
    -- leaves null when customer has no Auth row (PIN-only / unlinked).
  else
    if exists (
      select 1
      from public.customers c
      where public.normalize_customer_mobile(c.mobile) = v_mobile
    ) then
      -- Never silent-link. App must pass authorized existingCustomerId.
      -- Do not reveal which partner owns the match.
      raise exception 'customer_match_required' using errcode = 'P0001';
    end if;

    if not coalesce(p_allow_create_customer, false) then
      raise exception 'customer_match_required' using errcode = 'P0001';
    end if;

    begin
      -- Production customers columns only. Display via name. No invented ownership/source columns.
      -- Auth is not created here; applications.user_id stays null for new customers.
      insert into public.customers (id, name, mobile, email, address, referral_code, is_active)
      values (
        gen_random_uuid(),
        v_name,
        v_mobile,
        v_email,
        v_address,
        v_referral,
        true
      )
      returning id into v_customer_id;
    exception when unique_violation then
      -- Race: another convert created the customer. Require explicit authorized link.
      raise exception 'customer_match_required' using errcode = 'P0001';
    end;

    v_user_id := null;
  end if;

  -- Never allow actor to become the application Auth owner.
  if v_user_id is not null and v_user_id = p_actor_id then
    raise exception 'customer_auth_user_mismatch' using errcode = 'P0001';
  end if;

  -- Service + price: authoritative from agent_services when id provided. Ignore client fee.
  v_service_slug := coalesce(nullif(trim(p_service_slug), ''), 'general');
  v_service_name := coalesce(nullif(trim(p_service_name), ''), coalesce(v_lead.service, 'Service'));
  v_amount := 0;

  if p_agent_service_id is not null then
    select s.slug, s.title, s.customer_fee
    into v_service_slug, v_service_name, v_amount
    from public.agent_services s
    where s.id = p_agent_service_id and coalesce(s.is_active, false) = true;
    if not found then
      raise exception 'inactive_service' using errcode = 'P0001';
    end if;
  else
    -- No trusted catalog row — refuse client-supplied price (p_amount ignored).
    v_amount := 0;
  end if;

  -- Assignee eligibility (not arbitrary auth.users). Partners cannot assign across scope.
  if v_is_partner then
    v_assignee := p_actor_id;
    v_assignment_reason := 'partner_lead_conversion';
  elsif p_assignee_id is null then
    v_assignee := null;
    v_assignment_reason := 'unassigned_queue';
  else
    if not public.crm_user_is_eligible_assignee(p_assignee_id) then
      raise exception 'assignee_ineligible' using errcode = 'P0001';
    end if;
    v_assignee := p_assignee_id;
    v_assignment_reason := coalesce(nullif(trim(p_assignment_reason), ''), 'lead_conversion');
  end if;

  insert into public.applications (
    customer_id,
    user_id,
    created_by,
    assigned_agent_id,
    agent_id,
    customer_mobile,
    customer_mobile_normalized,
    customer_email,
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
    ownership_status,
    form_data,
    service_snapshot
  ) values (
    v_customer_id,
    v_user_id,
    p_actor_id,
    v_assignee,
    v_assignee,
    v_mobile,
    v_mobile,
    v_email,
    null,
    p_agent_service_id,
    v_service_slug,
    v_service_name,
    v_amount,
    v_amount,
    v_amount,
    'lead_conversion',
    'offline',
    v_status,
    'pending',
    case when v_is_partner then 'agency_partner' else 'admin' end,
    'owned',
    jsonb_build_object(
      'name', v_name,
      'mobile', v_mobile,
      'sourceLeadId', v_lead.id,
      'convert_idempotency_key', v_scoped_key,
      'lead_source', coalesce(v_lead.lead_source, v_lead.source),
      'partner_id', v_lead.partner_id,
      'referral_code', v_referral
    ),
    jsonb_build_object(
      'agent_service_id', p_agent_service_id,
      'slug', v_service_slug,
      'title', v_service_name,
      'customer_fee', v_amount,
      'source', 'lead_conversion'
    )
  )
  returning id into v_app_id;

  v_work_id := 'W-' || v_day || '-' || upper(substr(replace(v_app_id::text, '-', ''), 1, 6));
  begin
    update public.applications set work_id = v_work_id where id = v_app_id;
  exception when undefined_column then
    null;
  end;

  insert into public.status_logs (application_id, changed_by, old_status, new_status, note)
  values (v_app_id, p_actor_id, null, v_status, 'Created from lead conversion.');

  begin
    insert into public.application_status_logs (application_id, actor_id, actor_role, old_status, new_status, note, metadata)
    values (
      v_app_id,
      p_actor_id,
      case when v_is_partner then 'agency_partner' else 'admin' end,
      null,
      v_status,
      'Created from lead conversion.',
      jsonb_build_object('leadId', v_lead.id)
    );
  exception when undefined_table then
    null;
  end;

  insert into public.application_assignment_history (
    application_id, assigned_user_id, assigned_role, assignment_reason, assigned_by, assigned_by_system, metadata
  ) values (
    v_app_id,
    v_assignee,
    case when v_assignee is null then 'unassigned' else 'assignee' end,
    v_assignment_reason,
    p_actor_id,
    v_assignee is null,
    jsonb_build_object('leadId', v_lead.id)
  );

  -- pipeline_stage = won is terminal converted success; legacy status = converted.
  update public.leads
  set
    status = 'converted',
    pipeline_stage = 'won',
    converted_application_id = v_app_id,
    converted_customer_id = v_customer_id,
    converted_at = timezone('utc', now()),
    convert_idempotency_key = v_scoped_key,
    last_activity_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_lead.id;

  insert into public.lead_stage_history (lead_id, from_stage, to_stage, changed_by, note, metadata)
  values (
    v_lead.id,
    coalesce(v_lead.pipeline_stage, 'new'),
    'won',
    p_actor_id,
    'Lead converted to application',
    jsonb_build_object('applicationId', v_app_id, 'customerId', v_customer_id)
  );

  insert into public.lead_activities (lead_id, activity_type, body, actor_id, actor_role, metadata)
  values (
    v_lead.id,
    'converted',
    'Lead converted to application',
    p_actor_id,
    case when v_is_partner then 'agency_partner' else 'admin' end,
    jsonb_build_object('applicationId', v_app_id, 'customerId', v_customer_id)
  );

  v_response := jsonb_build_object(
    'ok', true,
    'deduped', false,
    'leadId', v_lead.id,
    'customerId', v_customer_id,
    'applicationId', v_app_id,
    'workId', v_work_id,
    'amount', v_amount,
    'serviceName', v_service_name,
    'assigneeId', v_assignee,
    'assignmentReason', v_assignment_reason
  );

  insert into public.lead_convert_idempotency (key, lead_id, actor_id, response)
  values (v_scoped_key, v_lead.id, p_actor_id, v_response);

  return v_response;
exception
  when others then
    if sqlerrm in (
      'actor_required',
      'actor_forbidden',
      'idempotency_key_required',
      'lead_forbidden',
      'lead_terminal_state',
      'lead_mobile_invalid',
      'customer_forbidden',
      'customer_match_required',
      'customer_auth_user_mismatch',
      'inactive_service',
      'assignee_ineligible',
      'assignee_not_found'
    ) then
      raise;
    end if;
    raise exception 'lead_convert_failed' using errcode = 'P0001';
end;
$$;

revoke all on function public.convert_lead_to_application_core(
  uuid, text, uuid, uuid, boolean, uuid, text, text, numeric, uuid, text
) from public;

revoke all on function public.convert_lead_to_application_core(
  uuid, text, uuid, uuid, boolean, uuid, text, text, numeric, uuid, text
) from anon, authenticated;

grant execute on function public.convert_lead_to_application_core(
  uuid, text, uuid, uuid, boolean, uuid, text, text, numeric, uuid, text
) to service_role;

comment on function public.convert_lead_to_application_core is
  'Atomic lead→customer/application conversion. service_role only. Uses customers.name for display. No customer Auth FK column. Optional Auth linkage via customers.id=auth.users.id. Partner customer scope via applications ownership. No WhatsApp inside.';
