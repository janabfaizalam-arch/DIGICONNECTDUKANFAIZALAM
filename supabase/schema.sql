create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  service text not null,
  message text default '',
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads
  add column if not exists status text not null default 'new';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_status_check'
  ) then
    alter table public.leads
      add constraint leads_status_check check (status in ('new', 'in_progress', 'completed'));
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text default '',
  email text not null,
  avatar_url text default '',
  updated_at timestamptz not null default now()
);
