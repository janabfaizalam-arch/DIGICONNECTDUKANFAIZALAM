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


