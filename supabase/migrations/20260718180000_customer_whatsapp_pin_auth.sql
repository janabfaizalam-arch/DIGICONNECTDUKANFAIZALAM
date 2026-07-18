-- DigiConnect Dukan — Customer WhatsApp OTP + PIN auth (V6-safe)
-- Idempotent / production-safe. Does NOT delete profiles or CRM rows.
-- Canonical WhatsApp identity on profiles is `mobile` (10-digit local).
-- Unique index is created only when no normalized duplicates remain.

-- ── 1) profiles: auth/security fields (additive) ────────────────────────────
alter table public.profiles
  add column if not exists address text not null default '',
  add column if not exists pincode text not null default '',
  add column if not exists district text not null default '',
  add column if not exists state text not null default '',
  add column if not exists phone_verified boolean not null default false,
  add column if not exists account_status text not null default 'active',
  add column if not exists failed_login_attempts integer not null default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists username text,
  add column if not exists partner_code text;

-- Optional legacy `phone` column (if a previous partial migration added it).
-- We keep it in sync with mobile when present; V6 app code uses `mobile`.
alter table public.profiles
  add column if not exists phone text;

-- ── 2) Normalize mobile / phone values (no deletes) ─────────────────────────
create or replace function public.normalize_indian_mobile(raw text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
  local_part text;
begin
  if raw is null then
    return null;
  end if;

  digits := regexp_replace(raw, '[^0-9]', '', 'g');

  if digits = '' then
    return null;
  end if;

  -- strip leading 91 / 0
  if length(digits) = 12 and left(digits, 2) = '91' then
    local_part := substr(digits, 3);
  elsif length(digits) = 11 and left(digits, 1) = '0' then
    local_part := substr(digits, 2);
  else
    local_part := digits;
  end if;

  if local_part ~ '^[6-9][0-9]{9}$' then
    return local_part;
  end if;

  -- Keep non-empty unparseable values as trimmed digits for manual cleanup,
  -- but empty → null so unique partial indexes ignore them.
  if btrim(digits) = '' then
    return null;
  end if;
  return local_part;
end;
$$;

update public.profiles
set mobile = coalesce(public.normalize_indian_mobile(mobile), nullif(btrim(mobile), ''))
where mobile is not null;

update public.profiles
set mobile = null
where mobile is not null and btrim(mobile) = '';

-- Sync optional phone column from mobile (or normalize existing phone)
update public.profiles
set phone = coalesce(
  public.normalize_indian_mobile(phone),
  public.normalize_indian_mobile(mobile),
  nullif(btrim(coalesce(phone, '')), '')
);

update public.profiles
set phone = null
where phone is not null and btrim(phone) = '';

-- Prefer filling empty mobile from phone when phone looks valid
update public.profiles
set mobile = phone
where (mobile is null or btrim(mobile) = '')
  and phone is not null
  and phone ~ '^[6-9][0-9]{9}$';

-- Normalize customers.mobile similarly (preserve rows)
update public.customers
set mobile = coalesce(public.normalize_indian_mobile(mobile), mobile)
where mobile is not null;

-- ── 3) Duplicate detection — fail loudly, do not delete ─────────────────────
do $$
declare
  dup_mobile_count integer;
  dup_phone_count integer;
  sample text;
begin
  select count(*) into dup_mobile_count
  from (
    select public.normalize_indian_mobile(mobile) as n
    from public.profiles
    where public.normalize_indian_mobile(mobile) is not null
    group by 1
    having count(*) > 1
  ) d;

  select count(*) into dup_phone_count
  from (
    select public.normalize_indian_mobile(phone) as n
    from public.profiles
    where public.normalize_indian_mobile(phone) is not null
    group by 1
    having count(*) > 1
  ) d;

  if dup_mobile_count > 0 or dup_phone_count > 0 then
    select string_agg(n || ' (' || c || ')', ', ' order by c desc)
      into sample
    from (
      select public.normalize_indian_mobile(mobile) as n, count(*)::text as c
      from public.profiles
      where public.normalize_indian_mobile(mobile) is not null
      group by 1
      having count(*) > 1
      order by count(*) desc
      limit 10
    ) s;

    raise exception
      'AUTH_MIGRATION_BLOCKED: % duplicate normalized mobile value(s) in profiles (phone dups=%). Sample: %. Run supabase/scripts/diagnose_duplicate_profile_phones.sql, resolve duplicates manually, then re-run this migration. No rows were deleted.',
      dup_mobile_count,
      dup_phone_count,
      coalesce(sample, '(see diagnostic script)');
  end if;
end
$$;

-- ── 4) Unique indexes (only reached when duplicates are resolved) ───────────
-- V6 baseline already has profiles_mobile_unique_idx; recreate if missing.
create unique index if not exists profiles_mobile_unique_idx
  on public.profiles (mobile)
  where mobile is not null and btrim(mobile) <> '';

-- Unique on phone only when column has no remaining dups (checked above)
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

-- ── 5) auth_otp_requests (server-side OTP; AiSensy is delivery only) ─────────
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

-- ── 6) auth security audit log ──────────────────────────────────────────────
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
  for select using (public.is_admin());

-- ── 7) agency_partners username / KYC fields ────────────────────────────────
alter table public.agency_partners
  add column if not exists username text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists partner_code text,
  add column if not exists kyc_status text default 'pending';

create unique index if not exists agency_partners_username_unique_idx
  on public.agency_partners (username)
  where username is not null and btrim(username) <> '';

-- ── 8) OTP cleanup helper ───────────────────────────────────────────────────
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
grant execute on function public.normalize_indian_mobile(text) to service_role;
