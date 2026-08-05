# DigiConnect Dukan — CRM Automation Map

Last updated: 2026-08-05 (Phase 5A audit + outbox)

## Walk-in application notification path (Phase 3)

```
Admin walk-in UI
  → POST /api/admin/crm/walk-in-application
  → DB: create_walk_in_application_core (or TS fallback)
       · application
       · status_logs / application_status_logs
       · application_assignment_history
       · crm_idempotency_keys
  → (outside tx) scheduleCrmSync(application_created)
  → (outside tx) sendApplicationWhatsApp(application_submitted)
       · upserts whatsapp_messages with idempotency_key
         `${applicationId}:application_submitted:${version}`
       · AiSensy via provider adapter when credentials/template present
       · else status configuration_required (API may report queued: true)
```

## Rules
- AiSensy is **never** called inside the core DB transaction / RPC.
- WhatsApp failure does **not** roll back customer/application.
- Retries use `forceRetry` + `attempt_count` with a hard cap (`MAX_WHATSAPP_ATTEMPTS = 5`).
- Manual resend: `POST /api/admin/crm/walk-in-application/resend-whatsapp` (capability `messaging.resend`).
- No secrets stored in `whatsapp_messages.payload` (URLs/provider blobs redacted in adapter).
- Transactional confirmation (`application_submitted`) is separate from promotional campaigns.
- Consent/preferences: `customer_communication_preferences` (promotional default off).

## Env conventions (reuse, do not rename)
- AiSensy credentials already used by `src/lib/whatsapp/aisensy.ts`
- Campaign: `AISENSY_APPLICATION_SUBMITTED_CAMPAIGN` (fallback `AISENSY_APPLICATION_CAMPAIGN`)

## Sheets sync
- `scheduleCrmSync(applicationId, "application_created")` after successful create
- Existing enqueue/process pipeline unchanged

## Lead ingest (Phase 4)

```
Website form / AP create / manual / WhatsApp-ready / Sheets-ready
  → lead-inbound-adapters.ts → ingestLead()
  → lead_ingestion_keys (idempotent, partner-scoped for AP)
  → public.leads insert (canonical)
  → lead_stage_history + lead_activities (+ assignment history if owned)
```

## Lead conversion (Phase 4)

```
Admin/AP lead workspace
  → POST /api/admin/crm/leads/canonical/[id]/convert
  → authZ (leads.convert) + partner scope
  → convert_lead_to_application_core (atomic)
       · customer link/create
       · application + status/assignment history
       · lead → won/converted + timeline
       · convert idempotency
  → (outside tx) scheduleCrmSync
  → (outside tx) sendApplicationWhatsApp
```

Rules:
- No Sheets→leads write path (prevents sync loops). DB authoritative for leads.
- No auto-merge of duplicate mobiles.
- Explicit customer link when match exists.
- Pipeline UI reads canonical leads via adapter; `crm_leads` is fallback only.
- Demo seed leads removed.
- WhatsApp/Sheets inbound adapters are ready but **not activated**.

---

## Phase 5A — Communication audit (first audit)

### Current message entry points

| Entry | Path | Provider call? |
|-------|------|----------------|
| Application notify | `sendApplicationWhatsApp` → adapter → `sendAisensyCampaign` | Yes (outside CRM tx) |
| Final document | `completeAndSendFinalDocumentWhatsApp` | Yes (signed URL in memory only) |
| WhatsApp automation helper | `triggerWhatsAppNotification` | Yes via application notify |
| Walk-in / lead convert | post-commit notify | Yes |
| Admin application WhatsApp API | `/api/admin/applications/[id]/whatsapp` | Yes |
| OTP / auth | `sendAisensyOtp` / `sendCustomerWhatsappOtp` | Yes (not outbox; OTP tables) |
| Canonical enqueue | `enqueueCommunication` | **No** (insert only) |
| Outbox processor | `processCommunicationOutbox` + `/api/cron/comms-outbox` | Yes |
| Legacy notification queue | `/api/cron/process-notifications` | Mock only — **not** production WA |
| Lead WA / Sheets inbound | adapters | **Inactive** |

### Current provider calls
- Single Campaign HTTP client: `src/lib/whatsapp/aisensy.ts`
- Hardened wrapper: `src/lib/communications/provider-adapter.ts`
- OTP path unchanged (separate from application outbox)

### Duplicate-send risks
- Mitigated by unique `idempotency_key` on `whatsapp_messages`
- Application keys: `${applicationId}:${eventType}:${version}`
- Enqueue keys: `purpose:…event parts` (or explicit override)
- In-memory OTP dedupe still exists for OTP; application path sets `dedupe: false`
- Risk if callers invent new `version` / `newEventId` without authorization — gated by admin capabilities for explicit resend

