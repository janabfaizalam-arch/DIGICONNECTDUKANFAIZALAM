-- Canonical admin-managed Service CMS and page builder.
-- This extends the existing services CMS without deleting legacy columns/data.

create extension if not exists pgcrypto;

alter table if exists public.services
  add column if not exists category text,
  add column if not exists full_description text,
  add column if not exists base_price numeric default 0,
  add column if not exists sale_price numeric,
  add column if not exists is_paid boolean default true,
  add column if not exists is_featured boolean default false,
  add column if not exists show_on_homepage boolean default false,
  add column if not exists is_active boolean default false,
  add column if not exists hero_image_url text,
  add column if not exists hero_image_storage_path text,
  add column if not exists cta_primary_label text,
  add column if not exists cta_primary_url text,
  add column if not exists cta_secondary_label text,
  add column if not exists cta_secondary_url text;

-- Compatibility columns for databases that have a leaner services table.
-- These keep later backfill SQL column-safe without requiring legacy migrations.
alter table if exists public.services
  add column if not exists overview text,
  add column if not exists blog_content text,
  add column if not exists old_price numeric,
  add column if not exists offer_price numeric,
  add column if not exists cta_type text,
  add column if not exists featured boolean,
  add column if not exists status text,
  add column if not exists benefits jsonb default '[]'::jsonb,
  add column if not exists documents jsonb default '[]'::jsonb,
  add column if not exists process jsonb default '[]'::jsonb,
  add column if not exists sort_order int default 0;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'service_categories'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'category_id'
  ) then
    execute $sql$
      update public.services s
      set
        category = coalesce(s.category, c.slug, c.name, 'general'),
        full_description = coalesce(s.full_description, s.overview, s.blog_content),
        base_price = coalesce(s.base_price, s.old_price, s.offer_price, 0),
        sale_price = coalesce(s.sale_price, s.offer_price),
        cta_type = coalesce(s.cta_type, 'apply'),
        status = coalesce(s.status, 'published'),
        is_paid = coalesce(s.is_paid, coalesce(s.offer_price, s.old_price, 0) > 0 and coalesce(s.cta_type, 'apply') = 'apply'),
        is_featured = coalesce(s.is_featured, s.featured, false),
        show_on_homepage = coalesce(s.show_on_homepage, s.featured, false),
        is_active = coalesce(s.is_active, s.status = 'published'),
        cta_primary_label = coalesce(s.cta_primary_label, case when coalesce(s.cta_type, 'apply') = 'apply' then 'Apply Now' else 'Enquiry Now' end),
        cta_primary_url = coalesce(s.cta_primary_url, case when coalesce(s.cta_type, 'apply') = 'apply' then '/apply/' || s.slug else null end),
        cta_secondary_label = coalesce(s.cta_secondary_label, 'WhatsApp')
      from public.service_categories c
      where s.category_id = c.id
    $sql$;
  end if;

  update public.services s
  set
    category = coalesce(s.category, 'general'),
    full_description = coalesce(s.full_description, s.overview, s.blog_content),
    base_price = coalesce(s.base_price, s.old_price, s.offer_price, 0),
    sale_price = coalesce(s.sale_price, s.offer_price),
    cta_type = coalesce(s.cta_type, 'apply'),
    status = coalesce(s.status, 'published'),
    is_paid = coalesce(s.is_paid, coalesce(s.offer_price, s.old_price, 0) > 0 and coalesce(s.cta_type, 'apply') = 'apply'),
    is_featured = coalesce(s.is_featured, s.featured, false),
    show_on_homepage = coalesce(s.show_on_homepage, s.featured, false),
    is_active = coalesce(s.is_active, s.status = 'published'),
    cta_primary_label = coalesce(s.cta_primary_label, case when coalesce(s.cta_type, 'apply') = 'apply' then 'Apply Now' else 'Enquiry Now' end),
    cta_primary_url = coalesce(s.cta_primary_url, case when coalesce(s.cta_type, 'apply') = 'apply' then '/apply/' || s.slug else null end),
    cta_secondary_label = coalesce(s.cta_secondary_label, 'WhatsApp')
  where true;
end $$;

