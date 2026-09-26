-- Stop signed-in users from granting themselves admin or partner powers.
--
-- Two routes to self-escalation existed, both reachable with nothing but the
-- public anon key and the user's own session:
--
-- 1. `current_app_role()` fell back to `auth.jwt() -> 'user_metadata' ->>
--    'role'`. Supabase lets every user rewrite their own user_metadata
--    (`supabase.auth.updateUser({ data: { role: 'admin' } })`), so that value
--    is attacker-controlled and must never grant anything. app_metadata can
--    only be written with the service role, so it stays.
--
-- 2. RLS lets a user UPDATE their own `profiles` row ("Profiles self or admin
--    update") and `users` row ("Users can update own profile") with no column
--    restriction, so `update profiles set role = 'admin' where id = auth.uid()`
--    succeeded — and `is_admin_role()` reads exactly that column. The same
--    policy let users clear their own KYC status, lockout counter, risk flags
--    and reward flags.
--
-- The self-update policies stay (the account page edits name, mobile, address
-- and so on), and a trigger now refuses changes to privileged columns unless
-- the caller is the service role / a database owner, or already an admin.
-- Server code uses the service role for every privileged write, so it is
-- unaffected.

-- 1. Role resolution without user_metadata.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with resolved as (
    select lower(coalesce(
      (select p.role from public.profiles p where p.id = auth.uid()),
      (select u.role from public.users u where u.id = auth.uid()),
      auth.jwt() -> 'app_metadata' ->> 'role',
      'customer'
    )) as role
  )
  select case
    when role in ('super_admin', 'staff', 'team', 'employee', 'processor') then 'admin'
    when role in ('admin', 'agent', 'customer') then role
    else 'customer'
  end
  from resolved;
$$;

-- 2. Privileged columns only change through trusted callers.
-- Deliberately SECURITY INVOKER: the check below reads `current_user`, which
-- inside a SECURITY DEFINER function would be the owner, not the caller.
create or replace function public.guard_privileged_identity_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  privileged text[] := case tg_table_name
    when 'profiles' then array[
      'role', 'active', 'is_active', 'account_status', 'kyc_status',
      'commission_rate', 'commission_type', 'commission_value', 'commission_rules',
      'agent_code', 'partner_code', 'referral_code', 'referred_by', 'referred_by_user_id',
      'referral_code_used', 'first_service_completed_at', 'first_service_cashback_awarded',
      'signup_referral_reward_awarded', 'suspicious', 'reward_risk_score', 'reward_risk_flags',
      'signup_ip', 'created_ip', 'created_user_agent', 'phone_verified',
      'failed_login_attempts', 'locked_until', 'must_change_password'
    ]
    else array['role']
  end;
  new_row jsonb := to_jsonb(new);
  old_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  col text;
begin
  -- Service role, migrations and dashboard run as roles other than the two
  -- API roles; they are trusted.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Existing admins may manage other accounts (evaluated against the row as
  -- it was before this statement).
  if public.is_admin_role() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(lower(new_row ->> 'role'), 'customer') <> 'customer' then
      raise exception 'Only an administrator can assign the role %', new_row ->> 'role'
        using errcode = '42501';
    end if;
    return new;
  end if;

  foreach col in array privileged loop
    if (new_row -> col) is distinct from (old_row -> col) then
      raise exception 'Column % can only be changed by an administrator', col
        using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;


drop trigger if exists guard_privileged_profile_columns on public.profiles;
create trigger guard_privileged_profile_columns
  before insert or update on public.profiles
  for each row execute function public.guard_privileged_identity_columns();

drop trigger if exists guard_privileged_user_columns on public.users;
create trigger guard_privileged_user_columns
  before insert or update on public.users
  for each row execute function public.guard_privileged_identity_columns();
