# DigiConnect Dukan — CRM Database Changes

Last updated: 2026-08-05 (Phase 3 security hardening)

## Mapping before Phase 3

| Need | Existing structure | Decision |
|------|--------------------|----------|
| Service catalogue / pricing | `agent_services` (+ sync from `services`) | **Reuse** — do not create a second catalogue |
| Offline invoice items | `offline_invoice*` tables | Separate POS path; not used for CRM applications |
| Application create | `applications` | Extend via walk-in API + RPC |
| Status history | `status_logs`, `application_status_logs` | Reuse both when present |
| Assignment current | `assignments`, `applications.assigned_agent_id` | Reuse; unassigned = null assignee |
| Assignment history | *(missing)* | **Add** `application_assignment_history` |
| WhatsApp outbox | `whatsapp_messages` (idempotent) | Reuse; send outside DB tx |
| Idempotency | CRM sync keys; wallet keys | **Add** `crm_idempotency_keys` for walk-in create |
| Customer identity | `customers`, `profiles`, auth users + PIN digest | Reuse Phase 2 walk-in create + argon2 `hashed_pin` |

## Migration: `20260805120000_crm_walk_in_application_foundation.sql`

### Additive objects
1. `public.crm_idempotency_keys` (+ `client_key`, actor-scoped unique index)
2. `public.application_assignment_history` (append-only; UPDATE/DELETE trigger forbidden)
3. Partial index `applications_unassigned_queue_idx`
4. `public.create_walk_in_application_core(...)` — hardened SECURITY DEFINER
5. `public.forbid_application_assignment_history_mutation()` trigger function

### Exact grants / privilege boundary

| Object | PUBLIC | anon | authenticated | service_role |
|--------|--------|------|---------------|--------------|
| `create_walk_in_application_core` | REVOKE ALL | REVOKE ALL | REVOKE ALL | GRANT EXECUTE |
| `forbid_application_assignment_history_mutation` | REVOKE ALL | REVOKE ALL | REVOKE ALL | (trigger only) |
| `crm_idempotency_keys` RLS | — | no policies | admin SELECT only | bypasses RLS |
| `application_assignment_history` RLS | — | no write | admin SELECT/INSERT; partner SELECT scoped | bypasses RLS |
| `whatsapp_messages` (existing) | — | — | admin manage only | bypasses RLS |

Function attributes:
- `SECURITY DEFINER`
- `SET search_path = ''` (empty) — all relations schema-qualified as `public.*` / `auth.users`
- Optional `p_customer_auth_user_id` — server-resolved only; must equal `customers.id` and exist in `auth.users`

### Production customer schema / Auth linkage (verified 2026-08-06)

| Fact | Production |
|------|------------|
| Display name column | `customers.name` (not `full_name`) |
| `customers.user_id` | **Absent** — do not add for walk-in |
| PIN login | JWT `sub` = `customers.id`; sessions via `customer_sessions.customer_id` |
| Proven Auth link | `customers.id == auth.users.id` when Auth row exists |
| `applications.user_id` | Nullable FK → `auth.users`; set only when proven link exists, else **null** |
| Ownership for CRM | Always set `applications.customer_id` to real `customers.id` |

RPC never reads `customers.full_name` or `customers.user_id`. Browser-supplied Auth ids are rejected.
- Owner: migration role (typically `postgres` / Supabase superuser) — document in deploy runbook

### Threat review (SECURITY DEFINER)

| Threat | Mitigation |
|--------|------------|
| search_path hijack | Empty `search_path`; fully qualified names |
| Client elevates via EXECUTE | Revoked from PUBLIC/anon/authenticated; only service_role |
| Trusted caller price/title | RPC reloads `agent_services` by id; fee from DB |
| Fake customer ownership | RPC requires existing `customers.id`; loads mobile/name/email from DB |
| Cross-user idempotency replay | Key = `walk_in_application_create:{actor_id}:{client_key}` |
| Concurrent double create | `pg_advisory_xact_lock` + idempotency insert in same function transaction |
| Assignee spoofing | Assignee must exist in `auth.users`; otherwise unassigned |
| SQL detail leak to browser | Exception mapper raises stable codes only; app returns generic JSON errors |
| Assignment history rewrite | BEFORE UPDATE OR DELETE trigger raises `assignment_history_append_only` |
| WhatsApp secrets | Not written by this RPC; existing `whatsapp_messages` admin-only RLS |

