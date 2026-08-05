# DigiConnect Dukan — CRM Test Report

Last updated: 2026-08-05 (Security Advisor remediation — local only)

## Status wording

**Security Advisor remediation authored and committed locally; production backup, preflight, migration apply, Advisor recheck and isolation tests pending.**  
Advisor findings are **not** claimed resolved. CRM production rollout remains paused.

## Authored tests (Phase 5B)

| File | Area |
|------|------|
| `src/lib/automation/automation.contract.test.ts` | Delivery mode, allowlists, safe conditions, rules safety, IST bounds, permissions, no dual-send / no recursion |
| `src/lib/automation/producers.contract.test.ts` | Assignment/follow-up/status producer idempotency contracts |
| `src/lib/automation/queue-producer.contract.test.ts` | Queue/direct/disabled call-chain ownership and migrated-route static guardrails |
| Phase 5A comms contracts | Still applicable |

## Authored tests (Security Advisor remediation)

| File | Area | Execution |
|------|------|-----------|
| `src/lib/supabase/security-advisor-remediation.contract.test.ts` | Migration static contracts: no `user_metadata` in offline_invoices policy; view invoker+revokes; initplan wraps; access matrix | May be **BLOCKED** on Windows App Control |
| Runtime RLS isolation (admin/partner/customer/forged metadata) | Documented in audit | **NOT RUN** — no DB harness |

CI: `pnpm test:crm-automation` · `pnpm test:security-advisor`

## Verification (Checkpoint B pre-commit)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| Targeted lint | **PASS** (0 errors; warnings none after fix) |
| Secret / artifact scan | **PASS** (no new secrets committed) |
| Migration static review | **PASS** (not applied) |
| Vitest | **BLOCKED** (Windows App Control) |
| DB concurrency | **NOT RUN** |
| Production build | **NOT RUN** |
| Playwright | **NOT RUN** |
| Live provider / scheduler | **NOT RUN** |
| Migration apply | **No** |
| Push | **No** |

## Verification (Security Advisor remediation — local)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| Targeted lint (contract test) | **PASS** (eslint exit 0) |
| Migration static review | **PASS** — no truncate/delete/drop table; policy removes `user_metadata` trust; views set invoker+revoke |
| Secret / artifact scan | **PASS** |
| Vitest (`test:security-advisor`) | **BLOCKED** (Windows App Control / Rollup native) — tests authored, not claimed PASS |
| Migration apply | **No** |
| Security Advisor recheck | **Not run** (production untouched) |
| Push / deploy | **No** |
| Claim Advisor resolved | **No** — requires apply + recheck + isolation tests |
