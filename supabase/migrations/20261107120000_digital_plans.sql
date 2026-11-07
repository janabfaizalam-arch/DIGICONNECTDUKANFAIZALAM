-- RNOS Digital packages: subscription plans, their features, add-on services,
-- price history and customer enquiries with quotations.
--
-- Additive only: no existing table is altered.
--
-- Money is integer paise throughout (₹999 = 99900), so no rupee figure is
-- ever a float.
--
-- Prices on a plan are the current list price. An enquiry copies the price it
-- was made at, and a quotation carries its own agreed figures, so editing a
-- plan never changes what an existing customer was quoted or agreed to.
-- `digital_plan_price_history` keeps every list price a plan has had.
--
-- RLS: the public may read active plans, their features and active add-ons
-- (the pricing page). Everything else — inactive rows, price history and
-- enquiries — is reachable only through the service role, used by the
-- admin-checked API routes, or by an admin's own session.

create table if not exists public.digital_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  best_for text not null default '',
  monthly_price_paise integer not null,
  setup_fee_paise integer not null default 0,
  price_is_starting boolean not null default false,
  commitment_months integer not null default 12,
  is_recommended boolean not null default false,
  is_active boolean not null default true,
  featured_on_homepage boolean not null default false,
  sort_order integer not null default 0,
  limits jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  maintenance text not null default '',
  terms text not null default '',
  faqs jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_plans_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint digital_plans_monthly_price_check check (monthly_price_paise >= 0),
  constraint digital_plans_setup_fee_check check (setup_fee_paise >= 0),
  constraint digital_plans_commitment_check check (commitment_months between 0 and 60),
  constraint digital_plans_limits_array check (jsonb_typeof(limits) = 'array'),
  constraint digital_plans_exclusions_array check (jsonb_typeof(exclusions) = 'array'),
  constraint digital_plans_faqs_array check (jsonb_typeof(faqs) = 'array')
);

create unique index if not exists digital_plans_slug_idx on public.digital_plans (slug);
create index if not exists digital_plans_sort_idx on public.digital_plans (sort_order, created_at);
-- At most one plan is marked recommended at a time.
create unique index if not exists digital_plans_one_recommended_idx on public.digital_plans (is_recommended) where is_recommended;

create table if not exists public.digital_plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.digital_plans (id) on delete cascade,
  feature_key text not null,
  label text not null,
  compare_label text not null,
  value text,
  feature_group text not null default 'website',
  highlight boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint digital_plan_features_key_format check (feature_key ~ '^[a-z0-9_]+$'),
  constraint digital_plan_features_group_check check (feature_group in ('website', 'commerce', 'platform', 'growth', 'care'))
);

create unique index if not exists digital_plan_features_plan_key_idx on public.digital_plan_features (plan_id, feature_key);
create index if not exists digital_plan_features_plan_sort_idx on public.digital_plan_features (plan_id, sort_order);

create table if not exists public.digital_addons (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text not null default '',
  price_paise integer not null,
  unit text not null default 'one_time',
  price_is_starting boolean not null default false,
  note text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_addons_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint digital_addons_price_check check (price_paise >= 0),
  constraint digital_addons_unit_check check (unit in ('one_time', 'monthly', 'per_page', 'per_product'))
);

create unique index if not exists digital_addons_slug_idx on public.digital_addons (slug);

