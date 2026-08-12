# Auth OTP + Agency Partner type — ops checklist

## Customer Signup OTP (AiSensy)

OTP is **not** sent via Meta Cloud API directly. Delivery is AiSensy Campaign API only.

**Critical:** `success=true` + `submitted_message_id` means AiSensy **accepted the submit**. It does **not** mean WhatsApp Delivered. Confirm Delivered in Campaign → Sent (or webhook) and that the user received the OTP.

### Required env (Vercel / server)

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_PROVIDER` | Must be `aisensy` (default) |
| `AISENSY_API_KEY` | Campaign API key (alias: `AISENSY_PROJECT_API_KEY`) |
| `AISENSY_API_URL` | Default `https://backend.aisensy.com/campaign/t1/api/v2` |
| `AISENSY_SIGNUP_CAMPAIGN` | Prefer `signup_otp` (Live Authentication campaign) |
| `AISENSY_CAMPAIGN_NAME_SIGNUP` | Legacy Vercel alias for signup campaign |
| `AISENSY_PASSWORD_RESET_CAMPAIGN` | Prefer `password_reset` |
| `AISENSY_CAMPAIGN_NAME_RESET` | Legacy Vercel alias for reset campaign |
| `AISENSY_LOGIN_CAMPAIGN` | Prefer `login_otp` |
| `AISENSY_CAMPAIGN_NAME_LOGIN` | Legacy Vercel alias for login campaign |
| `AISENSY_OTP_CAMPAIGN_NAME` | Legacy shared fallback if purpose-specific vars unset |
| `AISENSY_BASE_URL` | Legacy alias for `AISENSY_API_URL` |
| `AUTH_HMAC_SECRET` | OTP hash secret |
| `SUPABASE_SERVICE_ROLE_KEY` | OTP table writes |

### Optional OTP payload contract (match Test Campaign cURL — do not guess)

Default payload (AiSensy Authentication / Copy-Code docs):

```json
{
  "templateParams": ["<6-digit-otp>"],
  "buttons": [{
    "type": "button",
    "sub_type": "url",
    "index": 0,
    "parameters": [{ "type": "text", "text": "<6-digit-otp>" }]
  }]
}
```

| Variable | When to set |
|----------|-------------|
| `AISENSY_OTP_INCLUDE_EXPIRY_PARAM=true` | Only if Test Campaign cURL has **two** `templateParams` (OTP + expiry minutes). Template-baked expiry text alone does **not** need this. |
| `AISENSY_OTP_EXPIRY_MINUTES` | Second param value when include-expiry is on (default `5`) |
| `AISENSY_OTP_BUTTON_MODE` | `url` (default, Meta/AiSensy Copy Code), `copy_code`, or `none` |
| `AISENSY_DESTINATION_FORMAT` | `digits` (default `91…`) or `e164` (`+91…`) |
| `AISENSY_MESSAGE_STATUS_URL` | Optional status GET URL with `{id}` if AiSensy support provides one |
| `AISENSY_WEBHOOK_SECRET` | Enables `POST /api/webhooks/aisensy` delivery callbacks |

### Log lines to search after a failed signup

```
[otp] generated_and_stored
[aisensy] send_start
[aisensy] send_result
[aisensy] otp_send_accepted | otp_send_failed
[otp] provider_send_accepted | provider_send_failed
```

Safe structured fields now include: `TemplateParamCount`, `TemplateParamsMasked` (e.g. `[OTP_6]` — never full OTP), `Campaign`, masked `Destination`, `submitted_message_id`.

### Admin diagnostics

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/diagnostics/otp-config` | Campaign resolution + payload contract flags |
| `POST /api/admin/diagnostics/otp-test-send` | Real signup OTP send (`{ phone, confirm: true }`) → returns `submittedMessageId` |
| `GET /api/admin/diagnostics/otp-delivery-status?submittedMessageId=…` | Stored OTP metadata + optional status API |
| `POST /api/webhooks/aisensy` | Delivery webhook (requires `AISENSY_WEBHOOK_SECRET`) |

### Admin UI

`/admin/diagnostics/otp` (Communications → OTP Delivery) wraps the endpoints below in a
screen: campaign resolution, payload contract, recent attempts classified as
delivered / WhatsApp-rejected / AiSensy-refused / **submitted but unconfirmed**, plus a
guarded test send. The endpoints alone cannot be used from a phone.

Until `AISENSY_WEBHOOK_SECRET` is set, every attempt classifies as *submitted but
unconfirmed* — the app has no way to know whether WhatsApp delivered anything.

### AiSensy dashboard checks (when API accepts but inbox empty)

0. **Template status in AiSensy → Manage → Template Message.** A `REJECTED` or paused
   template is still accepted by the Campaign API and then discarded by WhatsApp, with
   no error anywhere in our logs. Authentication templates must use Meta's fixed
   wording — custom body copy (`Welcome to <brand>, your OTP is {{1}}`) is rejected.
0b. **Wallet balance / plan status.** An exhausted balance also accepts submits and
   silently drops them, and is invisible from the API response.
1. Exact template name linked to campaign `signup_otp`
2. Campaign status **Live**
3. API campaign enabled
4. Template approval **Approved**
5. Template language matches send
6. `templateParams` count/order equals Test Campaign cURL (usually one: OTP → `{{1}}`)
7. OTP present in `templateParams` (we log masked count)
8. Button / Copy-code parameter uses the same OTP (index 0)
9. Destination `91…` or `+91…` as accepted by AiSensy for India
10. WhatsApp account / phone number connection healthy
11. Contact not opted-out / blocklisted
12. Meta delivery errors on the message
13. Template category is **Authentication** (not Marketing)
14. Template quality / pacing limits
15. Conversation / account restrictions

Accepted API response ≠ WhatsApp inbox delivery. Use `submitted_message_id` in Campaign → Sent.

---

## Agency Partner `partner_type` CHECK

Canonical values (app + DB):

- `business_partner`
- `company_partner`
- `field_executive`
- `office_staff`

### Apply on production

```bash
# Prefer linked remote
supabase db push
# or run SQL file in Supabase SQL editor:
# supabase/migrations/20260803120000_partner_types_v2_repair.sql
```

Verify:

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'agency_partners_partner_type_check';

SELECT partner_type, count(*) FROM agency_partners GROUP BY 1 ORDER BY 1;
```

Expected CHECK:

```text
CHECK (partner_type IN ('business_partner','company_partner','field_executive','office_staff'))
```
