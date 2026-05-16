-- Incremental repair for the closed-loop Referral + Reward Wallet system.
-- Base schema is in 20260514130000_secure_referral_reward_wallet.sql.

create unique index if not exists wallet_redeem_application_once_idx
  on public.wallet_transactions (user_id, application_id)
  where type = 'redeem' and status <> 'reversed';

insert into public.reward_wallets (user_id)
select p.id
from public.profiles p
where coalesce(p.role, 'customer') = 'customer'
on conflict (user_id) do nothing;

do $$
declare
  v_profile record;
begin
  for v_profile in
    select id
    from public.profiles
    where coalesce(referral_code, '') = ''
      and coalesce(role, 'customer') = 'customer'
  loop
    perform public.ensure_referral_code_for_user(v_profile.id);
  end loop;
end;
$$;

update public.applications
set wallet_redeemed_amount = coalesce(nullif(wallet_redeemed_amount, 0), coalesce(wallet_used_amount, 0)),
    fresh_payable_amount = case
      when fresh_payable_amount > 0 then fresh_payable_amount
      else greatest(coalesce(amount, 0) - coalesce(nullif(wallet_redeemed_amount, 0), wallet_used_amount, 0), 0)
    end,
    cashback_eligible_amount = case
      when cashback_eligible_amount > 0 then cashback_eligible_amount
      else greatest(coalesce(amount, 0) - coalesce(nullif(wallet_redeemed_amount, 0), wallet_used_amount, 0), 0)
    end
where coalesce(amount, 0) > 0;

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

  select * into v_tx
  from public.wallet_transactions
  where idempotency_key = 'wallet_redeem:' || p_user_id::text || ':' || p_application_id::text
  limit 1;

  if v_tx.id is not null then
    return v_tx;
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
  order by paid_at desc nulls last, created_at desc
  limit 1;

  if v_payment.id is null then
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

  select * into v_profile
  from public.profiles
  where id = v_application.user_id
  for update;

  if v_application.cashback_awarded then
    return jsonb_build_object('processed', true, 'already_processed', true);
  end if;

  v_is_first := not coalesce(v_profile.first_service_cashback_awarded, false)
    and not exists (
      select 1
      from public.wallet_transactions
      where user_id = v_application.user_id
        and type = 'first_service_cashback'
        and status <> 'reversed'
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

update public.reward_wallets w
set balance = s.balance,
    lifetime_earned = s.lifetime_earned,
    lifetime_redeemed = s.lifetime_redeemed,
    updated_at = now()
from (
  select
    user_id,
    coalesce(sum(case
      when direction = 'credit' and status = 'posted' then amount
      when direction = 'debit' and status = 'posted' then -amount
      else 0
    end), 0) as balance,
    coalesce(sum(case when direction = 'credit' and status = 'posted' then amount else 0 end), 0) as lifetime_earned,
    coalesce(sum(case when direction = 'debit' and status = 'posted' then amount else 0 end), 0) as lifetime_redeemed
  from public.wallet_transactions
  group by user_id
) s
where w.user_id = s.user_id
  and (
    w.balance <> s.balance
    or w.lifetime_earned <> s.lifetime_earned
    or w.lifetime_redeemed <> s.lifetime_redeemed
  );

create or replace view public.reward_wallet_diagnostics as
with ledger as (
  select
    user_id,
    coalesce(sum(case
      when direction = 'credit' and status = 'posted' then amount
      when direction = 'debit' and status = 'posted' then -amount
      else 0
    end), 0) as ledger_balance
  from public.wallet_transactions
  group by user_id
),
duplicate_attempts as (
  select idempotency_key, count(*) as attempts
  from public.wallet_transactions
  group by idempotency_key
  having count(*) > 1
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
  'referral_event_without_signup_wallet_transaction',
  re.referred_user_id,
  null::uuid,
  re.id,
  jsonb_build_object('signup_reward_status', re.signup_reward_status, 'referral_code', re.referral_code)
from public.referral_events re
where re.signup_reward_status = 'credited'
  and not exists (
    select 1
    from public.wallet_transactions wt
    where wt.user_id = re.referred_user_id
      and wt.type = 'signup_referral_bonus'
      and wt.status <> 'reversed'
  )
union all
select
  'completed_paid_application_without_cashback',
  a.user_id,
  a.id,
  null::uuid,
  jsonb_build_object('status', a.status, 'payment_status', a.payment_status, 'amount', a.amount)
from public.applications a
where lower(coalesce(a.status, '')) in ('completed','delivered','approved','done')
  and coalesce(a.payment_status, '') = 'verified'
  and coalesce(a.amount, 0) > 0
  and not coalesce(a.cashback_awarded, false);

grant select on public.reward_wallet_diagnostics to service_role;
