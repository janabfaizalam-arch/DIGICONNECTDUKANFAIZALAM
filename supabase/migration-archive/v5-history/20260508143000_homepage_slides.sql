create table if not exists public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text not null,
  image_path text,
  mobile_image_url text,
  mobile_image_path text,
  cta_primary_label text,
  cta_primary_url text,
  cta_secondary_label text,
  cta_secondary_url text,
  cta_position text not null default 'bottom-right',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_slides_cta_position_check check (
    cta_position in ('bottom-left', 'bottom-right', 'bottom-center', 'center-left', 'center-right', 'hidden')
  )
);

create index if not exists homepage_slides_public_idx
  on public.homepage_slides (is_active, sort_order asc, created_at desc);

create index if not exists homepage_slides_admin_idx
  on public.homepage_slides (sort_order asc, created_at desc);

create or replace function public.set_homepage_slides_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists homepage_slides_updated_at on public.homepage_slides;
create trigger homepage_slides_updated_at
  before update on public.homepage_slides
  for each row
  execute function public.set_homepage_slides_updated_at();

insert into storage.buckets (id, name, public)
values ('homepage-slides', 'homepage-slides', true)
on conflict (id) do update set public = true;

alter table public.homepage_slides enable row level security;

drop policy if exists "Public can read active homepage slides" on public.homepage_slides;
create policy "Public can read active homepage slides" on public.homepage_slides
  for select to public
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "Admins manage homepage slides" on public.homepage_slides;
create policy "Admins manage homepage slides" on public.homepage_slides
  for all
  using (public.is_admin_role())
  with check (public.is_admin_role());

drop policy if exists "Public can read homepage slide images" on storage.objects;
create policy "Public can read homepage slide images" on storage.objects
  for select to public
  using (bucket_id = 'homepage-slides');

drop policy if exists "Admins can upload homepage slide images" on storage.objects;
create policy "Admins can upload homepage slide images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'homepage-slides' and public.is_admin_role());

drop policy if exists "Admins can update homepage slide images" on storage.objects;
create policy "Admins can update homepage slide images" on storage.objects
  for update to authenticated
  using (bucket_id = 'homepage-slides' and public.is_admin_role())
  with check (bucket_id = 'homepage-slides' and public.is_admin_role());

drop policy if exists "Admins can delete homepage slide images" on storage.objects;
create policy "Admins can delete homepage slide images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'homepage-slides' and public.is_admin_role());
