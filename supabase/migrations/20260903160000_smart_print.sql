-- ============================================================================
-- DigiConnect Smart Print
--
-- The counter page could take a file, a paper size and mono-or-colour. Every
-- other thing a print shop actually does — twelve passport photos on one
-- sheet, an Aadhaar front and back on a single A4, four ID cards to a page —
-- was a conversation with the person behind the desk, which meant the customer
-- had to be standing there to have it.
--
-- Two columns and a settings blob are all the schema this needs, because the
-- work happens in the browser: it composes the finished sheet from the
-- customer's uploads and sends that as the job's file. The printer keeps
-- receiving one print-ready file, exactly as before.
--
--   service_type  which of the ten services this was ordered as
--   settings      what the customer chose, kept whole so the shop can read
--                 back "35 × 45, glossy, 12 photos" months later
--   sheet_count   sheets of paper this puts through the printer, which is
--                 what the price was calculated from
--
-- And on the station, one blob of the shop's own defaults per service — so a
-- shop that always sells eight photos rather than twelve says it once.
--
-- Safe / reversible: three added columns, all nullable or defaulted. No
-- existing row changes and nothing is dropped.
-- ============================================================================

alter table public.print_jobs
  add column if not exists service_type text not null default 'document',
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists sheet_count integer not null default 1;

comment on column public.print_jobs.service_type is
  'Which Smart Print service was ordered: passport_photo, id_copy, document, and so on.';
comment on column public.print_jobs.settings is
  'The customer''s choices, kept whole — paper, colour, finish, quality, counts, arrangement.';
comment on column public.print_jobs.sheet_count is
  'Sheets of paper this job uses. The price is this times copies times the rate.';

-- The partner queue filters by service; the queue is already indexed by
-- station and status, so this only adds the service dimension.
create index if not exists print_jobs_service_idx on public.print_jobs (service_type, created_at desc);

alter table public.print_stations
  add column if not exists smart_print_defaults jsonb not null default '{}'::jsonb,
  -- A shop that wants to look at every job before it prints. Off means the
  -- job goes straight to the printer, which is how it has always worked.
  add column if not exists require_approval boolean not null default false;

comment on column public.print_stations.smart_print_defaults is
  'Per-service overrides of the platform presets, keyed by service id. A shop sets only what it cares about.';
comment on column public.print_stations.require_approval is
  'When true, a paid job waits in the panel until the partner releases it to the printer.';
