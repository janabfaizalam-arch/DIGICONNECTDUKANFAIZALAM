# DigiConnect Dukan — CRM Redesign Progress

Last updated: 2026-08-05

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Discovery & safety | **Complete** | Audit written |
| 2 Foundation + walk-in | **Complete (local)** | `928f187` — not pushed |
| 3 Application + assignment | **Complete (local)** | `c5722e6` — not pushed |
| 4 Leads & team ops | **Foundation checkpoint (local)** | Not “Phase 4 complete” |
| 5 WhatsApp & automation | Partial | Outbox reused; inbound adapters pending activation |
| 6 Dashboards & AI adapters | Pending | |
| 7 QA & production readiness | Pending | |

## Phase 2 / 3 checkpoints

| Phase | Hash | Message | Pushed |
|-------|------|---------|--------|
| 2 | `928f187` | `feat(crm): add secure walk-in customer foundation` | No |
| 3 | `c5722e6` | `feat(crm): add atomic walk-in application workflow` | No |

## Phase 4 foundation checkpoint

| Field | Value |
|-------|-------|
| Label | **Phase 4 foundation checkpoint** (not complete) |
| Commit message | `feat(crm): unify leads on canonical pipeline` |
| Commit hash | `cd34084` / `cd34084439f260d9dc4e722a813c85fc21b9b41c` |
| Pushed | **No** |
| Migration applied | **No** |
| Production | **Unchanged** |

### Foundation includes
- Canonical `public.leads` additive columns + history/ingestion tables
- Partner-scoped idempotency + duplicate privacy
- Website / AP / manual ingest adapters
- Pipeline compatibility adapter (no demo seed)
- Ownership docs + unit tests for core helpers

### Remaining Phase 4 work
- Transactional lead conversion
- Dedicated admin + AP lead operations UI
- Follow-up queues (today/overdue/upcoming)
- WhatsApp/Sheets-ready inbound (inactive)
- Conversion/UI integration tests

## Verification (foundation)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Re-run before commit |
| Targeted lint | Re-run before commit |
| Vitest | **Blocked** (App Control / Rollup) — not passed |
| Production build | **Blocked** (SWC App Control) — not passed |
| Playwright | **Not run** |
| Remote push | **No** |

## Decisions
1. Canonical lead table = `public.leads`; `crm_leads` compatibility only.
2. No push / deploy / prod migration without explicit approval.
3. Do not call Phase 4 complete until conversion + UI + follow-ups + inactive inbound adapters land.
