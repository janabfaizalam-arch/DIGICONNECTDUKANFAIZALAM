-- ============================================================================
-- Who is on the site, and what are they looking at
--
-- The panel could say how many applications came in and how much money moved,
-- and nothing at all about the people who never got that far: how many opened
-- the site today, which page they landed on, whether they came from a WhatsApp
-- forward or from Google, which town they were in. That is the difference
-- between knowing what happened and knowing what to do next.
--
-- What this table deliberately does NOT hold:
--
--   * no IP address, ever — the visitor id is a SHA-256 of (ip + user agent +
--     day + a server secret), truncated, so the same person counts once in an
--     afternoon and cannot be followed into the next day, by us or anybody
--     with a copy of this table;
--   * no query strings — they carry tokens, referral codes, and sometimes a
--     mobile number somebody was looking up;
--   * no cookie of any kind. Nothing is written to the visitor's browser.
--
-- City and state come from the CDN's own geo headers, which are coarse by
-- construction. That is the level a shop owner needs: "twelve people in
-- Jalaun", not a street.
--
-- Safe / reversible: one new table with no foreign keys and no policies. RLS
-- is on with nothing granted, so only the service role can read or write it —
-- the panel reads it server-side, and the public tracking endpoint writes
-- through that same service role.
-- ============================================================================

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- Stored alongside the timestamp so a day can be grouped without a function
  -- index, and so "today" means the same thing to every query.
  visit_day date not null default ((now() at time zone 'utc')::date),

  -- Rotates daily. Not an identity; see the note above.
  visitor_hash text not null,
  -- Lives in the browser tab only, for the length of one visit.
  session_id text not null,

  path text not null,
  page_title text,

  referrer_host text,
  source text not null default 'direct',
  campaign text,

  device text not null default 'desktop',
  city text,
  region text,
  country text,

  -- The first page of a visit. Counting landings without it would call every
  -- click a new arrival.
  is_entry boolean not null default false
);

comment on table public.site_visits is
  'One row per page view. No IP, no cookies, no query strings; the visitor hash rotates every day.';

-- The panel asks three questions: what happened recently, what happened on a
-- given day, and which pages/sources lead. One index each.
create index if not exists site_visits_occurred_at_idx on public.site_visits (occurred_at desc);
create index if not exists site_visits_day_idx on public.site_visits (visit_day desc);
create index if not exists site_visits_path_idx on public.site_visits (visit_day, path);
create index if not exists site_visits_source_idx on public.site_visits (visit_day, source);

alter table public.site_visits enable row level security;

-- No policies on purpose. Nobody reaches this table with an anon or an
-- authenticated key; the service role bypasses RLS and is the only way in.
