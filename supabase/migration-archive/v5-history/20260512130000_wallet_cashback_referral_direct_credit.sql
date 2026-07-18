-- ⚠️ LEGACY — SUPERSEDED by 20260514130000_secure_referral_reward_wallet.sql
-- Functions (credit_service_cashback, credit_referral_reward_on_signup, credit_referral_reward_by_code)
-- replaced by canonical reward wallet functions. Migration kept for chain integrity only.
--
-- Direct referral rewards + fixed 20% service cashback.
-- Idempotent and safe to run multiple times.

create unique index if not exists reward_referral_referred_user_once_idx
  on public.reward_transactions (reference_id)
  where type = 'referral_bonus' and reference_type = 'referred_user';

create unique index if not exists reward_cashback_application_once_idx
  on public.reward_transactions (reference_id)
  where type = 'cashback' and reference_type = 'application';

create or replace function public.credit_service_cashback(
  p_application_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_existing_transaction_id uuid;
  v_cashback_amount numeric(10, 2);
  v_paid_amount numeric(10, 2);
begin
  if p_application_id is null then
    return null;
  end if;

  select * into v_application
  from public.applications
  where id = p_application_id
  limit 1;

  if v_application.id is null or v_application.user_id is null then
    return null;
  end if;

  select id into v_existing_transaction_id
  from public.reward_transactions
  where type = 'cashback'
    and reference_type = 'application'
    and reference_id = p_application_id
  limit 1;

  if v_existing_transaction_id is not null then
    update public.applications
    set cashback_credited_at = coalesce(cashback_credited_at, now()),
        updated_at = now()
    where id = p_application_id;

    perform public.refresh_reward_wallet_summary(v_application.user_id);
    return v_existing_transaction_id;
  end if;

  if lower(coalesce(v_application.status, '')) not in ('completed', 'delivered', 'approved', 'done') then
    return null;
  end if;

  if lower(coalesce(v_application.payment_status, '')) <> 'verified' then
    return null;
  end if;

  v_paid_amount := round(greatest(coalesce(v_application.amount, 0), 0), 2);

  if v_paid_amount <= 0 then
    return null;
  end if;

  v_cashback_amount := round(v_paid_amount * 0.20, 2);

  if v_cashback_amount <= 0 then
    return null;
  end if;

  v_existing_transaction_id := public.credit_reward_points(
    v_application.user_id,
    'cashback',
    v_cashback_amount,
    '20% service cashback credited',
    'application',
    p_application_id,
    p_created_by,
    now() + interval '6 months',
    jsonb_build_object(
      'service_slug', v_application.service_slug,
      'service_name', v_application.service_name,
      'paid_amount', v_paid_amount,
      'cashback_percent', 20
    )
  );

  if v_existing_transaction_id is not null then
    update public.applications
    set cashback_credited_at = coalesce(cashback_credited_at, now()),
        cashback_amount = v_cashback_amount,
        cashback_enabled = true,
        updated_at = now()
    where id = p_application_id;
  end if;

  return v_existing_transaction_id;
end;
$$;

create or replace function public.credit_referral_reward_on_signup(
  p_referrer_id uuid,
  p_referred_user_id uuid,
  p_referral_code text default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.referrals%rowtype;
  v_existing_transaction_id uuid;
  v_reward_amount numeric(10, 2) := 50;
  v_code text;
begin
  if p_referrer_id is null or p_referred_user_id is null or p_referrer_id = p_referred_user_id then
    return null;
  end if;

  v_code := upper(trim(coalesce(p_referral_code, '')));

  select * into v_referral
  from public.referrals
  where referred_user_id = p_referred_user_id
  limit 1;

  if v_referral.id is null then
    insert into public.referrals (referrer_id, referred_user_id, referral_code, status, reward_amount, completed_at)
    values (p_referrer_id, p_referred_user_id, coalesce(nullif(v_code, ''), 'DIRECT'), 'completed', v_reward_amount, now())
    on conflict (referred_user_id) do update
      set status = case when public.referrals.status = 'rejected' then public.referrals.status else 'completed' end,
          completed_at = case when public.referrals.status = 'rejected' then public.referrals.completed_at else coalesce(public.referrals.completed_at, now()) end,
          reward_amount = case when public.referrals.status = 'rejected' then public.referrals.reward_amount else v_reward_amount end
    returning * into v_referral;
  end if;

  if v_referral.status = 'rejected' then
    return null;
  end if;

  select id into v_existing_transaction_id
  from public.reward_transactions
  where type = 'referral_bonus'
    and (
      (reference_type = 'referred_user' and reference_id = p_referred_user_id)
      or (reference_type = 'referral' and reference_id = v_referral.id)
      or (metadata ->> 'referred_user_id') = p_referred_user_id::text
    )
  limit 1;

  if v_existing_transaction_id is not null then
    update public.referrals
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        reward_amount = coalesce(nullif(reward_amount, 0), v_reward_amount)
    where id = v_referral.id
      and status <> 'rejected';

    perform public.refresh_reward_wallet_summary(v_referral.referrer_id);
    return v_existing_transaction_id;
  end if;

  v_existing_transaction_id := public.credit_reward_points(
    v_referral.referrer_id,
    'referral_bonus',
    coalesce(nullif(v_referral.reward_amount, 0), v_reward_amount),
    'Referral reward credited',
    'referred_user',
    p_referred_user_id,
    p_created_by,
    now() + interval '6 months',
    jsonb_build_object('referral_id', v_referral.id, 'referred_user_id', p_referred_user_id)
  );

  if v_existing_transaction_id is not null then
    update public.referrals
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        reward_amount = coalesce(nullif(reward_amount, 0), v_reward_amount)
    where id = v_referral.id;
  end if;

  return v_existing_transaction_id;
end;
$$;

create or replace function public.credit_referral_reward_by_code(
  p_referral_code text,
  p_referred_user_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
begin
  if p_referred_user_id is null or length(trim(coalesce(p_referral_code, ''))) = 0 then
    return null;
  end if;

  select id into v_referrer_id
  from public.profiles
  where referral_code = upper(trim(p_referral_code))
  limit 1;

  if v_referrer_id is null then
    return null;
  end if;

  return public.credit_referral_reward_on_signup(
    v_referrer_id,
    p_referred_user_id,
    p_referral_code,
    p_created_by
  );
end;
$$;

create or replace function public.backfill_pending_referral_rewards()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral record;
  v_count integer := 0;
  v_transaction_id uuid;
begin
  for v_referral in
    select r.id, r.referrer_id, r.referred_user_id, r.referral_code
    from public.referrals r
    where r.status = 'pending'
      and exists (select 1 from auth.users u where u.id = r.referred_user_id)
  loop
    v_transaction_id := public.credit_referral_reward_on_signup(
      v_referral.referrer_id,
      v_referral.referred_user_id,
      v_referral.referral_code,
      null
    );

    if v_transaction_id is not null then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.complete_referral_reward(
  p_referred_user_id uuid,
  p_application_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.referrals%rowtype;
begin
  select * into v_referral
  from public.referrals
  where referred_user_id = p_referred_user_id
  limit 1;

  if v_referral.id is null then
    return null;
  end if;

  return public.credit_referral_reward_on_signup(
    v_referral.referrer_id,
    p_referred_user_id,
    v_referral.referral_code,
    p_created_by
  );
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
    perform public.credit_referral_reward_on_signup(v_referrer_id, p_user_id, p_referral_code, null);
  end if;

  perform public.refresh_reward_wallet_summary(p_user_id);
end;
$$;

revoke execute on function public.credit_service_cashback(uuid, uuid) from anon, authenticated;
revoke execute on function public.credit_referral_reward_on_signup(uuid, uuid, text, uuid) from anon, authenticated;
revoke execute on function public.credit_referral_reward_by_code(text, uuid, uuid) from anon, authenticated;
revoke execute on function public.backfill_pending_referral_rewards() from anon, authenticated;
revoke execute on function public.complete_referral_reward(uuid, uuid, uuid) from anon, authenticated;

grant execute on function public.credit_service_cashback(uuid, uuid) to service_role;
grant execute on function public.credit_referral_reward_on_signup(uuid, uuid, text, uuid) to service_role;
grant execute on function public.credit_referral_reward_by_code(text, uuid, uuid) to service_role;
grant execute on function public.backfill_pending_referral_rewards() to service_role;
grant execute on function public.complete_referral_reward(uuid, uuid, uuid) to service_role;

select public.backfill_pending_referral_rewards();
