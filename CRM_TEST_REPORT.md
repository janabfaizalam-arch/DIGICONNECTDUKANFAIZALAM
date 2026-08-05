# DigiConnect Dukan — CRM Test Report

Last updated: 2026-08-05

## Status

**Phase 4 implementation complete locally; staging and CI verification pending.**  
Not production-ready.

## Local commits

| Phase | Hash | Message |
|-------|------|---------|
| 2 | `928f187` | walk-in foundation |
| 3 | `c5722e6` | atomic walk-in application |
| 4 foundation | `4e1ed2c` | unify leads on canonical pipeline |
| 4 completion | *(see git log)* | complete lead conversion and operations workspace |

## Authored automated CRM tests (not executed locally)

| File | Area |
|------|------|
| `src/lib/crm/leads.test.ts` | Normalize, stages, duplicates, overdue, ingest keys |
| `src/lib/crm/lead-workflow.test.ts` | Transitions, lost reason, IST follow-up buckets |
| `src/lib/crm/lead-convert.contract.test.ts` | Convert authZ/privacy/price contracts + CI checklist |
| `src/app/api/ap/leads/route.test.ts` | Legacy AP scope contract |

CI command (Linux / approved runners):

```bash
pnpm test:crm-leads
```

Local Windows host: Vitest **BLOCKED** by App Control / Rollup — do not claim PASS.

## Verification (Phase 4 completion commit)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| Targeted lint (Phase 4 files) | **PASS** |
| Secret scan | **PASS** |
| Migration static review | **PASS** (not applied) |
| Vitest / `pnpm test:crm-leads` | **BLOCKED** (authored, not executed locally) |
| Production build | **NOT RUN** / historically **BLOCKED** |
| Playwright / browser journeys | **NOT RUN** |
| Migrations applied | **No** |
| Remote push | **No** |
| Production | **Unchanged** |
