# DigiConnect Dukan — CRM Communications Runbook (Phase 5A + 5B)

Last updated: 2026-08-05  
Status: **Phase 5B implementation complete locally; staging database, CI, scheduler, provider and browser verification pending.**  
**Not production-ready.** Do not activate live webhooks, cron schedules, or production migrations without explicit approval.

## Required configuration names (values never in git)

| Name | Required? | Purpose | Disabled behavior |
|------|-----------|---------|-------------------|
| `AISENSY_API_KEY` / `AISENSY_PROJECT_API_KEY` | For live send | Campaign API auth | `configuration_required` |
| `AISENSY_API_URL` (+ aliases) | Optional | Campaign endpoint | Default URL / fail |
| `AISENSY_*_CAMPAIGN` | Per event | Approved template names | Missing → failed mapping |
| `AISENSY_WEBHOOK_SECRET` | For webhook | Header shared secret (min 16) | Webhook 503 |
| `AISENSY_MESSAGE_STATUS_URL` | Optional | Diagnostics GET `{id}` | Skip lookup |
| `COMMS_CRON_SECRET` | Preferred | Outbox cron Bearer (min 16) | See precedence |
| `CRON_SECRET` | Legacy fallback | Only if `COMMS_CRON_SECRET` **unset** | Cron 503 |
| `WHATSAPP_PROVIDER` | Optional | Must be `aisensy` | Client rejects others |

All of the above are **server-only** (never `NEXT_PUBLIC_*` except unrelated UI flags).

### Cron secret precedence
1. If env key `COMMS_CRON_SECRET` is **present** (even blank) → use only that value; blank/short → **503**, do **not** fall through.
2. Else use `CRON_SECRET` if length ≥ 16.
3. No development default. Header only: `Authorization: Bearer <secret>`.

## Template mapping

Server resolves campaigns via `src/lib/whatsapp/templates.ts`.  
Browsers must not supply arbitrary campaign/template IDs or destination numbers on ops APIs.

## Provider-disabled behavior

- Adapter → `configuration_required`.
- CRM walk-in / convert / status transactions are **not** rolled back.

## Queue processing & retry ownership

| Layer | Retries? |
|-------|----------|
| AiSensy HTTP client | **No** nested retry loop — single attempt, 15s timeout |
| Outbox processor | **Owns** durable retries (`retryable` + backoff + `max_attempts`, default 5) |

- Ambiguous timeout → `ambiguous_timeout` / `retryable` (not `sent`, not `delivered`).
- HTTP success → outbox `sent` + `provider_status=submitted` (API accept ≠ WhatsApp delivered).
- `submitted` vs `sent`: provider wording often says submitted; app records accept as `sent`. Delivered/read only from correlated webhook.

## Claim / lease

- `claim_communication_outbox`: `FOR UPDATE SKIP LOCKED` + status→`processing` atomically; `service_role` only; `search_path=''`.
- HTTP after claim returns.
- Finalize requires matching `processing_owner` (stale workers cannot overwrite).
- `configuration_required` is **not** auto-claimed.
- Expired leases with `attempt_count >= max_attempts` → `failed`.

## Webhook validation

Route: `POST /api/webhooks/aisensy`

- Auth: `x-aisensy-webhook-secret` or `x-webhook-secret` only (timing-safe SHA-256 compare).
- **Query-string secrets rejected.**
- **Limitation:** AiSensy provides **shared-secret only** in this integration — no cryptographic signature is invented or assumed.
- Body size bound; schema parse before field use; rate limit does not reveal customer existence.
- Outbox update only when exactly **one** row matches `provider_message_id` (ambiguous duplicates → no status flip; event still logged).
- OTP path updates **delivery_* metadata only** — never OTP codes/hashes/verified flags.
- Unknown events → safe ack after auth + schema check.
- Logs: masked destination, no secrets/bodies.

## Consent

- Promotional default false/unknown → suppress.
- Opt-out suppresses promotional.
- Classification from server `purposeClassification` (browser cannot relabel).
- Enqueue + processor both enforce; consent change between enqueue and send is respected.
- Preference history append-only (trigger).
- Suppressed cannot process without new authorized event.

## Manual resend / cancel

`/admin/communications` + `/api/admin/communications`  
Caps: `messaging.view` / `messaging.resend` / `messaging.cancel` (admin).  
Retry reuses row → `queued`. Explicit resend needs reason + new event ID; server recipient/template only.

## Staging preflight

Run SQL in `CRM_DATABASE_CHANGES.md` Phase 5A (status counts, unknowns, dup keys, dup provider IDs, invalid recipients).  
Migration aborts on unknown/null status — no automatic rewrite.

## Queue-mode authoritative producer model (Phase 5B)

Queue mode for migrated non-OTP business events is:

`business operation → automation event → rule execution → canonical outbox → outbox processor send`

For migrated queue-mode events, request paths emit event only and never independently enqueue customer communication.

### Compatibility direct/manual paths (explicit exceptions)

| Call site | Why exception exists |
|-----------|----------------------|
| `sendApplicationWhatsApp` via `/api/admin/applications/[id]/whatsapp` | Manual admin resend/override flow |
| `completeAndSendFinalDocumentWhatsApp` | Manual final-document workflow with short-lived signed URL |

These exception paths are not used as queue-mode communication producers for migrated business events.

### OTP (intentionally separate)

| Call site | Notes |
|-----------|-------|
| `sendAisensyOtp` → `sendAisensyCampaign` | Latency-sensitive auth |
| `sendCustomerWhatsappOtp` / `whatsapp-auth` | OTP only |

