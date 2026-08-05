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

### Abandoned customer risk
Phase 2 `POST /api/admin/customers/walk-in` can create a customer without an application. Phase 3 wizard prefers final submit via walk-in-application with `newCustomer`. If app fails after customer create, API returns `customerId` for retry without duplicate.
