create extension if not exists pgcrypto with schema extensions;

alter table public.applications
  add column if not exists total_amount numeric(10, 2),
  add column if not exists wallet_redeemed_amount numeric(10, 2) not null default 0,
  add column if not exists fresh_payable_amount numeric(10, 2),
  add column if not exists cashback_eligible_amount numeric(10, 2),
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists submitted_at timestamptz,
  add column if not exists paid_at timestamptz;

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in (
    'new',
    'documents_pending',
    'payment_pending',
    'payment_failed',
    'in_process',
    'in_progress',
    'submitted',
    'completed',
    'rejected'
  ));

alter table public.applications
  drop constraint if exists applications_payment_status_check;

alter table public.applications
  add constraint applications_payment_status_check
  check (payment_status in ('pending', 'verified', 'failed', 'refunded'));

update public.applications
set
  total_amount = coalesce(total_amount, amount),
  fresh_payable_amount = coalesce(fresh_payable_amount, real_payment_amount, amount),
  cashback_eligible_amount = coalesce(cashback_eligible_amount, real_payment_amount, amount)
where total_amount is null
  or fresh_payable_amount is null
  or cashback_eligible_amount is null;

update public.applications a
set
  razorpay_order_id = coalesce(a.razorpay_order_id, p.razorpay_order_id),
  razorpay_payment_id = coalesce(a.razorpay_payment_id, p.razorpay_payment_id),
  paid_at = coalesce(a.paid_at, p.paid_at),
  payment_status = case
    when coalesce(a.payment_status, '') = 'pending' and p.status = 'verified' then 'verified'
    else a.payment_status
  end
from public.payments p
where p.application_id = a.id
  and (a.razorpay_order_id is null or a.razorpay_payment_id is null or a.paid_at is null);

create index if not exists applications_status_created_idx
  on public.applications (status, created_at desc);

create index if not exists applications_payment_status_created_idx
  on public.applications (payment_status, created_at desc);

create index if not exists applications_razorpay_order_id_idx
  on public.applications (razorpay_order_id)
  where razorpay_order_id is not null;

create index if not exists applications_razorpay_payment_id_idx
  on public.applications (razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists payments_razorpay_order_id_idx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists payments_razorpay_payment_id_idx
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

create or replace view public.crm_application_payment_diagnostics as
select
  extensions.gen_random_uuid() as id,
  'verified_payment_without_verified_application'::text as issue_type,
  p.application_id,
  p.user_id,
  p.razorpay_order_id,
  p.razorpay_payment_id,
  p.amount,
  p.status as payment_status,
  a.status as application_status,
  a.payment_status as application_payment_status,
  p.created_at
from public.payments p
left join public.applications a on a.id = p.application_id
where p.status = 'verified'
  and (a.id is null or coalesce(a.payment_status, '') <> 'verified')
union all
select
  extensions.gen_random_uuid() as id,
  'paid_application_without_payment_row'::text as issue_type,
  a.id as application_id,
  a.user_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  a.amount,
  null::text as payment_status,
  a.status as application_status,
  a.payment_status as application_payment_status,
  a.created_at
from public.applications a
left join public.payments p on p.application_id = a.id
where a.payment_status = 'verified'
  and p.id is null
union all
select
  extensions.gen_random_uuid() as id,
  'payment_pending_too_old'::text as issue_type,
  a.id as application_id,
  a.user_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  a.amount,
  p.status as payment_status,
  a.status as application_status,
  a.payment_status as application_payment_status,
  a.created_at
from public.applications a
left join public.payments p on p.application_id = a.id
where a.status = 'payment_pending'
  and a.created_at < now() - interval '1 day'
union all
select
  extensions.gen_random_uuid() as id,
  'missing_service_slug_or_customer'::text as issue_type,
  a.id as application_id,
  a.user_id,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  a.amount,
  p.status as payment_status,
  a.status as application_status,
  a.payment_status as application_payment_status,
  a.created_at
from public.applications a
left join public.payments p on p.application_id = a.id
where coalesce(a.service_slug, '') = ''
  or (a.user_id is null and a.customer_id is null);
