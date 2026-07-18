-- Required customer details collected before Google/Facebook OAuth.

alter table if exists public.profiles
  add column if not exists mobile text,
  add column if not exists pincode text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists state text;

alter table if exists public.customer_profiles
  add column if not exists mobile text,
  add column if not exists pincode text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists state text;

alter table if exists public.customers
  add column if not exists mobile text,
  add column if not exists pincode text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists state text;
