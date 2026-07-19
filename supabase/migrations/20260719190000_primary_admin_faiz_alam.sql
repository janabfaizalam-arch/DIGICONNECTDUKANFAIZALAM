-- Primary admin: Faiz Alam (janabfaizalam@gmail.com / 7007595931)
-- Demote dgcntdkn@gmail.com to customer without deleting CRM data.
-- Idempotent / safe for production.

-- 1) Demote former admin profile(s)
update public.profiles
set
  role = 'customer',
  updated_at = now()
where lower(coalesce(email, '')) = 'dgcntdkn@gmail.com'
  and lower(coalesce(role::text, '')) in ('admin', 'super_admin');

-- 2) Promote / upsert Faiz Alam profile fields when auth user already exists
update public.profiles
set
  role = 'admin',
  full_name = 'Faiz Alam',
  email = 'janabfaizalam@gmail.com',
  mobile = '7007595931',
  active = true,
  is_active = true,
  updated_at = now()
where lower(coalesce(email, '')) = 'janabfaizalam@gmail.com'
   or mobile in ('7007595931', '917007595931', '+917007595931', '07007595931');

-- 3) If a profiles.phone column exists, keep it aligned for Faiz
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    execute $sql$
      update public.profiles
      set phone = '7007595931'
      where lower(coalesce(email, '')) = 'janabfaizalam@gmail.com'
         or mobile in ('7007595931', '917007595931', '+917007595931')
    $sql$;
  end if;
end
$$;

-- 4) Keep a single customers CRM row for the admin mobile (do not create duplicates)
--    Preserve wallet_balance / applications by never deleting the customer row.
do $$
declare
  v_count integer;
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
  elsif v_count = 0 then
    -- Optional CRM row for PIN storage; applications remain untouched
    begin
      insert into public.customers (mobile, name, email, is_active, hashed_pin)
      values (
        '7007595931',
        'Faiz Alam',
        'janabfaizalam@gmail.com',
        true,
        -- placeholder hash; real PIN set via scripts/ensure-primary-admin.mjs PRIMARY_ADMIN_PIN
        '$argon2id$v=19$m=65536,t=3,p=1$cGxhY2Vob2xkZXIxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      );
    exception when others then
      begin
        insert into public.customers (mobile, name, email, is_active)
        values ('7007595931', 'Faiz Alam', 'janabfaizalam@gmail.com', true);
      exception when others then
        raise notice 'customers insert skipped: %', sqlerrm;
      end;
    end;
  else
    raise notice 'Multiple customers share mobile 7007595931 — manual merge required; leaving rows intact.';
  end if;
end
$$;

-- 5) Portal users table (if present)
do $$
begin
  if to_regclass('public.users') is not null then
    update public.users
    set role = 'customer'
    where lower(coalesce(email, '')) = 'dgcntdkn@gmail.com'
      and lower(coalesce(role::text, '')) in ('admin', 'super_admin');

    update public.users
    set role = 'admin'
    where lower(coalesce(email, '')) = 'janabfaizalam@gmail.com';
  end if;
end
$$;
