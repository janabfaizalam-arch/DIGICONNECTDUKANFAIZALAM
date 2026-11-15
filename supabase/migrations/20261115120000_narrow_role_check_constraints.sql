-- Narrow the role CHECK constraints to the values actually in use.
--
-- `profiles.role` and `users.role` each admit six values:
--
--   super_admin, admin, staff, customer, agent, agency_partner
--
-- Two of them — `super_admin` and `staff` — are promoted to full `admin` by
-- `public.current_app_role()`, and by the matching alias sets in
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
--
-- FAIL CLOSED
--
-- This migration drops two constraints. Dropping a constraint that is not the
-- one you think it is, on a schema that is not the one you think it is, is how
-- a column ends up protected by nothing at all. So every assumption is checked
-- first and an unexpected answer aborts rather than proceeds:
--
--   * both tables exist
--   * both `role` columns exist, are `text`, and are NOT NULL
--   * both CHECK constraints exist under their expected names
--   * each admits exactly the six values this migration expects to replace
--
-- The constraint check reads the value set out of the rendered definition and
-- compares it as a set, so it does not depend on how a given PostgreSQL
-- version chooses to print `ARRAY[...]` versus `'{...}'::text[]`.
--
-- One state is explicitly *not* a failure: a constraint already carrying the
-- four target values is this migration having run before. That table is left
-- alone with a notice, so a re-run is a no-op rather than an error.
--
-- Everything that must not change between the check and the swap — the
-- columns, the constraints, the row counts — is verified while holding the
-- lock, not before taking it.
--
--
-- OPERATIONAL SAFETY
--
-- This migration takes ACCESS EXCLUSIVE on `profiles` and `users`. Those are
-- the two tables every authenticated request reads to resolve a role, so a
-- lock held here blocks the whole site, and a lock *waited for* here queues
-- every reader behind us.
--
-- Three bounds, all transaction-local so nothing leaks into the session that
-- runs the rest of the migrations:
--
--   lock_timeout       3s   — give up rather than queue behind a long
--                             transaction. Postgres queues conflicting lock
--                             requests in order, so waiting on ACCESS
--                             EXCLUSIVE stalls every later reader too; failing
--                             fast is strictly kinder than waiting.
--   statement_timeout  30s  — caps the whole block. Deliberately well above
--                             lock_timeout so a contended lock fails with the
--                             clearer lock error rather than being cut off
--                             first. The work itself is two constraint
--                             validations over ~460 rows each.
--   idle_in_transaction_session_timeout 15s
--                           — if the runner dies mid-migration, the backend
--                             releases the locks instead of holding the site
--                             down until someone notices.
--
-- Every failure path rolls the transaction back and leaves the original
-- six-value constraints and every row exactly as they were.

do $$
declare
  retired constant text[] := array['super_admin', 'staff'];
  expect_before constant text[] := array['admin', 'agency_partner', 'agent', 'customer', 'staff', 'super_admin'];
  keep constant text[] := array['admin', 'agency_partner', 'agent', 'customer'];
  note constant text :=
    'Roles actually in use. super_admin and staff were removed on 2026-11-15: both promoted to admin via current_app_role() and neither had a single row. employee is added only when those aliases are removed.';

  -- Words that belong to the SQL of a rendered CHECK, not to its value set.
  noise constant text[] := array['role', 'any', 'array', 'check', 'text', 'character', 'varying'];

  tbl text;
  con text;
  definition text;
  found_values text[];
  skip_table boolean;
  to_narrow text[] := array[]::text[];
  bad_profiles bigint := 0;
  bad_users bigint := 0;
  col_type text;
  col_nullable text;
