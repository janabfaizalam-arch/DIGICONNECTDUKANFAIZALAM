# DigiConnect Dukan — CRM Automation Map

Last updated: 2026-08-05 (Phase 5A audit + outbox)

## Walk-in application notification path (Phase 5B queue-authoritative)

```
Admin walk-in UI
  → POST /api/admin/crm/walk-in-application
  → DB: create_walk_in_application_core (or TS fallback)
       · application
       · status_logs / application_status_logs
       · application_assignment_history
       · crm_idempotency_keys
  → (outside tx) scheduleCrmSync(application_created)
  → (outside tx) dispatchApplicationNotification(application_submitted)
       · queue mode: emit automation event only
       · rule execution enqueues canonical outbox row
       · outbox processor sends
       · direct mode: explicit sync send + direct_handled event
       · disabled mode: suppressed/configuration_required audit (non-sendable)
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

## Lead conversion (Phase 5B queue-authoritative)

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
  → (outside tx) dispatchApplicationNotification (automationEventType=lead.converted)
       · queue mode: emit event only; rule enqueues outbox
       · direct mode: send once + direct_handled
       · disabled mode: non-sendable audit only
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
| Legacy notification queue | _removed_ | The mock processor was unauthenticated and wrote simulated outcomes into the real `notification_queue`. Deleted — use `/api/cron/comms-outbox` (secret-guarded). |
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

### Direct-send honesty (updated Phase 5B — FAIL-CLOSED)
`sendApplicationWhatsApp` / `dispatchApplicationNotification` respect `CRM_NOTIFICATION_DELIVERY_MODE`:
- **unset / blank / unknown → `disabled`** (never live-send by default)
- `queue` → enqueue only (no AiSensy in request); outbox processor sends
- `direct` → sync adapter send; event marked `completed/direct_handled` (must be explicit)
- `disabled` → configuration_required / suppressed audit only; not claimable
OTP remains on `sendAisensyOtp` and **does not** use this env var.

---

## Phase 5B — Event-driven automation (local)

**Status wording:** Phase 5B implementation complete locally; staging database, CI, scheduler, provider and browser verification pending.

### Delivery mode rollout (fail-closed)

| Mode | Behavior | Double-send |
|------|----------|-------------|
| `queue` | Enqueue / emit+rules enqueue; processor sends | Processor skipped unless mode=queue |
| `direct` | Sync adapter only; `direct_handled` | Processor does not claim/send; no second enqueue |
| `disabled` (default) | Audit only | No send |

Env: `CRM_NOTIFICATION_DELIVERY_MODE` (server-only). Browser cannot set it.  
**No mode sends both direct and queued.**  
**Missing value = disabled** — code deploy cannot accidentally turn messaging on.

**Deployment order:** (1) deploy code (mode disabled) (2) migrate (3) set secrets (4) verify processor manually (5) set mode=`queue`.

### Producer ownership (single queue-mode communication producer)
Queue mode architecture is now authoritative as:

`business operation → automation event → rule execution → canonical outbox → outbox processor send`

No migrated queue-mode route should independently enqueue customer communication.

| Business event | Event producer | Communication producer | Outbox idempotency key | Direct-mode owner | Reconciliation owner |
|---|---|---|---|---|---|
| Walk-in application created | `dispatchApplicationNotification` (event `application.created`) | Automation rule `application_created_customer_wa` | `auto:{automationEventId}:purpose:application_submitted:rv:1` | `dispatchApplicationNotification` + `sendApplicationWhatsApp` (`direct_handled`) | `reconcileMissingApplicationCreatedEvents` (event only) |
| Lead converted/application created | `dispatchApplicationNotification` (event `lead.converted`) | Automation rule `lead_converted_customer_wa` | `auto:{automationEventId}:purpose:application_submitted:rv:1` | `dispatchApplicationNotification` + `sendApplicationWhatsApp` (`direct_handled`) | Source event reconciliation (event only) |
| Admin-created application | `triggerWhatsAppNotification` → `dispatchApplicationNotification` (`application.created`) | Automation rule `application_created_customer_wa` | `auto:{automationEventId}:purpose:application_submitted:rv:1` | `dispatchApplicationNotification` direct branch | `reconcileMissingApplicationCreatedEvents` |
| Application assigned | `recordApplicationAssignmentEvent` (source `application_assignment_history.id`) | `application_assigned_staff_alert` rule (internal alert/action only) | n/a (no customer outbox in current rule) | same producer marks non-queue outcomes | `reconcileApplicationAssignmentEvents` |
| Application status changed | `emitApplicationStatusChangedFromHistory` (source `application_status_logs.id`) | `application_status_customer_wa` rule (customer-visible only) | `auto:{automationEventId}:purpose:application_status:rv:1` | `emitApplicationStatusChangedFromHistory` direct branch | `reconcileApplicationStatusEvents` |
| Document required | status-history producer emits mapped automation event | `application_document_required_wa` rule | `auto:{automationEventId}:purpose:document_required:rv:1` | status producer direct branch | status-event reconciliation (event only) |
| Payment due | canonical mutation emits `application.payment_due` | `application_payment_due_wa` rule | `auto:{automationEventId}:purpose:payment_due:rv:1` | dispatch/status producer direct branch | event reconciliation (event only) |
| Application completed | status/history producer emits `application.completed` | `application_completed_wa` rule | `auto:{automationEventId}:purpose:application_completed:rv:1` | status/direct helper | status-event reconciliation |
| Follow-up due | `scanLeadFollowupsDue` (source `lead_follow_ups.id + scheduled_at`) | `lead_followup_due_internal` rule (internal alert only) | n/a (internal alert path) | n/a | same scanner (event only) |
| Communication permanently failed | outbox terminal transition emits `communication.failed` | `communication_failed_admin_alert` rule | n/a (already terminal outbox row) | n/a | outbox event idempotency (`outbox:{id}:{terminal}`) |

**Temporary compatibility exceptions (explicit):**
- `/api/admin/applications/[id]/whatsapp` (manual admin send/resend)
- `completeAndSendFinalDocumentWhatsApp` (final document send helper)

These may use `sendApplicationWhatsApp` directly for manual workflows. They are not queue-mode business-event producers and are not paired with duplicate automation enqueue rules for the same business event.

### Partner assignment path disposition
- Current canonical application assignment-history writers are:
  - `src/app/api/admin/applications/[id]/route.ts`
  - `src/lib/crm/walk-in-application.ts`
- No separate AP portal application reassignment writer exists in the current codebase.
- Therefore AP-specific assignment producer wiring is **not applicable** at this checkpoint (not deferred).
- Reconciliation remains recovery-only and not the primary event path.

### Delivery guarantee (honest)
At-least-once event discovery + idempotent action. Event emit failure after business commit is observable and recoverable via reconciliation without rolling back the business row.
### Notification call-site matrix (Phase 5B)

| Call site | Trigger | Sync/async | CRM committed? | Recipient | Class | Idempotency | Disposition | Dup risk |
|-----------|---------|------------|----------------|-----------|-------|-------------|-------------|----------|
| `sendApplicationWhatsApp` | manual/compat app WA | mode-dependent | caller post-commit | customer | transactional | `buildLegacyApplicationOutboxKey` | **compat_only** | medium if misused on migrated routes |
| `dispatchApplicationNotification` | migrated business events | queue: emit only; rules enqueue | yes | customer | transactional | event idempotency + rule outbox key | **authoritative_queue_event_producer** | low |
| `triggerWhatsAppNotification` | apps/AP/verify/webhook | via dispatch | yes | customer | transactional | via above | migrate_queue | medium vs verify+webhook (key mitigates) |
| walk-in create/resend | walk-in | via dispatch | yes | customer | transactional | status/history + event | migrate_queue | low |
| lead-convert | convert | via dispatch (`lead.converted`) | yes | customer | transactional | source event + rule | migrate_queue | low |
| admin status PATCH | status change | via dispatch | yes | customer | transactional | status event | migrate_queue | high vs AP transition (same key) |
| admin `/whatsapp` + final-doc | manual | `sendApplicationWhatsApp` | n/a | customer | transactional | per event | preserve_compat (mode-aware) | medium on forceRetry |
| `sendAisensyOtp` + auth routes | OTP | sync direct | n/a | customer | auth | otp-store | **preserve_otp** | low |
| `enqueueCommunication` | outbox/rules/ops | enqueue only | n/a | — | purpose | event key | canonical | low |
| `notification_queue` mock | legacy | mock | n/a | — | — | — | config_disabled | none |
| Sheets sync | mirror | async | post-commit | Sheets | n/a | jobs | no WA | none |
| feedback/onboarding PIN | — | — | — | — | promo/sensitive | — | **config_disabled / deferred** | — |

### Event catalogue

Active producers: `application.created`, `lead.converted`, `application.status_changed`, `application.document_*`, `application.payment_*`, `application.completed`, `communication.failed` (from outbox terminal).  
Typed inactive: `customer.onboarding_requested` (no producer; PIN never stored).  
Defined for future: `customer.created`, `lead.created/assigned/followup_due`, `application.assigned`.

### Rule catalogue
Code-defined in `src/lib/automation/rules.ts` — whitelist actions only; enqueue rules require `delivery_mode=queue`. Onboarding + feedback rules **disabled**.

### Alerts
`crm_ops_alerts` — communication failed/config-required, automation failed, missing template, follow-up overdue. No recursive alert-about-alert. No customer re-message from `communication.failed`.

### Daily summary
`crm_daily_summaries` — IST date key; aggregates only; `delivery_status=disabled`. UI: `/admin/automation` summaries tab.

### Reconciliation
`reconcileMissingApplicationCreatedEvents` — lookback/batch bounded; dry-run; does not resend completed outbox; no OTP. Unregistered.

### Cron (inactive)
`/api/cron/automation-events` — same Bearer secret model as comms-outbox; **not** in vercel.json.
