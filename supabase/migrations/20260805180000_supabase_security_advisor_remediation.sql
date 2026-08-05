-- =============================================================================
-- Supabase Security Advisor remediation (forward-only, local authoring only)
-- Timestamp: 20260805180000 (after 20260805170000_crm_automation_foundation)
--
-- DO NOT APPLY TO PRODUCTION until a verified backup/recovery gate exists.
-- This migration is additive/forward-only. No data deletion, truncation,
-- table/column drops, role deletion, or customer/auth metadata rewrites.
--
-- Addresses (from Security Advisor screenshot + migration history):
--   1) Critical: offline_invoices RLS reading editable JWT user_metadata.role
--   2) Critical/WARN: SECURITY DEFINER views exposing diagnostics/aggregates
--   3) WARN (perf): Auth RLS initialization-plan on flagged tables
--
-- Requires: PostgreSQL 15+ (Supabase default) for ALTER VIEW ... security_invoker
--
-- Rollback / disable (emergency):
--   - Prefer fix profiles.role / users.role over restoring user_metadata trust
--   - Re-create prior offline_invoices policy from 20260518193000 only as temporary mitigation
--   - ALTER VIEW ... SET (security_invoker = false) only if a known break occurs
--   - Prefer leave grants revoked; do not re-grant anon/authenticated on diagnostics
--
-- Security Advisor recheck after apply: Dashboard → Database → Security Advisor → Rerun.
-- Do not claim resolved until Advisor clear + isolation tests pass.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Preflight — stop if expected objects/policies differ materially
-- -----------------------------------------------------------------------------
do $$
declare
  v_pol record;
  v_def text;
  v_expr text;
  v_check text;
  v_policy text;
  v_table text;
  v_needle text;
begin
  if to_regclass('public.offline_invoices') is null then
    raise exception 'preflight_failed: public.offline_invoices missing';
  end if;

  select pol.polname,
         pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
         pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
    into v_pol
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'offline_invoices'
    and pol.polname = 'Admins manage offline invoices';

  if not found then
    raise exception 'preflight_failed: expected policy "Admins manage offline invoices" on offline_invoices not found — production may differ; abort';
  end if;

  -- Accept legacy (user_metadata / is_admin_role) OR already-remediated (is_admin_from_db) forms.
  -- Abort on any other unexpected definition so DROP POLICY does not silently replace unknowns.
  v_expr := coalesce(v_pol.using_expr, '');
  if v_expr not like '%user_metadata%'
     and v_expr not like '%is_admin_role%'
     and v_expr not like '%is_admin_from_db%' then
    raise exception 'preflight_failed: offline_invoices policy expression unexpected: %', v_expr;
  end if;

  foreach v_def in array array[
    'crm_application_payment_diagnostics',
    'admin_crm_application_facts',
    'admin_crm_payment_facts',
    'reward_wallet_diagnostics',
    'admin_crm_diagnostics',
    'agent_legacy_leads_deprecated',
    'admin_wallet_ledger_balances'
  ]
  loop
    if to_regclass(format('public.%I', v_def)) is null then
      raise exception 'preflight_failed: expected view public.% missing', v_def;
    end if;
  end loop;

  if to_regclass('public.agent_services') is null
     or to_regclass('public.agent_service_assignments') is null
     or to_regclass('public.customer_sessions') is null
     or to_regclass('public.customer_login_logs') is null
     or to_regclass('public.applications') is null then
    raise exception 'preflight_failed: one or more flagged RLS tables missing';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'preflight_failed: public.profiles required for canonical admin check';
  end if;

  if to_regclass('public.users') is null then
    raise exception 'preflight_failed: public.users required for canonical admin check';
  end if;

  -- Initplan targets: require named policies exist and still call auth.uid()/auth.jwt()
  -- (or already use scalar subquery form). Fail fast if missing or unexpected.
  for v_table, v_policy, v_needle in
    select * from (values
      ('agent_services', 'Agents read visible agent services', 'auth.uid()'),
      ('agent_service_assignments', 'Agents read own service assignments', 'auth.uid()'),
      ('customer_sessions', 'Allow service role full access to sessions', 'auth.jwt()'),
      ('customer_login_logs', 'Allow service role full access to login_logs', 'auth.jwt()'),
      ('applications', 'Agents read assigned or created applications', 'auth.uid()'),
      ('applications', 'Agents create own applications', 'auth.uid()'),
      ('applications', 'Agents update assigned applications', 'auth.uid()'),
      ('applications', 'Customers read own applications', 'auth.uid()'),
      ('applications', 'Customers create own applications', 'auth.uid()'),
      ('applications', 'Agents read own applications by agent_id', 'auth.uid()')
    ) as t(tbl, pol, needle)
  loop
    select pg_get_expr(pol.polqual, pol.polrelid),
           pg_get_expr(pol.polwithcheck, pol.polrelid)
      into v_expr, v_check
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = v_table
      and pol.polname = v_policy;

    if not found then
      raise exception 'preflight_failed: expected policy "%" on public.% not found — abort (will not invent policy)', v_policy, v_table;
    end if;

    if coalesce(v_expr, '') not like '%' || v_needle || '%'
       and coalesce(v_check, '') not like '%' || v_needle || '%' then
      raise exception 'preflight_failed: policy "%" on public.% missing expected % in USING/WITH CHECK (got using=%; check=%); abort',
        v_policy, v_table, v_needle, v_expr, v_check;
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1) Hardened admin helper — DB role only (no JWT user_metadata / app_metadata)
--
-- Properties (intentional):
--   - STABLE: result constant within a statement for a given auth.uid()
--   - SECURITY DEFINER: evaluate against profiles/users as owner (migration role /
--     postgres), avoiding recursive RLS on profiles when called from RLS policies
--   - search_path = '': no search_path hijack; all objects schema-qualified
--   - Returns boolean only (cannot enumerate profile/user rows)
--   - Missing/null auth.uid(), missing profile/user row, or non-admin role → false
--   - customer / agency_partner / agent roles never match admin|super_admin lists
--   - Does not read auth.jwt(), user_metadata, or app_metadata
--   - EXECUTE granted only to authenticated + service_role (RLS evaluation needs it);
--     PUBLIC/anon revoked. Ordinary clients cannot CREATE OR REPLACE (not owners).
-- -----------------------------------------------------------------------------
create or replace function public.is_admin_from_db()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and lower(coalesce(p.role::text, '')) in ('admin', 'super_admin')
    )
    or exists (
      select 1
      from public.users u
      where u.id = (select auth.uid())
        and lower(coalesce(u.role::text, '')) in ('admin', 'super_admin')
    ),
    false
  );
