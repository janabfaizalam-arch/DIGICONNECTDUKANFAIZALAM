-- DigiConnect Dukan V6 — Core Baseline
-- Local greenfield only. Do NOT apply to production that already has V5 schema.

create extension if not exists pgcrypto;

-- ── Roles ───────────────────────────────────────────────────────────────────
create type public.app_role as enum ('admin', 'customer', 'agency_partner');

-- ── Profiles (1:1 with auth.users) ──────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  mobile text not null default '',
  role public.app_role not null default 'customer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create unique index profiles_mobile_unique_idx
  on public.profiles (mobile)
  where mobile is not null and btrim(mobile) <> '';

-- ── Customers ───────────────────────────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  assigned_agent_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  mobile text not null,
  email text not null default '',
  city text not null default '',
  address text not null default '',
  state text not null default '',
  pincode text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_user_id_unique_idx
  on public.customers (user_id)
  where user_id is not null;
create unique index customers_mobile_unique_idx on public.customers (mobile);
create index customers_email_idx on public.customers (lower(email));
create index customers_assigned_idx on public.customers (assigned_agent_id);

-- ── Agency Partners ─────────────────────────────────────────────────────────
create table public.agency_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null default '',
  contact_name text not null default '',
  mobile text not null default '',
  email text not null default '',
  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended', 'rejected')),
  commission_rate numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agency_partners_status_idx on public.agency_partners (status);

-- ── Services (single catalog) ───────────────────────────────────────────────
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  amount numeric(10, 2) not null default 0,
  documents jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  process_steps jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_active_sort_idx on public.services (active, sort_order);

-- ── Applications ────────────────────────────────────────────────────────────
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  service_slug text not null default '',
  service_name text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'in_review', 'pending_documents', 'approved', 'rejected', 'completed', 'cancelled')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'partial')),
  amount numeric(10, 2) not null default 0,
  wallet_redeemed numeric(10, 2) not null default 0,
  fresh_payable numeric(10, 2) not null default 0,
  cashback_eligible numeric(10, 2) not null default 0,
  assigned_agent_id uuid references auth.users (id) on delete set null,
  agency_partner_id uuid references public.agency_partners (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  submitted_by_role text not null default 'customer'
    check (submitted_by_role in ('customer', 'agency_partner', 'admin')),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  tracking_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_idx on public.applications (user_id, created_at desc);
create index applications_customer_idx on public.applications (customer_id, created_at desc);
create index applications_status_idx on public.applications (status, payment_status);
create index applications_assigned_idx on public.applications (assigned_agent_id);
create index applications_partner_idx on public.applications (agency_partner_id);
create unique index applications_razorpay_order_uidx
  on public.applications (razorpay_order_id)
  where razorpay_order_id is not null;
create unique index applications_razorpay_payment_uidx
  on public.applications (razorpay_payment_id)
  where razorpay_payment_id is not null;

-- ── Application documents ───────────────────────────────────────────────────
create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_by_role text not null default 'customer'
    check (uploaded_by_role in ('customer', 'agency_partner', 'admin')),
  document_type text not null default 'other',
  document_name text not null default '',
  file_name text not null default '',
  file_type text not null default '',
  storage_path text not null default '',
  file_url text not null default '',
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  is_final boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz not null default now()
);

create index application_documents_app_idx on public.application_documents (application_id, created_at desc);

-- ── Payments ────────────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'refunded')),
  payment_method text,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  razorpay_status text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index payments_razorpay_order_uidx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;
create unique index payments_razorpay_payment_uidx
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;
create index payments_application_idx on public.payments (application_id);

