alter table public.payments
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists razorpay_signature text,
  add column if not exists razorpay_status text,
  add column if not exists payment_method text,
  add column if not exists paid_at timestamptz;

create index if not exists payments_razorpay_order_id_idx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists payments_razorpay_payment_id_idx
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;
