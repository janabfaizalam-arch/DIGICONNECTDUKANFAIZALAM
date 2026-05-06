-- DigiWallet Cashback System
-- Internal wallet credit ledger for repeat purchases. Wallet credit is not a bank refund.

create extension if not exists pgcrypto;

alter table public.applications
  add column if not exists wallet_used_amount numeric(10, 2) not null default 0,
  add column if not exists real_payment_amount numeric(10, 2),
  add column if not exists cashback_enabled boolean not null default true,
  add column if not exists cashback_amount numeric(10, 2),
  add column if not exists cashback_expiry_days integer not null default 90,
  add column if not exists cashback_credited_at timestamptz;

alter table public.invoices
  add column if not exists wallet_used_amount numeric(10, 2) not null default 0,
  add column if not exists real_payment_amount numeric(10, 2);

alter table public.payments
  add column if not exists wallet_used_amount numeric(10, 2) not null default 0,
  add column if not exists real_payment_amount numeric(10, 2);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  balance numeric(10, 2) not null default 0 check (balance >= 0),
  total_cashback_earned numeric(10, 2) not null default 0 check (total_cashback_earned >= 0),
  total_cashback_used numeric(10, 2) not null default 0 check (total_cashback_used >= 0),
  nearest_expiry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.cashback_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_slug text,
  service_name text,
  cashback_type text not null default 'percentage' check (cashback_type in ('percentage', 'fixed')),
  cashback_value numeric(10, 2) not null default 100 check (cashback_value >= 0),
  expiry_days integer not null default 90 check (expiry_days > 0),
  max_redemption_percent numeric(5, 2) not null default 50 check (max_redemption_percent >= 0 and max_redemption_percent <= 50),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  campaign_id uuid references public.cashback_campaigns (id) on delete set null,
  transaction_type text not null check (transaction_type in ('cashback_credit', 'wallet_usage', 'refund_adjustment', 'admin_bonus')),
  direction text not null check (direction in ('credit', 'debit')),
  amount numeric(10, 2) not null check (amount > 0),
  remaining_amount numeric(10, 2) not null default 0 check (remaining_amount >= 0),
  service_name text,
  note text default '',
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'reversed')),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cashback_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  campaign_id uuid references public.cashback_campaigns (id) on delete set null,
  wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  service_name text not null,
  order_amount numeric(10, 2) not null default 0,
  cashback_amount numeric(10, 2) not null default 0,
  expires_at timestamptz not null,
  status text not null default 'credited' check (status in ('credited', 'expired', 'reversed')),
  created_at timestamptz not null default now(),
  unique (application_id)
);

create index if not exists wallets_user_idx on public.wallets (user_id);
create index if not exists wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);
create index if not exists wallet_transactions_expiry_idx on public.wallet_transactions (user_id, expires_at) where direction = 'credit' and status = 'active';
create unique index if not exists wallet_cashback_once_idx
  on public.wallet_transactions (application_id)
  where transaction_type = 'cashback_credit';
create index if not exists cashback_history_user_idx on public.cashback_history (user_id, created_at desc);
create index if not exists cashback_campaigns_active_idx on public.cashback_campaigns (active, service_slug);

insert into public.cashback_campaigns (title, service_slug, service_name, cashback_type, cashback_value, expiry_days, active)
values
  ('100% Cashback on ITR Filing', 'itr-filing', 'ITR Filing', 'percentage', 100, 90, true),
  ('100% Cashback on MSME Registration', 'msme-certificate', 'MSME Registration', 'percentage', 100, 90, true),
  ('DigiWallet Launch Cashback', null, null, 'percentage', 100, 90, true)
on conflict do nothing;