-- ── Invoices ────────────────────────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  invoice_number text not null unique,
  amount numeric(10, 2) not null default 0,
  status text not null default 'issued'
    check (status in ('draft', 'issued', 'paid', 'cancelled')),
  issued_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Wallets ─────────────────────────────────────────────────────────────────
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null
    check (type in (
      'signup_bonus', 'referral_signup', 'referral_purchase',
      'first_service_cashback', 'fresh_payment_cashback',
      'redemption', 'reversal', 'admin_adjustment'
    )),
  amount numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  application_id uuid references public.applications (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  idempotency_key text not null,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);

-- ── Referrals ───────────────────────────────────────────────────────────────
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid unique references auth.users (id) on delete cascade,
  referral_code text not null,
  status text not null default 'attached'
    check (status in ('attached', 'signup_rewarded', 'purchase_rewarded', 'rejected')),
  created_at timestamptz not null default now(),
  unique (referrer_user_id, referred_user_id)
);

create unique index referrals_code_uidx on public.referrals (referral_code);
create table public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- ── Coupons ─────────────────────────────────────────────────────────────────
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null,
  min_amount numeric(10, 2) not null default 0,
  max_discount numeric(10, 2),
  service_slug text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Notifications ───────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  audience text not null default 'user'
    check (audience in ('user', 'admin', 'agency_partner', 'all')),
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ── Reviews ─────────────────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ── Enquiries ───────────────────────────────────────────────────────────────
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  email text not null default '',
  service text not null default '',
  message text not null default '',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

-- ── Website settings ────────────────────────────────────────────────────────
create table public.website_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── Auth OTPs (WhatsApp) ────────────────────────────────────────────────────
create table public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  mobile text not null,
  otp_hash text not null,
  purpose text not null check (purpose in ('login', 'signup', 'password_reset')),
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index auth_otps_mobile_purpose_idx on public.auth_otps (mobile, purpose, created_at desc);