### Caller must still (app layer)
- Authenticate admin session
- Enforce `applications.create` + `walk_in.create`
- Enforce `payments.edit` before setting override flags
- Enforce `applications.assign` before passing assignee
- Never log temporary PIN

### Pre-deployment checks
- Confirm `public.is_admin_role()` exists
- Confirm `applications.customer_id`, `assigned_agent_id`, `source_channel`
- Confirm `ownership_status` allows `'owned'`
- Dry-run on staging; **no production apply without approval**

### Rollback / mitigation
1. `revoke execute on function public.create_walk_in_application_core(...) from service_role;`
2. `drop function public.create_walk_in_application_core(...);`
3. Drop assignment-history trigger + forbid function
4. `drop table if exists public.application_assignment_history;`
5. `drop table if exists public.crm_idempotency_keys;`
6. Drop unassigned index  
**Do not delete** application/customer rows created while the feature was live.

### Types
Regenerate Supabase types after applying when that is the project convention.

## PIN security (walk-in)

### Architecture (inspected)
- Primary customer login (`/api/auth/customer/login`) verifies **`customers.hashed_pin`** with **argon2id** (`src/lib/auth-v2/password.ts`).
- Supabase Auth email+password path uses `derivePinPassword` (HMAC → GoTrue bcrypt) for complete-signup compatibility.
- Walk-in now sets **both**: argon2 `hashed_pin` (login) + HMAC-derived Auth password (compat). Plain PIN is never stored.

### Residual risk / follow-up (not silently weakened)
1. HMAC-derived Auth password remains useful only if `AUTH_HMAC_SECRET` leaks **and** Auth password hashes are stolen — still gated by GoTrue bcrypt, but PIN space is small. Prefer retiring HMAC-as-password once all clients use argon2 PIN sessions.
2. Temporary PIN expiry column + forced change enforcement at every login gate are incomplete product-wide; walk-in sets `must_change_pin` in Auth user_metadata. **Follow-up task:** additive `pin_must_change` / `temporary_pin_expires_at` on `customers` + login gate + lockout audit consolidation.
3. OTP `hashOtp` still has a **dev-only fallback string** when secret missing — must never be used in production; `derivePinPassword` already throws without secret.
4. Failed-attempt limits / lockout exist on `/api/customer-auth/login` path; ensure `/api/auth/customer/login` has equivalent controls in the follow-up.

## Phase 4 additive migration

`20260805130000_crm_leads_canonical_ops.sql` (after Phase 3 `...120000_crm_walk_in...`)

### Additive only
- Extends `public.leads` with pipeline/source/assignment/follow-up/ingestion/attribution columns.
- Backfills `mobile_normalized`, `lead_source`, `pipeline_stage`, `assigned_to`, `last_activity_at` where null — does **not** rewrite names/messages or delete rows.
- Does **not** drop or rewrite `crm_leads`.
- No CHECK constraints that would fail on dirty legacy `status` values.
- No demo seed in migration.

### Indexes
mobile_normalized, lead_source, pipeline_stage, partner_id, assigned_to+follow_up, unassigned partial, overdue partial, external_ref, ingestion_key unique.

### History / idempotency
- `lead_stage_history`, `lead_assignment_history` append-only (forbid UPDATE/DELETE triggers; INVOKER; search_path empty; revoke PUBLIC/anon/authenticated).
- `lead_activities` admin + scoped partner insert/select.
- `lead_ingestion_keys` admin select only; writes via service role.

### App-layer hardening (paired with migration)
- Partner-scoped ingestion keys (`agency_partner:{partnerId}:...`).
- Duplicate suggestions privacy-scoped for partners.
- Ownership derived from authenticated actor.

### Rollback / mitigation
Drop new tables/indexes/columns; **do not DELETE** lead business rows. Production unchanged until explicitly applied.

## Phase 4 conversion migration (hardened)

`20260805140000_crm_lead_conversion_rpc.sql`

