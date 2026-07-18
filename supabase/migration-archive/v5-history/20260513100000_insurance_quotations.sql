create table if not exists public.insurance_quotations (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique not null,
  customer_name text not null,
  mobile text not null,
  email text,
  address text,
  vehicle_type text not null,
  vehicle_number text not null,
  make text,
  model text,
  variant text,
  fuel_type text,
  registration_year text,
  previous_policy_expiry date,
  ncb text,
  idv_amount numeric,
  insurance_type text not null,
  policy_duration text,
  insurer_company text,
  premium_amount numeric not null,
  gst_amount numeric default 0,
  total_amount numeric not null,
  addons text,
  documents_required text,
  notes text,
  valid_till date,
  status text default 'draft',
  public_token text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint insurance_quotations_status_check check (
    status in ('draft', 'sent', 'accepted', 'rejected', 'expired')
  )
);

create index if not exists insurance_quotations_created_at_idx
  on public.insurance_quotations (created_at desc);

create index if not exists insurance_quotations_public_token_idx
  on public.insurance_quotations (public_token);

create index if not exists insurance_quotations_status_idx
  on public.insurance_quotations (status, valid_till);

create or replace function public.set_insurance_quotations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists insurance_quotations_updated_at on public.insurance_quotations;
create trigger insurance_quotations_updated_at
  before update on public.insurance_quotations
  for each row
  execute function public.set_insurance_quotations_updated_at();

alter table public.insurance_quotations enable row level security;

drop policy if exists "Admins manage insurance quotations" on public.insurance_quotations;
create policy "Admins manage insurance quotations" on public.insurance_quotations
  for all
  using (public.is_admin_role())
  with check (public.is_admin_role());

create or replace function public.get_public_insurance_quotation(p_quote_id text)
returns setof public.insurance_quotations
language sql
security definer
set search_path = public
as $$
  select *
  from public.insurance_quotations
  where public_token = regexp_replace(p_quote_id, '[^a-zA-Z0-9-]', '', 'g')
     or id::text = regexp_replace(p_quote_id, '[^a-zA-Z0-9-]', '', 'g')
  limit 1;
$$;

revoke all on function public.get_public_insurance_quotation(text) from public;
grant execute on function public.get_public_insurance_quotation(text) to anon, authenticated;