-- ── AP commissions / payouts (minimal) ──────────────────────────────────────
create table public.ap_commissions (
  id uuid primary key default gen_random_uuid(),
  agency_partner_id uuid not null references public.agency_partners (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  amount numeric(10, 2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'paid', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.ap_payouts (
  id uuid primary key default gen_random_uuid(),
  agency_partner_id uuid not null references public.agency_partners (id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ── Rate limiting ───────────────────────────────────────────────────────────
create table public.rate_limit_buckets (
  bucket_key text primary key,
  hit_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Helpers ─────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger agency_partners_updated_at before update on public.agency_partners
  for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger wallets_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'customer'::public.app_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function public.is_agency_partner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'agency_partner' and active = true
  );
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role public.app_role := 'customer';
  v_meta_role text := lower(coalesce(new.raw_app_meta_data->>'role', new.raw_user_meta_data->>'role', 'customer'));
begin
  if v_meta_role = 'admin' then
    v_role := 'admin';
  elsif v_meta_role in ('agency_partner', 'agent') then
    v_role := 'agency_partner';
  end if;

  insert into public.profiles (id, email, full_name, mobile, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.phone, new.raw_user_meta_data->>'mobile', ''),
    v_role
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Wallet helpers
create or replace function public.ensure_wallet(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_wallet public.wallets;
begin
  insert into public.wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet from public.wallets where user_id = p_user_id;
  return v_wallet;
end;
$$;

create or replace function public.post_wallet_transaction(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_idempotency_key text,
  p_description text default '',
  p_application_id uuid default null,
  p_payment_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_wallet public.wallets;
  v_existing public.wallet_transactions;
  v_tx public.wallet_transactions;
  v_new_balance numeric(12, 2);
begin
  if p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = p_idempotency_key;

  if found then
    return v_existing;
  end if;

  v_wallet := public.ensure_wallet(p_user_id);
  v_new_balance := v_wallet.balance + p_amount;
  if v_new_balance < 0 then
    raise exception 'insufficient wallet balance';
  end if;

  update public.wallets
  set balance = v_new_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after,
    application_id, payment_id, idempotency_key, description, metadata
  ) values (
    v_wallet.id, p_user_id, p_type, p_amount, v_new_balance,
    p_application_id, p_payment_id, p_idempotency_key, coalesce(p_description, ''), coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

create or replace function public.credit_signup_bonus(p_user_id uuid)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return public.post_wallet_transaction(
    p_user_id,
    'signup_bonus',
    500,
    'signup_bonus:' || p_user_id::text,
    'Welcome bonus ₹500'
  );
end;
$$;

-- Tracking code
create or replace function public.generate_tracking_code()
returns trigger
language plpgsql
as $$
begin
  if new.tracking_code is null or btrim(new.tracking_code) = '' then
    new.tracking_code := 'DCD' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;
  return new;
end;
$$;

create trigger applications_tracking_code
  before insert on public.applications
  for each row execute function public.generate_tracking_code();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.agency_partners enable row level security;
alter table public.services enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_codes enable row level security;
alter table public.coupons enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.enquiries enable row level security;
alter table public.website_settings enable row level security;
alter table public.auth_otps enable row level security;
alter table public.ap_commissions enable row level security;
alter table public.ap_payouts enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

create policy "customers_select" on public.customers
  for select using (
    user_id = auth.uid()
    or created_by = auth.uid()
    or assigned_agent_id = auth.uid()
    or public.is_admin()
  );
create policy "customers_insert" on public.customers
  for insert with check (
    user_id = auth.uid()
    or created_by = auth.uid()
    or public.is_admin()
    or public.is_agency_partner()
  );
create policy "customers_update" on public.customers
  for update using (
    user_id = auth.uid()
    or created_by = auth.uid()
    or assigned_agent_id = auth.uid()
    or public.is_admin()
  );

create policy "services_public_read" on public.services
  for select using (active = true or public.is_admin());
create policy "services_admin_write" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

create policy "applications_select" on public.applications
  for select using (
    user_id = auth.uid()
    or created_by = auth.uid()
    or assigned_agent_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.agency_partners ap
      where ap.id = applications.agency_partner_id and ap.user_id = auth.uid()
    )
  );
create policy "applications_insert" on public.applications
  for insert with check (
    user_id = auth.uid()
    or created_by = auth.uid()
    or public.is_admin()
    or public.is_agency_partner()
  );
create policy "applications_update" on public.applications
  for update using (
    user_id = auth.uid()
    or created_by = auth.uid()
    or assigned_agent_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.agency_partners ap
      where ap.id = applications.agency_partner_id and ap.user_id = auth.uid()
    )
  );

create policy "docs_select" on public.application_documents
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          a.user_id = auth.uid()
          or a.assigned_agent_id = auth.uid()
          or exists (
            select 1 from public.agency_partners ap
            where ap.id = a.agency_partner_id and ap.user_id = auth.uid()
          )
        )
    )
  );
create policy "docs_insert" on public.application_documents
  for insert with check (
    uploaded_by = auth.uid() or public.is_admin() or public.is_agency_partner()
  );

create policy "payments_select" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "wallets_select_own" on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());
create policy "wallet_tx_select_own" on public.wallet_transactions
  for select using (user_id = auth.uid() or public.is_admin());

create policy "coupons_public_read_active" on public.coupons
  for select using (active = true or public.is_admin());
create policy "coupons_admin" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy "notifications_own" on public.notifications
  for select using (user_id = auth.uid() or audience = 'all' or public.is_admin());

create policy "reviews_public_approved" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "reviews_insert_own" on public.reviews
  for insert with check (user_id = auth.uid());

create policy "enquiries_insert_public" on public.enquiries
  for insert with check (true);
create policy "enquiries_admin" on public.enquiries
  for select using (public.is_admin());

create policy "website_settings_public_read" on public.website_settings
  for select using (true);
create policy "website_settings_admin" on public.website_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "auth_otps_deny_all" on public.auth_otps
  for all using (false) with check (false);

create policy "ap_own" on public.agency_partners
  for select using (user_id = auth.uid() or public.is_admin());
create policy "ap_commissions_own" on public.ap_commissions
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.agency_partners ap
      where ap.id = agency_partner_id and ap.user_id = auth.uid()
    )
  );
