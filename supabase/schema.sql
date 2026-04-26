create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  service text not null,
  message text default '',
  source text default 'website',
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
<<<<<<< HEAD

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text default '',
  email text not null,
  avatar_url text default '',
  updated_at timestamptz not null default now()
);
=======
>>>>>>> 9e4f100b0d1b7a3cfda460f7911ae8bc35f188d2
