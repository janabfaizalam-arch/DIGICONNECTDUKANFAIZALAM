-- Agent management additions for Super Admin Control Room.

alter table public.profiles
  add column if not exists agent_code text,
  add column if not exists commission_type text not null default 'fixed',
  add column if not exists commission_value numeric(10, 2) not null default 0,
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_commission_type_check') then
    alter table public.profiles
      add constraint profiles_commission_type_check check (commission_type in ('fixed', 'percentage'));
  end if;
end
$$;

create unique index if not exists profiles_agent_code_unique_idx
  on public.profiles (agent_code)
  where agent_code is not null and agent_code <> '';

alter table public.applications
  add column if not exists assigned_agent_id uuid references auth.users (id) on delete set null;

-- Seed current owner as super admin after they have logged in at least once.
update public.profiles
set role = 'super_admin',
    is_active = true,
    active = true,
    updated_at = now()
where lower(email) = 'janabfaizalam@gmail.com';

update public.users
set role = 'super_admin',
    updated_at = now()
where lower(email) = 'janabfaizalam@gmail.com';

-- If no profile exists yet, syncUserProfile() will create it on next login and assign super_admin in app logic.
