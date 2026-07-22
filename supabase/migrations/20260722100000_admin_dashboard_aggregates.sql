-- Admin dashboard financial aggregates (service_role only).
-- Required because PostgREST aggregate functions are disabled (PGRST123).
-- Non-destructive: adds SQL functions only; no table/data changes.

create or replace function public.admin_dashboard_payment_totals(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'verified_sum_rupees', coalesce((
      select sum(coalesce(real_payment_amount, amount, 0))::numeric
      from public.payments
      where lower(coalesce(status::text, '')) in ('verified', 'paid')
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at < p_to)
    ), 0),
    'pending_count', coalesce((
      select count(*)::bigint
      from public.payments
      where lower(coalesce(status::text, '')) in ('pending', 'unpaid')
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at < p_to)
    ), 0),
    'failed_count', coalesce((
      select count(*)::bigint
      from public.payments
      where lower(coalesce(status::text, '')) in ('failed', 'cancelled', 'canceled')
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at < p_to)
    ), 0),
    'verified_count', coalesce((
      select count(*)::bigint
      from public.payments
      where lower(coalesce(status::text, '')) in ('verified', 'paid')
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at < p_to)
    ), 0)
  );
$$;

create or replace function public.admin_dashboard_wallet_liability()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(balance, 0)), 0)::numeric from public.reward_wallets;
$$;

create or replace function public.admin_dashboard_partner_commission_pending()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select sum(coalesce(calculated_amount, 0))::numeric
    from public.ap_commissions
    where lower(coalesce(status::text, '')) in ('pending', 'earned', 'approved', 'reserved')
  ), (
    select sum(coalesce(amount, 0))::numeric
    from public.commissions
    where lower(coalesce(status::text, '')) not in ('paid', 'settled', 'reversed', 'cancelled')
  ), 0);
$$;

create or replace function public.admin_dashboard_revenue_series(
  p_from timestamptz,
  p_to timestamptz
)
returns table(day date, revenue numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    (created_at at time zone 'Asia/Kolkata')::date as day,
    sum(coalesce(real_payment_amount, amount, 0))::numeric as revenue
  from public.payments
  where lower(coalesce(status::text, '')) in ('verified', 'paid')
    and created_at >= p_from
    and created_at < p_to
  group by 1
  order by 1;
$$;

create or replace function public.admin_dashboard_application_series(
  p_from timestamptz,
  p_to timestamptz
)
returns table(day date, applications bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (created_at at time zone 'Asia/Kolkata')::date as day,
    count(*)::bigint as applications
  from public.applications
  where created_at >= p_from
    and created_at < p_to
  group by 1
  order by 1;
$$;

revoke all on function public.admin_dashboard_payment_totals(timestamptz, timestamptz) from public;
revoke all on function public.admin_dashboard_wallet_liability() from public;
revoke all on function public.admin_dashboard_partner_commission_pending() from public;
revoke all on function public.admin_dashboard_revenue_series(timestamptz, timestamptz) from public;
revoke all on function public.admin_dashboard_application_series(timestamptz, timestamptz) from public;

grant execute on function public.admin_dashboard_payment_totals(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_dashboard_wallet_liability() to service_role;
grant execute on function public.admin_dashboard_partner_commission_pending() to service_role;
grant execute on function public.admin_dashboard_revenue_series(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_dashboard_application_series(timestamptz, timestamptz) to service_role;
