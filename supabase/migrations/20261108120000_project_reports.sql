-- Detailed Project Reports (DPR) prepared by admins for customers' loan files.
--
-- The admin enters the project — capital items, products and capacity, raw
-- material, staff, overheads, loan terms — and src/lib/project-reports/engine.ts
-- works out the cost of project, means of finance, projections, repayment
-- schedule, DSCR and break-even every time it is shown or printed. `input`
-- is that entry; the summary columns beside it exist only for the list.
--
-- RLS is on with no policies: only the service role, used by the
-- admin-checked API routes, can read or write. Customers never see this table.

create table if not exists public.project_reports (
  id uuid primary key default gen_random_uuid(),
  serial_no bigint generated always as identity,
  business_name text not null,
  promoter_name text not null default '',
  mobile text,
  scheme text not null default 'none',
  project_cost numeric(14, 2) not null default 0,
  bank_loan numeric(14, 2) not null default 0,
  input jsonb not null,
  status text not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_reports_status_check check (status in ('draft', 'final')),
  constraint project_reports_input_object check (jsonb_typeof(input) = 'object'),
  constraint project_reports_amounts_check check (project_cost >= 0 and bank_loan >= 0)
);

create unique index if not exists project_reports_serial_no_idx on public.project_reports (serial_no);
create index if not exists project_reports_updated_at_idx on public.project_reports (updated_at desc);
create index if not exists project_reports_mobile_idx on public.project_reports (mobile);
create index if not exists project_reports_business_name_idx on public.project_reports (lower(business_name));

create or replace function public.touch_project_reports_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_project_reports_updated_at on public.project_reports;
create trigger trg_touch_project_reports_updated_at
  before update on public.project_reports
  for each row
  execute function public.touch_project_reports_updated_at();

alter table public.project_reports enable row level security;
revoke all on public.project_reports from anon, authenticated;
