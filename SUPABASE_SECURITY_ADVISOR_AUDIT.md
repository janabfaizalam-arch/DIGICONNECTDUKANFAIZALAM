# Supabase Security Advisor Audit

**Date:** 2026-08-05  
**Scope:** Local read-first audit of Security Advisor findings confirmed by production screenshot.  
**Status wording:** Security Advisor remediation authored and committed locally; production backup, preflight, migration apply, Advisor recheck and isolation tests pending.

**Gate:** **READY FOR BACKUP GATE** (remediation **not** applied; findings **not** claimed resolved)

## Hard constraints (honored)

- No push, deploy, production write access, migration apply, remote policy change, or production data modification.
- No customer metadata rewrite.
- Production rollout remains paused until backup/recovery gate + Advisor recheck.

---

## A. Status

**READY FOR BACKUP GATE**

Corrective migration and docs/tests are authored locally. Do **not** apply until one recovery gate is verified.

---

## B. Advisor findings → source migrations

| Advisor finding | Severity | Affected object | Source definition |
|-----------------|----------|-----------------|-------------------|
| RLS policy references editable Auth `user_metadata` | **Critical** | `public.offline_invoices` policy `"Admins manage offline invoices"` | `supabase/migrations/20260518193000_offline_invoices.sql` |
| SECURITY DEFINER view | Critical/Warn | `public.crm_application_payment_diagnostics` | `20260516123000_crm_payment_application_consistency.sql` |
| SECURITY DEFINER view | Critical/Warn | `public.admin_crm_application_facts` | `20260516133000_admin_crm_rebuild_diagnostics.sql` |
| SECURITY DEFINER view | Critical/Warn | `public.admin_crm_payment_facts` | same |
| SECURITY DEFINER view | Critical/Warn | `public.admin_crm_diagnostics` | same |
| SECURITY DEFINER view | Critical/Warn | `public.reward_wallet_diagnostics` | `20260516110000_reward_wallet_e2e_repair.sql` (+ redefine `20260517100000_canonical_reward_wallet_rules.sql`) |
| SECURITY DEFINER view | Critical/Warn | `public.agent_legacy_leads_deprecated` | `20260518160000_deprecate_legacy_agent_panel.sql` |
| SECURITY DEFINER view | Critical/Warn | `public.admin_wallet_ledger_balances` | `20260519120000_admin_control_room_identity_wallet_hardening.sql` |
| Auth RLS initplan | Warn (perf) | `agent_services`, `agent_service_assignments` | `20260520150000_agent_service_management.sql` |
| Auth RLS initplan | Warn (perf) | `customer_sessions`, `customer_login_logs` | `20260706000000_customer_auth_system.sql` |
| Auth RLS initplan | Warn (perf) | `applications` policies with `auth.uid()` | primarily `20260518120000_three_role_security_hardening.sql`, `20260517170000_agent_panel_workflow.sql` |

### Related helpers (context)

| Object | Source | Note |
|--------|--------|------|
| `public.is_admin_role()` / `current_app_role()` | `20260504110000` → redefined `20260518173000` → `20260519133000` | Later `current_app_role` still falls back to JWT `app_metadata` / `user_metadata` after profiles/users |
| App offline invoice access | `src/lib/offline-invoices.ts`, admin API routes | Always `getSupabaseAdmin()` after Next.js admin auth |

---

## C. `offline_invoices` policy risk and proposed fix

### Finding
Policy `"Admins manage offline invoices"` authorizes when:

```sql
public.is_admin_role()
or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
```

### Which value is read
`role` from JWT **`user_metadata`** (and also `app_metadata`).

### Can an ordinary authenticated user edit it?
**Yes for `user_metadata`.** Supabase Auth allows users to update their own `user_metadata`. A customer/partner who can set `user_metadata.role = 'admin'` would satisfy the OR branch even without a DB admin role.

`app_metadata` is normally server-only, but the policy still should not rely on JWT alone when canonical `profiles` / `users` roles exist.

### Intended authorized roles
**Admin only.** There is no partner/customer offline-invoice portal. All app paths use service role after server-side admin session checks. No `agency_partner_id` / `customer_id` ownership columns on this table for scoped sharing.

