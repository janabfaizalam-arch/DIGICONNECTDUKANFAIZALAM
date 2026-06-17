# Migrations Archive — MANIFEST

> **IMPORTANT**: These are COPIES for documentation only.
> The originals MUST remain in `supabase/migrations/` to preserve the migration chain.
> Supabase migrations are append-only — removing any would break `supabase db reset`.

## Archived Date: 2026-06-15

## Archived Migrations (9)

### 1. `20260508120000_referral_reward_wallet_cashback.sql`
- **Status**: LEGACY — superseded
- **Superseded By**: `20260514130000_secure_referral_reward_wallet.sql` + `20260516110000_reward_wallet_e2e_repair.sql`
- **Reason**: Old reward functions (`refresh_reward_wallet_summary`, `credit_reward_points`, `redeem_reward_points`, `expire_due_rewards`, `ensure_customer_reward_profile`, `issue_signup_bonus`, `complete_referral_reward`, `admin_adjust_reward_wallet`) replaced by canonical closed-loop system (`post_reward_wallet_transaction`, `process_rewards_on_application_completed`, `attach_referral_on_signup`, `redeem_reward_wallet_for_application`). Creates `referrals`, `reward_transactions`, `service_reward_rules` tables — still in DB but codebase primarily uses `reward_wallets` + `referral_events`.

### 2. `20260508130000_fix_referral_code_digest.sql`
- **Status**: LEGACY — superseded
- **Superseded By**: `20260508131000_fix_referral_code_digest_schema.sql`
- **Reason**: First hotfix for `generate_referral_code()` digest call — immediately replaced by schema-qualified version.

### 3. `20260508131000_fix_referral_code_digest_schema.sql`
- **Status**: LEGACY — superseded
- **Superseded By**: `20260514130000_secure_referral_reward_wallet.sql`
- **Reason**: Schema-qualified `generate_referral_code()` replaced by `generate_secure_referral_code()` + `ensure_referral_code_for_user()`.

### 4. `20260508132000_fix_reward_identity_trigger_service_role.sql`
- **Status**: LEGACY — superseded
- **Superseded By**: `20260520113000_remove_broken_identity_triggers.sql`
- **Reason**: Drops triggers also dropped by later comprehensive trigger removal migration.

### 5. `20260512130000_wallet_cashback_referral_direct_credit.sql`
- **Status**: LEGACY — superseded
- **Superseded By**: `20260514130000_secure_referral_reward_wallet.sql`
- **Reason**: `credit_service_cashback()`, `credit_referral_reward_on_signup()`, `credit_referral_reward_by_code()`, `backfill_pending_referral_rewards()` replaced by canonical reward wallet functions.

### 6. `20260518160000_deprecate_legacy_agent_panel.sql`
- **Status**: LEGACY — documentation only
- **Superseded By**: `20260517170000_agent_panel_workflow.sql`
- **Reason**: Only adds SQL COMMENT annotations deprecating old agent panel tables. No DDL changes.

### 7. `20260519133000_three_role_architecture_cleanup.sql`
- **Status**: LEGACY — one-time data migration
- **Superseded By**: N/A (additive cleanup)
- **Reason**: Normalizes legacy role values (`staff` → `customer`). Already applied to production data.

### 8. `20260520114500_safe_claim_customer_applications.sql`
- **Status**: LEGACY — superseded
- **Superseded By**: `20260520120000_master_production_stability.sql`
- **Reason**: Creates `claim_customer_applications()` which is recreated with improvements in the master stability migration.

### 9. `20260527163000_fix_profiles_role_constraint.sql`
- **Status**: LEGACY — one-time fix
- **Superseded By**: N/A
- **Reason**: One-time constraint fix to include `agency_partner` role. Already applied.