$$;

comment on function public.is_admin_from_db() is
  'Canonical admin check from profiles/users only. STABLE SECURITY DEFINER, empty search_path. Returns false by default. Does not read JWT user_metadata or app_metadata. Used by offline_invoices RLS remediation. Boolean-only (no row leak).';

revoke all on function public.is_admin_from_db() from public;
revoke all on function public.is_admin_from_db() from anon;
revoke all on function public.is_admin_from_db() from authenticated;
grant execute on function public.is_admin_from_db() to authenticated;
grant execute on function public.is_admin_from_db() to service_role;

-- -----------------------------------------------------------------------------
-- 2) offline_invoices — remove editable user_metadata authorization
-- Intended access (current product): admin only via Next.js admin APIs + service_role.
-- Partners and customers have no offline_invoices portal path.
-- No invoice rows or auth metadata are rewritten by this migration.
-- -----------------------------------------------------------------------------
drop policy if exists "Admins manage offline invoices" on public.offline_invoices;
create policy "Admins manage offline invoices" on public.offline_invoices
  for all
  using (public.is_admin_from_db())
  with check (public.is_admin_from_db());

-- -----------------------------------------------------------------------------
-- 3) Diagnostic / fact views — least privilege
-- App call sites (admin_crm_diagnostics) use getSupabaseAdmin() → service_role.
-- security_invoker=true (PG15+): caller privileges/RLS apply; owner bypass removed
-- for non-privileged callers. Revoke client roles so aggregates stay server-only.
-- Underlying table RLS is not weakened.
-- -----------------------------------------------------------------------------
do $$
declare
  v_view text;
begin
  foreach v_view in array array[
    'crm_application_payment_diagnostics',
    'admin_crm_application_facts',
    'admin_crm_payment_facts',
    'reward_wallet_diagnostics',
    'admin_crm_diagnostics',
    'agent_legacy_leads_deprecated',
    'admin_wallet_ledger_balances'
  ]
  loop
    execute format('alter view public.%I set (security_invoker = true)', v_view);
    execute format('revoke all on table public.%I from public', v_view);
    execute format('revoke all on table public.%I from anon', v_view);
    execute format('revoke all on table public.%I from authenticated', v_view);
    execute format('grant select on table public.%I to service_role', v_view);
  end loop;
end;
$$;

comment on view public.crm_application_payment_diagnostics is
  'Admin/service diagnostics only. security_invoker=true; SELECT revoked from anon/authenticated.';
comment on view public.admin_crm_application_facts is
  'Admin/service application facts. security_invoker=true; SELECT revoked from anon/authenticated.';
comment on view public.admin_crm_payment_facts is
  'Admin/service payment facts. security_invoker=true; SELECT revoked from anon/authenticated.';
comment on view public.reward_wallet_diagnostics is
  'Admin/service wallet diagnostics. security_invoker=true; SELECT revoked from anon/authenticated.';
comment on view public.admin_crm_diagnostics is
  'Admin/service CRM diagnostics. Consumed by getSupabaseAdmin(). security_invoker=true.';
comment on view public.agent_legacy_leads_deprecated is
  'Deprecated legacy leads read surface (PII). Not for client use. security_invoker=true; revoked from clients.';
