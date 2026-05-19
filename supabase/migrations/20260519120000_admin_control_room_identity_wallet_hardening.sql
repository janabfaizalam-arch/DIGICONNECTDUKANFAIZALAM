-- Admin control-room hardening: customer identity sync, non-hiding indexes, and reward idempotency.
-- Safe to re-run. Does not delete data and does not change existing RLS policies.

alter table public.profiles add column if not exists mobile text;
alter table public.customers add column if not exists mobile text;
alter table public.customer_profiles add column if not exists mobile text;
alter table public.customer_profiles add column if not exists user_id uuid;

update public.customer_profiles
set user_id = id
where user_id is null;

update public.profiles p
set mobile = right(regexp_replace(coalesce(p.mobile, au.phone, au.raw_user_meta_data ->> 'mobile', au.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), 10),
    updated_at = coalesce(p.updated_at, now())
from auth.users au
where p.id = au.id
  and coalesce(nullif(regexp_replace(p.mobile, '\D', '', 'g'), ''), '') = ''
  and coalesce(au.phone, au.raw_user_meta_data ->> 'mobile', au.raw_user_meta_data ->> 'phone', '') <> '';

with customer_profile_mobile_sources as (
  select
    cp.id,
    right(
      regexp_replace(
        coalesce(
          cp.mobile,
          p.mobile,
          au.phone,
          au.raw_user_meta_data ->> 'mobile',
          au.raw_user_meta_data ->> 'phone',
          app.customer_mobile,
          app.customer_details ->> 'mobile',
          app.form_data ->> 'mobile',
          ''
        ),
        '\D',
        '',
        'g'
      ),
      10
    ) as resolved_mobile
  from public.customer_profiles cp
  left join public.profiles p on p.id = cp.id
  left join auth.users au on au.id = cp.id
  left join lateral (
    select customer_mobile, customer_details, form_data
    from public.applications a
    where a.user_id = cp.id
    order by a.created_at desc nulls last
    limit 1
  ) app on true
)
update public.customer_profiles cp
set mobile = nullif(src.resolved_mobile, ''),
    updated_at = now()
from customer_profile_mobile_sources src
where cp.id = src.id
  and nullif(src.resolved_mobile, '') is not null
  and (
    cp.mobile is null
    or length(regexp_replace(coalesce(cp.mobile, ''), '\D', '', 'g')) < 10
  );

with customer_mobile_sources as (
  select
    c.id,
    right(
      regexp_replace(
        coalesce(
          c.mobile,
          p.mobile,
          cp.mobile,
          au.phone,
          au.raw_user_meta_data ->> 'mobile',
          au.raw_user_meta_data ->> 'phone',
          app.customer_mobile,
          app.customer_details ->> 'mobile',
          app.form_data ->> 'mobile',
          ''
        ),
        '\D',
        '',
        'g'
      ),
      10
    ) as resolved_mobile
  from public.customers c
  left join public.profiles p on p.id = c.user_id
  left join public.customer_profiles cp on cp.id = c.user_id
  left join auth.users au on au.id = c.user_id
  left join lateral (
    select customer_mobile, customer_details, form_data
    from public.applications a
    where a.user_id = c.user_id or a.customer_id = c.id
    order by a.created_at desc nulls last
    limit 1
  ) app on true
)
update public.customers c
set mobile = nullif(src.resolved_mobile, ''),
    updated_at = now()
from customer_mobile_sources src
where c.id = src.id
  and nullif(src.resolved_mobile, '') is not null
  and (
    c.mobile is null
    or length(regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g')) < 10
  );

create index if not exists profiles_role_created_idx on public.profiles(role, created_at desc);
create index if not exists profiles_mobile_idx on public.profiles(mobile) where mobile is not null;
create index if not exists profiles_email_idx on public.profiles(lower(email)) where email is not null;
create index if not exists customers_user_id_idx on public.customers(user_id) where user_id is not null;
create index if not exists customers_mobile_idx on public.customers(mobile) where mobile is not null;
create index if not exists customers_email_idx on public.customers(lower(email)) where email is not null;
create index if not exists customer_profiles_user_id_idx on public.customer_profiles(user_id) where user_id is not null;
create index if not exists customer_profiles_mobile_idx on public.customer_profiles(mobile) where mobile is not null;
create index if not exists applications_customer_lookup_idx on public.applications(user_id, customer_id, created_at desc);
create index if not exists applications_customer_mobile_idx on public.applications(customer_mobile) where customer_mobile is not null;
create index if not exists application_documents_lookup_idx on public.application_documents(application_id, user_id, customer_id);
create index if not exists payments_status_created_idx on public.payments(status, created_at desc);
create index if not exists commissions_status_idx on public.commissions(status);
create index if not exists reward_wallets_user_balance_idx on public.reward_wallets(user_id, balance);
create index if not exists wallet_transactions_user_status_idx on public.wallet_transactions(user_id, status, created_at desc);

create unique index if not exists wallet_first_service_cashback_once_idx
  on public.wallet_transactions(user_id, application_id)
  where type = 'first_service_cashback' and status <> 'reversed' and application_id is not null;

create unique index if not exists wallet_repeat_cashback_once_idx
  on public.wallet_transactions(user_id, application_id)
  where type = 'repeat_cashback' and status <> 'reversed' and application_id is not null;

create or replace view public.admin_wallet_ledger_balances as
select
  wt.user_id,
  round(coalesce(sum(case when wt.direction = 'credit' and wt.status = 'posted' then wt.amount when wt.direction = 'debit' and wt.status = 'posted' then -wt.amount else 0 end), 0), 2) as ledger_balance,
  round(coalesce(sum(case when wt.direction = 'credit' and wt.status = 'posted' then wt.amount else 0 end), 0), 2) as ledger_earned,
  round(coalesce(sum(case when wt.direction = 'debit' and wt.status = 'posted' then wt.amount else 0 end), 0), 2) as ledger_redeemed
from public.wallet_transactions wt
group by wt.user_id;
