-- DigiConnect Dukan — duplicate WhatsApp / mobile diagnostic
-- Run in Supabase SQL editor BEFORE re-applying
-- supabase/migrations/20260718180000_customer_whatsapp_pin_auth.sql
-- when AUTH_MIGRATION_BLOCKED is raised.
-- Creates/replaces helper function only; SELECTS below do not delete rows.

create or replace function public.normalize_indian_mobile(raw text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
  local_part text;
begin
  if raw is null then
    return null;
  end if;
  digits := regexp_replace(raw, '[^0-9]', '', 'g');
  if digits = '' then
    return null;
  end if;
  if length(digits) = 12 and left(digits, 2) = '91' then
    local_part := substr(digits, 3);
  elsif length(digits) = 11 and left(digits, 1) = '0' then
    local_part := substr(digits, 2);
  else
    local_part := digits;
  end if;
  if local_part ~ '^[6-9][0-9]{9}$' then
    return local_part;
  end if;
  if btrim(digits) = '' then
    return null;
  end if;
  return local_part;
end;
$$;

-- 0) Known duplicate sample
-- Inspect all profile rows for 8287002983 (and common variants)
select
  p.id,
  p.role,
  p.full_name,
  p.email,
  p.mobile as raw_mobile,
  p.phone as raw_phone,
  public.normalize_indian_mobile(p.mobile) as normalized_mobile,
  public.normalize_indian_mobile(p.phone) as normalized_phone,
  p.active,
  p.account_status,
  p.created_at,
  p.last_login_at
from public.profiles p
where
  regexp_replace(coalesce(p.mobile, ''), '[^0-9]', '', 'g') like '%8287002983%'
  or regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') like '%8287002983%'
  or public.normalize_indian_mobile(p.mobile) = '8287002983'
  or public.normalize_indian_mobile(p.phone) = '8287002983'
order by p.created_at;

-- Linked CRM customers for that number
select
  c.id,
  c.user_id,
  c.full_name,
  c.mobile,
  c.email,
  c.created_at
from public.customers c
where
  regexp_replace(coalesce(c.mobile, ''), '[^0-9]', '', 'g') like '%8287002983%'
  or public.normalize_indian_mobile(c.mobile) = '8287002983'
order by c.created_at;

-- Applications / wallet touchpoints for those profile ids
with dup_profiles as (
  select id
  from public.profiles
  where public.normalize_indian_mobile(mobile) = '8287002983'
     or public.normalize_indian_mobile(phone) = '8287002983'
)
select 'applications' as kind, a.id::text, a.user_id::text, a.status, a.created_at::text
from public.applications a
where a.user_id in (select id from dup_profiles)
union all
select 'wallets', w.id::text, w.user_id::text, w.balance::text, w.created_at::text
from public.wallets w
where w.user_id in (select id from dup_profiles)
order by 1, 5;

-- 1) All duplicate normalized mobiles on profiles
select
  public.normalize_indian_mobile(mobile) as normalized_mobile,
  count(*) as profile_count,
  array_agg(id order by created_at) as profile_ids,
  array_agg(coalesce(email, '') order by created_at) as emails,
  array_agg(coalesce(role::text, '') order by created_at) as roles
from public.profiles
where public.normalize_indian_mobile(mobile) is not null
group by 1
having count(*) > 1
order by profile_count desc, normalized_mobile;

-- 2) Duplicate normalized phones (legacy column), if any
select
  public.normalize_indian_mobile(phone) as normalized_phone,
  count(*) as profile_count,
  array_agg(id order by created_at) as profile_ids
from public.profiles
where public.normalize_indian_mobile(phone) is not null
group by 1
having count(*) > 1
order by profile_count desc;

-- 3) Mobile/phone mismatch after normalization
select
  id,
  mobile,
  phone,
  public.normalize_indian_mobile(mobile) as norm_mobile,
  public.normalize_indian_mobile(phone) as norm_phone
from public.profiles
where public.normalize_indian_mobile(mobile) is distinct from public.normalize_indian_mobile(phone)
  and (
    public.normalize_indian_mobile(mobile) is not null
    or public.normalize_indian_mobile(phone) is not null
  )
order by created_at
limit 100;

-- Manual resolution guidance (do NOT run blindly):
-- A) Keep the profile with real auth activity / applications / wallet.
-- B) For the other duplicate(s), either:
--    - merge CRM data then clear mobile/phone on the loser (set null), OR
--    - reassign a different verified number after user confirmation.
-- C) Never delete a profile that still owns applications/payments/wallet
--    without an explicit data-merge plan.
-- D) Re-run migration after duplicates report zero rows in query (1).
