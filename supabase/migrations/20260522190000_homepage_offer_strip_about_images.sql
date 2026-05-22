create table if not exists public.site_section_settings (
  section_key text primary key,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_offer_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  storage_path text not null,
  link_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.about_page_images (
  id uuid primary key default gen_random_uuid(),
  title text,
  alt_text text,
  image_url text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_offer_banners_public_idx
  on public.homepage_offer_banners (is_active, sort_order asc, created_at desc);

create index if not exists about_page_images_public_idx
  on public.about_page_images (is_active, sort_order asc, created_at desc);

create or replace function public.set_site_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_section_settings_updated_at on public.site_section_settings;
create trigger site_section_settings_updated_at
  before update on public.site_section_settings
  for each row execute function public.set_site_content_updated_at();

drop trigger if exists homepage_offer_banners_updated_at on public.homepage_offer_banners;
create trigger homepage_offer_banners_updated_at
  before update on public.homepage_offer_banners
  for each row execute function public.set_site_content_updated_at();

drop trigger if exists about_page_images_updated_at on public.about_page_images;
create trigger about_page_images_updated_at
  before update on public.about_page_images
  for each row execute function public.set_site_content_updated_at();

insert into public.site_section_settings (section_key, title)
values ('homepage_offer_strip', 'Featured Offers')
on conflict (section_key) do nothing;

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

alter table public.site_section_settings enable row level security;
alter table public.homepage_offer_banners enable row level security;
alter table public.about_page_images enable row level security;

drop policy if exists "Public can read site section settings" on public.site_section_settings;
create policy "Public can read site section settings" on public.site_section_settings
  for select to public using (true);

drop policy if exists "Admins manage site section settings" on public.site_section_settings;
create policy "Admins manage site section settings" on public.site_section_settings
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public can read active homepage offer banners" on public.homepage_offer_banners;
create policy "Public can read active homepage offer banners" on public.homepage_offer_banners
  for select to public using (is_active = true);

drop policy if exists "Admins manage homepage offer banners" on public.homepage_offer_banners;
create policy "Admins manage homepage offer banners" on public.homepage_offer_banners
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public can read active about page images" on public.about_page_images;
create policy "Public can read active about page images" on public.about_page_images
  for select to public using (is_active = true);

drop policy if exists "Admins manage about page images" on public.about_page_images;
create policy "Admins manage about page images" on public.about_page_images
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public can read site media" on storage.objects;
create policy "Public can read site media" on storage.objects
  for select to public using (bucket_id = 'site-media');

drop policy if exists "Admins can upload site media" on storage.objects;
create policy "Admins can upload site media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.is_admin_role());

drop policy if exists "Admins can update site media" on storage.objects;
create policy "Admins can update site media" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and public.is_admin_role())
  with check (bucket_id = 'site-media' and public.is_admin_role());

drop policy if exists "Admins can delete site media" on storage.objects;
create policy "Admins can delete site media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and public.is_admin_role());
