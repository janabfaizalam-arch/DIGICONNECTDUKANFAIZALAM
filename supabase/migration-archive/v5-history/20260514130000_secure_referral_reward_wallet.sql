-- Secure closed-loop Referral + Reward Wallet + Cashback ledger.
-- Rewards are promotional DigiConnect credits only: no withdrawal, transfer, P2P, or external merchant use.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists referral_code_used text,
  add column if not exists first_service_completed_at timestamptz,
  add column if not exists first_service_cashback_awarded boolean not null default false,
  add column if not exists signup_referral_reward_awarded boolean not null default false,
  add column if not exists created_ip text,
  add column if not exists created_user_agent text,
  add column if not exists reward_risk_score int not null default 0,
  add column if not exists reward_risk_flags jsonb not null default '[]'::jsonb;

create unique index if not exists profiles_referral_code_unique_idx
  on public.profiles (referral_code)
  where referral_code is not null;

alter table public.applications
  add column if not exists wallet_redeemed_amount numeric(12, 2) not null default 0 check (wallet_redeemed_amount >= 0),
  add column if not exists fresh_payable_amount numeric(12, 2) not null default 0 check (fresh_payable_amount >= 0),
  add column if not exists cashback_eligible_amount numeric(12, 2) not null default 0 check (cashback_eligible_amount >= 0),
  add column if not exists cashback_awarded boolean not null default false,
  add column if not exists cashback_awarded_at timestamptz,
  add column if not exists referral_reward_processed boolean not null default false,
  add column if not exists rewards_eligible boolean not null default true;

create table if not exists public.reward_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  lifetime_earned numeric(12, 2) not null default 0 check (lifetime_earned >= 0),
  lifetime_redeemed numeric(12, 2) not null default 0 check (lifetime_redeemed >= 0),
  frozen boolean not null default false,
  suspicious boolean not null default false,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('signup_referral_bonus','referrer_bonus','first_service_cashback','repeat_cashback','redeem','admin_adjustment','reversal')),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(12, 2) not null check (amount > 0),
  balance_after numeric(12, 2) not null default 0 check (balance_after >= 0),
  application_id uuid references public.applications(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  referred_user_id uuid references public.profiles(id) on delete set null,
  referrer_user_id uuid references public.profiles(id) on delete set null,
  idempotency_key text not null unique,
  status text not null default 'posted' check (status in ('pending','posted','reversed')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  signup_reward_status text not null default 'pending' check (signup_reward_status in ('pending','credited','reversed','rejected')),
  referrer_reward_status text not null default 'pending' check (referrer_reward_status in ('pending','credited','reversed','rejected')),
  referred_first_application_id uuid references public.applications(id) on delete set null,
  referred_first_completed_at timestamptz,
  ip text,
  user_agent text,
  risk_score int not null default 0,
  risk_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referred_user_id),
  unique (referrer_user_id, referred_user_id),
  check (referrer_user_id <> referred_user_id)
);

create table if not exists public.reward_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists reward_wallets_balance_idx on public.reward_wallets (balance desc);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions (user_id, created_at desc);
alter table public.wallet_transactions
  add column if not exists type text,
  add column if not exists referred_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists referrer_user_id uuid references public.profiles(id) on delete set null;

create index if not exists wallet_transactions_application_idx on public.wallet_transactions (application_id) where application_id is not null;
alter table public.wallet_transactions
  add column if not exists type text;

create index if not exists wallet_transactions_type_idx on public.wallet_transactions (type, created_at desc);
create index if not exists referral_events_referrer_idx on public.referral_events (referrer_user_id, created_at desc);
create index if not exists referral_events_risk_idx on public.referral_events (risk_score desc, created_at desc);

create unique index if not exists wallet_signup_referral_once_idx
  on public.wallet_transactions (user_id)
  where type = 'signup_referral_bonus' and status <> 'reversed';

create unique index if not exists wallet_first_cashback_once_idx
  on public.wallet_transactions (user_id)
  where type = 'first_service_cashback' and status <> 'reversed';

