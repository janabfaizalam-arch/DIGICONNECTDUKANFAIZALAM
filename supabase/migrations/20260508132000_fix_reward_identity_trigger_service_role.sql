create or replace function public.prevent_reward_identity_tamper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
    or current_role in ('service_role', 'postgres', 'supabase_admin')
    or current_user in ('service_role', 'postgres', 'supabase_admin')
    or public.is_admin_role() then
    return new;
  end if;

  if new.referral_code is distinct from old.referral_code
    or new.referred_by is distinct from old.referred_by
    or new.suspicious is distinct from old.suspicious then
    raise exception 'Reward identity fields cannot be changed from the client.';
  end if;

  return new;
end;
$$;

revoke execute on function public.prevent_reward_identity_tamper() from anon, authenticated;
grant execute on function public.prevent_reward_identity_tamper() to service_role;
