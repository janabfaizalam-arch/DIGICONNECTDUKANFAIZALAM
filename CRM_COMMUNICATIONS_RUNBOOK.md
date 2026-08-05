# DigiConnect Dukan — CRM Communications Runbook (Phase 5A)

Last updated: 2026-08-05  
Status: **Phase 5A implementation complete locally; staging database, CI, provider and scheduler verification pending.**  
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

## Direct-send paths (honest inventory)

### Still synchronously await provider (compatible Checkpoint A)

| Call site | Notes |
|-----------|-------|
| `sendApplicationWhatsApp` | Upsert outbox then adapter send (sync) |
| `completeAndSendFinalDocumentWhatsApp` | Signed URL in memory → above |
| `triggerWhatsAppNotification` | → `sendApplicationWhatsApp` |
| Walk-in / lead-convert post-commit | → `sendApplicationWhatsApp` (outside CRM tx) |
| Admin application WhatsApp / status routes | → `sendApplicationWhatsApp` |

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

**Phase 5B task:** migrate suitable non-OTP transactional notifications fully to enqueue + cron processing (remove sync await where safe).

Not all CRM messaging uses enqueue-only yet — application notify remains a **hybrid** path (outbox row + sync adapter send).

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

## Retention

Delivery events + ops audit ≥ 90 days preferred. No secrets/PII dumps in payloads.
