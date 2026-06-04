-- Migration: Wallet dual 50% cap + cashback at payment verification time
-- Fixes the wallet redeem formula to enforce BOTH 50% of service AND 50% of wallet balance
-- Adds process_rewards_on_payment_verified RPC for instant cashback on payment

-- 1. Add payment_cashback_processed column to applications
alter table public.applications
  add column if not exists payment_cashback_processed boolean not null default false,
  add column if not exists cashback_processed_at timestamptz;

-- 2. Fix redeem_reward_wallet_for_application to use dual 50% cap
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
  v_max_by_service numeric(12, 2);
  v_max_by_wallet numeric(12, 2);
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

  -- Dual 50% cap: min(50% of service, 50% of wallet balance)
  v_max_by_service := floor(round(p_order_amount, 2) * 0.5);
  v_max_by_wallet := floor(v_wallet.balance * 0.5);
  v_max_allowed := least(v_max_by_service, v_max_by_wallet);
  v_amount := least(round(p_requested_amount, 2), v_max_allowed);

  if round(p_requested_amount, 2) > v_max_allowed + 1 then
    raise exception 'Rewards can be used for maximum 50%% of service amount and 50%% of wallet balance.';
  end if;

  if round(p_order_amount, 2) - v_amount < ceil(round(p_order_amount, 2) * 0.5) then
    raise exception 'At least 50%% fresh Razorpay payment is required.';
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
    jsonb_build_object('order_amount', p_order_amount, 'max_redeem_percent', 50, 'max_by_service', v_max_by_service, 'max_by_wallet', v_max_by_wallet, 'closed_loop', true),
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

-- 3. Create process_rewards_on_payment_verified RPC
-- This is similar to process_rewards_on_application_completed but triggers at payment
-- verification time (status='submitted') instead of completion time (status='completed').
create or replace function public.process_rewards_on_payment_verified(
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

  -- Accept both 'submitted' (after verify-payment) and 'completed' (legacy flow)
  if lower(coalesce(v_application.status, '')) not in ('submitted', 'completed', 'in_process') then
    return jsonb_build_object('processed', false, 'reason', 'not_submitted_or_completed');
  end if;

  if coalesce(v_application.payment_status, '') <> 'verified' then
    return jsonb_build_object('processed', false, 'reason', 'payment_not_verified');
  end if;

  -- Idempotency: if already processed, return early
  if v_application.payment_cashback_processed or v_application.cashback_awarded then
    return jsonb_build_object('processed', true, 'already_processed', true);
  end if;

  -- Calculate fresh paid amount
  v_fresh_amount := round(coalesce(
    nullif(v_application.cashback_eligible_amount, 0),
    nullif(v_application.fresh_payable_amount, 0),
    nullif(v_application.real_payment_amount, 0),
    0
  ), 2);

  if v_fresh_amount <= 0 then
    -- Zero fresh payment (fully wallet paid) — mark as processed but no cashback
    update public.applications
    set payment_cashback_processed = true,
        cashback_processed_at = now(),
        cashback_awarded = true,
        cashback_awarded_at = now(),
        cashback_amount = 0,
        referral_reward_processed = true,
        updated_at = now()
    where id = p_application_id;

    return jsonb_build_object('processed', true, 'cashback_amount', 0, 'reason', 'wallet_only_no_cashback');
  end if;

  -- Determine if this is the first paid service
  v_is_first := not exists (
    select 1
    from public.wallet_transactions wt
    where wt.user_id = v_application.user_id
      and wt.type = 'first_service_cashback'
      and wt.status <> 'reversed'
  );

  if v_is_first then
    -- 100% first service cashback on fresh paid amount
    v_cashback_amount := v_fresh_amount;
    v_cashback_tx := public.post_reward_wallet_transaction(
      v_application.user_id,
      'first_service_cashback',
      'credit',
      v_cashback_amount,
      'first_service_cashback:' || v_application.user_id::text || ':' || p_application_id::text,
      p_application_id,
      null,
      null,
      null,
      '100% first service cashback credited after verified payment',
      jsonb_build_object('fresh_paid_amount', v_fresh_amount, 'cashback_percent', 100, 'closed_loop', true),
      p_created_by
    );

    update public.profiles
    set first_service_cashback_awarded = true,
        first_service_completed_at = coalesce(first_service_completed_at, now()),
        updated_at = now()
    where id = v_application.user_id;

    -- Credit referrer first-service bonus (₹100)
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
        null,
        v_application.user_id,
        v_referral.referrer_user_id,
        'Referral first service bonus credited after referred user first paid service',
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
    -- 20% repeat cashback on fresh paid amount
    v_cashback_amount := floor(v_fresh_amount * 0.20);

    if v_cashback_amount > 0 then
      v_cashback_tx := public.post_reward_wallet_transaction(
        v_application.user_id,
        'repeat_cashback',
        'credit',
        v_cashback_amount,
        'repeat_cashback_20:' || v_application.user_id::text || ':' || p_application_id::text,
        p_application_id,
        null,
        null,
        null,
        '20% repeat service cashback credited after verified payment',
        jsonb_build_object('fresh_paid_amount', v_fresh_amount, 'cashback_percent', 20, 'closed_loop', true),
        p_created_by
      );
    end if;
  end if;

  -- Mark application as cashback processed
  update public.applications
  set payment_cashback_processed = true,
      cashback_processed_at = now(),
      cashback_awarded = true,
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

-- 4. Add RLS policies for reward_wallets
alter table public.reward_wallets enable row level security;

drop policy if exists "Customers can read own wallet" on public.reward_wallets;
create policy "Customers can read own wallet" on public.reward_wallets
  for select using (auth.uid() = user_id);

-- 5. Add RLS policies for wallet_transactions
alter table public.wallet_transactions enable row level security;

drop policy if exists "Customers can read own wallet transactions" on public.wallet_transactions;
create policy "Customers can read own wallet transactions" on public.wallet_transactions
  for select using (auth.uid() = user_id);