### Adapter / processor

| Call site | Notes |
|-----------|-------|
| `createAisensyAdapter` | Only production CRM send wrapper for outbox |
| `processCommunicationOutbox` | Async durable path |

### Non-exception migrated flows

- Walk-in create
- Lead convert/create application
- Status-driven customer updates

These must route through `dispatchApplicationNotification` (event producer) and automation rule enqueue in queue mode.

## Incident / stuck / duplicate

See prior sections; lease recovery + Communications UI; compare `idempotency_key` / `correlation_id`.

## Production activation checklist

- [ ] Staging preflight SQL clean  
- [ ] Migration applied on staging  
- [ ] Env secrets set (names above)  
- [ ] Webhook header configured  
- [ ] Cron in `vercel.json` **only after approval**  
- [ ] Ops UI smoke test  
- [ ] Rollback/disable ready  

## Rollback / disable

1. Do not register / remove cron schedule.  
2. Unset `AISENSY_API_KEY` / webhook / cron secrets.  
3. Drop additive objects if needed — **never delete** message history.

## Phase 5B delivery mode (FAIL-CLOSED)

| Name | Purpose |
|------|---------|
| `CRM_NOTIFICATION_DELIVERY_MODE` | Exact `queue` \| `direct` \| `disabled` after trim+lowercase. **Missing / blank / unknown → `disabled`.** Never defaults to live send. |

| Mode | Request path | Automation enqueue customer WA | Outbox processor AiSensy |
|------|--------------|--------------------------------|---------------------------|
| `queue` | Emit + rules enqueue only | Yes | Yes |
| `direct` | Sync send once; event `completed/direct_handled` | No | No |
| `disabled` | Suppressed / configuration_required audit | No | No |

**OTP does not use `CRM_NOTIFICATION_DELIVERY_MODE`.** OTP stays on `sendAisensyOtp`.

### Deployment order (prevent accidental live send)
1. Deploy code with mode unset/disabled (fail-closed — no non-OTP CRM WhatsApp)  
2. Apply 5A + 5B migrations on staging  
3. Configure AiSensy + `COMMS_CRON_SECRET` (do not register vercel cron yet)  
4. Manually invoke `/api/cron/comms-outbox` and `/api/cron/automation-events` with Bearer auth  
5. **Only then** set `CRM_NOTIFICATION_DELIVERY_MODE=queue` (or explicit `direct` for temporary compatibility)  
6. Do not register vercel cron until approved  

**Never deploy code that defaults to `direct`.** Explicit `direct` is temporary compatibility only.

### Rollout
1. Apply 5A + 5B migrations on staging  
2. Configure AiSensy + `COMMS_CRON_SECRET`  
3. Manually invoke processors with Bearer auth  
4. Set `CRM_NOTIFICATION_DELIVERY_MODE=queue`  
5. Do not register vercel cron until approved  

### Rollback without duplicates
Set `disabled` (or remove the var — also disabled). Processor claims no sendable work when mode≠queue. Do not invent a dual-send fallback after timeout. Do not reconcile `direct_handled` into queued duplicates.

### OTP / temporary PIN
OTP stays on `sendAisensyOtp` and **does not** read `CRM_NOTIFICATION_DELIVERY_MODE`. Temporary PIN WhatsApp is **configuration-disabled** (`onboarding_pin_disabled` rule). Never store PIN/OTP in events/outbox.

### Reconciliation
`reconcileMissingApplicationCreatedEvents({ lookbackHours, batchSize, dryRun })` — admin/cron only when approved; max lookback 168h; no OTP reconstruction; skips direct_handled/suppressed.

### Follow-up due scanner
`/api/cron/lead-followups-due` — header Bearer auth only; **not** in vercel.json. Emits `lead.followup_due` event only; rule produces internal alert; no customer WA by default.

### Outbox key contract

- Queue-mode automation producer key: `auto:{automationEventId}:purpose:{purpose}:rv:{ruleVersion}`
- Legacy direct/manual key (compat): `{applicationId}:{eventType}:{version}`
- Ordinary retry reuses same outbox row/key.
- Explicit resend requires a new authorized resend event/reason.
- Rule version changes do not auto-replay completed events.

### Alerts severity
info / warning / critical — see `crm_ops_alerts`. Acknowledge/resolve requires `alerts.resolve` (idempotent).

### Daily metrics (IST)
See `DAILY_SUMMARY_METRIC_CONTRACT` in `daily-summary-contract.ts` and `DailySummaryMetrics` in `daily-summary.ts`. Delivery always `disabled` in Phase 5B.

Current shortcuts (documented, local-checkpoint acceptable):
- `applications_completed` currently uses row-state/`applications.updated_at` rather than canonical status-history completion transitions.
- `overdue_follow_ups` currently uses `leads.next_follow_up_at` pointer rather than full follow-up-history transition joins.
- Some snapshot metrics are point-in-time counts, not immutable ledger counts.

Risk:
- Late-arriving updates can shift a count across business dates for metrics using `updated_at`.
- These metrics are operational/admin aggregates and **not financially authoritative** yet.

Planned hardening:
- Move completion/follow-up metrics to canonical history-based queries in a follow-up phase after staging verification.
- This does not trigger customer communication because summary delivery remains disabled and admin-only.

### Rule version binding
Executions bind to `rule_key` + `rule_version` active when first processed (`exec:{eventId}:{ruleKey}:v{version}`). Deploying a new rule version does **not** auto-replay completed events; deliberate admin retry/replay is required.
