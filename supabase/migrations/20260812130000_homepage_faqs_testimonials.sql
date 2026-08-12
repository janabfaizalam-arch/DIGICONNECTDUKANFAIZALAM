-- Homepage FAQ + testimonial CMS
--
-- The homepage FAQ was hardcoded in the React component and the video
-- testimonial section was a stub that rendered nothing, so neither could be
-- changed without a deploy and neither contributed any structured data.
--
-- Per-service equivalents already exist (service_faqs, service_testimonials);
-- these are the site-level counterparts and follow the same shape.

create table if not exists public.homepage_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  -- Groups questions under headings on the homepage ("Payments", "Tracking").
  category text not null default 'General',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  -- Free text so "Lucknow, UP" and "Barabanki" are both fine.
  customer_location text not null default '',
  review_text text not null,
  rating int not null default 5 check (rating between 1 and 5),
  photo_url text,
  service_label text,
  -- A row is a video testimonial when video_url is set; otherwise it renders
  -- as a text card. One table keeps ordering consistent across both.
  video_url text,
  video_thumbnail_url text,
  -- Publishing a real person's face or voice needs their agreement on record.
  consent_confirmed boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_faqs_active_order_idx
  on public.homepage_faqs (is_active, sort_order, created_at);

create index if not exists homepage_testimonials_active_order_idx
  on public.homepage_testimonials (is_active, sort_order, created_at);

alter table public.homepage_faqs enable row level security;
alter table public.homepage_testimonials enable row level security;

-- Public read of active rows only. Writes go through the service role in the
-- admin API, so no public write policy exists.
drop policy if exists "Public can read active homepage faqs" on public.homepage_faqs;
create policy "Public can read active homepage faqs"
on public.homepage_faqs for select
using (is_active = true);

-- A testimonial is only publicly readable once consent is on record, so an
-- unconsented draft cannot leak through the public API even if activated.
drop policy if exists "Public can read consented homepage testimonials" on public.homepage_testimonials;
create policy "Public can read consented homepage testimonials"
on public.homepage_testimonials for select
using (is_active = true and consent_confirmed = true);