create policy "ap_payouts_own" on public.ap_payouts
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.agency_partners ap
      where ap.id = agency_partner_id and ap.user_id = auth.uid()
    )
  );

create policy "rate_limit_deny" on public.rate_limit_buckets
  for all using (false) with check (false);

-- ── Storage ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

drop policy if exists "app_docs_auth_read" on storage.objects;
create policy "app_docs_auth_read" on storage.objects
  for select using (
    bucket_id = 'application-documents'
    and (auth.role() = 'authenticated' or public.is_admin())
  );

drop policy if exists "app_docs_auth_insert" on storage.objects;
create policy "app_docs_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'application-documents'
    and auth.role() = 'authenticated'
  );

-- ── Seed: 7 services ────────────────────────────────────────────────────────
insert into public.services (slug, name, short_description, description, amount, sort_order, documents, benefits) values
(
  'gst-registration',
  'GST Registration',
  'Complete GST registration assistance for your business.',
  'Get your GSTIN with expert document verification and filing support.',
  999, 10,
  '["Aadhaar Card","PAN Card","Address Proof","Bank Details"]'::jsonb,
  '["Expert filing","Document checklist","Application tracking"]'::jsonb
),
(
  'itr-filing',
  'ITR Filing',
  'Income tax return filing for salaried and business customers.',
  'File your ITR accurately with AIS/26AS checks and expert review.',
  499, 20,
  '["Aadhaar Card","PAN Card","Form 16","Bank Statement"]'::jsonb,
  '["Fast filing","Error checks","Acknowledgement support"]'::jsonb
),
(
  'msme-registration',
  'MSME Registration',
  'Udyam / MSME registration certificate assistance.',
  'Register your enterprise under Udyam and unlock MSME benefits.',
  499, 30,
  '["Aadhaar Card","PAN Card","Business Details"]'::jsonb,
  '["Same-day assistance","Official Udyam support"]'::jsonb
),
(
  'food-license',
  'FSSAI / Food License',
  'FSSAI registration and food licence assistance.',
  'Apply for FSSAI registration, state, or central food licence with guided support.',
  999, 40,
  '["Aadhaar Card","PAN Card","Passport Photo","Premises Proof"]'::jsonb,
  '["FSSAI guidance","Rejection risk reduction"]'::jsonb
),
(
  'driving-licence',
  'Driving Licence',
  'Learning and permanent driving licence assistance.',
  'Assistance for learner and permanent driving licence applications.',
  999, 50,
  '["Aadhaar Card","Passport Photo","Age Proof"]'::jsonb,
  '["Guided RTO process","Document checklist"]'::jsonb
),
(
  'passport',
  'Passport Assistance',
  'Fresh passport, re-issue, and correction support.',
  'End-to-end assistance for passport applications and appointments.',
  1999, 60,
  '["Aadhaar Card","Address Proof","Photo"]'::jsonb,
  '["Form guidance","Appointment help"]'::jsonb
),
(
  'cm-yuva-loan',
  'CM YUVA Loan Assistance',
  'CM YUVA entrepreneur loan file assistance.',
  'Complete file preparation support for CM YUVA entrepreneur loan applications.',
  1999, 70,
  '["Aadhaar Card","PAN Card","Project Details","Bank Statement"]'::jsonb,
  '["File preparation","Scheme guidance"]'::jsonb
);

insert into public.website_settings (key, value) values
  ('homepage', '{"headline":"Digital services, done simply.","subheadline":"GST, ITR, licences and more — apply online with DigiConnect Dukan."}'::jsonb),
  ('contact', '{"email":"support@digiconnectdukan.com","phone":"+91 00000 00000"}'::jsonb)
on conflict (key) do nothing;
