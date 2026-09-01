-- The homepage, as a list the shop can reorder.
--
-- The page was twenty-two components written out in a fixed order in
-- `src/app/page.tsx`. Changing what appeared, or what came first, meant a code
-- edit and a deploy — so "homepage customise karna" was never something the
-- shop could do, only something it could ask for.
--
-- This table holds the order and the on/off switch. It holds nothing else: a
-- section's actual copy stays in the screen that owns it (hero slides in Hero
-- Slides, questions in FAQ & Testimonials), because content with two masters
-- goes out of step within a week.
--
-- A row is not required. A section with no row appears in its coded position,
-- switched on, so this table starting empty is the same as the page today.

create table if not exists public.homepage_sections (
  section_id text primary key,
  position int not null default 0,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.homepage_sections is
  'Order and visibility of the homepage bands. Content lives with each band''s own screen.';
comment on column public.homepage_sections.section_id is
  'Matches an id in src/lib/homepage/sections.ts. An unknown id is ignored by the site.';

alter table public.homepage_sections enable row level security;

-- The site reads this on every homepage render, signed in or not.
drop policy if exists "homepage sections are public" on public.homepage_sections;
create policy "homepage sections are public"
  on public.homepage_sections for select
  using (true);

-- Writes go through the service role from the admin API, never from a browser.
drop policy if exists "homepage sections are admin-written" on public.homepage_sections;
create policy "homepage sections are admin-written"
  on public.homepage_sections for all
  using (false)
  with check (false);
