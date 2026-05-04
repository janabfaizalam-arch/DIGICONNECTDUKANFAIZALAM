create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  storage_path text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gallery_images_created_at_idx on public.gallery_images (created_at desc);
create index if not exists gallery_images_active_idx on public.gallery_images (active, created_at desc);

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

alter table public.gallery_images enable row level security;

drop policy if exists "Public can read active gallery images" on public.gallery_images;
create policy "Public can read active gallery images" on public.gallery_images
  for select to public using (active = true);

drop policy if exists "Public can read gallery images" on storage.objects;
create policy "Public can read gallery images" on storage.objects
  for select to public
  using (bucket_id = 'gallery');