begin
  -- Transaction-local: reverts when this transaction ends, whether it commits
  -- or rolls back, so the migration runner's connection is unaffected
  -- afterwards. `true` is the is_local flag — the set_config equivalent of
  -- SET LOCAL, which works here whether or not the caller opened an explicit
  -- transaction block. Set first, so even the precondition reads are bounded.
  perform set_config('lock_timeout', '3s', true);
  perform set_config('statement_timeout', '30s', true);
  perform set_config('idle_in_transaction_session_timeout', '15s', true);

  -- ── Precondition 1: both tables exist ────────────────────────────────────
  foreach tbl in array array['profiles', 'users'] loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) then
      raise exception using
        errcode = 'undefined_table',
        message = format('narrow_role_check_constraints: public.%I does not exist', tbl),
        hint = 'This migration expects both public.profiles and public.users. Nothing was changed.';
    end if;
  end loop;

  -- ── Take the locks before verifying anything that could change ───────────
  begin
    execute 'lock table public.profiles in access exclusive mode';
    execute 'lock table public.users in access exclusive mode';
  exception
    when lock_not_available then
      raise exception using
        errcode = 'lock_not_available',
        message = 'narrow_role_check_constraints: could not lock public.profiles / public.users within 3s',
        hint = 'Another transaction holds a conflicting lock. Nothing was changed. Re-run when the database is quiet, or find the blocker in pg_stat_activity.';
  end;

  foreach tbl in array array['profiles', 'users'] loop
    con := tbl || '_role_check';
    skip_table := false;

    -- ── Precondition 2: the role column is text NOT NULL ───────────────────
    col_type := null;
    col_nullable := null;

    select data_type, is_nullable into col_type, col_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = tbl and column_name = 'role';

    if col_type is null then
      raise exception using
        errcode = 'undefined_column',
        message = format('narrow_role_check_constraints: public.%I has no "role" column', tbl),
        hint = 'Nothing was changed.';
    end if;

    if col_type is distinct from 'text' then
      raise exception using
        errcode = 'datatype_mismatch',
        message = format(
          'narrow_role_check_constraints: public.%I.role is %s, expected text',
          tbl, col_type
        ),
        hint = 'The constraint this migration replaces is written for a text column. Nothing was changed.';
    end if;

    if col_nullable <> 'NO' then
      raise exception using
        errcode = 'datatype_mismatch',
        message = format('narrow_role_check_constraints: public.%I.role is nullable, expected NOT NULL', tbl),
        hint = 'A nullable role column would let a row escape the constraint entirely. Nothing was changed.';
    end if;

    -- ── Precondition 3: the expected CHECK constraint is there ─────────────
    select pg_get_constraintdef(c.oid) into definition
    from pg_constraint c
    where c.conrelid = format('public.%I', tbl)::regclass
      and c.conname = con
      and c.contype = 'c';

    if definition is null then
      raise exception using
        errcode = 'undefined_object',
        message = format(
          'narrow_role_check_constraints: no CHECK constraint named %I on public.%I',
          con, tbl
        ),
        hint = format(
          'Expected the constraint this migration replaces. Present CHECK constraints: %s. It may have been renamed or already dropped — resolve deliberately. Nothing was changed.',
          coalesce((
            select string_agg(c2.conname, ', ' order by c2.conname)
            from pg_constraint c2
            where c2.conrelid = format('public.%I', tbl)::regclass and c2.contype = 'c'
          ), '(none)')
        );
    end if;

    -- The value set, read out of the rendered definition so this does not
    -- depend on whether the server prints ARRAY['a'::text, ...] or
    -- '{a,b}'::text[]. Both render the values as bare words once the SQL
    -- vocabulary is removed.
    select array_agg(distinct w order by w) into found_values
    from regexp_matches(lower(definition), '[a-z_]{3,}', 'g') as m(parts)
    cross join lateral unnest(parts) as w
    where w <> all (noise);

    if found_values @> keep and keep @> found_values then
      -- Already the target set: this migration has run before.
      raise notice 'narrow_role_check_constraints: public.% already narrowed, leaving it alone', tbl;
      skip_table := true;
    elsif not (found_values @> expect_before and expect_before @> found_values) then
      raise exception using
        errcode = 'invalid_table_definition',
        message = format(
          'narrow_role_check_constraints: %I on public.%I admits {%s}, expected {%s}',
          con, tbl, array_to_string(found_values, ', '), array_to_string(expect_before, ', ')
        ),
        hint = 'The constraint is not the one this migration was written to replace. Someone has changed it. Resolve deliberately. Nothing was changed.';
    end if;

    if not skip_table then
      to_narrow := to_narrow || tbl;
    end if;
  end loop;

  if cardinality(to_narrow) = 0 then
    raise notice 'narrow_role_check_constraints: both constraints already narrowed, nothing to do';
    return;
  end if;

  -- ── Precondition 4: no row still carries a retired role ──────────────────
  -- Counted under the lock, so it cannot go stale before the swap below.
  -- Refuse loudly rather than dropping a constraint we then cannot re-add, or
  -- worse, leaving a row stranded outside any constraint. A `staff` row is an
  -- administrator by another name and deciding its real role is not this
  -- migration's call.
  execute 'select count(*) from public.profiles where lower(role) = any($1)'
    into bad_profiles using retired;
  execute 'select count(*) from public.users where lower(role) = any($1)'
    into bad_users using retired;

  if bad_profiles > 0 or bad_users > 0 then
    raise exception using
      errcode = 'check_violation',
      message = format(
        'narrow_role_check_constraints: %s profiles row(s) and %s users row(s) still carry a retired role (%s)',
        bad_profiles, bad_users, array_to_string(retired, ', ')
      ),
      hint = 'Each such row is promoted to admin by current_app_role(). Decide its real role and update it, then re-run this migration.';
  end if;

  -- ── Swap ─────────────────────────────────────────────────────────────────
  foreach tbl in array to_narrow loop
    con := tbl || '_role_check';
    execute format('alter table public.%I drop constraint %I', tbl, con);
    execute format(
      'alter table public.%I add constraint %I check (role = any (%L))',
      tbl, con, keep
    );
    execute format('comment on constraint %I on public.%I is %L', con, tbl, note);
  end loop;

  raise notice 'narrow_role_check_constraints: narrowed % to %',
    array_to_string(to_narrow, ', '), array_to_string(keep, ', ');
end
$$;
