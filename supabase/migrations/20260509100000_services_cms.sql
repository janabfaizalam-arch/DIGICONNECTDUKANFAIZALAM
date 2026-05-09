create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.service_categories(id) on delete set null,
  title text not null,
  slug text unique not null,
  short_description text default '',
  overview text default '',
  benefits jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  process jsonb not null default '[]'::jsonb,
  old_price numeric,
  offer_price numeric,
  price_label text default '',
  cta_type text not null default 'apply' check (cta_type in ('apply', 'enquiry')),
  badge text default '',
  icon text default 'FileText',
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  sort_order int not null default 0,
  seo_title text default '',
  seo_description text default '',
  seo_keywords jsonb not null default '[]'::jsonb,
  blog_content text default '',
  faqs jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_categories_active_sort_idx on public.service_categories (is_active, sort_order, name);
create index if not exists services_status_sort_idx on public.services (status, sort_order, title);
create index if not exists services_category_status_idx on public.services (category_id, status, sort_order);
create index if not exists services_slug_idx on public.services (slug);

alter table public.service_categories enable row level security;
alter table public.services enable row level security;

drop policy if exists "Admins manage service categories" on public.service_categories;
create policy "Admins manage service categories" on public.service_categories
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active service categories" on public.service_categories;
create policy "Public read active service categories" on public.service_categories
  for select to public using (is_active = true);

drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services" on public.services
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read published services" on public.services;
create policy "Public read published services" on public.services
  for select to public using (status = 'published');

insert into public.service_categories (name, slug, description, sort_order, is_active)
values
  ('Tax & Business', 'tax-business', 'GST, ITR, MSME, FSSAI, trade license, and project report support for growing businesses.', 10, true),
  ('Insurance', 'insurance', 'Bike, car, commercial, renewal, and claim assistance in one place.', 20, true),
  ('Finance & Banking', 'finance-banking', 'Government subsidy schemes, business loans, credit cards, accounts, CIBIL, and loan file preparation.', 30, true),
  ('Gov ID & Form Submission', 'gov-id-form-submission', 'PAN, passport, driving licence, voter ID, labour card, and e-Shram support.', 40, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();
