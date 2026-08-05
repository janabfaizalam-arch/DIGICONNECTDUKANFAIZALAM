# DigiConnect Dukan — CRM Automation Map

Last updated: 2026-08-05

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
       · AiSensy campaign send when credentials/template present
       · else status remains queued / configuration_required
```

## Rules
- AiSensy is **never** called inside the core DB transaction / RPC.
- WhatsApp failure does **not** roll back customer/application.
- Retries use `forceRetry` + `attempt_count` with a hard cap (`MAX_WHATSAPP_ATTEMPTS = 5`).
- Manual resend: `POST /api/admin/crm/walk-in-application/resend-whatsapp` (capability `messaging.resend`).
- No secrets stored in `whatsapp_messages.payload` (URLs/provider blobs redacted in adapter).
- Transactional confirmation (`application_submitted`) is separate from promotional campaigns.
- Consent/preferences: reuse existing AiSensy adapter conventions and env campaign names.

## Env conventions (reuse, do not rename)
- AiSensy credentials already used by `src/lib/whatsapp/aisensy.ts`
- Campaign: `AISENSY_APPLICATION_SUBMITTED_CAMPAIGN` (fallback `AISENSY_APPLICATION_CAMPAIGN`)

## Sheets sync
- `scheduleCrmSync(applicationId, "application_created")` after successful create
- Existing enqueue/process pipeline unchanged

## Out of scope for Phase 3
- Full welcome PIN WhatsApp template (Phase 5)
- Promotional broadcasts
- Infinite retry workers
