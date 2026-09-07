-- The AI Content Engine: idea → angle → draft → fact check → design →
-- repurpose → approval → schedule → publish → analytics → next idea.
--
-- Every table here is prefixed `content_` so that this subsystem is one thing
-- in a database that already holds a hundred tables from a different part of
-- the business. Two names differ from the shorthand used in the brief for
-- exactly that reason: `fact_checks` is `content_fact_checks`, and
-- `brand_settings` is `content_brand_settings`. A bare `fact_checks` in a
-- schema that also holds applications, payouts and leads reads as if it might
-- be about any of them.
--
-- Nothing here is readable with the anon key. An unapproved draft that quotes
-- a scheme amount nobody has verified is the single most damaging row in this
-- database to expose, so the RLS policies below deny everything and all
-- access goes through the service role from the server.

/* ─────────────────────────────────────────────────────────────────────────
   Stage 01 — ideas
   ───────────────────────────────────────────────────────────────────────── */

create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  source text not null default 'manual'
    check (source in ('customer_question','government_update','service_catalogue',
                      'past_performance','faq','comment','document','manual','ai')),
  source_url text,
  category text not null default 'General',
  target_audience text not null default '',

  -- Five axes out of ten each. Kept as separate columns rather than one jsonb
  -- because the Learn engine groups and averages them, and a query that has
  -- to unpack json to sort a list is a query somebody will replace with a
  -- worse one.
  hook_score int not null default 0 check (hook_score between 0 and 10),
  demand_score int not null default 0 check (demand_score between 0 and 10),
  freshness_score int not null default 0 check (freshness_score between 0 and 10),
  business_value_score int not null default 0 check (business_value_score between 0 and 10),
  shareability_score int not null default 0 check (shareability_score between 0 and 10),
  total_score int not null default 0 check (total_score between 0 and 50),
  -- Why it scored what it scored, in one or two plain sentences. Shown on the
  -- card: a ranking nobody can interrogate is a ranking nobody trusts.
  score_reason text not null default '',

  suggested_format text not null default 'STATIC_POSTER',
  status text not null default 'NEW'
    check (status in ('NEW','RANKED','IN_PROGRESS','USED','REJECTED')),
  -- Set when the topic touches a scheme, rule, fee, eligibility or deadline.
  -- Decided once, here, and read by the publishing gate later.
  is_government boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_ideas_rank_idx
  on public.content_ideas (status, total_score desc, created_at desc);
create index if not exists content_ideas_category_idx on public.content_ideas (category);

/* ─────────────────────────────────────────────────────────────────────────
   The master post
   ───────────────────────────────────────────────────────────────────────── */

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.content_ideas(id) on delete set null,
  master_topic text not null,
  selected_angle text not null default '',
  hook text not null default '',
  body text not null default '',
  cta text not null default '',
  content_type text not null default 'STATIC_POSTER',

  status text not null default 'IDEA'
    check (status in ('IDEA','RESEARCHING','ANGLE_READY','DRAFT_READY','FACT_CHECK_PENDING',
                      'FACT_CHECKED','DESIGN_READY','APPROVAL_PENDING','APPROVED','SCHEDULED',
                      'PUBLISHED','ANALYZED','FAILED')),
  fact_check_status text not null default 'NOT_REQUIRED'
    check (fact_check_status in ('NOT_REQUIRED','PENDING','VERIFIED','NEEDS_REVIEW','REJECTED')),
  approval_status text not null default 'PENDING'
    check (approval_status in ('NOT_REQUIRED','PENDING','APPROVED','REJECTED','CHANGES_REQUESTED')),

  -- The flag the publishing gate reads. Stored rather than recomputed from
  -- the text at publish time: the decision about whether something is sarkari
  -- belongs to the moment it was written, when a person could still be asked.
  is_government boolean not null default false,

  -- Who approved it, so "an AI published this" is never the answer to "who
  -- said this amount was right".
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,

  scheduled_at timestamptz,
  published_at timestamptz,
  failure_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_posts_status_idx on public.content_posts (status, updated_at desc);
create index if not exists content_posts_schedule_idx on public.content_posts (scheduled_at)
  where scheduled_at is not null;
create index if not exists content_posts_government_idx on public.content_posts (is_government, approval_status);

