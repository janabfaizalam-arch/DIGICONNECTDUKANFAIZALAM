-- Canonical closed-loop reward wallet rules.
-- New writes go only to reward_wallets + wallet_transactions. Legacy wallet tables stay read-only.

alter table public.profiles
  add column if not exists referred_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists referral_code_used text,
  add column if not exists first_service_completed_at timestamptz,
  add column if not exists first_service_cashback_awarded boolean not null default false,
  add column if not exists signup_referral_reward_awarded boolean not null default false;

alter table public.referral_events
  add column if not exists referrer_signup_reward_status text not null default 'pending',
  add column if not exists referrer_signup_reward_credited_at timestamptz;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.wallet_transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.wallet_transactions drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.wallet_transactions
  add column if not exists type text,
  add column if not exists transaction_type text,
  add constraint wallet_transactions_type_check
  check (
    type in (
      'signup_bonus',
      'referrer_signup_bonus',
      'referrer_first_service_bonus',
      'first_service_cashback',
      'repeat_cashback',
      'redeem',
      'legacy_wallet_migration',
      'admin_adjustment',
      'reversal',
      'signup_referral_bonus',
      'referrer_bonus'
    )
  );

update public.wallet_transactions
set type = coalesce(
    nullif(type, ''),
    case
      when transaction_type = 'wallet_usage' then 'redeem'
      when transaction_type = 'cashback_credit' then 'repeat_cashback'
      when transaction_type = 'admin_bonus' then 'admin_adjustment'
      when transaction_type = 'refund_adjustment' then 'reversal'
      else nullif(transaction_type, '')
    end,
    'admin_adjustment'
  ),
  transaction_type = coalesce(
    nullif(transaction_type, ''),
    nullif(type, ''),
    'admin_adjustment'
  );

alter table public.wallet_transactions
  alter column type set not null,
  alter column transaction_type set default 'admin_adjustment',
  alter column transaction_type set not null;

create unique index if not exists wallet_signup_bonus_once_idx
  on public.wallet_transactions (user_id)
  where type = 'signup_bonus' and status <> 'reversed';

create unique index if not exists wallet_referrer_signup_bonus_once_idx
  on public.wallet_transactions (referrer_user_id, referred_user_id)
  where type = 'referrer_signup_bonus' and status <> 'reversed';

create unique index if not exists wallet_referrer_first_service_bonus_once_idx
  on public.wallet_transactions (referrer_user_id, referred_user_id)
  where type = 'referrer_first_service_bonus' and status <> 'reversed';

