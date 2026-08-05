# DigiConnect Dukan — CRM Redesign Progress

Last updated: 2026-08-05

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| 1–4 | Complete (local) | Prior commits not pushed |
| 5A | Complete (local) | `aa2c195` — outbox + adapter |
| 5B | **Implementation complete locally** | Uncommitted — queue-mode producer ownership finalized; Checkpoint B awaiting approval |
| 6–7 | Pending | |

## Status wording (Phase 5B)

**Phase 5B implementation complete locally; staging database, CI, scheduler, provider and browser verification pending.**

Not production-ready. Migrations not applied. Cron not registered. Live messages not sent. Remote not pushed.

## Checkpoint B queue-mode ownership resolution

- Root ambiguity addressed: removed “emit + request enqueue” interpretation for migrated queue-mode routes.
- Authoritative queue chain is now: business operation → automation event → rule enqueue → outbox processor send.
- Added producer-ownership documentation and static route contract tests preventing migrated routes from importing direct provider/enqueue helpers.
- Follow-up due scanner now emits event only; alert ownership is rule execution (single producer).

## Local commits (not pushed)

| Phase | Hash | Message |
|-------|------|---------|
| 5A | `aa2c195` | `feat(crm): add communication outbox and AiSensy adapter` |
| 5B | *awaiting approval* | `feat(crm): add event-driven CRM automations and operations` |