### Blocking provider calls
- `sendApplicationWhatsApp` still awaits provider (sync contract for existing callers) but **after** CRM commit
- Processor / cron path is non-blocking relative to CRM writes
- Provider failures never roll back walk-in/convert RPCs

### Missing delivery tracking (pre-5A) → addressed
- Webhook previously updated OTP metadata only
- Now also correlates `whatsapp_messages` by `provider_message_id` + `communication_delivery_events`

### Missing consent checks (pre-5A) → partial
- Promotional enqueue checks `customer_communication_preferences`
- Transactional application path classified `transactional_ops`
- Unknown promotional consent = not opted in
- Preference UI / customer self-serve deferred (Phase 5B+)

### Missing webhook validation (pre-5A) → hardened
- Timing-safe shared secret; rate limit; size bound; monotonic status; unknown-event ack
- **Limitation:** no cryptographic signature from provider in-repo — shared secret only

### Missing retry controls (pre-5A) → addressed
- `retryable` status, `next_attempt_at`, `max_attempts`, backoff, lease recovery, ops Retry/Cancel

### Conflicting message paths
- `notification_queue` mock cron vs canonical `whatsapp_messages` — keep mock inactive; do not dual-write
- OTP remains on AiSensy direct + `auth_otp_requests` (intentional)
- wa.me deep links in admin UI are browser chat, not AiSensy

### Production-compatible behavior to preserve
1. Idempotency key format for application events
2. Dedup on sent/delivered/read
3. Queued / configuration_required when AiSensy missing (not “sent”)
4. Signed final-document URL only in request memory
5. Payload URL redaction
6. Non-rollback of CRM on WA failure
7. Admin-only RLS on message logs
8. Campaign names from server env mapping

### Env var names (communication) — no values

| Name | Purpose | Client/Server | Safe disabled state |
|------|---------|---------------|---------------------|
| `AISENSY_API_KEY` | API auth | Server | configuration_required |
| `AISENSY_PROJECT_API_KEY` | Alias | Server | same |
| `AISENSY_API_URL` (+ aliases) | Endpoint | Server | fail/config |
| `AISENSY_*_CAMPAIGN` | Template map | Server | no send / failed mapping |
| `AISENSY_WEBHOOK_SECRET` | Webhook auth | Server | webhook 503 |
| `AISENSY_MESSAGE_STATUS_URL` | Optional status | Server | diagnostics skip |
| `COMMS_CRON_SECRET` | Outbox cron | Server | cron 503 |
| `CRON_SECRET` | Fallback cron | Server | cron 503 |
| `WHATSAPP_PROVIDER` | Provider select | Server | must be aisensy |
| `NEXT_PUBLIC_ENABLE_WHATSAPP_AUTH` | UI gate | Client | hides WA auth UI |

See `CRM_COMMUNICATIONS_RUNBOOK.md` for operations.

### Phase 5A architecture (Checkpoint A)

```
Event / caller
  → enqueueCommunication OR sendApplicationWhatsApp (legacy sync hybrid)
  → whatsapp_messages (canonical outbox)
  → processCommunicationOutbox / adapter (AiSensy)
  → webhook updates delivery + OTP delivery metadata only
  → admin /admin/communications ops UI
```

**State machine:** `OUTBOX_TRANSITIONS` / `isValidOutboxTransition` / `canAdvanceOutboxStatus` in `comms-core.ts` (single source for app + tests).

**Retry ownership:** outbox processor only; HTTP client = single attempt + timeout (no nested retry loop).

### Direct-send honesty
Checkpoint A **preserves** sync `sendApplicationWhatsApp` for caller compatibility (still writes outbox + uses adapter). OTP remains direct. Phase 5B: migrate non-OTP transactional paths to enqueue+processor fully.

### Initial automations (foundations — Checkpoint B deferred)

| Automation | State |
|------------|-------|
| Application created confirmation | Active via existing notify path (sync hybrid) |
| Status / document / payment messages | Active via existing event types (sync hybrid) |
| Onboarding / temporary PIN | **Deferred / configuration-disabled** |
| Staff assignment notify | Deferred |
| Follow-up due | Deferred |
| Failed-message admin alert | Deferred |
| Feedback request | Deferred (promotional + consent) |
| Daily operational summary | Deferred |
| Full enqueue-only for non-OTP WA | **Phase 5B task** |

---

## Phase 5B (not started until Checkpoint A committed + approved)
- Canonical automation events + rules
- Migrate suitable non-OTP transactional notifications to enqueue processing
- Daily summary foundation (delivery disabled)
- Broader staff alerts / work queue