create unique index if not exists wallet_referrer_bonus_once_idx
  on public.wallet_transactions (referrer_user_id, referred_user_id)
  where type = 'referrer_bonus' and status <> 'reversed';

create unique index if not exists wallet_cashback_application_once_idx
  on public.wallet_transactions (application_id)
  where type in ('first_service_cashback', 'repeat_cashback') and status <> 'reversed';

create or replace function public.generate_secure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_bytes bytea;
  v_i int;
begin
  v_bytes := gen_random_bytes(9);
  for v_i in 0..8 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1, 1);
  end loop;
  return v_code;
end;
$$;

create or replace function public.ensure_referral_code_for_user(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt int := 0;
begin
  if p_user_id is null then
    raise exception 'User is required.';
  end if;

  select referral_code into v_code
  from public.profiles
  where id = p_user_id
  for update;

  if v_code is not null and v_code ~ '^[A-Z0-9]{8,10}$' then
    return v_code;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_secure_referral_code();
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
    if v_attempt > 25 then
      raise exception 'Could not generate referral code.';
    end if;
  end loop;

  update public.profiles
  set referral_code = v_code,
      updated_at = now()
  where id = p_user_id;

  return v_code;
end;
$$;

create or replace function public.create_reward_wallet_if_missing(p_user_id uuid)
returns public.reward_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.reward_wallets;
begin
  if p_user_id is null then
    raise exception 'User is required.';
  end if;

  insert into public.reward_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.reward_wallets
  where user_id = p_user_id
  for update;

  return v_wallet;
end;
$$;

create or replace function public.post_reward_wallet_transaction(
  p_user_id uuid,
  p_type text,
  p_direction text,
  p_amount numeric,
  p_idempotency_key text,
  p_application_id uuid default null,
  p_payment_id uuid default null,
  p_referred_user_id uuid default null,
  p_referrer_user_id uuid default null,
  p_note text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.reward_wallets;
  v_existing public.wallet_transactions;
  v_balance numeric(12, 2);
  v_transaction public.wallet_transactions;
begin
  if p_user_id is null or p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'User and idempotency key are required.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Amount must be positive.';
  end if;

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    return v_existing;
  end if;

  v_wallet := public.create_reward_wallet_if_missing(p_user_id);

  if v_wallet.frozen then
    raise exception 'Reward wallet is frozen.';
  end if;

  if p_direction = 'credit' then
    v_balance := round(v_wallet.balance + p_amount, 2);
    update public.reward_wallets
    set balance = v_balance,
        lifetime_earned = lifetime_earned + p_amount,
        updated_at = now()
    where user_id = p_user_id;
  elsif p_direction = 'debit' then
    if v_wallet.balance < round(p_amount, 2) then
      raise exception 'Insufficient reward wallet balance.';
    end if;

    v_balance := round(v_wallet.balance - p_amount, 2);
    update public.reward_wallets
    set balance = v_balance,
        lifetime_redeemed = lifetime_redeemed + p_amount,
        updated_at = now()
    where user_id = p_user_id;
  else
    raise exception 'Invalid wallet direction.';
  end if;

  insert into public.wallet_transactions (
    user_id, type, direction, amount, balance_after, application_id, payment_id,
    referred_user_id, referrer_user_id, idempotency_key, status, note, metadata, created_by
  )
  values (
    p_user_id, p_type, p_direction, round(p_amount, 2), v_balance, p_application_id, p_payment_id,
    p_referred_user_id, p_referrer_user_id, p_idempotency_key, 'posted', p_note, coalesce(p_metadata, '{}'::jsonb), p_created_by
  )
  returning * into v_transaction;

  return v_transaction;
end;
$$;

create or replace function public.calculate_referral_risk(
  p_referrer_user_id uuid,
  p_referred_user_id uuid,
  p_ip text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score int := 0;
  v_flags jsonb := '[]'::jsonb;
  v_referrer public.profiles%rowtype;
  v_referred public.profiles%rowtype;
begin
  select * into v_referrer from public.profiles where id = p_referrer_user_id;
  select * into v_referred from public.profiles where id = p_referred_user_id;

  if p_referrer_user_id = p_referred_user_id then
    v_score := v_score + 100;
    v_flags := v_flags || '["self_referral"]'::jsonb;
  end if;

  if lower(coalesce(v_referrer.email, '')) <> '' and lower(coalesce(v_referrer.email, '')) = lower(coalesce(v_referred.email, '')) then
    v_score := v_score + 60;
    v_flags := v_flags || '["same_email"]'::jsonb;
  end if;

  if regexp_replace(coalesce(v_referrer.mobile, ''), '\D', '', 'g') <> ''
    and regexp_replace(coalesce(v_referrer.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(v_referred.mobile, ''), '\D', '', 'g') then
    v_score := v_score + 60;
    v_flags := v_flags || '["same_mobile"]'::jsonb;
  end if;

  if p_ip is not null and exists (
    select 1 from public.referral_events
    where ip = p_ip and created_at > now() - interval '24 hours'
  ) then
    v_score := v_score + 25;
    v_flags := v_flags || '["ip_reused_24h"]'::jsonb;
  end if;

  if p_user_agent is not null and exists (
    select 1 from public.referral_events
    where user_agent = p_user_agent and created_at > now() - interval '24 hours'
  ) then
    v_score := v_score + 15;
    v_flags := v_flags || '["device_reused_24h"]'::jsonb;
  end if;

  return jsonb_build_object('score', v_score, 'flags', v_flags);
end;
$$;

create or replace function public.attach_referral_on_signup(
  p_referred_user_id uuid,
  p_referral_code text,
  p_ip text default null,
  p_user_agent text default null
)
returns public.referral_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_referral_code, '')));
  v_referrer_id uuid;
  v_event public.referral_events;
  v_risk jsonb;
begin
  if p_referred_user_id is null or v_code = '' then
    raise exception 'Referral code is required.';
  end if;

  select id into v_referrer_id
  from public.profiles
  where referral_code = v_code
  limit 1;

  if v_referrer_id is null then
    raise exception 'Referral code is invalid.';
  end if;

  if v_referrer_id = p_referred_user_id then
    raise exception 'You cannot use your own referral code.';
  end if;

  v_risk := public.calculate_referral_risk(v_referrer_id, p_referred_user_id, p_ip, p_user_agent);

  update public.profiles
  set referred_by_user_id = coalesce(referred_by_user_id, v_referrer_id),
      referred_by = coalesce(referred_by, v_referrer_id),
      referral_code_used = coalesce(referral_code_used, v_code),
      created_ip = coalesce(created_ip, p_ip),
      created_user_agent = coalesce(created_user_agent, p_user_agent),
      reward_risk_score = (v_risk ->> 'score')::int,
      reward_risk_flags = v_risk -> 'flags',
      updated_at = now()
  where id = p_referred_user_id;

  insert into public.referral_events (
    referrer_user_id, referred_user_id, referral_code, ip, user_agent, risk_score, risk_flags
  )
  values (
    v_referrer_id, p_referred_user_id, v_code, p_ip, p_user_agent, (v_risk ->> 'score')::int, v_risk -> 'flags'
  )
  on conflict (referred_user_id) do update
    set ip = coalesce(public.referral_events.ip, excluded.ip),
        user_agent = coalesce(public.referral_events.user_agent, excluded.user_agent),
        risk_score = greatest(public.referral_events.risk_score, excluded.risk_score),
        risk_flags = excluded.risk_flags,
        updated_at = now()
  returning * into v_event;

  if v_event.signup_reward_status = 'pending' then
    perform public.post_reward_wallet_transaction(
      p_referred_user_id,
      'signup_referral_bonus',
      'credit',
      100,
      'signup_referral_bonus:' || p_referred_user_id::text,
      null,
      null,
      p_referred_user_id,
      v_referrer_id,
      'Signup referral reward credited',
      jsonb_build_object('referral_code', v_code, 'closed_loop', true, 'risk_score', v_event.risk_score),
      p_referred_user_id
    );

    update public.profiles
    set signup_referral_reward_awarded = true,
        updated_at = now()
    where id = p_referred_user_id;

    update public.referral_events
    set signup_reward_status = 'credited',
        updated_at = now()
    where id = v_event.id
    returning * into v_event;
  end if;

  return v_event;
end;
$$;

create or replace function public.redeem_reward_wallet_for_application(
  p_user_id uuid,
  p_application_id uuid,
  p_order_amount numeric,
  p_requested_amount numeric,
  p_payment_id uuid default null,
  p_created_by uuid default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.reward_wallets;
  v_max_allowed numeric(12, 2);
  v_amount numeric(12, 2);
  v_tx public.wallet_transactions;
begin
  if coalesce(p_requested_amount, 0) <= 0 then
    return null;
  end if;

  if coalesce(p_order_amount, 0) <= 0 then
    raise exception 'Order amount must be positive.';
  end if;

  v_wallet := public.create_reward_wallet_if_missing(p_user_id);
  v_max_allowed := floor(round(p_order_amount, 2) * 0.5);
  v_amount := least(round(p_requested_amount, 2), v_wallet.balance, v_max_allowed);

  if round(p_requested_amount, 2) > v_max_allowed then
    raise exception 'Rewards can be used for maximum 50 percent of service amount.';
  end if;

  if v_amount <= 0 then
    return null;
  end if;

  v_tx := public.post_reward_wallet_transaction(
    p_user_id,
    'redeem',
    'debit',
    v_amount,
    'redeem:' || p_user_id::text || ':' || p_application_id::text,
    p_application_id,
    p_payment_id,
    null,
    null,
    'Reward Wallet credits redeemed for DigiConnect service',
    jsonb_build_object('order_amount', p_order_amount, 'max_redeem_percent', 50, 'closed_loop', true),
    p_created_by
  );

  update public.applications
  set wallet_redeemed_amount = v_amount,
      wallet_used_amount = v_amount,
      fresh_payable_amount = greatest(round(p_order_amount, 2) - v_amount, 0),
      real_payment_amount = greatest(round(p_order_amount, 2) - v_amount, 0),
      cashback_eligible_amount = greatest(round(p_order_amount, 2) - v_amount, 0),
      updated_at = now()
  where id = p_application_id;

  return v_tx;
end;
$$;

create or replace function public.process_rewards_on_application_completed(
  p_application_id uuid,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_payment public.payments%rowtype;
  v_profile public.profiles%rowtype;
  v_fresh_amount numeric(12, 2);
  v_cashback_amount numeric(12, 2);
  v_is_first boolean := false;
  v_cashback_tx public.wallet_transactions;
  v_referrer_tx public.wallet_transactions;
  v_referral public.referral_events%rowtype;
begin
  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if v_application.id is null or v_application.user_id is null then
    return jsonb_build_object('processed', false, 'reason', 'application_not_found');
  end if;

  if not coalesce(v_application.rewards_eligible, true) then
    return jsonb_build_object('processed', false, 'reason', 'not_rewards_eligible');
  end if;

  if lower(coalesce(v_application.status, '')) not in ('completed','delivered','approved','done') then
    return jsonb_build_object('processed', false, 'reason', 'not_completed');
  end if;

  select * into v_payment
  from public.payments
  where application_id = p_application_id
    and status = 'verified'
    and razorpay_payment_id is not null
  order by paid_at desc nulls last, created_at desc
  limit 1;

  if v_payment.id is null and lower(coalesce(v_application.payment_status, '')) = 'verified' then
    select * into v_payment
    from public.payments
    where application_id = p_application_id
      and status = 'verified'
    order by paid_at desc nulls last, created_at desc
    limit 1;
  end if;

  if v_payment.id is null then
    return jsonb_build_object('processed', false, 'reason', 'verified_payment_missing');
  end if;

  v_fresh_amount := round(greatest(coalesce(v_application.cashback_eligible_amount, 0), coalesce(v_application.fresh_payable_amount, 0), coalesce(v_application.real_payment_amount, 0), coalesce(v_payment.amount, 0), 0), 2);

  if v_fresh_amount <= 0 then
    return jsonb_build_object('processed', false, 'reason', 'free_or_wallet_only_service');
  end if;

  select * into v_profile
  from public.profiles
  where id = v_application.user_id
  for update;

  v_is_first := not coalesce(v_profile.first_service_cashback_awarded, false)
    and not exists (
      select 1
      from public.wallet_transactions
      where user_id = v_application.user_id
        and type = 'first_service_cashback'
        and status <> 'reversed'
    );

  if v_application.cashback_awarded then
    return jsonb_build_object('processed', true, 'already_processed', true);
  end if;

  if v_is_first then
    v_cashback_amount := v_fresh_amount;
    v_cashback_tx := public.post_reward_wallet_transaction(
      v_application.user_id,
      'first_service_cashback',
      'credit',
      v_cashback_amount,
      'first_service_cashback:' || v_application.user_id::text || ':' || p_application_id::text,
      p_application_id,
      v_payment.id,
      null,
      null,
      '100% first service cashback credited after verified completion',
      jsonb_build_object('fresh_paid_amount', v_fresh_amount, 'cashback_percent', 100, 'closed_loop', true),
      p_created_by
    );

    update public.profiles
    set first_service_cashback_awarded = true,
        first_service_completed_at = coalesce(first_service_completed_at, now()),
        updated_at = now()
    where id = v_application.user_id;

    select * into v_referral
    from public.referral_events
    where referred_user_id = v_application.user_id
    limit 1;

    if v_referral.id is not null and v_referral.referrer_reward_status = 'pending' then
      v_referrer_tx := public.post_reward_wallet_transaction(
        v_referral.referrer_user_id,
        'referrer_bonus',
        'credit',
        100,
        'referrer_bonus:' || v_referral.referrer_user_id::text || ':' || v_application.user_id::text,
        p_application_id,
        v_payment.id,
        v_application.user_id,
        v_referral.referrer_user_id,
        'Referral reward credited after referred user first completed paid service',
        jsonb_build_object('referral_event_id', v_referral.id, 'closed_loop', true),
        p_created_by
      );

      update public.referral_events
      set referrer_reward_status = 'credited',
          referred_first_application_id = p_application_id,
          referred_first_completed_at = now(),
          updated_at = now()
      where id = v_referral.id;
    end if;
  else
    v_cashback_amount := round(v_fresh_amount * 0.20, 2);

    if v_cashback_amount > 0 then
      v_cashback_tx := public.post_reward_wallet_transaction(
        v_application.user_id,
        'repeat_cashback',
        'credit',
        v_cashback_amount,
        'repeat_cashback:' || v_application.user_id::text || ':' || p_application_id::text,
        p_application_id,
        v_payment.id,
        null,
        null,
        '20% repeat service cashback credited after verified completion',
        jsonb_build_object('fresh_paid_amount', v_fresh_amount, 'cashback_percent', 20, 'closed_loop', true),
        p_created_by
      );
    end if;
  end if;

  update public.applications
  set cashback_awarded = true,
      cashback_awarded_at = coalesce(cashback_awarded_at, now()),
      cashback_credited_at = coalesce(cashback_credited_at, now()),
      cashback_amount = v_cashback_amount,
      referral_reward_processed = true,
      updated_at = now()
  where id = p_application_id;

  return jsonb_build_object(
    'processed', true,
    'first_service', v_is_first,
    'cashback_amount', v_cashback_amount,
    'cashback_transaction_id', v_cashback_tx.id,
    'referrer_transaction_id', v_referrer_tx.id
  );
end;
$$;

create or replace function public.reverse_reward_wallet_transaction(
  p_transaction_id uuid,
  p_reason text,
  p_created_by uuid default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.wallet_transactions;
  v_reverse public.wallet_transactions;
begin
  select * into v_original
  from public.wallet_transactions
  where id = p_transaction_id
  for update;

  if v_original.id is null then
    raise exception 'Transaction not found.';
  end if;

  if v_original.status = 'reversed' then
    return v_original;
  end if;

  v_reverse := public.post_reward_wallet_transaction(
    v_original.user_id,
    'reversal',
    case when v_original.direction = 'credit' then 'debit' else 'credit' end,
    v_original.amount,
    'reversal:' || v_original.id::text,
    v_original.application_id,
    v_original.payment_id,
    v_original.referred_user_id,
    v_original.referrer_user_id,
    coalesce(nullif(trim(p_reason), ''), 'Reward transaction reversed'),
    jsonb_build_object('reversed_transaction_id', v_original.id, 'original_type', v_original.type),
    p_created_by
  );

  update public.wallet_transactions
  set status = 'reversed',
      metadata = metadata || jsonb_build_object('reversal_transaction_id', v_reverse.id, 'reversal_reason', p_reason)
  where id = v_original.id
  returning * into v_original;

  return v_reverse;
end;
$$;

alter table public.reward_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.referral_events enable row level security;
alter table public.reward_audit_logs enable row level security;

drop policy if exists "Customers read own reward wallet" on public.reward_wallets;
create policy "Customers read own reward wallet" on public.reward_wallets
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage reward wallets" on public.reward_wallets;
create policy "Admins manage reward wallets" on public.reward_wallets
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Customers read own wallet transactions" on public.wallet_transactions;
create policy "Customers read own wallet transactions" on public.wallet_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage wallet transactions" on public.wallet_transactions;
create policy "Admins manage wallet transactions" on public.wallet_transactions
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Customers read own referral events" on public.referral_events;
create policy "Customers read own referral events" on public.referral_events
  for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

drop policy if exists "Admins manage referral events" on public.referral_events;
create policy "Admins manage referral events" on public.referral_events
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Admins read reward audit logs" on public.reward_audit_logs;
create policy "Admins read reward audit logs" on public.reward_audit_logs
  for select using (public.is_admin_role());

drop policy if exists "Admins insert reward audit logs" on public.reward_audit_logs;
create policy "Admins insert reward audit logs" on public.reward_audit_logs
  for insert with check (public.is_admin_role());

revoke execute on function public.generate_secure_referral_code() from anon, authenticated;
revoke execute on function public.ensure_referral_code_for_user(uuid) from anon, authenticated;
revoke execute on function public.create_reward_wallet_if_missing(uuid) from anon, authenticated;
revoke execute on function public.post_reward_wallet_transaction(uuid, text, text, numeric, text, uuid, uuid, uuid, uuid, text, jsonb, uuid) from anon, authenticated;
revoke execute on function public.calculate_referral_risk(uuid, uuid, text, text) from anon, authenticated;
revoke execute on function public.attach_referral_on_signup(uuid, text, text, text) from anon, authenticated;
revoke execute on function public.redeem_reward_wallet_for_application(uuid, uuid, numeric, numeric, uuid, uuid) from anon, authenticated;
revoke execute on function public.process_rewards_on_application_completed(uuid, uuid) from anon, authenticated;
revoke execute on function public.reverse_reward_wallet_transaction(uuid, text, uuid) from anon, authenticated;

grant execute on function public.generate_secure_referral_code() to service_role;
grant execute on function public.ensure_referral_code_for_user(uuid) to service_role;
grant execute on function public.create_reward_wallet_if_missing(uuid) to service_role;
grant execute on function public.post_reward_wallet_transaction(uuid, text, text, numeric, text, uuid, uuid, uuid, uuid, text, jsonb, uuid) to service_role;
grant execute on function public.calculate_referral_risk(uuid, uuid, text, text) to service_role;
grant execute on function public.attach_referral_on_signup(uuid, text, text, text) to service_role;
grant execute on function public.redeem_reward_wallet_for_application(uuid, uuid, numeric, numeric, uuid, uuid) to service_role;
grant execute on function public.process_rewards_on_application_completed(uuid, uuid) to service_role;
grant execute on function public.reverse_reward_wallet_transaction(uuid, text, uuid) to service_role;

