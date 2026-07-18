-- DigiConnect Dukan — Customer WhatsApp OTP + PIN auth foundation
-- Additive / safe for existing V5 data. Does not drop CRM customers.

-- ── profiles: customer auth security fields ─────────────────────────────────
alter table public.profiles
  add column if not exists phone text,
  add column if not exists address text default '',
  add column if not exists pincode text default '',
  add column if not exists district text default '',
  add column if not exists state text default '',
  add column if not exists phone_verified boolean not null default false,
  add column if not exists account_status text not null default 'active',
  add column if not exists failed_login_attempts integer not null default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists username text,
  add column if not exists partner_code text;

-- Backfill phone from mobile where present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'mobile'
  ) then
    execute $sql$
      update public.profiles
      set phone = mobile
      where (phone is null or btrim(phone) = '')
        and mobile is not null
        and btrim(mobile) <> ''
    $sql$;
  end if;
end
$$;

-- Unique phone for non-empty values
create unique index if not exists profiles_phone_unique_idx
  on public.profiles (phone)
  where phone is not null and btrim(phone) <> '';

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null and btrim(username) <> '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'blocked', 'suspended', 'pending'));
  end if;
end
$$;

-- ── auth_otp_requests ───────────────────────────────────────────────────────
create table if not exists public.auth_otp_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null
    check (purpose in (
      'customer_signup',
      'forgot_pin',
      'change_phone',
      'security_verification'
    )),
  otp_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  invalidated_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  verification_token_hash text,
  created_at timestamptz not null default now()
);

create index if not exists auth_otp_requests_phone_purpose_idx
  on public.auth_otp_requests (phone, purpose, created_at desc);

create index if not exists auth_otp_requests_expires_idx
  on public.auth_otp_requests (expires_at)
  where invalidated_at is null and verified_at is null;

create index if not exists auth_otp_requests_token_idx
  on public.auth_otp_requests (verification_token_hash)
  where verification_token_hash is not null;

alter table public.auth_otp_requests enable row level security;

drop policy if exists "auth_otp_requests_deny_all" on public.auth_otp_requests;
create policy "auth_otp_requests_deny_all" on public.auth_otp_requests
  for all using (false) with check (false);

-- ── auth security audit log ─────────────────────────────────────────────────
create table if not exists public.auth_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  phone text,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists auth_security_events_user_idx
  on public.auth_security_events (user_id, created_at desc);

create index if not exists auth_security_events_phone_idx
  on public.auth_security_events (phone, created_at desc);

alter table public.auth_security_events enable row level security;

drop policy if exists "auth_security_events_admin_read" on public.auth_security_events;
create policy "auth_security_events_admin_read" on public.auth_security_events
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text in ('admin', 'super_admin')
    )
  );

-- ── agency_partners username support ────────────────────────────────────────
alter table public.agency_partners
  add column if not exists username text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists partner_code text,
  add column if not exists kyc_status text default 'pending';

create unique index if not exists agency_partners_username_unique_idx
  on public.agency_partners (username)
  where username is not null and btrim(username) <> '';

-- ── cleanup expired OTPs ────────────────────────────────────────────────────
create or replace function public.cleanup_expired_auth_otps()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.auth_otp_requests
  where expires_at < now() - interval '1 day'
     or (invalidated_at is not null and invalidated_at < now() - interval '1 day')
     or (verified_at is not null and verified_at < now() - interval '1 day');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.cleanup_expired_auth_otps() to service_role;

-- Ensure customers.mobile uniqueness for CRM sync (if table/column exist)
do $$
begin
  if to_regclass('public.customers') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'customers' and column_name = 'mobile'
    )
    and not exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'customers_mobile_unique_auth_idx'
    )
  then
    begin
      execute 'create unique index customers_mobile_unique_auth_idx on public.customers (mobile) where mobile is not null and btrim(mobile) <> ''''';
    exception when others then
      raise notice 'customers mobile unique index skipped: %', sqlerrm;
    end;
  end if;
end
$$;