create unique index if not exists wallet_legacy_migration_once_idx
  on public.wallet_transactions (user_id)
  where type = 'legacy_wallet_migration' and status <> 'reversed';

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.wallet_transactions'::regclass
      and c.contype = 'f'
      and a.attname = 'wallet_id'
  loop
    execute format('alter table public.wallet_transactions drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.wallet_transactions
  add column if not exists wallet_id uuid;

insert into public.reward_wallets (user_id)
select distinct wt.user_id
from public.wallet_transactions wt
where wt.user_id is not null
on conflict (user_id) do nothing;

update public.wallet_transactions wt
set wallet_id = rw.id
from public.reward_wallets rw
where wt.wallet_id is null
  and rw.user_id = wt.user_id;

alter table public.wallet_transactions
  alter column wallet_id set not null;

create index if not exists wallet_transactions_wallet_id_idx
  on public.wallet_transactions(wallet_id);

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

  perform pg_advisory_xact_lock(hashtext(p_idempotency_key));

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = p_idempotency_key
  limit 1;

  if v_existing.id is not null then
    return v_existing;
  end if;

  perform public.create_reward_wallet_if_missing(p_user_id);

  select * into v_wallet
  from public.reward_wallets
  where user_id = p_user_id
  for update;

  if v_wallet.frozen then
    raise exception 'Reward wallet is frozen.';
  end if;

  if p_direction = 'credit' then
    v_balance := round(v_wallet.balance + round(p_amount, 2), 2);
    update public.reward_wallets
    set balance = v_balance,
        lifetime_earned = round(lifetime_earned + round(p_amount, 2), 2),
        updated_at = now()
    where user_id = p_user_id;
  elsif p_direction = 'debit' then
    if v_wallet.balance < round(p_amount, 2) then
      raise exception 'Insufficient reward wallet balance.';
    end if;

    v_balance := round(v_wallet.balance - round(p_amount, 2), 2);
    update public.reward_wallets
    set balance = v_balance,
        lifetime_redeemed = round(lifetime_redeemed + round(p_amount, 2), 2),
        updated_at = now()
    where user_id = p_user_id;
  else
    raise exception 'Invalid wallet direction.';
  end if;

  insert into public.wallet_transactions (
    wallet_id, user_id, type, transaction_type, direction, amount, balance_after, application_id, payment_id,
    referred_user_id, referrer_user_id, idempotency_key, status, note, metadata, created_by
  )
  values (
    v_wallet.id, p_user_id, p_type, p_type, p_direction, round(p_amount, 2), v_balance, p_application_id, p_payment_id,
    p_referred_user_id, p_referrer_user_id, p_idempotency_key, 'posted', p_note, coalesce(p_metadata, '{}'::jsonb), p_created_by
  )
  returning * into v_transaction;

  return v_transaction;
end;
$$;

create or replace function public.reconcile_reward_wallet_balance(p_user_id uuid)
returns public.reward_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.reward_wallets;
  v_balance numeric(12, 2);
  v_earned numeric(12, 2);
  v_redeemed numeric(12, 2);
begin
  perform public.create_reward_wallet_if_missing(p_user_id);

  select
    round(coalesce(sum(case when direction = 'credit' and status = 'posted' then amount when direction = 'debit' and status = 'posted' then -amount else 0 end), 0), 2),
    round(coalesce(sum(case when direction = 'credit' and status = 'posted' then amount else 0 end), 0), 2),
    round(coalesce(sum(case when direction = 'debit' and status = 'posted' then amount else 0 end), 0), 2)
  into v_balance, v_earned, v_redeemed
  from public.wallet_transactions
  where user_id = p_user_id;

  update public.reward_wallets
  set balance = greatest(v_balance, 0),
      lifetime_earned = greatest(v_earned, 0),
      lifetime_redeemed = greatest(v_redeemed, 0),
      updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$$;

create or replace function public.credit_signup_bonus_if_missing(
  p_user_id uuid,
  p_created_by uuid default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.post_reward_wallet_transaction(
    p_user_id,
    'signup_bonus',
    'credit',
    500,
    'signup_bonus_500:' || p_user_id::text,
    null,
    null,
    null,
    null,
    'Signup bonus credited to DigiConnect Reward Wallet',
    jsonb_build_object('closed_loop', true),
    coalesce(p_created_by, p_user_id)
  );
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

  perform public.credit_signup_bonus_if_missing(p_referred_user_id, p_referred_user_id);

  v_risk := public.calculate_referral_risk(v_referrer_id, p_referred_user_id, p_ip, p_user_agent);

  update public.profiles
  set referred_by_user_id = coalesce(referred_by_user_id, v_referrer_id),
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

  if v_event.referrer_signup_reward_status = 'pending' then
    perform public.post_reward_wallet_transaction(
      v_event.referrer_user_id,
      'referrer_signup_bonus',
      'credit',
      100,
      'referrer_signup_bonus_100:' || v_event.referrer_user_id::text || ':' || p_referred_user_id::text,
      null,
      null,
      p_referred_user_id,
      v_event.referrer_user_id,
      'Referral signup bonus credited after referred user signup',
      jsonb_build_object('referral_event_id', v_event.id, 'referral_code', v_code, 'closed_loop', true, 'risk_score', v_event.risk_score),
      p_referred_user_id
    );

    update public.referral_events
    set referrer_signup_reward_status = 'credited',
        signup_reward_status = 'credited',
        referrer_signup_reward_credited_at = coalesce(referrer_signup_reward_credited_at, now()),
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

  perform pg_advisory_xact_lock(hashtext('wallet_redeem:' || p_user_id::text || ':' || p_application_id::text));

  select * into v_tx
  from public.wallet_transactions
  where idempotency_key = 'wallet_redeem:' || p_user_id::text || ':' || p_application_id::text
  limit 1;

  if v_tx.id is not null then
    return v_tx;
  end if;

  perform public.create_reward_wallet_if_missing(p_user_id);
  select * into v_wallet from public.reward_wallets where user_id = p_user_id for update;

  v_max_allowed := floor(round(p_order_amount, 2) * 0.5);
  v_amount := least(round(p_requested_amount, 2), v_wallet.balance, v_max_allowed);

  if round(p_requested_amount, 2) > v_max_allowed then
    raise exception 'Rewards can be used for maximum 50 percent of service amount.';
  end if;

  if round(p_order_amount, 2) - v_amount < ceil(round(p_order_amount, 2) * 0.5) then
    raise exception 'At least 50 percent fresh Razorpay payment is required.';
  end if;

  if v_amount <= 0 then
    return null;
  end if;

  v_tx := public.post_reward_wallet_transaction(
    p_user_id,
    'redeem',
    'debit',
    v_amount,
    'wallet_redeem:' || p_user_id::text || ':' || p_application_id::text,
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

  if lower(coalesce(v_application.status, '')) <> 'completed' then
    return jsonb_build_object('processed', false, 'reason', 'not_completed');
  end if;

  select * into v_payment
  from public.payments
  where application_id = p_application_id
    and status = 'verified'
  order by paid_at desc nulls last, created_at desc
  limit 1;

  if v_payment.id is null or coalesce(v_application.payment_status, '') <> 'verified' then
    return jsonb_build_object('processed', false, 'reason', 'verified_payment_missing');
  end if;

  v_fresh_amount := round(coalesce(
    nullif(v_application.cashback_eligible_amount, 0),
    nullif(v_application.fresh_payable_amount, 0),
    nullif(v_application.real_payment_amount, 0),
    nullif(v_payment.real_payment_amount, 0),
    nullif(v_payment.amount, 0),
    0
  ), 2);

  if v_fresh_amount <= 0 then
    return jsonb_build_object('processed', false, 'reason', 'free_or_wallet_only_service');
  end if;

  if v_application.cashback_awarded then
    return jsonb_build_object('processed', true, 'already_processed', true);
  end if;

  v_is_first := not exists (
    select 1
    from public.applications a
    join public.wallet_transactions wt on wt.application_id = a.id
    where a.user_id = v_application.user_id
      and a.status = 'completed'
      and a.payment_status = 'verified'
      and wt.type = 'first_service_cashback'
      and wt.status <> 'reversed'
  );

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
        'referrer_first_service_bonus',
        'credit',
        100,
        'referrer_first_service_bonus_100:' || v_referral.referrer_user_id::text || ':' || v_application.user_id::text,
        p_application_id,
        v_payment.id,
        v_application.user_id,
        v_referral.referrer_user_id,
        'Referral first service bonus credited after referred user completed first paid service',
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
        'repeat_cashback_20:' || v_application.user_id::text || ':' || p_application_id::text,
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

create or replace function public.migrate_legacy_wallet_if_needed(p_user_id uuid)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.reward_wallets;
  v_wallet_id uuid;
  v_existing public.wallet_transactions;
  v_legacy_balance numeric(12, 2) := 0;
  v_candidate numeric(12, 2);
begin
  v_wallet := public.create_reward_wallet_if_missing(p_user_id);
  v_wallet_id := v_wallet.id;

  if v_wallet_id is null then
    perform public.create_reward_wallet_if_missing(p_user_id);

    select id into v_wallet_id
    from public.reward_wallets
    where user_id = p_user_id
    limit 1;
  end if;

  if v_wallet_id is null then
    raise exception 'Reward wallet could not be created.';
  end if;

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = 'legacy_wallet_migration:' || p_user_id::text
  limit 1;

  if v_existing.id is not null then
    return v_existing;
  end if;

  if coalesce(v_wallet.balance, 0) > 0 then
    return null;
  end if;

  begin
    if to_regclass('public.wallets') is not null then
      execute 'select greatest(coalesce(balance_points, balance, 0), 0) from public.wallets where user_id = $1 order by updated_at desc nulls last limit 1'
      into v_candidate
      using p_user_id;
      v_legacy_balance := greatest(v_legacy_balance, coalesce(v_candidate, 0));
    end if;
  exception when undefined_column then
    begin
      execute 'select greatest(coalesce(balance, 0), 0) from public.wallets where user_id = $1 limit 1'
      into v_candidate
      using p_user_id;
      v_legacy_balance := greatest(v_legacy_balance, coalesce(v_candidate, 0));
    exception when others then
      null;
    end;
  end;

  if v_legacy_balance <= 0 then
    return null;
  end if;

  return public.post_reward_wallet_transaction(
    p_user_id,
    'legacy_wallet_migration',
    'credit',
    v_legacy_balance,
    'legacy_wallet_migration:' || p_user_id::text,
    null,
    null,
    null,
    null,
    'Legacy DigiWallet balance migrated into canonical Reward Wallet ledger',
    jsonb_build_object('legacy_balance', v_legacy_balance, 'source', 'wallets', 'closed_loop', true),
    null
  );
end;
$$;

do $$
declare
  v_profile record;
begin
  for v_profile in
    select id
    from public.profiles
    where coalesce(role, 'customer') = 'customer'
  loop
    perform public.create_reward_wallet_if_missing(v_profile.id);
    perform public.migrate_legacy_wallet_if_needed(v_profile.id);
    perform public.credit_signup_bonus_if_missing(v_profile.id, null);
  end loop;
end;
$$;

create or replace view public.reward_wallet_diagnostics as
with ledger as (
  select
    user_id,
    coalesce(sum(case when direction = 'credit' and status = 'posted' then amount when direction = 'debit' and status = 'posted' then -amount else 0 end), 0) as ledger_balance
  from public.wallet_transactions
  group by user_id
),
duplicate_attempts as (
  select idempotency_key, count(*) as attempts
  from public.wallet_transactions
  group by idempotency_key
  having count(*) > 1
),
completed_missing_cashback as (
  select a.id, a.user_id
  from public.applications a
  where a.status = 'completed'
    and a.payment_status = 'verified'
    and coalesce(a.amount, 0) > 0
    and not exists (
      select 1
      from public.wallet_transactions wt
      where wt.application_id = a.id
        and wt.type in ('first_service_cashback', 'repeat_cashback')
        and wt.status <> 'reversed'
    )
),
legacy_wallets as (
  select user_id, greatest(coalesce(balance_points, balance, 0), 0) as legacy_balance
  from public.wallets
  where greatest(coalesce(balance_points, balance, 0), 0) > 0
)
select
  'wallet_balance_mismatch' as issue_type,
  w.user_id,
  null::uuid as application_id,
  null::uuid as referral_event_id,
  jsonb_build_object('wallet_balance', w.balance, 'ledger_balance', coalesce(l.ledger_balance, 0)) as details
from public.reward_wallets w
left join ledger l on l.user_id = w.user_id
where w.balance <> coalesce(l.ledger_balance, 0)
union all
select
  'duplicate_reward_attempts',
  null::uuid,
  null::uuid,
  null::uuid,
  jsonb_build_object('idempotency_key', idempotency_key, 'attempts', attempts)
from duplicate_attempts
union all
select
  'legacy_wallet_balance_not_migrated',
  lw.user_id,
  null::uuid,
  null::uuid,
  jsonb_build_object('legacy_balance', lw.legacy_balance, 'reward_wallet_balance', coalesce(rw.balance, 0))
from legacy_wallets lw
left join public.reward_wallets rw on rw.user_id = lw.user_id
where coalesce(rw.balance, 0) = 0
union all
select
  'completed_application_cashback_missing',
  cm.user_id,
  cm.id,
  null::uuid,
  jsonb_build_object('application_id', cm.id)
from completed_missing_cashback cm
union all
select
  'referrer_signup_bonus_missing',
  re.referrer_user_id,
  null::uuid,
  re.id,
  jsonb_build_object('referred_user_id', re.referred_user_id, 'referral_code', re.referral_code)
from public.referral_events re
where not exists (
  select 1
  from public.wallet_transactions wt
  where wt.type = 'referrer_signup_bonus'
    and wt.referrer_user_id = re.referrer_user_id
    and wt.referred_user_id = re.referred_user_id
    and wt.status <> 'reversed'
)
union all
select
  'referrer_first_service_bonus_missing',
  re.referrer_user_id,
  re.referred_first_application_id,
  re.id,
  jsonb_build_object('referred_user_id', re.referred_user_id, 'referral_code', re.referral_code)
from public.referral_events re
where re.referred_first_completed_at is not null
  and not exists (
    select 1
    from public.wallet_transactions wt
    where wt.type = 'referrer_first_service_bonus'
      and wt.referrer_user_id = re.referrer_user_id
      and wt.referred_user_id = re.referred_user_id
      and wt.status <> 'reversed'
  );
