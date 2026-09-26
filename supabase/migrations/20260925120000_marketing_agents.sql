-- Daily marketing agents: one row per run (research → prompt → post → publish).
--
-- Only the server (service role) reads or writes this table; RLS is on with
-- no policies, so the anon and authenticated roles see nothing.

create table if not exists public.marketing_agent_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  trigger text not null check (trigger in ('cron', 'manual')),
  mode text not null check (mode in ('draft', 'live')),
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed')),
  stage text not null default 'starting',
  service_slug text,
  service_title text,
  research jsonb,
  creative jsonb,
  posts jsonb,
  prepared jsonb,
  results jsonb not null default '[]'::jsonb,
  image_url text,
  image_path text,
  article_id uuid references public.articles(id) on delete set null,
  article_slug text,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- The daily cron may be retried by the scheduler; this makes a second run
-- on the same Indian date impossible, so nothing is ever posted twice.
create unique index if not exists marketing_agent_runs_one_cron_per_day
  on public.marketing_agent_runs (run_date)
  where trigger = 'cron';

create index if not exists marketing_agent_runs_created_idx
  on public.marketing_agent_runs (created_at desc);

alter table public.marketing_agent_runs enable row level security;

-- Posters must be publicly readable: Instagram, Facebook, Threads, Telegram
-- and Pinterest fetch the image from this URL themselves.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketing-posts', 'marketing-posts', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true;
