-- ⚠️ LEGACY — SUPERSEDED by generate_secure_referral_code() in 20260514130000_secure_referral_reward_wallet.sql
-- Migration kept for chain integrity only.

create or replace function public.generate_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(encode(extensions.digest(p_user_id::text || clock_timestamp()::text || v_attempt::text, 'sha256'), 'hex'), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;

  return v_code;
end;
$$;

revoke execute on function public.generate_referral_code(uuid) from anon, authenticated;
grant execute on function public.generate_referral_code(uuid) to service_role;
