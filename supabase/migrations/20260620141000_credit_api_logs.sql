-- ============================================================
-- Credit API Logs Table
-- DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
-- ============================================================

create table if not exists public.credit_api_logs (
  id uuid primary key default gen_random_uuid(),
  credit_report_id uuid references public.credit_reports (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  endpoint text not null,
  request_payload jsonb, -- Note: PAN numbers must be masked in this JSON
  response_payload jsonb,
  status_code integer,
  is_success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists credit_api_logs_report_idx on public.credit_api_logs (credit_report_id, created_at desc);
create index if not exists credit_api_logs_user_idx on public.credit_api_logs (user_id, created_at desc);

-- Enable RLS
alter table public.credit_api_logs enable row level security;

-- Admin-only select policy (or bypass via service role key)
drop policy if exists "Admins can view API logs" on public.credit_api_logs;
create policy "Admins can view API logs" on public.credit_api_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
