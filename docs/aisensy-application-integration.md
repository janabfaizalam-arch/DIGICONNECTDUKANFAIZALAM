# AiSensy Application WhatsApp Integration

This guide configures DigiConnect Dukan application notifications on AiSensy.
OTP auth already uses LIVE campaigns (`signup_otp`, `password_reset`, `login_otp`) — do not break those.

## Architecture

- Central sender: `src/lib/whatsapp/aisensy.ts` → `sendAisensyCampaign`
- Alias: `src/lib/whatsapp/aisensy-client.ts`
- Application orchestration + idempotency: `src/lib/whatsapp/application-notify.ts`
- Template contracts: `src/lib/whatsapp/templates.ts`
- Admin API: `POST /api/admin/applications/[id]/whatsapp`
- Automatic triggers: `triggerWhatsAppNotification` → `sendApplicationWhatsApp`

There is **no** AiSensy delivery webhook in this project yet. Statuses are based on send API responses (`queued` / `sent` / `failed` / `configuration_required`). `delivered` / `read` remain unsupported until webhook configuration is added.

## Admin setup steps

1. Create/approve WhatsApp utility templates in Meta / AiSensy for each event below.
2. Create an AiSensy **API Campaign** for each approved template.
3. Set each campaign to **Live**.
4. Copy the exact campaign names (case-sensitive).
5. Add env variables in Vercel (names in `.env.example`, no secrets in git).
6. Redeploy the app.
7. Send a test message from Admin → Application Detail → Communication actions.
8. Verify recipient format is `91XXXXXXXXXX` (10-digit Indian mobile with country code, no `+`).
9. Verify template parameter order matches the matrix below.
10. For final document, verify media/document template accepts `media.url` + `media.filename`.

## Campaign / template matrix

| Event | Env Variable | Parameters (order) | Media |
|------|--------------|--------------------|-------|
| Application submitted | `AISENSY_APPLICATION_SUBMITTED_CAMPAIGN` | customerName, serviceName, applicationNumber, statusDetail | No |
| Payment pending | `AISENSY_PAYMENT_PENDING_CAMPAIGN` | customerName, serviceName, applicationNumber, amountOrNote | No |
| Payment reminder | `AISENSY_PAYMENT_REMINDER_CAMPAIGN` | customerName, serviceName, applicationNumber, amountOrNote | No |
| Payment success | `AISENSY_PAYMENT_SUCCESS_CAMPAIGN` | customerName, serviceName, applicationNumber, amountOrNote | No |
| Documents required | `AISENSY_DOCUMENT_REQUIRED_CAMPAIGN` | customerName, serviceName, applicationNumber, requiredDocuments | No |
| Documents received | `AISENSY_DOCUMENT_RECEIVED_CAMPAIGN` | customerName, serviceName, applicationNumber, note | No |
| Under review | `AISENSY_UNDER_REVIEW_CAMPAIGN` | customerName, serviceName, applicationNumber, statusDetail | No |
| Processing started | `AISENSY_PROCESSING_CAMPAIGN` | customerName, serviceName, applicationNumber, progressMessage | No |
| Progress update | `AISENSY_PROGRESS_UPDATE_CAMPAIGN` | customerName, serviceName, applicationNumber, progressMessage | No |
| Objection | `AISENSY_OBJECTION_CAMPAIGN` | customerName, serviceName, applicationNumber, objectionMessage | No |
| Objection resolved | `AISENSY_OBJECTION_RESOLVED_CAMPAIGN` | customerName, serviceName, applicationNumber, note | No |
| Completed | `AISENSY_APPLICATION_COMPLETED_CAMPAIGN` | customerName, serviceName, applicationNumber, note | No |
| Final document | `AISENSY_FINAL_DOCUMENT_CAMPAIGN` | customerName, serviceName, applicationNumber, note | Yes (signed URL, request memory only) |
| Custom / fallback | `AISENSY_APPLICATION_CAMPAIGN` | customerName, serviceName, applicationNumber, customMessage | No |

If a specific campaign env is empty, the code falls back to `AISENSY_APPLICATION_CAMPAIGN` (default `application_update`).

## Suggested template text (Hinglish / English, utility-focused)

**Application received**  
Namaste {{1}}, aapka {{2}} application ({{3}}) DigiConnect Dukan par receive ho gaya hai. {{4}}

**Payment reminder**  
Namaste {{1}}, {{2}} ({{3}}) ka payment pending hai. {{4}} Please complete payment to continue.

**Payment confirmation**  
Namaste {{1}}, {{2}} ({{3}}) ka payment receive ho gaya. {{4}}

**Documents required**  
Namaste {{1}}, {{2}} ({{3}}) ke liye documents chahiye: {{4}}

**Processing update**  
Namaste {{1}}, {{2}} ({{3}}) update: {{4}}

**Objection**  
Namaste {{1}}, {{2}} ({{3}}) par action needed: {{4}}

**Completion**  
Namaste {{1}}, aapka {{2}} application ({{3}}) complete ho gaya hai. {{4}}

**Final document**  
Namaste {{1}}, {{2}} ({{3}}) ka final document WhatsApp par share kiya gaya hai. {{4}} Link temporary hai.

## API payload contract

```json
{
  "apiKey": "<server-only>",
  "campaignName": "<from env>",
  "destination": "91XXXXXXXXXX",
  "userName": "Customer Name",
  "templateParams": ["name", "service", "appId", "detail"],
  "source": "digiconnect-application:<event>",
  "media": { "url": "<temporary-signed-url>", "filename": "document.pdf" }
}
```

`media` is only attached for `final_document`. Signed URLs are never stored in DB/logs.

## Idempotency

Key: `applicationId:eventType:eventVersion`  
Max attempts: 5  
Successful `sent`/`delivered`/`read` cannot auto-resend; failed/queued/config-required can retry.

If `whatsapp_messages` table is missing: returns `database_upgrade_required` and never claims sent.

## Manual remaining work

1. Create/approve AiSensy campaigns for each event (or use one shared `application_update` campaign).
2. Set Vercel env vars and redeploy.
3. Optionally add AiSensy delivery webhook later for delivered/read.
4. Apply pending Supabase WhatsApp migration in staging/prod when ready (do not apply from this task).
