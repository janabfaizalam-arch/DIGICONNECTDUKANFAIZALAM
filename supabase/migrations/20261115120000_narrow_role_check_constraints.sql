-- Narrow the role CHECK constraints to the values actually in use.
--
-- `profiles.role` and `users.role` each admit six values:
--
--   super_admin, admin, staff, customer, agent, agency_partner
--
-- Two of them — `super_admin` and `staff` — are promoted to full `admin` by
-- `public.current_app_role()` below, and by the matching alias sets in
-- `src/lib/auth.ts` and `src/lib/crm/permissions-core.ts`. So the column can
-- hold a value that silently confers administrator rights under a name that
-- does not say "admin".
--
-- A production audit on 2026-11-15 (docs/HRMS_PHASE0A_ROLE_DISTRIBUTION.md)
-- counted every distinct value in both columns and in `app_metadata`:
--
--   profiles  (457 rows): customer 407, agency_partner 47, agent 2, admin 1
--   users     (460 rows): customer 410, agency_partner 47, agent 2, admin 1
--   app_metadata (482):   absent 469, agency_partner 10, customer 3
--
-- Neither `super_admin` nor `staff` appears anywhere, so removing them from
-- the constraints takes nothing away from anybody. No row changes. No role
-- resolution changes. This migration only stops a value nobody uses from
-- being writable in future.
--
-- `employee` is deliberately NOT added here. The alias sets still map
-- `employee` to `admin`, so admitting it now would make a promoting value
-- storable — the opposite of the intent. It is added in the same change that
-- removes the aliases, not before.
--
-- Concurrency: both tables are locked ACCESS EXCLUSIVE before the counts are
-- taken, so no session can insert a `staff` row between the check and the
-- constraint. The `add constraint` would in any case validate every existing
-- row under its own ACCESS EXCLUSIVE lock and fail if one violated — the
-- explicit lock is what makes the error message below trustworthy rather than
-- a race. Migrations run in a transaction, so a failure here rolls the whole
-- file back and leaves the old constraints in place.

do $$
declare
  has_profiles boolean;
  has_users boolean;
  bad_profiles bigint := 0;
  bad_users bigint := 0;
  retired constant text[] := array['super_admin', 'staff'];
  keep constant text[] := array['admin', 'agency_partner', 'agent', 'customer'];
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) into has_profiles;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) into has_users;

  if not has_profiles and not has_users then
    raise notice 'narrow_role_check_constraints: neither table present, nothing to do';
    return;
  end if;

  -- Hold the tables still for the rest of this transaction, so the counts
  -- below cannot go stale before the constraints are replaced.
  if has_profiles then
    execute 'lock table public.profiles in access exclusive mode';
  end if;
  if has_users then
    execute 'lock table public.users in access exclusive mode';
  end if;

  if has_profiles then
    execute format(
      'select count(*) from public.profiles where lower(role) = any($1)'
    ) into bad_profiles using retired;
  end if;

  if has_users then
    execute format(
      'select count(*) from public.users where lower(role) = any($1)'
    ) into bad_users using retired;
  end if;

  -- Refuse loudly rather than dropping a constraint we then cannot re-add, or
  -- worse, leaving a row stranded outside any constraint. If this fires, the
  -- rows must be resolved deliberately — a `staff` row is an administrator by
  -- another name and deciding its real role is not this migration's call.
  if bad_profiles > 0 or bad_users > 0 then
    raise exception using
      errcode = 'check_violation',
      message = format(
        'narrow_role_check_constraints: %s profiles row(s) and %s users row(s) still carry a retired role (%s)',
        bad_profiles, bad_users, array_to_string(retired, ', ')
      ),
      hint = 'Each such row is promoted to admin by current_app_role(). Decide its real role and update it, then re-run this migration.';
  end if;

  if has_profiles then
    alter table public.profiles drop constraint if exists profiles_role_check;
    execute format(
      'alter table public.profiles add constraint profiles_role_check check (role = any (%L))',
      keep
    );
  end if;

  if has_users then
    alter table public.users drop constraint if exists users_role_check;
    execute format(
      'alter table public.users add constraint users_role_check check (role = any (%L))',
      keep
    );
  end if;

  raise notice 'narrow_role_check_constraints: role constraints narrowed to %', array_to_string(keep, ', ');
end
$$;

comment on constraint profiles_role_check on public.profiles is
  'Roles actually in use. super_admin and staff were removed on 2026-11-15: both promoted to admin via current_app_role() and neither had a single row. employee is added only when those aliases are removed.';

comment on constraint users_role_check on public.users is
  'Roles actually in use. super_admin and staff were removed on 2026-11-15: both promoted to admin via current_app_role() and neither had a single row. employee is added only when those aliases are removed.';
