-- Customer signup identity hardening.
-- Prevents new duplicate customer email/mobile records without deleting existing data.

create extension if not exists pgcrypto;

alter table public.customer_profiles add column if not exists user_id uuid;
alter table public.customers add column if not exists pincode text default '';
alter table public.customers add column if not exists state text default '';

update public.customer_profiles
set user_id = id
where user_id is null;

create or replace function public.normalize_customer_mobile(value text)
returns text
language sql
immutable
as $$
  select nullif(right(regexp_replace(coalesce(value, ''), '\D', '', 'g'), 10), '');
$$;

create or replace function public.normalize_customer_email(value text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(coalesce(value, ''))), '');
$$;

create or replace function public.prevent_duplicate_customer_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_email text := public.normalize_customer_email(new.email);
  new_mobile text := public.normalize_customer_mobile(new.mobile);
  new_user_id uuid := coalesce(new.user_id, new.id);
  new_customer_id uuid := new.id;
begin
  if tg_table_name = 'profiles' and coalesce(new.role::text, 'customer') <> 'customer' then
    return new;
  end if;

  if new_email is not null then
    if exists (
      select 1 from public.profiles p
      where coalesce(p.role::text, 'customer') = 'customer'
        and p.id is distinct from new_user_id
        and public.normalize_customer_email(p.email) = new_email
    ) or exists (
      select 1 from public.customer_profiles cp
      where coalesce(cp.user_id, cp.id) is distinct from new_user_id
        and public.normalize_customer_email(cp.email) = new_email
    ) or exists (
      select 1 from public.customers c
      where c.id is distinct from new_customer_id
        and coalesce(c.user_id, '00000000-0000-0000-0000-000000000000'::uuid) is distinct from new_user_id
        and public.normalize_customer_email(c.email) = new_email
    ) then
      raise exception 'Customer already exists with this email/mobile number.';
    end if;
  end if;

  if new_mobile is not null then
    if exists (
      select 1 from public.profiles p
      where coalesce(p.role::text, 'customer') = 'customer'
        and p.id is distinct from new_user_id
        and public.normalize_customer_mobile(p.mobile) = new_mobile
    ) or exists (
      select 1 from public.customer_profiles cp
      where coalesce(cp.user_id, cp.id) is distinct from new_user_id
        and public.normalize_customer_mobile(cp.mobile) = new_mobile
    ) or exists (
      select 1 from public.customers c
      where c.id is distinct from new_customer_id
        and coalesce(c.user_id, '00000000-0000-0000-0000-000000000000'::uuid) is distinct from new_user_id
        and public.normalize_customer_mobile(c.mobile) = new_mobile
    ) then
      raise exception 'Customer already exists with this email/mobile number.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_customer_identity_profiles on public.profiles;
create trigger prevent_duplicate_customer_identity_profiles
before insert or update of email, mobile, role on public.profiles
for each row
execute function public.prevent_duplicate_customer_identity();

drop trigger if exists prevent_duplicate_customer_identity_customer_profiles on public.customer_profiles;
create trigger prevent_duplicate_customer_identity_customer_profiles
before insert or update of email, mobile, user_id on public.customer_profiles
for each row
execute function public.prevent_duplicate_customer_identity();

drop trigger if exists prevent_duplicate_customer_identity_customers on public.customers;
create trigger prevent_duplicate_customer_identity_customers
before insert or update of email, mobile, user_id on public.customers
for each row
execute function public.prevent_duplicate_customer_identity();

create index if not exists profiles_customer_email_lookup_idx
  on public.profiles(public.normalize_customer_email(email))
  where coalesce(role::text, 'customer') = 'customer' and public.normalize_customer_email(email) is not null;

create index if not exists profiles_customer_mobile_lookup_idx
  on public.profiles(public.normalize_customer_mobile(mobile))
  where coalesce(role::text, 'customer') = 'customer' and public.normalize_customer_mobile(mobile) is not null;

create index if not exists customers_email_lookup_idx
  on public.customers(public.normalize_customer_email(email))
  where public.normalize_customer_email(email) is not null;

create index if not exists customers_mobile_lookup_idx
  on public.customers(public.normalize_customer_mobile(mobile))
  where public.normalize_customer_mobile(mobile) is not null;

create index if not exists customer_profiles_email_lookup_idx
  on public.customer_profiles(public.normalize_customer_email(email))
  where public.normalize_customer_email(email) is not null;

create index if not exists customer_profiles_mobile_lookup_idx
  on public.customer_profiles(public.normalize_customer_mobile(mobile))
  where public.normalize_customer_mobile(mobile) is not null;

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where coalesce(role::text, 'customer') = 'customer'
      and public.normalize_customer_email(email) is not null
    group by public.normalize_customer_email(email)
    having count(*) > 1
  ) then
    create unique index if not exists profiles_customer_email_unique_idx
      on public.profiles(public.normalize_customer_email(email))
      where coalesce(role::text, 'customer') = 'customer' and public.normalize_customer_email(email) is not null;
  end if;

  if not exists (
    select 1
    from public.profiles
    where coalesce(role::text, 'customer') = 'customer'
      and public.normalize_customer_mobile(mobile) is not null
    group by public.normalize_customer_mobile(mobile)
    having count(*) > 1
  ) then
    create unique index if not exists profiles_customer_mobile_unique_idx
      on public.profiles(public.normalize_customer_mobile(mobile))
      where coalesce(role::text, 'customer') = 'customer' and public.normalize_customer_mobile(mobile) is not null;
  end if;

  if not exists (
    select 1
    from public.customers
    where public.normalize_customer_email(email) is not null
    group by public.normalize_customer_email(email)
    having count(*) > 1
  ) then
    create unique index if not exists customers_email_unique_idx
      on public.customers(public.normalize_customer_email(email))
      where public.normalize_customer_email(email) is not null;
  end if;

  if not exists (
    select 1
    from public.customers
    where public.normalize_customer_mobile(mobile) is not null
    group by public.normalize_customer_mobile(mobile)
    having count(*) > 1
  ) then
    create unique index if not exists customers_mobile_unique_idx
      on public.customers(public.normalize_customer_mobile(mobile))
      where public.normalize_customer_mobile(mobile) is not null;
  end if;

  if not exists (
    select 1
    from public.customer_profiles
    where public.normalize_customer_email(email) is not null
    group by public.normalize_customer_email(email)
    having count(*) > 1
  ) then
    create unique index if not exists customer_profiles_email_unique_idx
      on public.customer_profiles(public.normalize_customer_email(email))
      where public.normalize_customer_email(email) is not null;
  end if;

  if not exists (
    select 1
    from public.customer_profiles
    where public.normalize_customer_mobile(mobile) is not null
    group by public.normalize_customer_mobile(mobile)
    having count(*) > 1
  ) then
    create unique index if not exists customer_profiles_mobile_unique_idx
      on public.customer_profiles(public.normalize_customer_mobile(mobile))
      where public.normalize_customer_mobile(mobile) is not null;
  end if;
end $$;
