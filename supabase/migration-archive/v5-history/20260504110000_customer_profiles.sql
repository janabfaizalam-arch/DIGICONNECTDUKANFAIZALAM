create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  mobile text,
  email text,
  dob date,
  gender text,
  address text,
  city text,
  state text,
  pincode text,
  photo_url text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role::text from public.profiles p where p.id = auth.uid()),
    (select u.role from public.users u where u.id = auth.uid()),
    'customer'
  );
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('super_admin', 'admin');
$$;

create or replace function public.set_customer_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customer_profiles_updated_at on public.customer_profiles;
create trigger set_customer_profiles_updated_at
before update on public.customer_profiles
for each row
execute function public.set_customer_profiles_updated_at();

alter table public.customer_profiles enable row level security;

drop policy if exists "Customers read own customer profile" on public.customer_profiles;
create policy "Customers read own customer profile" on public.customer_profiles
  for select using (auth.uid() = id);

drop policy if exists "Customers create own customer profile" on public.customer_profiles;
create policy "Customers create own customer profile" on public.customer_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Customers update own customer profile" on public.customer_profiles;
create policy "Customers update own customer profile" on public.customer_profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins manage customer profiles" on public.customer_profiles;
create policy "Admins manage customer profiles" on public.customer_profiles
  for all using (public.is_admin_role())
  with check (public.is_admin_role());
