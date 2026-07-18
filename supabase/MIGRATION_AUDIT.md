# DigiConnect Dukan — Migration Audit Report

Date: 2026-07-18  
Strategy: **Option A** — preserve ordered migrations; repair determinism in place  
Backup: `supabase/migration-audit-backup/20260718-151427`

## Root causes

1. **Future / missing column dependencies**  
   Wallet indexes in `20260514130000_secure_referral_reward_wallet.sql` previously assumed columns added later. Columns are now added before indexes (`IF NOT EXISTS`).

2. **Hardcoded `service_catalog.status`**  
   Seeds (CSC Olympiad, Food License) inserted a `status` column that does not exist on baseline `service_catalog`. CSC seed archived; Food License made column-aware.

3. **Legacy vault RLS**  
   `20260613000000_ds_os_foundation.sql` used `customers.agent_id`, which is not part of the final schema.

4. **Destructive customer auth migration (critical)**  
   `20260706000000_customer_auth_system.sql` previously ran `DROP TABLE public.customers CASCADE`, wiping CRM columns (`user_id`, `full_name`, `assigned_agent_id`), dropping FKs, and clearing vault policies. Local reset “succeeded” while leaving an app-incompatible schema.

5. **UTF-8 BOM on config**  
   Historical PowerShell BOM broke `config.toml` parsing. Current file is UTF-8 without BOM; `project_id = "digiconnectdukanfaizalam"`.

6. **Service catalog purge**  
   `20260626000000_v2_updates.sql` deletes and reseeds a smaller service set. Approved services were re-upserted by `20260718003000_approved_services_catalog_sync.sql` (no CSC Olympiad / PAN).

## Migrations removed or archived

| Path | Reason |
|---|---|
| `supabase/disabled-migrations/20260612110000_add_csc_olympiad_service.sql` | Inserted nonexistent `service_catalog.status`; CSC not approved |
| `supabase/disabled-migrations/*.bak` / `*.backup-*` | Prior emergency backups of wallet migration |

Active migrations directory contains **83** SQL files (no `.bak` files).

## Migrations modified

| File | Change |
|---|---|
| `20260613000000_ds_os_foundation.sql` | Vault SELECT policy: owner via `customers.user_id` + `is_admin_role()`; no agent vault access |
| `20260625110000_add_food_license_service.sql` | Column-aware `service_catalog` insert (no hard dependency on `status`) |
| `20260706000000_customer_auth_system.sql` | **Rewritten**: no `DROP customers`; ADD PIN columns; recreate satellite auth tables only |

## Migrations added

| File | Purpose |
|---|---|
| `20260718002000_crm_customers_vault_integrity.sql` | Ensure CRM columns, restore FKs, restore vault RLS |
| `20260718003000_approved_services_catalog_sync.sql` | Upsert approved services into `services` / `service_catalog` / `agent_services` |

## Canonical objects selected

See `SCHEMA_DECISIONS.md`.

Summary:

- Identity: `auth.users` + `profiles` + CRM `customers.user_id`
- Services: `services` (public) + `service_catalog` (CRM) + `agent_services` (AP)
- Wallet: `reward_wallets` + `wallet_transactions`
- Partner: `agency_partners`
- Assignment: `applications.assigned_agent_id` / `agency_partner_id`

## Legacy objects retained

- Historical enum values (`staff`, `super_admin`) where PostgreSQL cannot safely drop them
- Deprecated agent-panel tables from early migrations (not used by `/ap` app paths)
- `customers.wallet_balance` display field (not authoritative ledger)
- CSC Olympiad **application UI remnants** for legacy apps; APIs return **410**; static catalog entry removed

## Application code changes (with migrations)

- Removed CSC Olympiad from `src/lib/services-data.ts`
- CSC API routes return 410
- Admin CSC CMS page → `notFound()`
- Removed CSC subject-multiplier pricing in applications API

## Remaining risks

1. **Remote production history** may still contain the old destructive `DROP customers` migration version. Never re-apply rewritten history blindly on production; use additive migrations only on linked remotes.
2. **Wallet repair chain** (`e2e_repair`, `canonical_reward_wallet_rules`, dual-cap) is large and overlapping; functions work after reset but further consolidation is future work.
3. **`pnpm supabase migration list`** requires a Supabase access token for remote comparison; local reset/status work without it.
4. **db lint** still reports plpgsql warnings (unused vars/params); no blocking errors after CRM restore.
5. Full authenticated E2E smoke (signup, Razorpay webhook, dual-cap redemption) still needs a dedicated test pass with real local users.

## Production deployment notes

- Local destructive resets are fine (`db reset` on Docker only).
- Do **not** push/reset a linked remote from this repair without an explicit plan.
- If production already has CRM `customers`, deploy only the **new** additive migrations (`20260718002000`, `20260718003000`) after confirming they are not already applied.
- Keep `supabase/disabled-migrations` out of the active migrations path forever.
