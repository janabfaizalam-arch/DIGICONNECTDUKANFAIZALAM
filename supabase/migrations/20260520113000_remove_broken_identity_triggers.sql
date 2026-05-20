-- Permanent repair for signup/customer identity compatibility.
-- Removes trigger-based guards that referenced incompatible schemas and normalizes
-- legacy name columns into the canonical full_name columns.

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

update public.profiles set full_name = '' where full_name is null;
update public.customers set full_name = '' where full_name is null;

alter table if exists public.customers alter column full_name set not null;
