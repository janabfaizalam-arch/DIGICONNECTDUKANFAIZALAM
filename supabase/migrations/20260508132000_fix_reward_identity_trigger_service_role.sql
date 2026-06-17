-- ⚠️ LEGACY — SUPERSEDED by 20260520113000_remove_broken_identity_triggers.sql
-- These triggers are also dropped in the later comprehensive migration.
-- Migration kept for chain integrity only.
--
-- Legacy reward identity trigger repair.
-- Trigger-based tamper protection was removed because it blocked valid
-- service-role signup/profile repair flows on mismatched production schemas.

drop trigger if exists prevent_profiles_reward_identity_tamper on public.profiles;
drop trigger if exists prevent_customer_profiles_reward_identity_tamper on public.customer_profiles;
drop function if exists public.prevent_reward_identity_tamper() cascade;
