-- Close row-level-security policies that let anyone read or write private data.
--
-- Found in the 2026-11-21 security audit. With only the public anon key (which
-- every browser has), these allowed:
--   * applications: "Allow Public Select" (qual true) -- every customer's
--     application, name, mobile and address, readable by anyone; plus an
--     unrestricted insert.
--   * auth_otps: "Service role can manage OTPs" was granted to role public with
--     qual true, so anyone could read, insert or delete OTP rows. The service
--     role bypasses RLS and never needed it.
--   * application_documents / notifications: unrestricted inserts, i.e. anyone
--     could attach a file record to any application or push a message into any
--     user's notifications.
--   * leads: every signed-in user (customers included) could read and edit
--     every lead.
--   * admin_notes: every signed-in user could read and write admin notes.
--   * entity_timelines / service_referrals: readable by anyone.
--   * agency_partners: a partner could update their own row directly,
--     including status, KYC status, commission rate and bank details.
--
-- Every server path that needs these tables uses the service role, which
-- bypasses RLS, so nothing in the app depended on them. The remaining
-- owner/admin policies on each table stay as they are.

drop policy if exists "Allow Public Select" on public.applications;
drop policy if exists "Allow Public Insert" on public.applications;
drop policy if exists "Allow Public Insert" on public.application_documents;
drop policy if exists "Allow Public Insert" on public.notifications;

drop policy if exists "Service role can manage OTPs" on public.auth_otps;
drop policy if exists "auth_otps_deny_all" on public.auth_otps;
create policy "auth_otps_deny_all" on public.auth_otps
  for all to public using (false) with check (false);

drop policy if exists "Allow authenticated read leads" on public.leads;
drop policy if exists "Allow authenticated update leads" on public.leads;
drop policy if exists "Admins manage leads" on public.leads;
create policy "Admins manage leads" on public.leads
  for all to public using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Admin notes full access" on public.admin_notes;

drop policy if exists "AP read timelines" on public.entity_timelines;
drop policy if exists "Admins read timelines" on public.entity_timelines;
create policy "Admins read timelines" on public.entity_timelines
  for select to public using (public.is_admin_role());

drop policy if exists "Public select referrals" on public.service_referrals;

drop policy if exists "AP updates own partner record" on public.agency_partners;

-- Users mark their own notifications read and delete them from the browser;
-- without these the clicks silently did nothing.
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- Pin search_path on trigger/helper functions (Supabase linter 0011).
alter function public.set_itr_cms_updated_at() set search_path = public;
alter function public.set_customer_profiles_updated_at() set search_path = public;
alter function public.set_homepage_slides_updated_at() set search_path = public;
alter function public.set_homepage_notices_updated_at() set search_path = public;
alter function public.set_insurance_quotations_updated_at() set search_path = public;
alter function public.touch_offline_invoices_updated_at() set search_path = public;
alter function public.set_site_content_updated_at() set search_path = public;
alter function public.set_print_jobs_updated_at() set search_path = public;
alter function public.update_modified_column() set search_path = public;
alter function public.set_dpr_cms_updated_at() set search_path = public;
alter function public.set_partner_announcement_banners_updated_at() set search_path = public;