### Proposed fix (authored)
1. Add `public.is_admin_from_db()` — `SECURITY DEFINER`, `search_path = ''`, checks only `public.profiles` / `public.users` for `admin` / `super_admin`, uses `(select auth.uid())`.
2. Replace policy to `using` / `with check` **only** `public.is_admin_from_db()`.
3. Do **not** rewrite Auth user metadata remotely.
4. Narrow EXECUTE grants: revoke PUBLIC/anon; grant authenticated + service_role (needed for RLS evaluation).

### Compatibility
Low for product behavior: admin APIs already use service_role (bypasses RLS). Risk is limited to any direct PostgREST client that previously relied on forged/stale JWT metadata without a profiles/users admin row — that access is intentionally removed.

### Tests authored
Static contract + access matrix in `src/lib/supabase/security-advisor-remediation.contract.test.ts`  
Runtime RLS isolation: **pending DB harness** (documented matrix: admin permitted; partner/customer/forged metadata/anon denied).

---

## D. Per-view security analysis

| View | Sensitive data | App consumers | Ordinary authenticated SELECT (default grants) | Owner RLS bypass risk | Treatment |
|------|----------------|---------------|--------------------------------------------------|----------------------|-----------|
| `crm_application_payment_diagnostics` | Payment + application | None in `src/` | Likely yes if granted | Yes if SECURITY DEFINER owner | `security_invoker=true`; revoke PUBLIC/anon/authenticated; grant `service_role` |
| `admin_crm_application_facts` | Applications | Indirect via diagnostics | Likely | Yes | same |
| `admin_crm_payment_facts` | Payments | Indirect | Likely | Yes | same |
| `admin_crm_diagnostics` | Payment/CRM issues | `admin-crm.ts`, `admin-payment-reconciliation.ts` via **service_role** | Must not | Yes | same — preserves admin UI via service role |
| `reward_wallet_diagnostics` | Wallet / referral | Historical grant to service_role only | Must not | Yes | same |
| `agent_legacy_leads_deprecated` | Lead PII (name, mobile) | None in current `src/` | Must not | Yes | same |
| `admin_wallet_ledger_balances` | Wallet aggregates | None direct in `src/` | Must not | Yes | same |

**Not chosen:** converting to client-callable SECURITY DEFINER RPCs (unnecessary — app already uses service layer).  
**Not chosen:** weakening underlying table RLS.

---

## E. RLS performance (initplan) warnings

| Table | Current pattern | Safe optimization | Auth change? | Expected benefit |
|-------|-----------------|-------------------|--------------|------------------|
| `agent_services` | `asa.agent_id = auth.uid()` | `= (select auth.uid())` | No | InitPlan once per statement |
| `agent_service_assignments` | `agent_id = auth.uid()` | `(select auth.uid())` | No | same |
| `customer_sessions` / `customer_login_logs` | `auth.jwt()->>'role'` | `(select auth.jwt())` | No | same |
| `applications` (agent/customer policies) | repeated `auth.uid()` | `(select auth.uid())` | No | same |

These are **performance** warnings, not authorization defects by themselves. Equivalence preserved by keeping identical predicates.

---

## F. Runtime PostgreSQL errors — read-only diagnostic plan

Advisor does not attribute last-hour Postgres errors. **Do not access remote logs without granted read-only access.**

When authorized (dashboard Logs / sanitized API only):

| Dimension | Capture |
|-----------|---------|
| Time range | Last 1h (and 24h if sparse) |
| Error code / category | `SQLSTATE`, message class (permission, missing relation, unique_violation, etc.) |
| Endpoint / query / function | Truncate SQL; hash identifiers; **no** full customer rows |
| Count | Group by code + statement fingerprint |
| Secrets/PII | Redact mobiles, emails, tokens, JWTs before export |
| Live code vs stale | Compare fingerprints to current deployed commit |
| Missing migrations | `42P01` undefined_table / `42703` undefined_column |
| Permission/RLS | `42501` / empty results with 200 from app |
| Health probes / retries | Burst patterns from known IPs / `/api/health` |

