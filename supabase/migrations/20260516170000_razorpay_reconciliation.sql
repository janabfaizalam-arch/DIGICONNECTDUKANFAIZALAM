create extension if not exists pgcrypto with schema extensions;

create table if not exists public.unmatched_razorpay_payments (
  id uuid primary key default extensions.gen_random_uuid(),
  razorpay_payment_id text not null unique,
  razorpay_order_id text,
  amount numeric(10, 2) not null default 0,
  currency text not null default 'INR',
  razorpay_status text not null,
  payment_method text,
  email text,
  contact text,
  paid_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_application_id uuid references public.applications (id) on delete set null,
  resolved_payment_id uuid references public.payments (id) on delete set null,
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists unmatched_razorpay_payments_status_idx
  on public.unmatched_razorpay_payments (razorpay_status, last_seen_at desc);

create index if not exists unmatched_razorpay_payments_unresolved_idx
  on public.unmatched_razorpay_payments (last_seen_at desc)
  where resolved_at is null;

create index if not exists unmatched_razorpay_payments_order_idx
  on public.unmatched_razorpay_payments (razorpay_order_id)
  where razorpay_order_id is not null;

create table if not exists public.razorpay_reconciliation_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  action text not null,
  admin_user_id uuid references auth.users (id) on delete set null,
  razorpay_payment_id text,
  razorpay_order_id text,
  application_id uuid references public.applications (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  before_metadata jsonb not null default '{}'::jsonb,
  after_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists razorpay_reconciliation_logs_created_idx
  on public.razorpay_reconciliation_logs (created_at desc);

create index if not exists razorpay_reconciliation_logs_payment_idx
  on public.razorpay_reconciliation_logs (razorpay_payment_id, created_at desc)
  where razorpay_payment_id is not null;

alter table public.unmatched_razorpay_payments enable row level security;
alter table public.razorpay_reconciliation_logs enable row level security;

create or replace view public.admin_crm_diagnostics as
select
  extensions.gen_random_uuid() as id,
  'unmatched_razorpay_payment'::text as issue_type,
  'critical'::text as severity,
  null::uuid as application_id,
  null::uuid as payment_id,
  u.razorpay_order_id,
  u.razorpay_payment_id,
  'Razorpay payment exists but no application is matched in CRM. Link it manually or create the application from real customer/service details.'::text as message,
  u.last_seen_at as created_at
from public.unmatched_razorpay_payments u
where u.resolved_at is null
union all
select
  extensions.gen_random_uuid() as id,
  'orphan_verified_payment'::text as issue_type,
  'critical'::text as severity,
  p.application_id,
  p.payment_id,
  p.razorpay_order_id,
  p.razorpay_payment_id,
  'Verified payment exists without a matching application.'::text as message,
  p.created_at
from public.admin_crm_payment_facts p
left join public.applications a on a.id = p.application_id
where p.payment_status in ('verified', 'paid')
  and a.id is null
union all
select
  extensions.gen_random_uuid() as id,
  'duplicate_razorpay_payment_id'::text as issue_type,
  'critical'::text as severity,
  p.application_id,
  p.payment_id,
  p.razorpay_order_id,
  p.razorpay_payment_id,
  'Duplicate Razorpay payment id found. Review before changing records.'::text as message,
  p.created_at
from public.admin_crm_payment_facts p
where p.razorpay_payment_id is not null
  and p.razorpay_payment_duplicate_count > 1
union all
select
  extensions.gen_random_uuid() as id,
  'duplicate_razorpay_order_id'::text as issue_type,
  'warning'::text as severity,
  p.application_id,
  p.payment_id,
  p.razorpay_order_id,
  p.razorpay_payment_id,
  'Multiple payment rows share one Razorpay order id.'::text as message,
  p.created_at
from public.admin_crm_payment_facts p
where p.razorpay_order_id is not null
  and p.razorpay_order_duplicate_count > 1
union all
select
  extensions.gen_random_uuid() as id,
  'application_without_customer'::text as issue_type,
  'warning'::text as severity,
  a.application_id,
  null::uuid as payment_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  'Application has neither customer_id nor user_id.'::text as message,
  a.created_at
from public.admin_crm_application_facts a
where a.customer_id is null
  and a.user_id is null
union all
select
  extensions.gen_random_uuid() as id,
  'paid_application_without_payment'::text as issue_type,
  'critical'::text as severity,
  a.application_id,
  null::uuid as payment_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  'Application is paid/submitted but no payment row is linked.'::text as message,
  a.created_at
from public.admin_crm_application_facts a
left join public.payments p on p.application_id = a.application_id
where a.is_paid
  and p.id is null
union all
select
  extensions.gen_random_uuid() as id,
  'stale_payment_pending'::text as issue_type,
  'warning'::text as severity,
  a.application_id,
  p.id as payment_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  'Payment pending application is older than 30 minutes.'::text as message,
  a.created_at
from public.admin_crm_application_facts a
left join public.payments p on p.application_id = a.application_id
where a.is_payment_pending
  and a.created_at < now() - interval '30 minutes'
union all
select
  extensions.gen_random_uuid() as id,
  'amount_mismatch'::text as issue_type,
  'warning'::text as severity,
  a.application_id,
  p.payment_id,
  a.razorpay_order_id,
  p.razorpay_payment_id,
  'Application fresh payable amount and verified payment amount differ.'::text as message,
  greatest(a.created_at, p.created_at) as created_at
from public.admin_crm_application_facts a
join public.admin_crm_payment_facts p on p.application_id = a.application_id
where p.payment_status in ('verified', 'paid')
  and abs(coalesce(a.fresh_payable_amount, 0) - coalesce(p.paid_amount, 0)) > 1
union all
select
  extensions.gen_random_uuid() as id,
  'missing_service_slug'::text as issue_type,
  'warning'::text as severity,
  a.application_id,
  null::uuid as payment_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  'Application is missing service_slug.'::text as message,
  a.created_at
from public.admin_crm_application_facts a
where coalesce(a.service_slug, '') = ''
union all
select
  extensions.gen_random_uuid() as id,
  'missing_status'::text as issue_type,
  'warning'::text as severity,
  a.application_id,
  null::uuid as payment_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  'Application status or payment_status is missing.'::text as message,
  a.created_at
from public.admin_crm_application_facts a
where coalesce(a.application_status, '') = ''
  or coalesce(a.payment_status, '') = '';
