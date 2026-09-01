-- A print station per shop.
--
-- The print system was built for one printer: one global agent key, one rate
-- card compiled into the code, and jobs that belonged to nobody in particular.
-- That is a shop feature. This makes it a product a partner runs.
--
-- A partner sets up a station, gets a code, prints the QR, and their customers
-- scan it. The job knows whose shop it belongs to, which printer it is for,
-- and what that shop charges — so two shops on the same platform can charge
-- differently and neither can see the other's files.

create table if not exists public.print_stations (
  id uuid primary key default gen_random_uuid(),

  -- The shop. A partner may run more than one counter.
  partner_id uuid not null references public.agency_partners(id) on delete cascade,

  /*
    The code inside the QR, and what a customer sees in the URL.

    Short, unambiguous and case-insensitive: this ends up printed on a card
    taped to a counter, read by a phone camera in bad light, and occasionally
    typed by hand. The characters that look alike are excluded when it is
    generated (see src/lib/print/stations.ts).
  */
  code text not null unique,

  display_name text not null,
  address text,

  /*
    What this shop charges, in rupees per page.

    Held here rather than in code because it is the shop's decision — paper
    costs differ by town — and because changing it should never need a deploy.
    The platform's floor and ceiling are enforced when a station saves, not
    here, so an administrator can widen them without a migration.
  */
  rate_a4_mono numeric(10, 2) not null default 2.00,
  rate_a4_color numeric(10, 2) not null default 10.00,
  rate_a3_mono numeric(10, 2) not null default 5.00,
  rate_a3_color numeric(10, 2) not null default 20.00,

  /*
    Open or closed, by the shop's own hand.

    A shop that has shut for the night must be able to stop taking money for
    prints nobody will collect. This is that switch, and the customer page
    says so plainly rather than failing at payment.
  */
  accepting_orders boolean not null default true,
  is_active boolean not null default true,

  /*
    How long a customer's file lives.

    The promise this product is sold on: the shop never sees your document.
    A short window is the whole point, so it is per station but bounded — see
    the check below — and the customer page counts it down.
  */
  auto_delete_minutes int not null default 15 check (auto_delete_minutes between 5 and 120),

  /*
    The desktop agent's credential, hashed.

    Never stored in the clear: this repository has one global key in an
    environment variable today, and a leaked per-shop token must not be
    readable from a database dump. The plain token is shown to the partner
    once, at setup, and never again.
  */
  agent_token_hash text,
  agent_last_seen_at timestamptz,
  printer_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists print_stations_partner_idx on public.print_stations (partner_id);
create index if not exists print_stations_code_idx on public.print_stations (lower(code));

-- Which shop a job belongs to. Null means the platform's own counter, which
-- is every job that exists today.
alter table public.print_jobs
  add column if not exists station_id uuid references public.print_stations(id) on delete set null,
  add column if not exists expires_at timestamptz,
  add column if not exists pickup_pin text;

create index if not exists print_jobs_station_idx on public.print_jobs (station_id, created_at desc);

comment on column public.print_jobs.expires_at is
  'When the uploaded file is deleted. Set from the station''s auto_delete_minutes.';
comment on column public.print_jobs.pickup_pin is
  'Four digits printed on the job slip. The customer quotes it to collect their pages.';

alter table public.print_stations enable row level security;

/*
  No browser reads or writes this table.

  The customer page needs a station's name and rates, and the agent needs its
  own row — both go through the service role in server code, which can scope
  what it returns. A public select policy here would expose every shop's
  token hash and takings to anybody with the anon key.
*/
drop policy if exists "print stations are server-only" on public.print_stations;
create policy "print stations are server-only"
  on public.print_stations for all
  using (false)
  with check (false);
