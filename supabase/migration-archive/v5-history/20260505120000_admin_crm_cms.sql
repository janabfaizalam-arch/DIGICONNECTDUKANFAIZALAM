alter table public.leads
  add column if not exists source text not null default 'website',
  add column if not exists converted_application_id uuid references public.applications(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check check (status in ('new', 'contacted', 'converted', 'closed', 'in_progress', 'completed'));

update public.leads set status = 'contacted' where status = 'in_progress';
update public.leads set status = 'closed' where status = 'completed';

create index if not exists leads_status_created_idx on public.leads (status, created_at desc);

alter table public.gallery_images
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text default '',
  content text not null default '',
  featured_image_url text,
  featured_image_path text,
  category text default '',
  seo_title text default '',
  seo_description text default '',
  keywords text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_created_idx on public.articles (status, created_at desc);
create index if not exists articles_slug_idx on public.articles (slug);

alter table public.customer_notes enable row level security;
alter table public.articles enable row level security;

drop policy if exists "Admins manage customer notes" on public.customer_notes;
create policy "Admins manage customer notes" on public.customer_notes
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Admins manage articles" on public.articles;
create policy "Admins manage articles" on public.articles
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read published articles" on public.articles;
create policy "Public read published articles" on public.articles
  for select to public using (status = 'published');
