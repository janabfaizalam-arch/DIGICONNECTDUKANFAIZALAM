-- Homepage reels — short vertical UGC videos, admin managed.
--
-- Separate from homepage_testimonials on purpose: a testimonial is a review
-- with a rating and a named customer whose consent is on record, while a reel
-- is marketing content the team produces. Mixing them would force one set of
-- rules (star ratings, consent) onto content that does not have them.

create table if not exists public.homepage_reels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',

  -- Either a direct video file (best for autoplay) or a hosted short.
  -- video_url holds both; the app decides how to render it.
  video_url text not null,
  -- Shown before playback and while the video loads. Without it the rail is a
  -- row of black rectangles until each file starts buffering.
  poster_url text,

  cta_label text,
  cta_href text,

  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_reels_active_order_idx
  on public.homepage_reels (is_active, sort_order, created_at);

alter table public.homepage_reels enable row level security;

drop policy if exists "Public can read active homepage reels" on public.homepage_reels;
create policy "Public can read active homepage reels"
on public.homepage_reels for select
using (is_active = true);

-- Storage for uploaded reel files. Public bucket: these are marketing videos
-- meant to be served straight to anonymous homepage visitors.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage-reels',
  'homepage-reels',
  true,
  104857600, -- 100 MB; a 30-second vertical clip is far below this
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
