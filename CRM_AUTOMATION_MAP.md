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

