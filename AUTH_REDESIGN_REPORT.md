# DigiConnect Dukan — AiSensy WhatsApp OTP + PIN Auth (V6 integration)

Branch: `integrate/aisensy-auth` (based on `origin/main` lightweight V6)  
Date: 2026-07-18

## Architecture

| Actor | Login | Identity |
|---|---|---|
| Customer | WhatsApp number + 6-digit PIN | `{phone}@customer.rnos.internal` |
| Agency Partner | Username + password | `{username}@agency.rnos.internal` |
| Admin | Email + password | Existing admin user |

- PIN → `HMAC_SHA256(AUTH_HMAC_SECRET, localPhone + ":" + pin)` as Supabase Auth password
- OTP generate/verify on server (`auth_otp_requests`); AiSensy delivery only
- Canonical profile field: **`profiles.mobile`** (10-digit local)

## Env

```
WHATSAPP_PROVIDER=aisensy
AISENSY_API_KEY=
AISENSY_OTP_CAMPAIGN_NAME=
AISENSY_API_URL=https://backend.aisensy.com/campaign/t1/api/v2
AUTH_HMAC_SECRET=
```

## Migration

`supabase/migrations/20260718180000_customer_whatsapp_pin_auth.sql`

- Additive columns on `profiles` / `agency_partners`
- Normalizes mobiles; **raises** if duplicates remain (no blind deletes)
- Creates unique indexes only after duplicate check passes
- Diagnostic: `supabase/scripts/diagnose_duplicate_profile_phones.sql`

## Customer routes

- `/customer/signup` → OTP → PIN → `/customer/dashboard`
- `/customer/login` → PIN (no OTP)
- `/customer/forgot-pin` → OTP → new PIN → sessions invalidated

APIs under `/api/auth/customer/*` and `/api/auth/ap/*`.

## Duplicate phone (8287002983)

Run diagnostic script, keep the profile with applications/wallet, null or reassign the loser mobile, then re-apply migration.
