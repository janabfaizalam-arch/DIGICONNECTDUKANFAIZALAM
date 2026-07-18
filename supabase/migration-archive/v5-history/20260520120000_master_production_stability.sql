-- Master production stability repair for signup, customer identity, and claim flow.
-- Idempotent: safe to run after earlier partial repairs.

drop trigger if exists prevent_duplicate_customer_identity_profiles on public.profiles;
drop trigger if exists prevent_duplicate_customer_identity_customer_profiles on public.customer_profiles;
drop trigger if exists prevent_duplicate_customer_identity_customers on public.customers;

drop trigger if exists prevent_profiles_reward_identity_tamper on public.profiles;
drop trigger if exists prevent_customer_profiles_reward_identity_tamper on public.customer_profiles;

drop function if exists public.prevent_duplicate_customer_identity() cascade;
drop function if exists public.prevent_reward_identity_tamper() cascade;

alter table if exists public.profiles add column if not exists full_name text default '';
alter table if exists public.customers add column if not exists full_name text default '';
alter table if exists public.customer_profiles add column if not exists full_name text;
alter table if exists public.customer_profiles add column if not exists user_id uuid;
alter table if exists public.customers add column if not exists user_id uuid;
alter table if exists public.customers add column if not exists pincode text default '';
alter table if exists public.customers add column if not exists state text default '';

do $$
begin
  if to_regclass('public.profiles') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'name'
    ) then
    update public.profiles
    set full_name = coalesce(nullif(full_name, ''), name)
    where nullif(name, '') is not null;

    alter table public.profiles drop column if exists name;
  end if;

  if to_regclass('public.customers') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'customers' and column_name = 'name'
    ) then
    update public.customers
    set full_name = coalesce(nullif(full_name, ''), name)
    where nullif(name, '') is not null;

    alter table public.customers drop column if exists name;
  end if;

  if to_regclass('public.customer_profiles') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'customer_profiles' and column_name = 'name'
    ) then
    update public.customer_profiles
    set full_name = coalesce(nullif(full_name, ''), name)
    where nullif(name, '') is not null;

    alter table public.customer_profiles drop column if exists name;
  end if;
end $$;

update public.customer_profiles
set user_id = id
where user_id is null;

update public.profiles
set full_name = ''
where full_name is null;

update public.customers
set full_name = ''
where full_name is null;

update public.customers c
set user_id = p.id,
    full_name = coalesce(nullif(c.full_name, ''), nullif(p.full_name, ''), 'Customer'),
    updated_at = now()
from public.profiles p
where c.user_id is null
  and p.role = 'customer'
  and lower(coalesce(c.email, '')) <> ''
  and lower(c.email) = lower(p.email)
  and not exists (
    select 1 from public.customers existing
    where existing.user_id = p.id
  );

update public.customers c
set user_id = p.id,
    full_name = coalesce(nullif(c.full_name, ''), nullif(p.full_name, ''), 'Customer'),
    updated_at = now()
from public.profiles p
where c.user_id is null
  and p.role = 'customer'
  and regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g') <> ''
  and right(regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g'), 10) = right(regexp_replace(coalesce(p.mobile, ''), '\D', '', 'g'), 10)
  and not exists (
    select 1 from public.customers existing
    where existing.user_id = p.id
  );

create index if not exists customers_user_id_lookup_idx on public.customers(user_id) where user_id is not null;
create index if not exists customers_email_lookup_safe_idx on public.customers(lower(email)) where email is not null;
create index if not exists customers_mobile_lookup_safe_idx on public.customers(mobile) where mobile is not null;
create index if not exists customer_profiles_user_id_lookup_idx on public.customer_profiles(user_id) where user_id is not null;

create or replace function public.claim_customer_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_mobile text;
  v_customer_id uuid;
  v_claimed integer := 0;
begin
  if v_user_id is null then
    return 0;
  end if;

  select lower(coalesce(email, '')), right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 10)
    into v_email, v_mobile
  from public.profiles
  where id = v_user_id
    and coalesce(role::text, 'customer') = 'customer';

  if coalesce(v_email, '') = '' or coalesce(v_mobile, '') = '' then
    return 0;
  end if;

  select id into v_customer_id
  from public.customers
  where user_id = v_user_id
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    select id into v_customer_id
    from public.customers
    where user_id is null
      and (
        lower(coalesce(email, '')) = v_email
        or right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 10) = v_mobile
      )
    order by created_at asc
    limit 1;

    if v_customer_id is not null then
      update public.customers
      set user_id = v_user_id,
          updated_at = now()
      where id = v_customer_id;
    end if;
  end if;

  if v_customer_id is null then
    insert into public.customers(user_id, full_name, email, mobile, source)
    select id, coalesce(nullif(full_name, ''), 'Customer'), email, mobile, 'online'
    from public.profiles
    where id = v_user_id
    returning id into v_customer_id;
  end if;

  update public.applications
  set user_id = v_user_id,
      customer_id = v_customer_id,
      updated_at = now()
  where customer_id is null
    and lower(coalesce(customer_email, '')) = v_email
    and right(regexp_replace(coalesce(customer_mobile, ''), '\D', '', 'g'), 10) = v_mobile;

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$$;
