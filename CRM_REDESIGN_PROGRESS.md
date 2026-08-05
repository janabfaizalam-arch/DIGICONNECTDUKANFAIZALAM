# DigiConnect Dukan — CRM Redesign Progress

Last updated: 2026-08-05

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Discovery & safety | **Complete** | Audit written |
| 2 Foundation + walk-in | **Complete (local commit)** | `928f187` — not pushed |
| 3 Application + assignment | **Complete (local commit `25cc0d4`)** | Security-hardened RPC + argon2 PIN |
| 4 Leads & team ops | **Starting after Phase 3 commit** | Canonical = `public.leads` |
| 5 WhatsApp & automation | Partial | Outbox reused in Phase 3 |
| 6 Dashboards & AI adapters | Pending | |
| 7 QA & production readiness | Pending | |

## Phase 2 local checkpoint

| Field | Value |
|-------|-------|
| Commit | `928f187` / `928f187cab6f7e289889115ddf9b2906ae9de3c2` |
| Message | `feat(crm): add secure walk-in customer foundation` |
| Pushed | **No** |

## Phase 3 local checkpoint

| Field | Value |
|-------|-------|
| Commit | `25cc0d4` / `25cc0d475d65945657e9faa259bb1c9e3bbebfce` |
| Message | `feat(crm): add atomic walk-in application workflow` |
| Pushed | **No** |

## Phase 3 verification

| Check | Result |
|-------|--------|
| Secrets / `.env*` staged | No |
| SECURITY DEFINER review | Hardened before commit |
| PIN review | argon2 `hashed_pin` + documented residual HMAC risk |
| `npx tsc --noEmit` | PASS |
| `npx next lint` (Phase 3 files) | PASS |
| Vitest | **Not completed** (App Control / Rollup) |
| Production build | **Not completed** (SWC App Control) |
| Playwright | **Not run** |
| Migration applied to production | **No** |

## Phase 3 security changes in pre-commit review
- Rewrote RPC: empty search_path, re-validate customer + active service fee from DB
- Actor-scoped idempotency keys
- Append-only assignment history (no UPDATE/DELETE policies + forbid trigger)
- Walk-in stores argon2 `hashed_pin` for real PIN login
- Safe RPC error codes; no SQL detail to browser
- Docs: grants + threat review in `CRM_DATABASE_CHANGES.md`

## Decisions
1. Canonical lead table for Phase 4 = `public.leads` (not `crm_leads` demo pipeline).
2. No push / deploy / prod migration without explicit approval.