create table if not exists public.service_sections (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  section_type text not null check (section_type in (
    'hero', 'overview', 'benefits', 'documents', 'process', 'faq', 'gallery',
    'testimonials', 'pricing', 'stats', 'banner', 'rich_text', 'custom_html',
    'video', 'trust_badges', 'offer_strip', 'contact_cta'
  )),
  title text,
  subtitle text,
  content jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_media (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  section_id uuid references public.service_sections(id) on delete cascade,
  file_url text not null,
  storage_path text,
  alt_text text,
  media_type text not null default 'image',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_faqs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.service_documents_required (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  document_name text not null,
  description text,
  is_required boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.service_process_steps (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  step_title text not null,
  step_description text,
  step_icon text,
  sort_order int not null default 0
);

create table if not exists public.service_testimonials (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  customer_name text not null,
  review_text text not null,
  rating int not null default 5 check (rating between 1 and 5),
  photo_url text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create index if not exists services_active_slug_idx on public.services(slug) where is_active = true;
create index if not exists services_homepage_idx on public.services(show_on_homepage, is_featured, sort_order) where is_active = true;
create index if not exists service_sections_service_order_idx on public.service_sections(service_id, sort_order);
create index if not exists service_media_service_order_idx on public.service_media(service_id, sort_order);
create index if not exists service_faqs_service_order_idx on public.service_faqs(service_id, sort_order);
create index if not exists service_documents_service_order_idx on public.service_documents_required(service_id, sort_order);
create index if not exists service_process_service_order_idx on public.service_process_steps(service_id, sort_order);
create index if not exists service_testimonials_service_order_idx on public.service_testimonials(service_id, sort_order);

drop policy if exists "Public read published services" on public.services;
create policy "Public read published services"
on public.services for select to public
using (status = 'published' and coalesce(is_active, false) = true);

drop policy if exists "Anyone can read active services" on public.services;
create policy "Anyone can read active services"
on public.services for select to public
using (status = 'published' and coalesce(is_active, false) = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-media',
  'service-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.service_sections enable row level security;
alter table public.service_media enable row level security;
alter table public.service_faqs enable row level security;
alter table public.service_documents_required enable row level security;
alter table public.service_process_steps enable row level security;
alter table public.service_testimonials enable row level security;

drop policy if exists "Public can read active service sections" on public.service_sections;
create policy "Public can read active service sections"
on public.service_sections for select
using (
  is_active = true
  and exists (
    select 1 from public.services s
    where s.id = service_sections.service_id
      and coalesce(s.is_active, s.status = 'published') = true
      and s.status = 'published'
  )
);

drop policy if exists "Public can read active service media" on public.service_media;
create policy "Public can read active service media"
on public.service_media for select
using (
  exists (
    select 1 from public.services s
    where s.id = service_media.service_id
      and coalesce(s.is_active, s.status = 'published') = true
      and s.status = 'published'
  )
);

drop policy if exists "Public can read active service faqs" on public.service_faqs;
create policy "Public can read active service faqs"
on public.service_faqs for select
using (
  is_active = true
  and exists (
    select 1 from public.services s
    where s.id = service_faqs.service_id
      and coalesce(s.is_active, s.status = 'published') = true
      and s.status = 'published'
  )
);

drop policy if exists "Public can read service documents" on public.service_documents_required;
create policy "Public can read service documents"
on public.service_documents_required for select
using (
  exists (
    select 1 from public.services s
    where s.id = service_documents_required.service_id
      and coalesce(s.is_active, s.status = 'published') = true
      and s.status = 'published'
  )
);

drop policy if exists "Public can read service process steps" on public.service_process_steps;
create policy "Public can read service process steps"
on public.service_process_steps for select
using (
  exists (
    select 1 from public.services s
    where s.id = service_process_steps.service_id
      and coalesce(s.is_active, s.status = 'published') = true
      and s.status = 'published'
  )
);

drop policy if exists "Public can read active testimonials" on public.service_testimonials;
create policy "Public can read active testimonials"
on public.service_testimonials for select
using (
  is_active = true
  and exists (
    select 1 from public.services s
    where s.id = service_testimonials.service_id
      and coalesce(s.is_active, s.status = 'published') = true
      and s.status = 'published'
  )
);

drop policy if exists "Admins manage service sections" on public.service_sections;
create policy "Admins manage service sections" on public.service_sections for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Admins manage service media" on public.service_media;
create policy "Admins manage service media" on public.service_media for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Admins manage service faqs" on public.service_faqs;
create policy "Admins manage service faqs" on public.service_faqs for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Admins manage service documents" on public.service_documents_required;
create policy "Admins manage service documents" on public.service_documents_required for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Admins manage service process" on public.service_process_steps;
create policy "Admins manage service process" on public.service_process_steps for all using (public.is_admin_role()) with check (public.is_admin_role());
drop policy if exists "Admins manage service testimonials" on public.service_testimonials;
create policy "Admins manage service testimonials" on public.service_testimonials for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public can read service media bucket" on storage.objects;
create policy "Public can read service media bucket"
on storage.objects for select
using (bucket_id = 'service-media');

drop policy if exists "Admins manage service media bucket" on storage.objects;
create policy "Admins manage service media bucket"
on storage.objects for all
using (bucket_id = 'service-media' and public.is_admin_role())
with check (bucket_id = 'service-media' and public.is_admin_role());

insert into public.service_sections (service_id, section_type, title, content, sort_order)
select id, 'overview', 'Overview', jsonb_build_object('text', coalesce(full_description, overview, '')), 20
from public.services s
where coalesce(full_description, overview, '') <> ''
  and not exists (select 1 from public.service_sections ss where ss.service_id = s.id and ss.section_type = 'overview');

insert into public.service_sections (service_id, section_type, title, content, sort_order)
select id, 'benefits', 'Benefits', jsonb_build_object('items', coalesce(to_jsonb(benefits), '[]'::jsonb)), 30
from public.services s
where coalesce(jsonb_array_length(coalesce(to_jsonb(benefits), '[]'::jsonb)), 0) > 0
  and not exists (select 1 from public.service_sections ss where ss.service_id = s.id and ss.section_type = 'benefits');

insert into public.service_sections (service_id, section_type, title, content, sort_order)
select id, 'documents', 'Documents Required', jsonb_build_object('items', coalesce(to_jsonb(documents), '[]'::jsonb)), 40
from public.services s
where coalesce(jsonb_array_length(coalesce(to_jsonb(documents), '[]'::jsonb)), 0) > 0
  and not exists (select 1 from public.service_sections ss where ss.service_id = s.id and ss.section_type = 'documents');

insert into public.service_sections (service_id, section_type, title, content, sort_order)
select id, 'process', 'Process', jsonb_build_object('items', coalesce(to_jsonb(process), '[]'::jsonb)), 50
from public.services s
where coalesce(jsonb_array_length(coalesce(to_jsonb(process), '[]'::jsonb)), 0) > 0
  and not exists (select 1 from public.service_sections ss where ss.service_id = s.id and ss.section_type = 'process');
