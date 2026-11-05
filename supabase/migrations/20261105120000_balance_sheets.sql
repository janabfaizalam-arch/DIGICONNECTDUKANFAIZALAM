-- Bank-ready balance sheets prepared by admins for customers.
--
-- The admin types in the customer's basic figures; the statements themselves
-- (Trading and P&L, Balance Sheet, ratios) are worked out from `figures` by
-- src/lib/balance-sheets/engine.ts every time they are shown or printed, so
-- the stored record is the input and nothing is computed twice.
--
-- RLS is on and there are no policies: only the service role, used by the
-- admin-checked API routes, can read or write. Customers never see this table.

create table if not exists public.balance_sheets (
  id uuid primary key default gen_random_uuid(),
  serial_no bigint generated always as identity,
  business_name text not null,
  owner_name text not null,
  constitution text not null default 'proprietorship',
  nature_of_business text,
  pan text,
  gstin text,
  udyam_number text,
  address text,
  city text,
  state text,
  pincode text,
  mobile text,
  email text,
  bank_name text,
  loan_purpose text,
  loan_amount numeric(14, 2),
  base_year integer not null,
  has_actual boolean not null default true,
  figures jsonb not null,
  status text not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint balance_sheets_status_check check (status in ('draft', 'final')),
  constraint balance_sheets_constitution_check check (
    constitution in ('proprietorship', 'partnership', 'llp', 'private_limited', 'opc', 'other')
  ),
  constraint balance_sheets_base_year_check check (base_year between 2000 and 2100),
  constraint balance_sheets_loan_amount_check check (loan_amount is null or loan_amount >= 0)
);

create unique index if not exists balance_sheets_serial_no_idx on public.balance_sheets (serial_no);
create index if not exists balance_sheets_updated_at_idx on public.balance_sheets (updated_at desc);
create index if not exists balance_sheets_mobile_idx on public.balance_sheets (mobile);
create index if not exists balance_sheets_business_name_idx on public.balance_sheets (lower(business_name));

create or replace function public.touch_balance_sheets_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_balance_sheets_updated_at on public.balance_sheets;
create trigger trg_touch_balance_sheets_updated_at
  before update on public.balance_sheets
  for each row
  execute function public.touch_balance_sheets_updated_at();

alter table public.balance_sheets enable row level security;
