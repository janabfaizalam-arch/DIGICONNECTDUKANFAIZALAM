create extension if not exists pgcrypto;

create table if not exists public.offline_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_name text not null,
  mobile text not null,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  gst_number text,
  service_name text not null,
  service_category text,
  description text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax_percent numeric(6,2) not null default 0,
  extra_charges numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_status text not null default 'Pending',
  payment_method text not null default 'Cash',
  amount_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offline_invoices_payment_status_check check (payment_status in ('Pending', 'Paid', 'Partial')),
  constraint offline_invoices_payment_method_check check (payment_method in ('Cash', 'UPI', 'Razorpay', 'Bank Transfer', 'Card')),
  constraint offline_invoices_amounts_check check (
    quantity >= 0
    and unit_price >= 0
    and discount >= 0
    and tax_percent >= 0
    and extra_charges >= 0
    and total_amount >= 0
    and amount_paid >= 0
    and balance_due >= 0
  )
);

create index if not exists offline_invoices_created_at_idx on public.offline_invoices (created_at desc);
create index if not exists offline_invoices_payment_status_idx on public.offline_invoices (payment_status, created_at desc);
create index if not exists offline_invoices_mobile_idx on public.offline_invoices (mobile);
create index if not exists offline_invoices_customer_name_idx on public.offline_invoices (lower(customer_name));

create or replace function public.generate_offline_invoice_number()
returns trigger
language plpgsql
as $$
declare
  v_date text := to_char(coalesce(new.created_at, now()), 'YYYYMMDD');
  v_prefix text := 'DIGI-OFF-' || to_char(coalesce(new.created_at, now()), 'YYYYMMDD') || '-';
  v_next integer;
begin
  if new.invoice_number is not null and new.invoice_number <> '' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('offline_invoices_' || v_date));

  select coalesce(max(substring(invoice_number from 19 for 4)::integer), 0) + 1
    into v_next
  from public.offline_invoices
  where invoice_number like v_prefix || '%';

  new.invoice_number := v_prefix || lpad(v_next::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_generate_offline_invoice_number on public.offline_invoices;
create trigger trg_generate_offline_invoice_number
  before insert on public.offline_invoices
  for each row
  execute function public.generate_offline_invoice_number();

create or replace function public.touch_offline_invoices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_offline_invoices_updated_at on public.offline_invoices;
create trigger trg_touch_offline_invoices_updated_at
  before update on public.offline_invoices
  for each row
  execute function public.touch_offline_invoices_updated_at();

alter table public.offline_invoices enable row level security;

drop policy if exists "Admins manage offline invoices" on public.offline_invoices;
create policy "Admins manage offline invoices" on public.offline_invoices
  for all
  using (
    public.is_admin_role()
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  )
  with check (
    public.is_admin_role()
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  );
