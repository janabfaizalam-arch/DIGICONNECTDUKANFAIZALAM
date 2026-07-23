-- ============================================================================
-- Digi Partner announcement banners (partner_dashboard audience)
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-07-23
-- Idempotent. Does not modify public homepage_slides.
-- ============================================================================

create table if not exists public.partner_announcement_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  image_url text not null,
  image_path text,
  mobile_image_url text,
  mobile_image_path text,
  button_text text,
  button_url text,
  partner_types text[] null,
  audience text not null default 'partner_dashboard'
    check (audience in ('public_home', 'customer_dashboard', 'partner_dashboard')),
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_announcement_banners_active_idx
  on public.partner_announcement_banners (audience, is_active, sort_order asc, created_at desc);

create or replace function public.set_partner_announcement_banners_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists partner_announcement_banners_updated_at on public.partner_announcement_banners;
create trigger partner_announcement_banners_updated_at
  before update on public.partner_announcement_banners
  for each row
  execute function public.set_partner_announcement_banners_updated_at();

insert into storage.buckets (id, name, public)
values ('partner-announcement-banners', 'partner-announcement-banners', true)
on conflict (id) do update set public = true;

alter table public.partner_announcement_banners enable row level security;

drop policy if exists "Admins manage partner announcement banners" on public.partner_announcement_banners;
create policy "Admins manage partner announcement banners" on public.partner_announcement_banners
  for all
  using (public.is_admin_role())
  with check (public.is_admin_role());

drop policy if exists "Authenticated partners read active partner banners" on public.partner_announcement_banners;
create policy "Authenticated partners read active partner banners" on public.partner_announcement_banners
  for select to authenticated
  using (
    audience = 'partner_dashboard'
    and is_active = true
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );

drop policy if exists "Public can read partner banner images" on storage.objects;
create policy "Public can read partner banner images" on storage.objects
  for select to public
  using (bucket_id = 'partner-announcement-banners');

drop policy if exists "Admins can upload partner banner images" on storage.objects;
create policy "Admins can upload partner banner images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'partner-announcement-banners' and public.is_admin_role());

drop policy if exists "Admins can update partner banner images" on storage.objects;
create policy "Admins can update partner banner images" on storage.objects
  for update to authenticated
  using (bucket_id = 'partner-announcement-banners' and public.is_admin_role())
  with check (bucket_id = 'partner-announcement-banners' and public.is_admin_role());

drop policy if exists "Admins can delete partner banner images" on storage.objects;
create policy "Admins can delete partner banner images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'partner-announcement-banners' and public.is_admin_role());
