-- Customer signup identity compatibility.
-- This migration used to create trigger-based duplicate guards that were not
-- compatible with all production table shapes. Duplicate handling now lives in
-- application code and later repair migrations remove any old trigger artifacts.

create extension if not exists pgcrypto;

alter table if exists public.customer_profiles add column if not exists user_id uuid;
alter table if exists public.customers add column if not exists pincode text default '';
alter table if exists public.customers add column if not exists state text default '';

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

drop trigger if exists prevent_duplicate_customer_identity_profiles on public.profiles;
drop trigger if exists prevent_duplicate_customer_identity_customer_profiles on public.customer_profiles;
drop trigger if exists prevent_duplicate_customer_identity_customers on public.customers;
drop function if exists public.prevent_duplicate_customer_identity() cascade;

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
