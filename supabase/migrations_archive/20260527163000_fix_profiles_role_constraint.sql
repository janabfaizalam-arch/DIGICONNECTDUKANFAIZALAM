-- ============================================================================
-- FIX PROFILES AND USERS ROLE CONSTRAINTS
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-05-27
-- ============================================================================

-- 1. Update profiles table constraint if it exists
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    -- Drop existing check constraint
    alter table public.profiles drop constraint if exists profiles_role_check;
    
    -- Recreate check constraint with agency_partner included
    alter table public.profiles
      add constraint profiles_role_check check (
        role in ('super_admin', 'admin', 'staff', 'customer', 'agent', 'agency_partner')
      );
  end if;
end $$;

-- 2. Update users table constraint if it exists
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'users'
  ) then
    -- Drop existing check constraint
    alter table public.users drop constraint if exists users_role_check;
    
    -- Recreate check constraint with agency_partner included
    alter table public.users
      add constraint users_role_check check (
        role in ('super_admin', 'admin', 'staff', 'customer', 'agent', 'agency_partner')
      );
  end if;
end $$;
