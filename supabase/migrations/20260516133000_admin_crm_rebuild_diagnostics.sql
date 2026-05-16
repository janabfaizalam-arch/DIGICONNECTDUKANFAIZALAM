create extension if not exists pgcrypto with schema extensions;

create index if not exists applications_created_at_idx
  on public.applications (created_at desc);

create index if not exists applications_status_idx
  on public.applications (status);

create index if not exists applications_payment_status_idx
  on public.applications (payment_status);

create index if not exists applications_customer_idx
  on public.applications (customer_id, created_at desc);

create index if not exists applications_razorpay_order_id_idx
  on public.applications (razorpay_order_id)
  where razorpay_order_id is not null;

create index if not exists applications_razorpay_payment_id_idx
  on public.applications (razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists payments_application_idx
  on public.payments (application_id);

create index if not exists payments_status_idx
  on public.payments (status, created_at desc);

create index if not exists payments_created_at_idx
  on public.payments (created_at desc);

create index if not exists payments_razorpay_order_id_idx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists payments_razorpay_payment_id_idx
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

create or replace view public.admin_crm_application_facts as
select
  a.id as application_id,
  a.user_id,
  a.customer_id,
  a.service_slug,
  a.service_name,
  a.status as application_status,
  a.payment_status,
  coalesce(a.total_amount, a.amount, 0)::numeric as total_amount,
  coalesce(a.fresh_payable_amount, a.real_payment_amount, a.amount, 0)::numeric as fresh_payable_amount,
  coalesce(a.wallet_redeemed_amount, a.wallet_used_amount, 0)::numeric as wallet_redeemed_amount,
  a.razorpay_order_id,
  a.razorpay_payment_id,
  a.created_at,
  a.submitted_at,
  a.paid_at,
  a.updated_at,
  case when a.payment_status in ('verified', 'paid') then true else false end as is_paid,
  case when a.status = 'payment_pending' or a.payment_status in ('unpaid', 'pending') then true else false end as is_payment_pending,
  case when a.status = 'payment_failed' or a.payment_status = 'failed' then true else false end as is_failed_payment
from public.applications a;

create or replace view public.admin_crm_payment_facts as
select
  p.id as payment_id,
  p.application_id,
  p.user_id,
  p.status as payment_status,
  coalesce(p.real_payment_amount, p.amount, 0)::numeric as paid_amount,
  coalesce(p.wallet_used_amount, 0)::numeric as wallet_used_amount,
  p.razorpay_order_id,
  p.razorpay_payment_id,
  p.payment_method,
  p.paid_at,
  p.created_at,
  row_number() over (
    partition by coalesce(p.razorpay_payment_id, p.id::text)
    order by p.created_at desc, p.id desc
  ) as payment_rank,
  count(*) over (partition by p.razorpay_payment_id) as razorpay_payment_duplicate_count,
  count(*) over (partition by p.razorpay_order_id) as razorpay_order_duplicate_count
from public.payments p;

create or replace view public.admin_crm_diagnostics as
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
