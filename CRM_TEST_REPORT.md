# DigiConnect Dukan — CRM Test Report

Last updated: 2026-08-05

## Phase 2 checkpoint (local)

| Field | Value |
|-------|-------|
| Commit | `928f187` (`feat(crm): add secure walk-in customer foundation`) |
| Pushed | No |

## Automated tests added

| Area | File |
|------|------|
| Permissions | `src/lib/crm/permissions.test.ts` |
| Mobile / price / assignment / WhatsApp UI map / authZ | `src/lib/crm/walk-in-application.test.ts` |

Covered behaviours (unit):
- Indian mobile normalization + validation + masking
- Unauthorized capability gaps (partner assign/resend, customer walk-in)
- Existing vs new path pricing authority
- Override reason requirement
- Unassigned fallback (no silent assign)
- WhatsApp state mapping without provider payload exposure

Integration behaviours implemented in code (require DB + migration for full E2E):
- Idempotent repeat submission (`crm_idempotency_keys` / RPC)
- Atomic rollback on post-insert history failure (TS fallback deletes application)
- WhatsApp failure does not fail application
- Partner scope isolation on customer access
- Temporary PIN not logged (asserted by code review + log fields)

## Commands & results (this host — Phase 3 verify)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npx next lint` (Phase 3 files) | **PASS** (exit 0; SWC native blocked warning only) |
| `npx vitest run src/lib/crm/*.test.ts` | **BLOCKED** — Windows App Control blocks `@rollup/rollup-win32-x64-msvc` |
| `npx next build` | **FAILED / env** — App Control blocks `@next/swc-win32-x64-msvc`; webpack fallback ends in `TypeError: Cannot read properties of undefined (reading 'length')`. Not attributed to Phase 3 source errors (`tsc` clean). |
| Playwright critical journey | Not run (no authenticated admin env in this session) |

## Pre-existing / environmental issues (not hidden)

1. **Vitest native Rollup binary** blocked by Windows App Control on this machine — document, do not treat as product regression.
2. `pnpm lint` may fail when pnpm ignored builds are blocked — prefer `npx next lint` for product lint signal.

## Phase 4 automated tests

| Area | File |
|------|------|
| Lead core (normalize, stages, duplicates, overdue, idempotency keys, authZ) | `src/lib/crm/leads.test.ts` |

## Phase 4 foundation verification

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| Targeted `npx next lint` (Phase 4 files) | **PASS** |
| Vitest | **Blocked** — App Control / Rollup (not passed) |
| Production build | **Blocked** — SWC App Control (not passed) |
| Playwright | **Not run** |
| Production migration | **Not applied** |
| Remote push | **No** |

Label: **Phase 4 foundation completed** — remaining conversion/UI/follow-ups/inbound activation still pending.

