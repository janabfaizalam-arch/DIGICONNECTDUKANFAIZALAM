-- ⚠️ LEGACY — SUPERSEDED by 20260514130000_secure_referral_reward_wallet.sql + 20260516110000_reward_wallet_e2e_repair.sql
-- Functions here (refresh_reward_wallet_summary, credit_reward_points, redeem_reward_points, etc.)
-- are replaced by canonical closed-loop system. Migration kept for chain integrity only.
--
-- Referral + Reward + Wallet + Cashback production ledger.
-- The older DigiWallet tables remain for compatibility; reward_transactions is the canonical ledger.

create extension if not exists pgcrypto;

alter table public.wallets
  add column if not exists balance_points numeric(10, 2) not null default 0 check (balance_points >= 0),
  add column if not exists total_reward_earned numeric(10, 2) not null default 0 check (total_reward_earned >= 0),
  add column if not exists total_reward_redeemed numeric(10, 2) not null default 0 check (total_reward_redeemed >= 0),
  add column if not exists frozen boolean not null default false,
  add column if not exists suspicious boolean not null default false,
  add column if not exists admin_note text;

alter table public.profiles
  add column if not exists pincode text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references auth.users(id) on delete set null,
  add column if not exists suspicious boolean not null default false,
  add column if not exists signup_ip inet;

alter table public.customer_profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references auth.users(id) on delete set null,
  add column if not exists suspicious boolean not null default false;

create unique index if not exists profiles_referral_code_unique_idx
  on public.profiles (referral_code)
  where referral_code is not null;

create table if not exists public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('signup_bonus', 'referral_bonus', 'cashback', 'redemption', 'expiry', 'admin_adjustment')),
  amount numeric(10, 2) not null check (amount > 0),
  remaining_amount numeric(10, 2) not null default 0 check (remaining_amount >= 0),
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'reversed')),
  expires_at timestamptz,
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  reward_amount numeric(10, 2) not null default 50 check (reward_amount >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (referred_user_id),
  check (referrer_id <> referred_user_id)
);

create table if not exists public.service_reward_rules (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  cashback_type text not null check (cashback_type in ('percentage', 'fixed')),
  cashback_value numeric(10, 2) not null check (cashback_value >= 0),
  max_redemption_percent numeric(5, 2) not null default 50 check (max_redemption_percent >= 0 and max_redemption_percent <= 50),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_slug)
);

create table if not exists public.reward_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists reward_transactions_user_idx on public.reward_transactions (user_id, created_at desc);
create index if not exists reward_transactions_expiry_idx
  on public.reward_transactions (expires_at)
  where status = 'active' and remaining_amount > 0 and expires_at is not null;
create unique index if not exists reward_signup_once_idx
  on public.reward_transactions (user_id)
  where type = 'signup_bonus';
create unique index if not exists reward_referral_once_idx
  on public.reward_transactions (reference_id)
  where type = 'referral_bonus' and reference_type = 'referral';
create unique index if not exists reward_cashback_once_idx
  on public.reward_transactions (reference_id)
  where type = 'cashback' and reference_type = 'application';
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, created_at desc);
create index if not exists referrals_referred_idx on public.referrals (referred_user_id);
create index if not exists service_reward_rules_active_idx on public.service_reward_rules (active, service_slug);

insert into public.service_reward_rules (service_slug, cashback_type, cashback_value, max_redemption_percent, active)
values
  ('itr-msme-combo', 'fixed', 700, 50, true),
  ('itr-filing', 'percentage', 20, 50, true),
  ('msme-certificate', 'percentage', 20, 50, true),
  ('default', 'percentage', 20, 50, true)
on conflict (service_slug) do update set
  cashback_type = excluded.cashback_type,
  cashback_value = excluded.cashback_value,
  max_redemption_percent = excluded.max_redemption_percent,
  active = excluded.active,
  updated_at = now();