create or replace function public.refresh_wallet_summary(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_balance numeric(10, 2);
  v_earned numeric(10, 2);
  v_used numeric(10, 2);
  v_expiry timestamptz;
begin
  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.wallet_transactions
  set status = 'expired', remaining_amount = 0
  where user_id = p_user_id
    and direction = 'credit'
    and status = 'active'
    and expires_at is not null
    and expires_at <= now();

  select
    coalesce(sum(remaining_amount) filter (where direction = 'credit' and status = 'active' and (expires_at is null or expires_at > now())), 0),
    coalesce(sum(amount) filter (where transaction_type in ('cashback_credit', 'admin_bonus') and direction = 'credit'), 0),
    coalesce(sum(amount) filter (where transaction_type = 'wallet_usage' and direction = 'debit'), 0),
    min(expires_at) filter (where direction = 'credit' and status = 'active' and remaining_amount > 0 and expires_at > now())
  into v_balance, v_earned, v_used, v_expiry
  from public.wallet_transactions
  where user_id = p_user_id;

  update public.wallets
  set balance = v_balance,
      total_cashback_earned = v_earned,
      total_cashback_used = v_used,
      nearest_expiry_at = v_expiry,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$$;

create or replace function public.credit_wallet_cashback(
  p_user_id uuid,
  p_application_id uuid,
  p_service_name text,
  p_order_amount numeric,
  p_cashback_amount numeric,
  p_expiry_days integer,
  p_created_by uuid default null,
  p_campaign_id uuid default null
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
  if p_user_id is null or p_application_id is null then
    raise exception 'User and application are required.';
  end if;

  if coalesce(p_cashback_amount, 0) <= 0 then
    raise exception 'Cashback amount must be greater than zero.';
  end if;

  if exists (select 1 from public.cashback_history where application_id = p_application_id) then
    return null;
  end if;

  v_wallet := public.refresh_wallet_summary(p_user_id);
  v_expires_at := now() + make_interval(days => greatest(coalesce(p_expiry_days, 90), 1));

  insert into public.wallet_transactions (
    wallet_id, user_id, application_id, campaign_id, transaction_type, direction,
    amount, remaining_amount, service_name, note, status, expires_at, created_by
  )
  values (
    v_wallet.id, p_user_id, p_application_id, p_campaign_id, 'cashback_credit', 'credit',
    round(p_cashback_amount, 2), round(p_cashback_amount, 2), p_service_name,
    '100% DigiWallet cashback credited after successful service completion.', 'active', v_expires_at, p_created_by
  )
  returning id into v_transaction_id;

  insert into public.cashback_history (
    user_id, application_id, campaign_id, wallet_transaction_id, service_name,
    order_amount, cashback_amount, expires_at
  )
  values (
    p_user_id, p_application_id, p_campaign_id, v_transaction_id, coalesce(p_service_name, 'Service'),
    round(coalesce(p_order_amount, 0), 2), round(p_cashback_amount, 2), v_expires_at
  );

  perform public.refresh_wallet_summary(p_user_id);
  return v_transaction_id;
end;
$$;

create or replace function public.redeem_wallet_balance(
  p_user_id uuid,
  p_application_id uuid,
  p_service_name text,
  p_order_amount numeric,
  p_requested_amount numeric
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

  v_wallet := public.refresh_wallet_summary(p_user_id);
  v_max_allowed := round(p_order_amount * 0.50, 2);
  v_to_redeem := least(round(p_requested_amount, 2), v_max_allowed, v_wallet.balance);

  if v_to_redeem <= 0 then
    return 0;
  end if;

  if round(p_requested_amount, 2) > v_max_allowed then
    raise exception 'Wallet can be used for maximum 50%% of order value.';
  end if;

  if round(p_requested_amount, 2) > v_wallet.balance then
    raise exception 'Insufficient DigiWallet balance.';
  end if;

  v_remaining := v_to_redeem;

  for v_credit in
    select id, remaining_amount
    from public.wallet_transactions
    where user_id = p_user_id
      and direction = 'credit'
      and status = 'active'
      and remaining_amount > 0
      and (expires_at is null or expires_at > now())
    order by expires_at asc nulls last, created_at asc
  loop
    exit when v_remaining <= 0;

    update public.wallet_transactions
    set remaining_amount = greatest(remaining_amount - least(remaining_amount, v_remaining), 0),
        status = case when greatest(remaining_amount - least(remaining_amount, v_remaining), 0) = 0 then 'used' else status end
    where id = v_credit.id;

    v_remaining := v_remaining - least(v_credit.remaining_amount, v_remaining);
  end loop;

  if v_remaining > 0 then
    raise exception 'Insufficient unexpired DigiWallet balance.';
  end if;

  insert into public.wallet_transactions (
    wallet_id, user_id, application_id, transaction_type, direction,
    amount, remaining_amount, service_name, note, status
  )
  values (
    v_wallet.id, p_user_id, p_application_id, 'wallet_usage', 'debit',
    v_to_redeem, 0, p_service_name, 'DigiWallet used for future eligible service.', 'used'
  );

  perform public.refresh_wallet_summary(p_user_id);
  return v_to_redeem;
end;
$$;

create or replace function public.admin_adjust_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_type text,
  p_note text,
  p_created_by uuid default null,
  p_expiry_days integer default 90
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_transaction_id uuid;
  v_direction text;
  v_remaining numeric(10, 2);
  v_credit record;
begin
  if p_user_id is null or coalesce(p_amount, 0) = 0 then
    raise exception 'User and non-zero amount are required.';
  end if;

  if p_transaction_type not in ('admin_bonus', 'refund_adjustment') then
    raise exception 'Invalid admin wallet transaction type.';
  end if;

  v_wallet := public.refresh_wallet_summary(p_user_id);
  v_direction := case when p_amount > 0 then 'credit' else 'debit' end;

  if v_direction = 'debit' and abs(p_amount) > v_wallet.balance then
    raise exception 'Adjustment would create a negative wallet balance.';
  end if;

  if v_direction = 'credit' then
    insert into public.wallet_transactions (
      wallet_id, user_id, transaction_type, direction, amount, remaining_amount,
      service_name, note, status, expires_at, created_by
    )
    values (
      v_wallet.id, p_user_id, p_transaction_type, 'credit', round(abs(p_amount), 2), round(abs(p_amount), 2),
      'Admin Wallet Adjustment', coalesce(p_note, 'Admin wallet credit.'), 'active',
      now() + make_interval(days => greatest(coalesce(p_expiry_days, 90), 1)), p_created_by
    )
    returning id into v_transaction_id;
  else
    v_remaining := round(abs(p_amount), 2);

    for v_credit in
      select id, remaining_amount
      from public.wallet_transactions
      where user_id = p_user_id
        and direction = 'credit'
        and status = 'active'
        and remaining_amount > 0
        and (expires_at is null or expires_at > now())
      order by expires_at asc nulls last, created_at asc
    loop
      exit when v_remaining <= 0;

      update public.wallet_transactions
      set remaining_amount = greatest(remaining_amount - least(remaining_amount, v_remaining), 0),
          status = case when greatest(remaining_amount - least(remaining_amount, v_remaining), 0) = 0 then 'used' else status end
      where id = v_credit.id;

      v_remaining := v_remaining - least(v_credit.remaining_amount, v_remaining);
    end loop;

    if v_remaining > 0 then
      raise exception 'Insufficient unexpired DigiWallet balance.';
    end if;

    insert into public.wallet_transactions (
      wallet_id, user_id, transaction_type, direction, amount, remaining_amount,
      service_name, note, status, created_by
    )
    values (
      v_wallet.id, p_user_id, p_transaction_type, 'debit', round(abs(p_amount), 2), 0,
      'Admin Wallet Adjustment', coalesce(p_note, 'Admin wallet debit.'), 'used', p_created_by
    )
    returning id into v_transaction_id;
  end if;

  perform public.refresh_wallet_summary(p_user_id);
  return v_transaction_id;
end;
$$;

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.cashback_history enable row level security;
alter table public.cashback_campaigns enable row level security;

drop policy if exists "Customers read own wallet" on public.wallets;
create policy "Customers read own wallet" on public.wallets
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage wallets" on public.wallets;
create policy "Admins manage wallets" on public.wallets
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Customers read own wallet transactions" on public.wallet_transactions;
create policy "Customers read own wallet transactions" on public.wallet_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage wallet transactions" on public.wallet_transactions;
create policy "Admins manage wallet transactions" on public.wallet_transactions
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Customers read own cashback history" on public.cashback_history;
create policy "Customers read own cashback history" on public.cashback_history
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage cashback history" on public.cashback_history;
create policy "Admins manage cashback history" on public.cashback_history
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Everyone reads active cashback campaigns" on public.cashback_campaigns;
create policy "Everyone reads active cashback campaigns" on public.cashback_campaigns
  for select using (active = true or public.is_admin_role());

drop policy if exists "Admins manage cashback campaigns" on public.cashback_campaigns;
create policy "Admins manage cashback campaigns" on public.cashback_campaigns
  for all using (public.is_admin_role()) with check (public.is_admin_role());