### Mobile uniqueness precondition
- Audits duplicate `normalize_customer_mobile(mobile)` groups; **fails migration** if any exist (operator message + audit query).
- Ensures `customers_mobile_unique_auth_idx` (raw mobile) and `customers_mobile_normalized_unique_idx` (expression).
- Source of raw unique index historically: `20260718180000_customer_whatsapp_pin_auth.sql` (may have been skipped via NOTICE — preflight now hard-fails).

### RPC defense in depth
- Validates admin via `profiles`/`users` roles OR active approved `agency_partners`.
- Partner lead ownership: `agent_id` / `assigned_to` / `partner_id`.
- Customer link scoped; inaccessible matches raise generic `customer_forbidden` / `customer_match_required` (no cross-partner leak).
- Assignee must pass `crm_user_is_eligible_assignee` (admin/staff or active partner — not customer-only / arbitrary auth.users).
- Partners forced to self-assignment on convert.
- Fee from `agent_services` when service id present; otherwise 0 (client price ignored).
- Lead-scoped advisory lock + `FOR UPDATE`; already-converted returns prior IDs; different clientKey cannot double-convert.
- EXECUTE: `service_role` only; `search_path=''`.

### Remaining DB boundary (documented)
- Fine-grained TS capabilities (e.g. `leads.convert` string) are not a SQL enum — RPC uses strongest canonical role/membership checks available.
- Service-skill assignee matching deferred; uncertain assignees → unassigned for admin null path.

## Phase 4 follow-up lifecycle

`20260805150000_crm_lead_followups.sql` — `lead_follow_ups` statuses: scheduled/completed/cancelled/rescheduled. `leads.next_follow_up_at` remains queue pointer.

### Rollback / mitigation (conversion + follow-ups)
Revoke/drop convert function and helpers; drop convert idempotency + follow-up tables/columns. **Do not** delete converted applications/customers/leads. Production unchanged until explicitly applied.

## Phase 5A — Communication outbox (additive)

`20260805160000_crm_communication_outbox.sql`

### Decision
Reuse `public.whatsapp_messages` as the **canonical** outbox. Do **not** create a competing queue. Leave `notification_queue` mock/legacy untouched.

### Additive changes
1. Expand `whatsapp_messages.status` check to include processing/submitted/retryable/cancelled/configuration_required/suppressed
2. Columns: provider, purpose, lead_id, payment_id, follow_up_id, classification, consent_basis, max_attempts, next_attempt_at, provider_status, failure_*, correlation_id, created_by, cancel_*, processing lease, safe_metadata
3. `communication_delivery_events` — webhook idempotency (provider + provider_event_id)
4. `customer_communication_preferences` + `customer_communication_preference_history`
5. `claim_communication_outbox` SECURITY DEFINER, `search_path=''`, EXECUTE **service_role only**
6. `communication_ops_audit` — retry/cancel/explicit_resend audit (admin SELECT)

### RLS / grants
| Object | Policy / grant |
|--------|----------------|
| whatsapp_messages | Existing admin manage (unchanged intent) |
| communication_delivery_events | Admin SELECT |
| customer_communication_preferences | Admin ALL |
| preference history | Admin SELECT |
| communication_ops_audit | Admin SELECT; writes via service_role from Next.js |
| claim_communication_outbox | REVOKE PUBLIC/anon/authenticated; GRANT service_role |

### Retention
Delivery events + ops audit: prefer ≥ 90 days. Never store API keys, webhook secrets, identity documents, or full rendered PII dumps in payload/safe_metadata.

### Preflight (staging — non-destructive reporting)

Legacy statuses written by production-compatible code: `queued`, `sent`, `delivered`, `read`, `failed`.  
Migration **fails safely** if null/blank or unknown statuses exist (no silent rewrite/delete).