create or replace function public.generate_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(encode(digest(p_user_id::text || clock_timestamp()::text || v_attempt::text, 'sha256'), 'hex'), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;

  return v_code;
end;
$$;

create or replace function public.refresh_reward_wallet_summary(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_balance numeric(10, 2);
  v_earned numeric(10, 2);
  v_redeemed numeric(10, 2);
  v_expiry timestamptz;
begin
  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  perform public.expire_due_rewards(p_user_id);

  select
    coalesce(sum(remaining_amount) filter (where type in ('signup_bonus', 'referral_bonus', 'cashback', 'admin_adjustment') and status = 'active' and (expires_at is null or expires_at > now())), 0),
    coalesce(sum(amount) filter (where type in ('signup_bonus', 'referral_bonus', 'cashback', 'admin_adjustment') and status in ('active', 'used', 'expired')), 0),
    coalesce(sum(amount) filter (where type = 'redemption' and status = 'used'), 0),
    min(expires_at) filter (where type in ('signup_bonus', 'referral_bonus', 'cashback', 'admin_adjustment') and status = 'active' and remaining_amount > 0 and expires_at > now())
  into v_balance, v_earned, v_redeemed, v_expiry
  from public.reward_transactions
  where user_id = p_user_id;

  update public.wallets
  set balance_points = v_balance,
      balance = v_balance,
      total_reward_earned = v_earned,
      total_reward_redeemed = v_redeemed,
      total_cashback_earned = v_earned,
      total_cashback_used = v_redeemed,
      nearest_expiry_at = v_expiry,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$$;

create or replace function public.credit_reward_points(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_description text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_created_by uuid default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_transaction_id uuid;
  v_expires_at timestamptz;
begin
  if p_user_id is null or coalesce(p_amount, 0) <= 0 then
    raise exception 'User and positive reward amount are required.';
  end if;

  if p_type not in ('signup_bonus', 'referral_bonus', 'cashback', 'admin_adjustment') then
    raise exception 'Invalid reward credit type.';
  end if;

  v_wallet := public.refresh_reward_wallet_summary(p_user_id);

  if v_wallet.frozen then
    raise exception 'Wallet is frozen.';
  end if;

  v_expires_at := coalesce(p_expires_at, now() + interval '6 months');

  insert into public.reward_transactions (
    user_id, type, amount, remaining_amount, description, status, expires_at,
    reference_type, reference_id, created_by, metadata
  )
  values (
    p_user_id, p_type, round(p_amount, 2), round(p_amount, 2), coalesce(p_description, ''),
    'active', v_expires_at, p_reference_type, p_reference_id, p_created_by, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict do nothing
  returning id into v_transaction_id;

  perform public.refresh_reward_wallet_summary(p_user_id);
  return v_transaction_id;
end;
$$;

create or replace function public.redeem_reward_points(
  p_user_id uuid,
  p_application_id uuid,
  p_service_name text,
  p_order_amount numeric,
  p_requested_amount numeric,
  p_max_redemption_percent numeric default 50
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_max_allowed numeric(10, 2);
  v_to_redeem numeric(10, 2);
  v_remaining numeric(10, 2);
  v_credit record;
begin
  if coalesce(p_requested_amount, 0) <= 0 then
    return 0;
  end if;

  if p_user_id is null or p_application_id is null then
    raise exception 'User and application are required.';
  end if;

  if coalesce(p_order_amount, 0) <= 0 then
    raise exception 'Order amount must be greater than zero.';
  end if;

  v_wallet := public.refresh_reward_wallet_summary(p_user_id);

  if v_wallet.frozen then
    raise exception 'Wallet is frozen.';
  end if;

  v_max_allowed := round(p_order_amount * (least(greatest(coalesce(p_max_redemption_percent, 50), 0), 50) / 100), 2);
  v_to_redeem := least(round(p_requested_amount, 2), v_max_allowed, v_wallet.balance_points);

  if round(p_requested_amount, 2) > v_max_allowed then
    raise exception 'Wallet can be used for maximum % percent of order value.', least(greatest(coalesce(p_max_redemption_percent, 50), 0), 50);
  end if;

  if round(p_requested_amount, 2) > v_wallet.balance_points then
    raise exception 'Insufficient wallet balance.';
  end if;

  if v_to_redeem <= 0 then
    return 0;
  end if;

  v_remaining := v_to_redeem;

  for v_credit in
    select id, remaining_amount
    from public.reward_transactions
    where user_id = p_user_id
      and type in ('signup_bonus', 'referral_bonus', 'cashback', 'admin_adjustment')
      and status = 'active'
      and remaining_amount > 0
      and (expires_at is null or expires_at > now())
    order by expires_at asc nulls last, created_at asc
  loop
    exit when v_remaining <= 0;

    update public.reward_transactions
    set remaining_amount = greatest(remaining_amount - least(remaining_amount, v_remaining), 0),
        status = case when greatest(remaining_amount - least(remaining_amount, v_remaining), 0) = 0 then 'used' else status end
    where id = v_credit.id;

    v_remaining := v_remaining - least(v_credit.remaining_amount, v_remaining);
  end loop;

  if v_remaining > 0 then
    raise exception 'Insufficient unexpired wallet balance.';
  end if;

  insert into public.reward_transactions (
    user_id, type, amount, remaining_amount, description, status, reference_type, reference_id, metadata
  )
  values (
    p_user_id, 'redemption', v_to_redeem, 0,
    coalesce(p_service_name, 'Service') || ' wallet redemption',
    'used', 'application', p_application_id,
    jsonb_build_object('order_amount', p_order_amount)
  );

  perform public.refresh_reward_wallet_summary(p_user_id);
  return v_to_redeem;
end;
$$;

create or replace function public.expire_due_rewards(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count integer := 0;
  v_credit record;
begin
  for v_credit in
    select id, user_id, remaining_amount, type
    from public.reward_transactions
    where status = 'active'
      and remaining_amount > 0
      and expires_at is not null
      and expires_at <= now()
      and (p_user_id is null or user_id = p_user_id)
  loop
    update public.reward_transactions
    set status = 'expired', remaining_amount = 0
    where id = v_credit.id;

    insert into public.reward_transactions (
      user_id, type, amount, remaining_amount, description, status, reference_type, reference_id
    )
    values (
      v_credit.user_id, 'expiry', v_credit.remaining_amount, 0,
      'Reward points expired after 6 months.', 'expired', 'reward_transaction', v_credit.id
    )
    on conflict do nothing;

    v_expired_count := v_expired_count + 1;
  end loop;

  if p_user_id is null then
    update public.wallets w
    set balance_points = coalesce(t.balance, 0),
        balance = coalesce(t.balance, 0),
        nearest_expiry_at = t.nearest_expiry_at,
        updated_at = now()
    from (
      select user_id,
             sum(remaining_amount) filter (where status = 'active' and remaining_amount > 0 and (expires_at is null or expires_at > now())) as balance,
             min(expires_at) filter (where status = 'active' and remaining_amount > 0 and expires_at > now()) as nearest_expiry_at
      from public.reward_transactions
      group by user_id
    ) t
    where w.user_id = t.user_id;
  end if;

  return v_expired_count;
end;
$$;

create or replace function public.ensure_customer_reward_profile(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_pincode text,
  p_city text,
  p_state text,
  p_referral_code text default null,
  p_ip_address inet default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_own_code text;
  v_referrer_id uuid;
begin
  if p_user_id is null then
    raise exception 'User is required.';
  end if;

  select referral_code into v_own_code from public.profiles where id = p_user_id;

  if v_own_code is null then
    v_own_code := public.generate_referral_code(p_user_id);
  end if;

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id into v_referrer_id
    from public.profiles
    where referral_code = upper(trim(p_referral_code))
    limit 1;

    if v_referrer_id = p_user_id then
      v_referrer_id := null;
    end if;

    if exists (select 1 from public.profiles where id = v_referrer_id and referred_by = p_user_id) then
      v_referrer_id := null;
    end if;
  end if;

  update public.profiles
  set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      email = coalesce(nullif(trim(p_email), ''), email),
      pincode = coalesce(nullif(trim(p_pincode), ''), pincode),
      city = coalesce(nullif(trim(p_city), ''), city),
      state = coalesce(nullif(trim(p_state), ''), state),
      referral_code = v_own_code,
      referred_by = coalesce(referred_by, v_referrer_id),
      signup_ip = coalesce(signup_ip, p_ip_address),
      updated_at = now()
  where id = p_user_id;

  update public.customer_profiles
  set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      email = coalesce(nullif(trim(p_email), ''), email),
      pincode = coalesce(nullif(trim(p_pincode), ''), pincode),
      city = coalesce(nullif(trim(p_city), ''), city),
      state = coalesce(nullif(trim(p_state), ''), state),
      referral_code = v_own_code,
      referred_by = coalesce(referred_by, v_referrer_id),
      updated_at = now()
  where id = p_user_id;

  if v_referrer_id is not null then
    insert into public.referrals (referrer_id, referred_user_id, referral_code, status, reward_amount)
    values (v_referrer_id, p_user_id, upper(trim(p_referral_code)), 'pending', 50)
    on conflict (referred_user_id) do nothing;
  end if;

  perform public.refresh_reward_wallet_summary(p_user_id);
end;
$$;

create or replace function public.issue_signup_bonus(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.credit_reward_points(
    p_user_id,
    'signup_bonus',
    50,
    'Signup reward after email verification.',
    'auth_user',
    p_user_id,
    null,
    now() + interval '6 months',
    '{}'::jsonb
  );
end;
$$;

create or replace function public.complete_referral_reward(p_referred_user_id uuid, p_application_id uuid, p_created_by uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.referrals;
  v_transaction_id uuid;
begin
  select * into v_referral
  from public.referrals
  where referred_user_id = p_referred_user_id
  limit 1;

  if v_referral.id is null or v_referral.status = 'completed' then
    return null;
  end if;

  if exists (
    select 1
    from public.applications
    where user_id = p_referred_user_id
      and payment_status = 'verified'
      and id <> p_application_id
  ) then
    return null;
  end if;

  v_transaction_id := public.credit_reward_points(
    v_referral.referrer_id,
    'referral_bonus',
    v_referral.reward_amount,
    'Referral reward after first successful paid order.',
    'referral',
    v_referral.id,
    p_created_by,
    now() + interval '6 months',
    jsonb_build_object('referred_user_id', p_referred_user_id, 'application_id', p_application_id)
  );

  if v_transaction_id is not null then
    update public.referrals
    set status = 'completed', completed_at = now()
    where id = v_referral.id;
  end if;

  return v_transaction_id;
end;
$$;

create or replace function public.admin_adjust_reward_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_note text,
  p_created_by uuid default null,
  p_expiry_months integer default 6
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_transaction_id uuid;
  v_remaining numeric(10, 2);
  v_credit record;
begin
  if p_user_id is null or coalesce(p_amount, 0) = 0 then
    raise exception 'User and non-zero amount are required.';
  end if;

  v_wallet := public.refresh_reward_wallet_summary(p_user_id);

  if p_amount > 0 then
    return public.credit_reward_points(
      p_user_id,
      'admin_adjustment',
      p_amount,
      coalesce(p_note, 'Admin wallet credit.'),
      'admin_adjustment',
      null,
      p_created_by,
      now() + make_interval(months => greatest(coalesce(p_expiry_months, 6), 1)),
      '{}'::jsonb
    );
  end if;

  if abs(p_amount) > v_wallet.balance_points then
    raise exception 'Adjustment would create a negative wallet balance.';
  end if;

  v_remaining := round(abs(p_amount), 2);

  for v_credit in
    select id, remaining_amount
    from public.reward_transactions
    where user_id = p_user_id
      and type in ('signup_bonus', 'referral_bonus', 'cashback', 'admin_adjustment')
      and status = 'active'
      and remaining_amount > 0
      and (expires_at is null or expires_at > now())
    order by expires_at asc nulls last, created_at asc
  loop
    exit when v_remaining <= 0;

    update public.reward_transactions
    set remaining_amount = greatest(remaining_amount - least(remaining_amount, v_remaining), 0),
        status = case when greatest(remaining_amount - least(remaining_amount, v_remaining), 0) = 0 then 'used' else status end
    where id = v_credit.id;

    v_remaining := v_remaining - least(v_credit.remaining_amount, v_remaining);
  end loop;

  insert into public.reward_transactions (
    user_id, type, amount, remaining_amount, description, status, reference_type, created_by
  )
  values (
    p_user_id, 'admin_adjustment', round(abs(p_amount), 2), 0,
    coalesce(p_note, 'Admin wallet debit.'), 'used', 'admin_adjustment', p_created_by
  )
  returning id into v_transaction_id;

  perform public.refresh_reward_wallet_summary(p_user_id);
  return v_transaction_id;
end;
$$;

drop trigger if exists prevent_profiles_reward_identity_tamper on public.profiles;
drop trigger if exists prevent_customer_profiles_reward_identity_tamper on public.customer_profiles;
drop function if exists public.prevent_reward_identity_tamper() cascade;

alter table public.reward_transactions enable row level security;
alter table public.referrals enable row level security;
alter table public.service_reward_rules enable row level security;
alter table public.reward_audit_logs enable row level security;

drop policy if exists "Users read own reward transactions" on public.reward_transactions;
create policy "Users read own reward transactions" on public.reward_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage reward transactions" on public.reward_transactions;
create policy "Admins manage reward transactions" on public.reward_transactions
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Users read own referrals" on public.referrals;
create policy "Users read own referrals" on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

drop policy if exists "Admins manage referrals" on public.referrals;
create policy "Admins manage referrals" on public.referrals
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Everyone reads active reward rules" on public.service_reward_rules;
create policy "Everyone reads active reward rules" on public.service_reward_rules
  for select using (active = true or public.is_admin_role());

drop policy if exists "Admins manage reward rules" on public.service_reward_rules;
create policy "Admins manage reward rules" on public.service_reward_rules
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Admins read reward audit logs" on public.reward_audit_logs;
create policy "Admins read reward audit logs" on public.reward_audit_logs
  for select using (public.is_admin_role());

drop policy if exists "Admins insert reward audit logs" on public.reward_audit_logs;
create policy "Admins insert reward audit logs" on public.reward_audit_logs
  for insert with check (public.is_admin_role());

revoke execute on function public.generate_referral_code(uuid) from anon, authenticated;
revoke execute on function public.refresh_reward_wallet_summary(uuid) from anon, authenticated;
revoke execute on function public.credit_reward_points(uuid, text, numeric, text, text, uuid, uuid, timestamptz, jsonb) from anon, authenticated;
revoke execute on function public.redeem_reward_points(uuid, uuid, text, numeric, numeric, numeric) from anon, authenticated;
revoke execute on function public.expire_due_rewards(uuid) from anon, authenticated;
revoke execute on function public.ensure_customer_reward_profile(uuid, text, text, text, text, text, text, inet) from anon, authenticated;
revoke execute on function public.issue_signup_bonus(uuid) from anon, authenticated;
revoke execute on function public.complete_referral_reward(uuid, uuid, uuid) from anon, authenticated;
revoke execute on function public.admin_adjust_reward_wallet(uuid, numeric, text, uuid, integer) from anon, authenticated;

grant execute on function public.generate_referral_code(uuid) to service_role;
grant execute on function public.refresh_reward_wallet_summary(uuid) to service_role;
grant execute on function public.credit_reward_points(uuid, text, numeric, text, text, uuid, uuid, timestamptz, jsonb) to service_role;
grant execute on function public.redeem_reward_points(uuid, uuid, text, numeric, numeric, numeric) to service_role;
grant execute on function public.expire_due_rewards(uuid) to service_role;
grant execute on function public.ensure_customer_reward_profile(uuid, text, text, text, text, text, text, inet) to service_role;
grant execute on function public.issue_signup_bonus(uuid) to service_role;
grant execute on function public.complete_referral_reward(uuid, uuid, uuid) to service_role;
grant execute on function public.admin_adjust_reward_wallet(uuid, numeric, text, uuid, integer) to service_role;
