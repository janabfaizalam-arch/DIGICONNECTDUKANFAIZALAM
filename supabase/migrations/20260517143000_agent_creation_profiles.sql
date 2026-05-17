-- Agent creation and login profile fields used by the admin panel.

alter table public.profiles
  add column if not exists mobile text,
  add column if not exists agent_code text,
  add column if not exists address text,
  add column if not exists area text,
  add column if not exists commission_type text not null default 'fixed',
  add column if not exists commission_value numeric(10, 2) not null default 0,
  add column if not exists commission_rate numeric(10, 2),
  add column if not exists active boolean not null default true,
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
  on public.profiles (lower(agent_code))
  where agent_code is not null and agent_code <> '';

create index if not exists profiles_agent_search_idx
  on public.profiles (role, full_name, mobile, email, agent_code);
