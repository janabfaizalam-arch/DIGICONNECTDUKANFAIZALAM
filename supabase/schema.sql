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

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text default '',
  email text not null,
  avatar_url text default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  amount numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_slug text not null,
  service_name text not null,
  amount numeric(10, 2) not null default 0,
  form_data jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (
    status in ('new', 'documents_pending', 'payment_pending', 'in_process', 'submitted', 'completed', 'rejected')
  ),
  final_document_url text,
  final_document_name text,
  assigned_to text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on public.applications (user_id, created_at desc);
create index if not exists applications_status_idx on public.applications (status);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null default 'customer_document',
  file_name text not null,
  file_url text not null,
  file_type text,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists application_documents_application_idx on public.application_documents (application_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  utr_number text,
  screenshot_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_application_idx on public.payments (application_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_number text unique not null,
  customer_name text not null,
  customer_email text not null,
  service_name text not null,
  amount numeric(10, 2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists invoices_application_idx on public.invoices (application_id);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  note text not null,
  assigned_to text,
  created_at timestamptz not null default now()
);

create index if not exists admin_notes_application_idx on public.admin_notes (application_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now(),
  unique (application_id, user_id)
);

create index if not exists ratings_user_idx on public.ratings (user_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

alter table public.users enable row level security;
alter table public.services enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.admin_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.ratings enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

drop policy if exists "Anyone can read active services" on public.services;
create policy "Anyone can read active services" on public.services
  for select using (active = true);

drop policy if exists "Customers can read own applications" on public.applications;
create policy "Customers can read own applications" on public.applications
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can create own applications" on public.applications;
create policy "Customers can create own applications" on public.applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "Customers can read own documents" on public.application_documents;
create policy "Customers can read own documents" on public.application_documents
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can read own payments" on public.payments;
create policy "Customers can read own payments" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can read own invoices" on public.invoices;
create policy "Customers can read own invoices" on public.invoices
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can read own notifications" on public.notifications;
create policy "Customers can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can read own ratings" on public.ratings;
create policy "Customers can read own ratings" on public.ratings
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can rate completed own applications" on public.ratings;
create policy "Customers can rate completed own applications" on public.ratings
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.applications
      where applications.id = application_id
      and applications.user_id = auth.uid()
      and applications.status = 'completed'
    )
  );
