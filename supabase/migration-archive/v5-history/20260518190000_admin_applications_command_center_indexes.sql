-- Non-destructive support indexes for the admin applications command center filters/search.
-- These complement the earlier staff/security index migration and are safe to re-run.

create index if not exists applications_service_name_created_idx
  on public.applications (service_name, created_at desc);

create index if not exists applications_source_created_idx
  on public.applications (source, created_at desc);

create index if not exists applications_submitted_by_role_created_idx
  on public.applications (submitted_by_role, created_at desc);

create index if not exists applications_razorpay_payment_idx
  on public.applications (razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists applications_razorpay_order_idx
  on public.applications (razorpay_order_id)
  where razorpay_order_id is not null;