```sql
-- 1) Count per status (including unknown)
select coalesce(nullif(btrim(status), ''), '(blank)') as status, count(*) as n
from public.whatsapp_messages
group by 1
order by n desc;

-- 2) Unknown statuses (must be 0 before apply)
select id, status, created_at
from public.whatsapp_messages
where status is null
   or btrim(status) = ''
   or status not in (
     'queued','sent','delivered','read','failed',
     'processing','submitted','retryable','cancelled','configuration_required','suppressed'
   );

-- 3) Duplicate idempotency keys (unique already exists — expect 0)
select idempotency_key, count(*) as n
from public.whatsapp_messages
group by 1 having count(*) > 1;

-- 4) Duplicate provider_message_id (NO unique index added — report only)
select provider_message_id, count(*) as n
from public.whatsapp_messages
where provider_message_id is not null
group by 1 having count(*) > 1;

-- 5) Recipients that look unnormalizable (< 10 digits)
select id, left(recipient, 4) as recipient_prefix, length(regexp_replace(recipient, '\D', '', 'g')) as digits
from public.whatsapp_messages
where length(regexp_replace(coalesce(recipient, ''), '\D', '', 'g')) < 10
limit 100;
```

### Remediation options (manual — never auto)
- Unknown status: map only with operator-approved UPDATE after backup; or quarantine rows before CHECK apply.
- Duplicate provider IDs: leave as-is; webhook refuses multi-match updates.
- Invalid recipients: leave failed/queued; fix at source on retry.

### Compatibility with old rows
- New columns have defaults (`provider`, `classification`, `max_attempts`, `safe_metadata`).
- List/processor/webhook tolerate null `purpose` (fall back to `event_type`), null lease fields, missing delivery events table (logged safely).
- Existing notification rows remain readable via prior admin selects.

### Indexes
Non-unique only on `provider_message_id` — **no** unique index on dirty provider IDs.

### Rollback / disable
1. Unset `AISENSY_API_KEY` / `COMMS_CRON_SECRET` / `AISENSY_WEBHOOK_SECRET` (feature safely disabled).
2. Do not register cron in `vercel.json`.
3. Drop new tables/function/columns; restore prior status CHECK if required.
4. **Do not delete** message history.

## Phase 5B — Automation foundation (additive)

`20260805170000_crm_automation_foundation.sql`

### Objects
- `crm_automation_events` (+ claim RPC `claim_crm_automation_events`, service_role only)
- `crm_automation_executions` (DELETE forbidden)
- `crm_ops_alerts`
- `crm_daily_summaries` (unique business_date + timezone)
- Queue producer key contract (app-layer): `auto:{automationEventId}:purpose:{purpose}:rv:{ruleVersion}`
- Legacy direct/manual key (compat): `{applicationId}:{eventType}:{version}`

### Routing ownership note
- Database uniqueness remains last-line defense (`unique(idempotency_key)`), but queue-mode architecture must use one producer path:
  business operation → automation event → rule execution → outbox row.
- Reconciliation inserts missing automation events only; it must not directly enqueue customer communication.

### Preflight (staging)
```sql
select count(*) from public.whatsapp_messages; -- ensure 5A applied first
-- No destructive rewrites. New tables are create-if-not-exists.
```

### Rollback
Drop new tables/functions. Set `CRM_NOTIFICATION_DELIVERY_MODE=disabled` (or unset — also disabled). Do not delete business rows.

## Security Advisor remediation (local only — do not apply without backup gate)

Migration: `20260805180000_supabase_security_advisor_remediation.sql`  
Full audit: `SUPABASE_SECURITY_ADVISOR_AUDIT.md`

**Status wording:** Security Advisor remediation authored and committed locally; production backup, preflight, migration apply, Advisor recheck and isolation tests pending.

### Changes
1. `public.is_admin_from_db()` — profiles/users only; empty `search_path`; no JWT metadata
2. Replace `offline_invoices` policy `"Admins manage offline invoices"` to use `is_admin_from_db()` only
3. Seven diagnostic/fact views: `security_invoker = true` (PostgreSQL 15+ / current Supabase); revoke PUBLIC/anon/authenticated; grant SELECT to `service_role`
4. Initplan-safe wraps of `auth.uid()` / `auth.jwt()` on flagged policies (`agent_services`, `agent_service_assignments`, `customer_sessions`, `customer_login_logs`, `applications`) with fail-fast policy-name/expression preflight

### Not included
- No customer metadata rewrite
- No truncation / data deletion
- No production apply in this change set

### Backup requirement before apply
1. Supabase plan with verified recoverable backup/PITR, **or**
2. Verified encrypted manual production backup outside Git/workspace/public folders

### Rollback
Prefer fix canonical `profiles.role` over restoring `user_metadata` trust. See audit § Rollback.

