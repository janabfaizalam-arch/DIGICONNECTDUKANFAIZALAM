-- Coupons move from a JSON file to the database.
--
-- Three problems being fixed, all of which cost money:
--
-- 1. Coupons lived in src/lib/coupons-db.json and were written with
--    fs.writeFileSync. The application directory is read-only at runtime on
--    Vercel, so every admin edit failed in production.
-- 2. `usedCount` was read when checking `usageLimit` but nothing ever
--    incremented it, so a coupon capped at 100 uses could be redeemed forever.
-- 3. `perUserUsageLimit` was collected in the admin form, stored, and shown in
--    the table — but no code ever read it. One customer could reuse the same
--    coupon on every order.

create table if not exists public.coupons (
  code text primary key,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  -- 'All' or a service slug.
  applicable_service text not null default 'All',
  min_order_amount numeric(10, 2),
  max_discount numeric(10, 2),
  usage_limit int check (usage_limit is null or usage_limit > 0),
  per_user_usage_limit int check (per_user_usage_limit is null or per_user_usage_limit > 0),
  start_date timestamptz,
  expiry_date timestamptz,
  active boolean not null default true,
  -- Maintained by redeem_coupon only; never written directly by the app.
  used_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.coupons(code) on delete cascade,
  -- Null for a guest checkout; per-user limits only apply to signed-in users.
  user_id uuid,
  application_id uuid,
  order_id text,
  discount_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists coupon_redemptions_code_user_idx
  on public.coupon_redemptions (code, user_id);

-- One redemption per order. Without this a retried payment callback would
-- consume the coupon twice.
create unique index if not exists coupon_redemptions_code_order_idx
  on public.coupon_redemptions (code, order_id)
  where order_id is not null;

create unique index if not exists coupon_redemptions_code_application_idx
  on public.coupon_redemptions (code, application_id)
  where application_id is not null;

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

-- Reads and writes both go through the service role in API routes. No public
-- policy: a customer must never be able to enumerate unused coupon codes.
drop policy if exists "coupons_deny_all" on public.coupons;
create policy "coupons_deny_all" on public.coupons for all using (false) with check (false);

drop policy if exists "coupon_redemptions_deny_all" on public.coupon_redemptions;
create policy "coupon_redemptions_deny_all" on public.coupon_redemptions
  for all using (false) with check (false);

/*
  Atomic redemption.

  Checking a limit in application code and then writing is a race: two
  concurrent checkouts both read used_count = 99 against a limit of 100 and
  both proceed. This locks the coupon row, re-checks every limit under that
  lock, and increments in the same transaction, so the last seat can only be
  taken once.

  Returns the discount actually granted, or raises with a reason the caller
  can map to a message.
*/
create or replace function public.redeem_coupon(
  p_code text,
  p_user_id uuid,
  p_application_id uuid,
  p_order_id text,
  p_discount_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_user_uses int;
begin
  select * into v_coupon from public.coupons where code = p_code for update;

  if not found then
    raise exception 'coupon_not_found';
  end if;

  if not v_coupon.active then
    raise exception 'coupon_inactive';
  end if;

  if v_coupon.start_date is not null and v_coupon.start_date > now() then
    raise exception 'coupon_not_started';
  end if;

  if v_coupon.expiry_date is not null and v_coupon.expiry_date < now() then
    raise exception 'coupon_expired';
  end if;

  if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
    raise exception 'coupon_usage_limit_reached';
  end if;

  -- Per-user limits are only meaningful for a signed-in customer; a guest
  -- checkout has no identity to count against.
  if p_user_id is not null and v_coupon.per_user_usage_limit is not null then
    select count(*) into v_user_uses
    from public.coupon_redemptions
    where code = p_code and user_id = p_user_id;

    if v_user_uses >= v_coupon.per_user_usage_limit then
      raise exception 'coupon_user_limit_reached';
    end if;
  end if;

  insert into public.coupon_redemptions (code, user_id, application_id, order_id, discount_amount)
  values (p_code, p_user_id, p_application_id, p_order_id, coalesce(p_discount_amount, 0));

  update public.coupons
  set used_count = used_count + 1,
      updated_at = now()
  where code = p_code;

  return coalesce(p_discount_amount, 0);
exception
  -- A repeated callback for the same order is not an error; the coupon was
  -- already consumed for it and must not be consumed again.
  when unique_violation then
    return 0;
end;
$$;

revoke all on function public.redeem_coupon(text, uuid, uuid, text, numeric) from public, anon, authenticated;

-- Carry over the coupon that lived in src/lib/coupons-db.json so switching the
-- lookup to the database does not silently invalidate a code already in use.
insert into public.coupons (code, discount_type, discount_value, applicable_service, active)
values ('DGCNT5K', 'fixed', 5000, 'cm-yuva-entrepreneur-loan-assistance', true)
on conflict (code) do nothing;
