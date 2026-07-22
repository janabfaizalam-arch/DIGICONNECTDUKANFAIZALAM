-- Primary admin: Faiz Alam (Auth email janabfaizalam@gmail.com).
-- Demote dgcntdkn@gmail.com to customer without deleting CRM data.
--
-- SAFETY (production):
--   * Promote ONLY via auth.users.email join (profiles.id = auth.users.id).
--   * NEVER promote by mobile number (shared mobile with Digi Partner is expected).
--   * NEVER overwrite a profile that has agency_partners.user_id linkage.
--   * Idempotent: re-run is a no-op when already correct.
--
-- Preconditions (run read-only preflight before apply):
--   * auth.users row exists for janabfaizalam@gmail.com
--   * That Auth user is NOT linked in agency_partners
--   * Shared mobile across admin + Digi Partner profiles is OK and must not trigger promotion

-- 1) Demote former admin by Auth identity (handles profile-email drift).
--    Business rule: DEMOTED_ADMIN_EMAILS / dgcntdkn@gmail.com → customer.
--    NEVER demote by profiles.email alone (may incorrectly equal primary-admin email).
--    NEVER touch primary-admin Auth UUID or any agency_partners-linked profile.
update public.profiles p
set
  role = 'customer',
  email = lower(u.email),
  updated_at = now()
from auth.users u
where u.id = p.id
  and lower(coalesce(u.email, '')) = 'dgcntdkn@gmail.com'
  and not exists (
    select 1
    from auth.users primary_admin
    where primary_admin.id = p.id
      and lower(coalesce(primary_admin.email, '')) = 'janabfaizalam@gmail.com'
  )
  and not exists (
    select 1
    from public.agency_partners ap
    where ap.user_id = p.id
  )
  and (
    lower(coalesce(p.email, '')) is distinct from lower(u.email)
    or lower(coalesce(p.role::text, '')) is distinct from 'customer'
  );

-- 2) Promote exactly the Auth user with primary admin email (exclude Digi Partner memberships)
update public.profiles p
set
  role = 'admin',
  full_name = coalesce(nullif(btrim(p.full_name), ''), 'Faiz Alam'),
  email = 'janabfaizalam@gmail.com',
  active = true,
  is_active = true,
  updated_at = now()
from auth.users u
where u.id = p.id
  and lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com'
  and not exists (
    select 1
    from public.agency_partners ap
    where ap.user_id = p.id
  )
  and lower(coalesce(p.role::text, '')) is distinct from 'agency_partner'
  and lower(coalesce(p.role::text, '')) is distinct from 'agent';

-- 3) Optional phone sync for the same Auth-linked profile only (never by mobile match)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    execute $sql$
      update public.profiles p
      set phone = coalesce(nullif(btrim(p.phone), ''), '7007595931')
      from auth.users u
      where u.id = p.id
        and lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com'
        and not exists (
          select 1 from public.agency_partners ap where ap.user_id = p.id
        )
    $sql$;
  end if;
end
$$;

-- 4) CRM customers row for admin mobile — never touch hashed_pin / auth credentials
do $$
declare
  v_count integer;
  v_has_pin boolean;
begin
  if to_regclass('public.customers') is null then
    return;
  end if;

  select count(*) into v_count
  from public.customers
  where right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 10) = '7007595931';

  if v_count = 1 then
    update public.customers
    set
      mobile = '7007595931',
      name = coalesce(nullif(btrim(name), ''), 'Faiz Alam'),
      email = coalesce(nullif(btrim(email), ''), 'janabfaizalam@gmail.com'),
      is_active = true,
      updated_at = now()
    where right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 10) = '7007595931';
    -- hashed_pin intentionally untouched
  elsif v_count = 0 then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'customers' and column_name = 'hashed_pin'
    ) into v_has_pin;

    begin
      if v_has_pin then
        -- Prefer insert without credentials; skip if NOT NULL hashed_pin blocks it.
        begin
          execute $sql$
            insert into public.customers (mobile, name, email, is_active)
            values ('7007595931', 'Faiz Alam', 'janabfaizalam@gmail.com', true)
          $sql$;
        exception
          when not_null_violation then
            raise notice 'customers insert skipped — hashed_pin required; set PIN via ensure-primary-admin.mjs, not this migration.';
          when others then
            raise notice 'customers insert skipped: %', sqlerrm;
        end;
      else
        insert into public.customers (mobile, name, email, is_active)
        values ('7007595931', 'Faiz Alam', 'janabfaizalam@gmail.com', true);
      end if;
    exception when others then
      raise notice 'customers insert skipped: %', sqlerrm;
    end;
  else
    raise notice 'Multiple customers share mobile 7007595931 — manual merge required; leaving rows intact.';
  end if;
end
$$;

-- 5) Portal users table (if present) — demote/promote by Auth-linked identity only
do $$
begin
  if to_regclass('public.users') is not null then
    update public.users usr
    set
      role = 'customer',
      email = lower(u.email)
    from auth.users u
    where u.id = usr.id
      and lower(coalesce(u.email, '')) = 'dgcntdkn@gmail.com'
      and not exists (
        select 1 from public.agency_partners ap where ap.user_id = usr.id
      )
      and (
        lower(coalesce(usr.email, '')) is distinct from lower(u.email)
        or lower(coalesce(usr.role::text, '')) is distinct from 'customer'
      );

    update public.users usr
    set role = 'admin'
    from auth.users u
    where u.id = usr.id
      and lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com'
      and not exists (
        select 1 from public.agency_partners ap where ap.user_id = usr.id
      )
      and lower(coalesce(usr.role::text, '')) is distinct from 'agency_partner'
      and lower(coalesce(usr.role::text, '')) is distinct from 'agent'
      and lower(coalesce(usr.role::text, '')) is distinct from 'admin';
  end if;
end
$$;

-- 6) Safety notices (non-destructive)
do $$
declare
  v_auth_admin integer;
  v_ap_conflict integer;
  v_shared_mobile integer;
begin
  select count(*) into v_auth_admin
  from auth.users u
  where lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com';

  if v_auth_admin = 0 then
    raise warning 'Primary admin Auth email janabfaizalam@gmail.com not found — profile promotion skipped.';
  elsif v_auth_admin > 1 then
    raise warning 'Multiple auth.users rows for primary admin email — unexpected.';
  end if;

  select count(*) into v_ap_conflict
  from auth.users u
  join public.agency_partners ap on ap.user_id = u.id
  where lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com';

  if v_ap_conflict > 0 then
    raise warning 'Primary admin Auth user is linked to agency_partners — admin promotion excluded by design; review manually.';
  end if;

  select count(*) into v_shared_mobile
  from public.profiles
  where right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 10) = '7007595931';

  if v_shared_mobile > 1 then
    raise notice 'Multiple profiles share mobile 7007595931 (%). Email-only promotion leaves Digi Partner roles intact.', v_shared_mobile;
  end if;
end
$$;