**Remaining access requirement:** Owner-granted read-only log inspection (or export of sanitized aggregates). Not performed in this audit.

---

## G. Corrective migration created

`supabase/migrations/20260805180000_supabase_security_advisor_remediation.sql`

- Forward-only; preflight abort if objects/policy missing or unexpected
- Not applied

---

## H. Production preflight queries

```sql
-- 1) Confirm offline_invoices policy still matches expected legacy form
select pol.polname, pg_get_expr(pol.polqual, pol.polrelid) as using_expr
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'offline_invoices';

-- 2) Confirm diagnostic views exist
select to_regclass('public.admin_crm_diagnostics'),
       to_regclass('public.reward_wallet_diagnostics'),
       to_regclass('public.agent_legacy_leads_deprecated');

-- 3) Current grants (expect possible anon/authenticated — remediation removes them)
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like 'admin_crm%'
  or table_name in ('reward_wallet_diagnostics','agent_legacy_leads_deprecated','admin_wallet_ledger_balances','crm_application_payment_diagnostics');
```

Stop migration apply if policy/view set differs materially from repo history.

---

## I. Tests authored vs executed

| Test | Authored | Executed |
|------|----------|----------|
| `security-advisor-remediation.contract.test.ts` | Yes | See verification (Vitest may be BLOCKED) |
| Runtime RLS: admin/partner/customer/forged metadata | Matrix documented | **NOT RUN** (no DB harness) |
| Portal smoke | — | **NOT RUN** |

---

## J. Verification results (local)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| Migration static review | **PASS** |
| Secret scan | **PASS** |
| Vitest security-advisor contracts | **BLOCKED** (Windows App Control) |
| Migration applied | **No** |
| Advisor recheck | **No** |

Advisor issues remain **open on production** until apply + recheck.

---

## K. Compatibility risks

1. Direct browser/PostgREST clients selecting diagnostic views as `authenticated` will lose access (intended).
2. Admins without `profiles`/`users` admin role but with forged JWT metadata lose offline_invoices RLS path (intended); service_role admin APIs unaffected.
3. `security_invoker=true` means non-service callers (if somehow granted) must pass underlying RLS — grants revoked to avoid surprise empty/error behavior.
4. Initplan policy rewrites assume named policies still exist; preflight covers offline_invoices; applications policy drops are `IF EXISTS` pattern via `DROP POLICY IF EXISTS`.

---

## L. Backup / recovery requirement

Production shows **Free plan / No recoverable backups**.

**Do not apply this migration until one gate passes:**

1. **Preferred:** Upgrade Supabase plan with confirmed recoverable backup/PITR; verify a backup timestamp in dashboard.  
2. **Alternative:** Complete encrypted manual PostgreSQL backup with an approved tool to protected storage (not Git, not Documents/Codex workspace, not public/shared folders). Verify restore procedure on a throwaway instance.

Do not print connection strings or backup contents.

---

## M. Exact next action

1. Satisfy **backup gate** (upgrade+PITR **or** verified encrypted manual backup).  
2. Run production **preflight** queries (read-only).  
3. Apply `20260805180000_…` only after gate + preflight OK.  
4. Rerun Security Advisor; run isolation + admin portal smoke.  
5. Only then resume any paused CRM production rollout planning.

**Do not claim Advisor issues resolved until steps 3–4 succeed.**

---

## Deployment order (when authorized)

1. Backup gate verified  
2. Preflight SQL  
3. Apply remediation migration only (not CRM feature migrations unless separately authorized)  
4. Advisor recheck  
5. Access isolation + admin offline-invoices + diagnostics smoke  
6. Document results in `CRM_TEST_REPORT.md`

## Rollback / mitigation

- If admin offline invoices break: confirm service_role key still used; confirm actor has `profiles.role` admin — do not restore `user_metadata` trust.  
- If diagnostics empty in admin UI: confirm `getSupabaseAdmin()` path; confirm `GRANT SELECT … TO service_role`.  
- Emergency policy restore: recreate prior policy from `20260518193000` only as temporary mitigation while fixing DB roles — prefer fixing profiles over restoring metadata OR.
