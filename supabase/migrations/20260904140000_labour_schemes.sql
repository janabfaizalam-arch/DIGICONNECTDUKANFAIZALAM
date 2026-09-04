-- Labour Card scheme directory, and the record of who checked each figure.
--
-- Government benefit amounts change by notification, and a page that prints a
-- stale figure costs somebody a wasted trip or a rejected claim. So the table
-- keeps provenance beside the money: who supplied it, when, from which source,
-- and whether it is due another look. The public page renders that state
-- rather than hiding it.
--
-- Frontend code never hard-codes an amount. It reads this table; the seed file
-- in src/lib/labour/seed-schemes.ts is only the first-run fallback.

create table if not exists public.labour_schemes (
  id text primary key,
  slug text unique not null,
  name text not null,
  name_hi text default '',
  category text not null,
  summary text default '',

  beneficiaries jsonb not null default '[]'::jsonb,
  -- Each line carries its own kind: cash, fd, reimbursement, installment,
  -- pension, service, awareness. Nothing here is a single "amount" column,
  -- because a scheme that pays cash AND opens a deposit has two answers and
  -- one column would force them into one.
  benefits jsonb not null default '[]'::jsonb,
  eligibility jsonb not null default '[]'::jsonb,
  key_conditions jsonb not null default '{}'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  process jsonb not null default '[]'::jsonb,
  payment_method text default '',
  -- Said out loud on the card, never buried in a disclaimer.
  warnings jsonb not null default '[]'::jsonb,

  -- Provenance.
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified', 'needs_review', 'outdated', 'archived')),
  provided_by text default '',
  verified_on date,
  source_url text,
  source_title text default '',
  source_date date,
  caveat text default '',

  sort_order int not null default 0,
  published boolean not null default false,
  seo_title text default '',
  seo_description text default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists labour_schemes_published_idx
  on public.labour_schemes (published, sort_order);
create index if not exists labour_schemes_category_idx
  on public.labour_schemes (category);

-- Every edit to a figure, kept.
--
-- "₹55,000 → ₹65,000, source, who, when, why" is the difference between a
-- page somebody can trust and a page nobody can audit. Without this an amount
-- silently becomes whatever the last person typed.
create table if not exists public.labour_scheme_versions (
  id uuid primary key default gen_random_uuid(),
  scheme_id text not null references public.labour_schemes(id) on delete cascade,
  -- The whole row as it stood before the change.
  snapshot jsonb not null,
  changed_fields jsonb not null default '[]'::jsonb,
  reason text default '',
  source_url text,
  changed_by text default '',
  changed_at timestamptz not null default now()
);

create index if not exists labour_scheme_versions_scheme_idx
  on public.labour_scheme_versions (scheme_id, changed_at desc);

-- Server-only, like every other operational table here.
--
-- The anon key must not read this: an unpublished draft amount or a caveat
-- naming an unresolved conflict is not something to hand a browser before an
-- administrator has decided it is right.
alter table public.labour_schemes enable row level security;
alter table public.labour_scheme_versions enable row level security;

drop policy if exists "labour_schemes_no_public" on public.labour_schemes;
create policy "labour_schemes_no_public" on public.labour_schemes
  for all using (false) with check (false);

drop policy if exists "labour_scheme_versions_no_public" on public.labour_scheme_versions;
create policy "labour_scheme_versions_no_public" on public.labour_scheme_versions
  for all using (false) with check (false);
