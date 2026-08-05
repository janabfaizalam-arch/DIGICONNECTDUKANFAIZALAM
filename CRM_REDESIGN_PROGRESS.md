# DigiConnect Dukan — CRM Redesign Progress

Last updated: 2026-08-05

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Discovery & safety | **Complete** | Audit written; baseline `tsc` PASS; `next lint` PASS (warnings only) |
| 2 Foundation + walk-in | **Complete (local commit)** | See checkpoint hash below |
| 3 Application + assignment | **In progress** | After Phase 2 checkpoint |
| 4 Leads & team ops | Pending | |
| 5 WhatsApp & automation | Pending | Preserve AiSensy; add outbox later |
| 6 Dashboards & AI adapters | Pending | No fake LLM credentials |
| 7 QA & production readiness | Pending | |

## Completed work

### Phase 1
- Inspected stack, portals, migrations, auth, integrations, reports vs code
- Created `CRM_REDESIGN_AUDIT.md`
- Baseline: `npx tsc --noEmit` exit 0; `npx next lint` exit 0
- `pnpm lint` may fail locally due to App Control / pnpm ignored builds — not treated as product lint failure

### Phase 2 (in progress — foundation landed)
- `CRM_PERMISSION_MATRIX.md`
- `src/lib/crm/permissions-core.ts` + `permissions.ts`
- `GET /api/admin/customers/lookup`
- `POST /api/admin/customers/walk-in` (secure PIN, no staff password)
- `/admin/customers/walk-in` phone-first wizard + pincode autofill
- Admin nav **New Customer** → walk-in

## Changed files (Phase 2)

- `CRM_REDESIGN_AUDIT.md`, `CRM_REDESIGN_PROGRESS.md`, `CRM_PERMISSION_MATRIX.md`
- `src/lib/crm/*`
- `src/app/api/admin/customers/lookup/route.ts`
- `src/app/api/admin/customers/walk-in/route.ts`
- `src/app/admin/customers/walk-in/page.tsx`
- `src/components/admin/walk-in-customer-wizard.tsx`
- `src/lib/admin/nav.ts`

## Phase 2 local checkpoint

| Field | Value |
|-------|-------|
| Commit message | `feat(crm): add secure walk-in customer foundation` |
| Commit hash | ac628ce |
| Pushed | **No** (local only) |

### Pre-commit verification (Phase 2)

| Check | Result |
|-------|--------|
| Secrets / `.env*` staged | No |
| `npx tsc --noEmit` | PASS |
| `npx next lint` (Phase 2 files) | PASS |
| `vitest run src/lib/crm/permissions.test.ts` | BLOCKED locally (Windows App Control / Rollup native) |
| AuthZ on lookup/walk-in | Admin capability + rate limit |
| Temporary PIN logged | No |
| PIN in URL | No |
| Internal email in lookup UI | Filtered out (`@customer.rnos.internal`) |

## Tests / verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx next lint` | PASS on Phase 2 files |
| Vitest | Blocked on this Windows App Control host |
| Manual walk-in | Pending after Phase 3 |

Unit tests added: `src/lib/crm/permissions.test.ts`

## Risks

- Dual `customers` column shapes — create path must tolerate missing optional columns
- `AUTH_HMAC_SECRET` required for PIN-derived auth password
- Messaging failure must not roll back customer create

## Remaining items

- Wire walk-in success → service selection → application create (Phase 3)
- Assignment engine + history
- Lead unification
- Full AI adapter (disabled without provider)
- Remaining deliverable docs (DB changes, automation map, test report, deployment, final)

## Decisions taken without blocking

1. Keep three canonical roles; finer permissions in code matrix.  
2. Walk-in generates secure PIN; queues WhatsApp when configured; never blocks save on messaging failure.