comment on view public.admin_wallet_ledger_balances is
  'Admin/service wallet ledger aggregates. security_invoker=true; SELECT revoked from anon/authenticated.';

-- -----------------------------------------------------------------------------
-- 4) Auth RLS initplan (performance only) — wrap auth.* in scalar subqueries
-- Semantically equivalent; does not broaden access or change command/role scope.
-- Not security vulnerabilities unless expressions themselves were wrong.
-- Preflight above verified policy names + auth.* presence before DROP/CREATE.
-- -----------------------------------------------------------------------------

-- agent_services (SELECT only — unchanged command)
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
          and asa.agent_id = (select auth.uid())
      )
    )
  );

-- agent_service_assignments (SELECT only)
drop policy if exists "Agents read own service assignments" on public.agent_service_assignments;
create policy "Agents read own service assignments" on public.agent_service_assignments
  for select using (agent_id = (select auth.uid()));

-- customer_sessions / customer_login_logs (FOR ALL USING — WITH CHECK omitted = USING, same as source)
drop policy if exists "Allow service role full access to sessions" on public.customer_sessions;
create policy "Allow service role full access to sessions" on public.customer_sessions
  for all using (((select auth.jwt()) ->> 'role') = 'service_role');

drop policy if exists "Allow service role full access to login_logs" on public.customer_login_logs;
create policy "Allow service role full access to login_logs" on public.customer_login_logs
  for all using (((select auth.jwt()) ->> 'role') = 'service_role');

-- applications — preserve predicates; only wrap auth.uid()
drop policy if exists "Agents read assigned or created applications" on public.applications;
create policy "Agents read assigned or created applications" on public.applications
  for select using (
    public.is_active_approved_agent() and (
      (select auth.uid()) = created_by_agent_id
      or (select auth.uid()) = agent_id
      or (select auth.uid()) = assigned_agent_id
      or exists (
        select 1 from public.assignments x
        where x.application_id = id
          and x.agent_id = (select auth.uid())
          and x.active
      )
    )
  );

drop policy if exists "Agents create own applications" on public.applications;
create policy "Agents create own applications" on public.applications
  for insert with check (
    public.is_active_approved_agent()
    and (
      created_by_agent_id = (select auth.uid())
      or created_by = (select auth.uid())
      or agent_id = (select auth.uid())
    )
  );

drop policy if exists "Agents update assigned applications" on public.applications;
create policy "Agents update assigned applications" on public.applications
  for update using (
    public.is_active_approved_agent() and (
      (select auth.uid()) = assigned_agent_id
      or exists (
        select 1 from public.assignments x
        where x.application_id = id
          and x.agent_id = (select auth.uid())
          and x.active
      )
    )
  ) with check (
    public.is_active_approved_agent() and (
      (select auth.uid()) = assigned_agent_id
      or exists (
        select 1 from public.assignments x
        where x.application_id = id
          and x.agent_id = (select auth.uid())
          and x.active
      )
    )
  );

drop policy if exists "Customers read own applications" on public.applications;
create policy "Customers read own applications" on public.applications
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Customers create own applications" on public.applications;
create policy "Customers create own applications" on public.applications
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Agents read own applications by agent_id" on public.applications;
create policy "Agents read own applications by agent_id" on public.applications
  for select using (
    (select auth.uid()) = agent_id
    or (select auth.uid()) = created_by
    or (select auth.uid()) = assigned_agent_id
  );

-- -----------------------------------------------------------------------------
-- 5) Post-migration verification queries (run manually after apply)
-- -----------------------------------------------------------------------------
-- -- offline_invoices policy: expect is_admin_from_db(); no user_metadata
-- select pol.polname, pg_get_expr(pol.polqual, pol.polrelid), pg_get_expr(pol.polwithcheck, pol.polrelid)
-- from pg_policy pol
-- join pg_class c on c.oid = pol.polrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relname = 'offline_invoices';
--
-- -- views: expect security_invoker=true
-- select c.relname, c.reloptions
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relname in (
--   'crm_application_payment_diagnostics','admin_crm_application_facts',
--   'admin_crm_payment_facts','reward_wallet_diagnostics','admin_crm_diagnostics',
--   'agent_legacy_leads_deprecated','admin_wallet_ledger_balances'
-- );
--
-- -- effective grants: expect zero anon/authenticated/PUBLIC rows
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in (
--     'crm_application_payment_diagnostics','admin_crm_application_facts',
--     'admin_crm_payment_facts','admin_crm_diagnostics','reward_wallet_diagnostics',
--     'agent_legacy_leads_deprecated','admin_wallet_ledger_balances'
--   )
--   and grantee in ('anon','authenticated','PUBLIC');
--
-- -- service_role SELECT present
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'admin_crm_diagnostics'
--   and grantee = 'service_role';
--
-- Security Advisor recheck: Dashboard → Database → Security Advisor → Rerun.