create table if not exists public.digital_plan_addons (
  plan_id uuid not null references public.digital_plans (id) on delete cascade,
  addon_id uuid not null references public.digital_addons (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (plan_id, addon_id)
);

create table if not exists public.digital_plan_price_history (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.digital_plans (id) on delete cascade,
  monthly_price_paise integer not null,
  setup_fee_paise integer not null,
  price_is_starting boolean not null,
  changed_by uuid references auth.users (id) on delete set null,
  effective_from timestamptz not null default now()
);

create index if not exists digital_plan_price_history_plan_idx on public.digital_plan_price_history (plan_id, effective_from desc);

create table if not exists public.digital_plan_enquiries (
  id uuid primary key default gen_random_uuid(),
  serial_no bigint generated always as identity,
  reference text generated always as ('RD-' || lpad(serial_no::text, 5, '0')) stored,
  plan_id uuid references public.digital_plans (id) on delete set null,
  -- What the customer saw when they enquired, copied rather than joined.
  plan_slug text not null,
  plan_name text not null,
  monthly_price_paise integer not null,
  setup_fee_paise integer not null,
  price_is_starting boolean not null default false,
  commitment_months integer not null default 12,
  name text not null,
  mobile text not null,
  email text,
  business_name text,
  requirements text,
  addon_slugs text[] not null default '{}',
  lead_id uuid references public.leads (id) on delete set null,
  status text not null default 'new',
  -- The quotation, prepared by an admin. Its figures are the agreed price.
  quote_monthly_paise integer,
  quote_setup_paise integer,
  quote_lines jsonb not null default '[]'::jsonb,
  quote_gst_percent numeric(5, 2) not null default 18,
  quote_commitment_months integer,
  quote_notes text,
  quote_valid_until date,
  quote_token text,
  quoted_at timestamptz,
  quoted_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  approval_name text,
  declined_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_plan_enquiries_status_check check (status in ('new', 'contacted', 'quoted', 'approved', 'declined', 'won', 'lost')),
  constraint digital_plan_enquiries_prices_check check (monthly_price_paise >= 0 and setup_fee_paise >= 0),
  constraint digital_plan_enquiries_quote_prices_check check (
    (quote_monthly_paise is null or quote_monthly_paise >= 0) and (quote_setup_paise is null or quote_setup_paise >= 0)
  ),
  constraint digital_plan_enquiries_quote_lines_array check (jsonb_typeof(quote_lines) = 'array'),
  constraint digital_plan_enquiries_gst_check check (quote_gst_percent between 0 and 28),
  -- A customer can only approve a quotation that exists.
  constraint digital_plan_enquiries_approval_needs_quote check (approved_at is null or quoted_at is not null)
);

create unique index if not exists digital_plan_enquiries_serial_idx on public.digital_plan_enquiries (serial_no);
create unique index if not exists digital_plan_enquiries_token_idx on public.digital_plan_enquiries (quote_token) where quote_token is not null;
create index if not exists digital_plan_enquiries_created_idx on public.digital_plan_enquiries (created_at desc);
create index if not exists digital_plan_enquiries_status_idx on public.digital_plan_enquiries (status, created_at desc);
create index if not exists digital_plan_enquiries_mobile_idx on public.digital_plan_enquiries (mobile);

/* ── updated_at ─────────────────────────────────────────────────────────── */

create or replace function public.touch_digital_plans_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_digital_plans_updated_at on public.digital_plans;
create trigger trg_touch_digital_plans_updated_at
  before update on public.digital_plans
  for each row execute function public.touch_digital_plans_updated_at();

drop trigger if exists trg_touch_digital_addons_updated_at on public.digital_addons;
create trigger trg_touch_digital_addons_updated_at
  before update on public.digital_addons
  for each row execute function public.touch_digital_plans_updated_at();

drop trigger if exists trg_touch_digital_plan_enquiries_updated_at on public.digital_plan_enquiries;
create trigger trg_touch_digital_plan_enquiries_updated_at
  before update on public.digital_plan_enquiries
  for each row execute function public.touch_digital_plans_updated_at();

/* ── price history ──────────────────────────────────────────────────────── */

-- Every list price a plan has had, written by the database so no code path
-- can change a price without leaving a record.
create or replace function public.record_digital_plan_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.monthly_price_paise is distinct from old.monthly_price_paise
     or new.setup_fee_paise is distinct from old.setup_fee_paise
     or new.price_is_starting is distinct from old.price_is_starting then
    insert into public.digital_plan_price_history (plan_id, monthly_price_paise, setup_fee_paise, price_is_starting, changed_by)
    values (new.id, new.monthly_price_paise, new.setup_fee_paise, new.price_is_starting, new.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_record_digital_plan_price on public.digital_plans;
create trigger trg_record_digital_plan_price
  after insert or update on public.digital_plans
  for each row execute function public.record_digital_plan_price();

/* ── RLS ────────────────────────────────────────────────────────────────── */

alter table public.digital_plans enable row level security;
alter table public.digital_plan_features enable row level security;
alter table public.digital_addons enable row level security;
alter table public.digital_plan_addons enable row level security;
alter table public.digital_plan_price_history enable row level security;
alter table public.digital_plan_enquiries enable row level security;

drop policy if exists "Public reads active digital plans" on public.digital_plans;
create policy "Public reads active digital plans" on public.digital_plans
  for select using (is_active or public.is_admin_role());

drop policy if exists "Public reads features of active plans" on public.digital_plan_features;
create policy "Public reads features of active plans" on public.digital_plan_features
  for select using (
    exists (select 1 from public.digital_plans p where p.id = plan_id and (p.is_active or public.is_admin_role()))
  );

drop policy if exists "Public reads active digital addons" on public.digital_addons;
create policy "Public reads active digital addons" on public.digital_addons
  for select using (is_active or public.is_admin_role());

drop policy if exists "Public reads plan addon links" on public.digital_plan_addons;
create policy "Public reads plan addon links" on public.digital_plan_addons
  for select using (
    exists (select 1 from public.digital_plans p where p.id = plan_id and (p.is_active or public.is_admin_role()))
  );

drop policy if exists "Admins read digital plan price history" on public.digital_plan_price_history;
create policy "Admins read digital plan price history" on public.digital_plan_price_history
  for select using (public.is_admin_role());

drop policy if exists "Admins read digital plan enquiries" on public.digital_plan_enquiries;
create policy "Admins read digital plan enquiries" on public.digital_plan_enquiries
  for select using (public.is_admin_role());

-- No insert, update or delete policies: writes go through the admin-checked
-- API routes on the service role. Enquiries from the public are inserted by
-- the server after validation, never by the browser.

revoke all on public.digital_plan_price_history from anon;
revoke all on public.digital_plan_enquiries from anon;
revoke insert, update, delete on public.digital_plans, public.digital_plan_features, public.digital_addons, public.digital_plan_addons from anon, authenticated;
