-- ============================================================================
-- Role resolution hardening
-- Date: 2026-07-18
--
-- Existing behavior:
--   public.current_app_role() (defined in 20260519133000) resolves the role
--   from profiles.role → users.role → JWT app_metadata.role →
--   JWT **user_metadata.role** → 'customer'.
--
-- Vulnerability:
--   user_metadata is editable by the authenticated user themselves via
--   supabase.auth.updateUser({ data: { role: 'admin' } }). Any account that
--   has no profiles/users row (or NULL roles there) and no app_metadata role
--   could self-assign 'admin' and satisfy every is_admin_role() RLS policy.
--
-- New behavior:
--   Identical resolution order, but the client-editable user_metadata claim
--   is no longer consulted. app_metadata remains (it is server-controlled and
--   only settable via the service-role admin API).
--
-- Affected roles:
--   No legitimate user changes: production accounts receive a profiles row at
--   signup (handle_new_user trigger), so their role never reached the JWT
--   fallbacks. Only forged/edge accounts lose (unwanted) elevation.
--
-- Required application changes: none. The app's server code resolves roles
--   from profiles/users tables and the server-only ADMIN_EMAILS allowlist.
--
-- Rollback SQL: re-run the current_app_role() definition from
--   supabase/migrations/20260519133000_three_role_architecture_cleanup.sql.
-- ============================================================================

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(coalesce(
      (select p.role from public.profiles p where p.id = auth.uid()),
      (select u.role from public.users u where u.id = auth.uid()),
      auth.jwt() -> 'app_metadata' ->> 'role',
      'customer'
    )) in ('super_admin', 'staff', 'team', 'employee', 'processor') then 'admin'
    when lower(coalesce(
      (select p.role from public.profiles p where p.id = auth.uid()),
      (select u.role from public.users u where u.id = auth.uid()),
      auth.jwt() -> 'app_metadata' ->> 'role',
      'customer'
    )) in ('admin', 'agent', 'customer') then lower(coalesce(
      (select p.role from public.profiles p where p.id = auth.uid()),
      (select u.role from public.users u where u.id = auth.uid()),
      auth.jwt() -> 'app_metadata' ->> 'role',
      'customer'
    ))
    else 'customer'
  end;
$$;

comment on function public.current_app_role() is
  'Returns the normalized platform role (admin/agent/customer). Resolves from profiles/users tables and server-controlled app_metadata only; client-editable user_metadata is intentionally ignored.';
