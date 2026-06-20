-- ============================================================
-- Credit Score & Credit Report Module
-- DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
-- ============================================================

-- 1. credit_reports table
create table if not exists public.credit_reports (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  mobile text not null,
  pan text not null,
  dob date not null,
  credit_score integer,
  bureau_name text,
  report_reference text,
  report_pdf_url text,
  status text not null default 'pending' check (
    status in ('pending', 'payment_pending', 'payment_verified', 'processing', 'completed', 'failed', 'expired')
  ),
  provider text not null default 'unifers',
  package_type text not null default 'score_check' check (
    package_type in ('score_check', 'report_pdf', 'premium')
  ),
  score_category text,
  credit_rating text,
  payment_id uuid,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric(10, 2) not null default 0,
  response_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists credit_reports_customer_id_idx on public.credit_reports (customer_id, created_at desc);
create index if not exists credit_reports_mobile_idx on public.credit_reports (mobile);
create index if not exists credit_reports_pan_idx on public.credit_reports (pan);
create index if not exists credit_reports_created_at_idx on public.credit_reports (created_at desc);
create index if not exists credit_reports_status_idx on public.credit_reports (status);
create index if not exists credit_reports_razorpay_order_id_idx on public.credit_reports (razorpay_order_id) where razorpay_order_id is not null;

-- 2. credit_audit_logs table
create table if not exists public.credit_audit_logs (
  id uuid primary key default gen_random_uuid(),
  credit_report_id uuid references public.credit_reports (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists credit_audit_logs_report_idx on public.credit_audit_logs (credit_report_id, created_at desc);
create index if not exists credit_audit_logs_user_idx on public.credit_audit_logs (user_id, created_at desc);

-- 3. credit_payments table (links to Razorpay orders for credit services)
create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  credit_report_id uuid not null references public.credit_reports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'refunded')),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credit_payments_report_idx on public.credit_payments (credit_report_id);
create index if not exists credit_payments_user_idx on public.credit_payments (user_id, created_at desc);
create unique index if not exists credit_payments_razorpay_payment_id_idx on public.credit_payments (razorpay_payment_id) where razorpay_payment_id is not null;

-- 4. Enable Row Level Security
alter table public.credit_reports enable row level security;
alter table public.credit_audit_logs enable row level security;
alter table public.credit_payments enable row level security;

-- 5. RLS Policies — credit_reports

-- Customers can only read their own reports
drop policy if exists "Customers can read own credit reports" on public.credit_reports;
create policy "Customers can read own credit reports" on public.credit_reports
  for select using (auth.uid() = customer_id);

-- Customers can insert their own reports (via API route)
drop policy if exists "Customers can create own credit reports" on public.credit_reports;
create policy "Customers can create own credit reports" on public.credit_reports
  for insert with check (auth.uid() = customer_id);

-- 6. RLS Policies — credit_payments

-- Customers can read their own payments
drop policy if exists "Customers can read own credit payments" on public.credit_payments;
create policy "Customers can read own credit payments" on public.credit_payments
  for select using (auth.uid() = user_id);

-- 7. RLS Policies — credit_audit_logs

-- Customers can read their own audit logs
drop policy if exists "Customers can read own credit audit logs" on public.credit_audit_logs;
create policy "Customers can read own credit audit logs" on public.credit_audit_logs
  for select using (auth.uid() = user_id);

-- 8. Storage bucket for credit report PDFs
insert into storage.buckets (id, name, public)
values ('credit-reports', 'credit-reports', false)
on conflict (id) do nothing;

-- Storage policy: authenticated users can read their own reports
drop policy if exists "Authenticated users can read credit reports" on storage.objects;
create policy "Authenticated users can read credit reports" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'credit-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
