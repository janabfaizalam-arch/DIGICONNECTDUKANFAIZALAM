# DigiConnect Dukan — Schema Decisions

Concise canonical choices after the 2026-07-18 migration deep fix.

## Canonical identity

| Concern | Canonical object | Notes |
|---|---|---|
| Auth identity | `auth.users` | Supabase Auth is the login source of truth |
| App role | `public.profiles.role` | Live roles: `admin`, `agency_partner` / legacy `agent`, `customer` |
| Customer CRM row | `public.customers` | Linked by `customers.user_id → auth.users.id` |
| Customer profile mirror | `public.customer_profiles` | Secondary profile cache; do not diverge identity uniqueness |

**Uniqueness:** one account per email and one per mobile (enforced in identity helpers + DB constraints where present). Mobile is mandatory for customer signup flows.

**PIN/mobile auth:** `customers.hashed_pin` and satellite tables (`customer_sessions`, `customer_devices`, `otp_codes`, `customer_login_logs`) are optional overlays. They must never replace or drop the CRM `customers` table. WhatsApp OTP uses `public.auth_otps`.

## Canonical customer table

`public.customers` with at least:

- `id`, `user_id`, `full_name`, `mobile`, `email`
- `created_by`, `assigned_agent_id`
- optional PIN fields: `hashed_pin`, `is_active`, `name`

Do **not** use `customers.agent_id` (legacy; does not exist).

## Canonical services

| Layer | Table | Role |
|---|---|---|
| Public CMS | `public.services` | Customer-facing service pages / catalog reads |
| CRM pricing | `public.service_catalog` | Amount / commission fields for CRM |
| AP catalog | `public.agent_services` | Agency Partner sellable services |

Application code primarily reads `services` and `agent_services`. Keep both `services` and `service_catalog` in sync via seed/sync migrations. **CSC Olympiad** and **PAN Card** are not in the approved catalog.

## Canonical wallet

| Concern | Object |
|---|---|
| Balance | `public.reward_wallets` |
| Ledger | `public.wallet_transactions` |

Reward posting must go through idempotent SQL functions (e.g. payment-verified / referral completion). Do not maintain a second live balance that can diverge (`customers.wallet_balance` is display/legacy only).

## Canonical agent / AP assignment

| Concern | Canonical |
|---|---|
| Partner record | `public.agency_partners` (`user_id → auth.users`) |
| Application assignment | `applications.assigned_agent_id` and/or `applications.agency_partner_id` |
| Customer ownership by AP | `customers.assigned_agent_id` / `customers.created_by` |

Legacy `public.agents` panel tables are deprecated; app uses `/ap` + `agency_partners`.

## Canonical application ownership

- Customer: `applications.user_id` and/or `applications.customer_id → customers.id`
- Creator: `applications.created_by`
- Assignee: `applications.assigned_agent_id` / `agency_partner_id`
- Payment: Razorpay columns on applications/payments + reconciliation tables

## Canonical documents

`public.application_documents` for application uploads (customer / assigned AP / admin RLS).

`public.customer_vault_documents` for reusable vault docs:

- Owner: `customers.user_id = auth.uid()`
- Admin: `public.is_admin_role()`
- No agent vault SELECT via `customers.agent_id` (removed)

## Canonical payments

Razorpay fields on payment/application records; unique/partial indexes for order/payment IDs; reconciliation tables retained. Offline invoices remain for admin CRM.

## Deprecated / retained legacy

| Object | Status |
|---|---|
| `staff` / `super_admin` roles | Historical enum values only; not used in live authz |
| Legacy agent panel tables | Deprecated; AP ecosystem is canonical |
| CSC Olympiad seeds | Disabled (`supabase/disabled-migrations`) |
| `customers.agent_id` | Never reintroduce |
| Dual wallet tables (`wallets` vs `reward_wallets`) | Prefer `reward_wallets` + `wallet_transactions` |

## Production note

Local migration history was repaired in place (Option A). Do **not** blindly re-run destructive historical SQL against a linked remote that already has CRM `customers` data. New migrations after this audit are additive and idempotent.