/* ─────────────────────────────────────────────────────────────────────────
   One master piece, one version per platform
   ───────────────────────────────────────────────────────────────────────── */

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_post_id uuid not null references public.content_posts(id) on delete cascade,
  platform text not null
    check (platform in ('INSTAGRAM','FACEBOOK','YOUTUBE','WHATSAPP','LINKEDIN','WEBSITE','GOOGLE_BUSINESS')),
  title text not null default '',
  hook text not null default '',
  body text not null default '',
  caption text not null default '',
  hashtags jsonb not null default '[]'::jsonb,
  cta text not null default '',
  media_type text not null default 'IMAGE'
    check (media_type in ('IMAGE','VIDEO','CAROUSEL','TEXT','DOCUMENT')),
  status text not null default 'DRAFT'
    check (status in ('DRAFT','READY','APPROVED','PUBLISHED','FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One version per platform per post. Regenerating a single platform is an
  -- upsert, which is what lets the admin redo the Instagram caption without
  -- touching the six versions they were happy with.
  unique (content_post_id, platform)
);

/* ─────────────────────────────────────────────────────────────────────────
   Research and verification
   ───────────────────────────────────────────────────────────────────────── */

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  source_type text not null default 'web',
  publisher text not null default '',
  published_date date,
  accessed_at timestamptz not null default now(),
  -- OFFICIAL means a government domain. The fact check leans on this: a
  -- scheme amount confirmed by a news article is not confirmed.
  reliability text not null default 'UNKNOWN'
    check (reliability in ('OFFICIAL','NEWS','SECONDARY','UNKNOWN')),
  content_reference text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists content_sources_url_idx on public.content_sources (url);

-- One row per claim, not one row per post.
--
-- A post about a scheme makes four or five separate assertions — the amount,
-- who qualifies, which papers, by when — and they are not equally certain.
-- Collapsing them into a single "verified" flag on the post is how a page
-- ends up carrying a confident figure next to a guessed deadline.
create table if not exists public.content_fact_checks (
  id uuid primary key default gen_random_uuid(),
  content_post_id uuid not null references public.content_posts(id) on delete cascade,
  claim text not null,
  source text not null default '',
  source_url text,
  verification_status text not null default 'UNVERIFIED'
    check (verification_status in ('VERIFIED','NEEDS_REVIEW','UNVERIFIED','REJECTED')),
  confidence numeric(3,2) not null default 0 check (confidence between 0 and 1),
  notes text not null default '',
  -- A claim that costs somebody money or a wasted trip if it is wrong. These
  -- are the ones that block publishing when unverified.
  is_critical boolean not null default false,
  checked_at timestamptz not null default now(),
  -- Set when a person, not the model, decided this claim was acceptable.
  reviewed_by text,
  reviewed_at timestamptz
);

create index if not exists content_fact_checks_post_idx
  on public.content_fact_checks (content_post_id, verification_status);

/* ─────────────────────────────────────────────────────────────────────────
   Design
   ───────────────────────────────────────────────────────────────────────── */

create table if not exists public.content_designs (
  id uuid primary key default gen_random_uuid(),
  content_post_id uuid not null references public.content_posts(id) on delete cascade,
  platform text not null,
  template_id text not null default '',
  -- Null until an external design tool has actually produced something. The
  -- specification below is complete without it.
  design_id text,
  preview_url text,
  export_url text,
  status text not null default 'SPEC_READY'
    check (status in ('SPEC_READY','GENERATING','READY','FAILED','CONFIGURATION_REQUIRED')),
  -- Canvas, headline, colours, margins and the filled {{VARIABLES}}. Enough
  -- for a person to build the design by hand when no API is connected.
  spec jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  unique (content_post_id, platform)
);

/* ─────────────────────────────────────────────────────────────────────────
   Scheduling and publishing
   ───────────────────────────────────────────────────────────────────────── */

create table if not exists public.content_schedule (
  id uuid primary key default gen_random_uuid(),
  content_post_id uuid not null references public.content_posts(id) on delete cascade,
  platform text not null,
  scheduled_at timestamptz not null,
  publishing_status text not null default 'PENDING'
    check (publishing_status in ('PENDING','QUEUED','PUBLISHING','PUBLISHED','FAILED','SKIPPED','CONFIGURATION_REQUIRED')),
  external_post_id text,
  error_message text,
  attempts int not null default 0,
  -- Held by whichever worker claimed this row, so two overlapping cron runs
  -- cannot publish the same post twice.
  claimed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_post_id, platform)
);

create index if not exists content_schedule_due_idx
  on public.content_schedule (publishing_status, scheduled_at);

-- OAuth connections to the platforms.
--
-- Access tokens only, never passwords, and the token column is written by the
-- server after encryption at rest with CONTENT_TOKEN_SECRET. A row with no
-- token is the honest state of an unconnected platform, and the publishers
-- report CONFIGURATION_REQUIRED rather than pretending to post.
create table if not exists public.content_publish_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique,
  account_name text not null default '',
  external_account_id text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  scopes jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  connected_by text,
  connected_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ─────────────────────────────────────────────────────────────────────────
   What happened afterwards
   ───────────────────────────────────────────────────────────────────────── */

create table if not exists public.content_analytics (
  id uuid primary key default gen_random_uuid(),
  content_post_id uuid not null references public.content_posts(id) on delete cascade,
  platform text not null,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  saves bigint not null default 0,
  clicks bigint not null default 0,
  watch_time_seconds bigint not null default 0,
  -- The four that matter to a shop. Filled from the CRM rather than the
  -- platform, because no platform knows somebody walked in.
  enquiries int not null default 0,
  leads int not null default 0,
  customers int not null default 0,
  revenue numeric(12,2),
  collected_at timestamptz not null default now(),
  -- One row per post per platform, overwritten as figures mature. A post's
  -- numbers keep moving for a fortnight and appending would make every
  -- average wrong.
  unique (content_post_id, platform)
);

