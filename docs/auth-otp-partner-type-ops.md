# Auth OTP + Agency Partner type — ops checklist

## Customer Signup OTP (AiSensy)

OTP is **not** sent via Meta Cloud API directly. Delivery is AiSensy Campaign API only.

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

### Log lines to search after a failed signup

```
[otp] generated_and_stored
[aisensy] send_start
[aisensy] send_result
[aisensy] otp_send_failed | otp_send_accepted
[otp] provider_send_failed | provider_send_accepted
```

Provider rejection logs include **redacted** AiSensy response body + HTTP status + request id.
Never expect the OTP digits in logs.

### AiSensy dashboard checks

1. Campaign name matches env (`signup_otp` or `AISENSY_SIGNUP_CAMPAIGN`).
2. Campaign is **Live**.
3. Template is Authentication / OTP category with `{{1}}` = OTP.
4. If template is copy-code / URL-button, button param must accept the OTP string we send.

Accepted API response ≠ WhatsApp inbox delivery. Confirm delivery in AiSensy / Meta logs using `provider_request_id` from `auth_otp_requests.metadata`.

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
