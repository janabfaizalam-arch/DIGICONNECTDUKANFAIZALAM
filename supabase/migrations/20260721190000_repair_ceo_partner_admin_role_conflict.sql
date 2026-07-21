-- Repair Digi Partner profile corrupted by primary-admin mobile-wide promotion.
-- Context: migration 20260719190000 set role=admin for ALL profiles sharing mobile 7007595931,
-- including the Auth user linked to agency_partners.partner_code = CEO-DCD-AD-0001.
-- That left a valid active+approved partner blocked by profiles.role / wrong Auth email resolution.
--
-- Policy preserved:
--   - Primary admin Auth user (janabfaizalam@gmail.com) stays admin.
--   - Digi Partner Auth user linked to CEO-DCD-AD-0001 is restored to agency_partner.
--   - agency_partners.id and financial data are untouched.
--   - Only agency_partners.user_id linkage is verified; user_id is NOT changed.

-- 1) Restore partner profile role + sync email to auth.users for the CEO-DCD-AD-0001 membership
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
  and ap.partner_code = 'CEO-DCD-AD-0001'
  and ap.status = 'active'
  and ap.kyc_status = 'approved'
  and lower(coalesce(p.role::text, '')) = 'admin';

-- 2) Ensure primary admin Auth user profile remains admin (by Auth email, not by shared mobile)
update public.profiles p
set
  role = 'admin',
  email = 'janabfaizalam@gmail.com',
  full_name = coalesce(nullif(btrim(p.full_name), ''), 'Faiz Alam'),
  mobile = coalesce(nullif(btrim(p.mobile), ''), '7007595931'),
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

-- 3) Safety notice: any other active partners still stuck as admin due to shared-mobile promotion
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.profiles p
  join public.agency_partners ap on ap.user_id = p.id
  where lower(coalesce(p.role::text, '')) = 'admin'
    and ap.status = 'active'
    and ap.kyc_status = 'approved';

  if v_count > 0 then
    raise notice 'Found % active approved partner profile(s) still role=admin — review manually.', v_count;
  end if;
end
$$;