-- What the Learn engine concluded, kept so a claim can be checked later.
create table if not exists public.content_learnings (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  posts_analyzed int not null default 0,
  -- The arithmetic: top and bottom groups, per-category and per-format means.
  comparison jsonb not null default '{}'::jsonb,
  -- The sentence somebody reads. "Problem-solving posts are generating more
  -- enquiries than generic service advertisements."
  summary text not null default '',
  winning_topics jsonb not null default '[]'::jsonb,
  winning_hooks jsonb not null default '[]'::jsonb,
  winning_formats jsonb not null default '[]'::jsonb,
  winning_ctas jsonb not null default '[]'::jsonb,
  winning_times jsonb not null default '[]'::jsonb,
  weak_topics jsonb not null default '[]'::jsonb,
  weak_hooks jsonb not null default '[]'::jsonb,
  weak_formats jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

/* ─────────────────────────────────────────────────────────────────────────
   Brand, settings, memory
   ───────────────────────────────────────────────────────────────────────── */

-- A single row, id = 'default'. A settings table with one row is honest about
-- what it is; a key-value store would make every read a join and every typo a
-- silent default.
create table if not exists public.content_brand_settings (
  id text primary key default 'default',
  brand_name text not null default 'DigiConnect Dukan',
  logo_url text,
  primary_colors jsonb not null default '[]'::jsonb,
  secondary_colors jsonb not null default '[]'::jsonb,
  fonts jsonb not null default '{}'::jsonb,
  tone text not null default '',
  preferred_language text not null default '',
  words_to_avoid jsonb not null default '[]'::jsonb,
  cta_rules jsonb not null default '[]'::jsonb,
  audience text not null default '',
  business_categories jsonb not null default '[]'::jsonb,
  visual_rules jsonb not null default '[]'::jsonb,
  -- Derived from the shop's own posts by "Analyze My Posts", not asserted.
  voice jsonb not null default '{}'::jsonb,
  -- The examples the guide was derived from, kept so it can be redone.
  sample_posts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.content_engine_settings (
  id text primary key default 'default',
  auto_research boolean not null default true,
  auto_idea_generation boolean not null default true,
  auto_writing boolean not null default true,
  auto_design boolean not null default true,
  auto_repurpose boolean not null default true,
  -- Off. Turning it on is a decision an administrator makes deliberately.
  auto_publish boolean not null default false,
  -- Off, and separate. The general switch says nothing about sarkari figures:
  -- a wrong scheme amount on a public page sends somebody to an office with
  -- the wrong papers.
  auto_publish_government boolean not null default false,
  human_approval_required boolean not null default true,
  weekly_plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Every hook this shop has ever used, so the angle engine stops proposing the
-- same opener every Monday.
create table if not exists public.content_hooks_used (
  id uuid primary key default gen_random_uuid(),
  hook text not null,
  hook_style text not null default 'statement',
  content_post_id uuid references public.content_posts(id) on delete set null,
  used_at timestamptz not null default now()
);

create index if not exists content_hooks_used_recent_idx on public.content_hooks_used (used_at desc);

-- Every transition, and who caused it.
--
-- "Who approved this scheme amount, and when" has to be answerable months
-- later, and a status column alone cannot answer it.
create table if not exists public.content_activity (
  id uuid primary key default gen_random_uuid(),
  entity text not null
    check (entity in ('idea','post','version','design','schedule','analytics','settings')),
  entity_id uuid,
  from_status text,
  to_status text,
  action text not null,
  actor text not null default 'system',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists content_activity_entity_idx
  on public.content_activity (entity, entity_id, created_at desc);

/* ─────────────────────────────────────────────────────────────────────────
   Nothing here is public
   ───────────────────────────────────────────────────────────────────────── */

alter table public.content_ideas enable row level security;
alter table public.content_posts enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_sources enable row level security;
alter table public.content_fact_checks enable row level security;
alter table public.content_designs enable row level security;
alter table public.content_schedule enable row level security;
alter table public.content_publish_accounts enable row level security;
alter table public.content_analytics enable row level security;
alter table public.content_learnings enable row level security;
alter table public.content_brand_settings enable row level security;
alter table public.content_engine_settings enable row level security;
alter table public.content_hooks_used enable row level security;
alter table public.content_activity enable row level security;

do $$
declare
  target text;
begin
  foreach target in array array[
    'content_ideas','content_posts','content_versions','content_sources','content_fact_checks',
    'content_designs','content_schedule','content_publish_accounts','content_analytics',
    'content_learnings','content_brand_settings','content_engine_settings','content_hooks_used',
    'content_activity'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', target || '_no_public', target);
    -- Deny to every role the anon and authenticated keys can reach. The
    -- service role bypasses RLS, which is the only way in and is server-side.
    execute format(
      'create policy %I on public.%I for all using (false) with check (false)',
      target || '_no_public', target
    );
  end loop;
end $$;

-- The singleton rows, so a first read never has to decide whether an empty
-- table means "not configured" or "configured with nothing".
insert into public.content_brand_settings (id) values ('default') on conflict (id) do nothing;
insert into public.content_engine_settings (id) values ('default') on conflict (id) do nothing;
