-- Defensive Digi Partner / primary-admin role repair.
--
-- Context: older builds of 20260719190000 (and/or manual scripts) promoted admin by
-- shared mobile 7007595931, which could set Digi Partner profiles to role=admin.
-- The corrected primary-admin migration promotes only by Auth email and excludes
-- agency_partners — so this file no longer repairs damage that migration creates.
-- It remains as a harmless, idempotent safety net for pre-existing production drift.
--
-- Guarantees:
--   * Never demotes Auth user janabfaizalam@gmail.com from admin.
--   * Never changes agency_partners.user_id, balances, or financial tables.
--   * Only restores partner profile roles when an active+approved AP membership exists
--     and the profile is incorrectly role=admin (and is not the primary admin Auth email).

-- 1) Restore Digi Partner profiles wrongly stuck as admin (defensive)
update public.profiles p
set
  role = 'agency_partner',
  email = coalesce(
    (
      select lower(u.email)
      from auth.users u
      where u.id = p.id
      limit 1
    ),
    p.email
  ),
  updated_at = now()
from public.agency_partners ap
where ap.user_id = p.id
  and ap.status = 'active'
  and ap.kyc_status = 'approved'
  and lower(coalesce(p.role::text, '')) = 'admin'
  and not exists (
    select 1
    from auth.users u
    where u.id = p.id
      and lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com'
  );

-- 2) Ensure primary admin Auth user profile remains admin (email-only; never AP-linked)
update public.profiles p
set
  role = 'admin',
  email = 'janabfaizalam@gmail.com',
  full_name = coalesce(nullif(btrim(p.full_name), ''), 'Faiz Alam'),
  active = true,
  is_active = true,
  updated_at = now()
from auth.users u
where u.id = p.id
  and lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com'
  and not exists (
    select 1
    from public.agency_partners ap
    where ap.user_id = p.id
  );

-- 3) Validation notices (non-destructive)
do $$
declare
  v_ceo_ok integer;
  v_stuck integer;
  v_admin_ok integer;
begin
  select count(*) into v_ceo_ok
  from public.agency_partners ap
  join public.profiles p on p.id = ap.user_id
  where ap.partner_code = 'CEO-DCD-AD-0001'
    and lower(coalesce(p.role::text, '')) = 'agency_partner';

  if v_ceo_ok > 0 then
    raise notice 'CEO-DCD-AD-0001 profile role is agency_partner (healthy).';
  end if;

  select count(*) into v_stuck
  from public.profiles p
  join public.agency_partners ap on ap.user_id = p.id
  where lower(coalesce(p.role::text, '')) = 'admin'
    and ap.status = 'active'
    and ap.kyc_status = 'approved';

  if v_stuck > 0 then
    raise warning 'Found % active approved partner profile(s) still role=admin after repair — review manually.', v_stuck;
  end if;

  select count(*) into v_admin_ok
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(coalesce(u.email, '')) = 'janabfaizalam@gmail.com'
    and lower(coalesce(p.role::text, '')) = 'admin';

  if v_admin_ok = 0 then
    raise warning 'Primary admin Auth email profile is not role=admin after repair — review manually.';
  end if;
end
$$;
