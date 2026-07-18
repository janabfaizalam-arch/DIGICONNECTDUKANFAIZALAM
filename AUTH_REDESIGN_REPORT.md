# DigiConnect Dukan — WhatsApp OTP + PIN Auth Redesign

Date: 2026-07-18  
Status: **Implementation complete** — `npx tsc --noEmit` pass, `npx next build` pass

---

## 1. Updated authentication architecture

| Actor | Public login | Internal Supabase identity | Session |
|---|---|---|---|
| Customer | WhatsApp number + 6-digit PIN | `{10digit}@customer.rnos.internal` | Supabase SSR cookies via server APIs |
| Agency Partner | Username + password | `{username}@agency.rnos.internal` | Same SSR cookies |
| Admin | Email/password (existing) | Real admin email | Same SSR cookies |

**Customer PIN:** never stored. Server derives  
`HMAC_SHA256(AUTH_HMAC_SECRET, localPhone + ":" + pin)`  
and uses it as the Supabase Auth password.

**OTP delivery:** AiSensy Campaign API only (`WHATSAPP_PROVIDER=aisensy`).  
OTP generate / hash / verify / rate-limit stay on our server (`auth_otp_requests`). AiSensy is never the verification source of truth.

**Browser never calls** Supabase Auth for customer signup/login/PIN reset — only Next.js API routes + service role.

---

## 2. Database migration

`supabase/migrations/20260718180000_customer_whatsapp_pin_auth.sql`

- `profiles`: phone, address, pincode, district, state, phone_verified, account_status, failed_login_attempts, locked_until, last_login_at, username, must_change_password, partner_code
- Unique indexes on phone / username
- `auth_otp_requests` + RLS deny-all (service role only)
- `auth_security_events`
- AP fields on `agency_partners` where applicable
- `cleanup_expired_auth_otps()`

Safe / additive — no CRM `customers` drop.

Apply: `pnpm supabase db reset` (local) or migrate up on staging/prod.

---

## 3–6. Customer UI pages

| Page | Path |
|---|---|
| Signup (details → OTP → PIN) | `/customer/signup` |
| Login (phone + PIN) | `/customer/login` |
| Forgot PIN | `/customer/forgot-pin` |

Components: `customer-signup-flow`, `customer-pin-login-form`, `customer-forgot-pin-flow`, `otp-input`.

---

## 7–8. Agent + Admin

- AP login: `/ap/login` → `POST /api/auth/ap/login` → `/ap/dashboard` (or `/ap/change-password` if forced)
- Admin login: `/admin/login`
- Admin create AP: `/admin/agency-partners/new` → `POST /api/admin/agency-partners/create` (username + temp password)
- Customer security on detail page: block/unblock, PIN-reset OTP, logout all sessions

---

## 9. Middleware

`src/middleware.ts`

- Role gates: customer ↔ `/customer/*`, AP ↔ `/ap/*`, admin ↔ `/admin/*`
- Suspended/blocked → sign out + login redirect
- Legacy `/login`, `/signup`, `/admin-login`, `/dashboard` redirects

---

## 10. RLS

- `auth_otp_requests` / `auth_security_events`: deny all to authenticated clients (service role only)
- Existing profiles/customers RLS unchanged for CRM flows

---

## 11. Environment variables (see `.env.example`)

```
AUTH_HMAC_SECRET=                 # min 32 chars
WHATSAPP_PROVIDER=aisensy
AISENSY_API_KEY=
AISENSY_OTP_CAMPAIGN_NAME=        # Authentication-category campaign (Live)
AISENSY_API_URL=https://backend.aisensy.com/campaign/t1/api/v2
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=
```

### WhatsApp / AiSensy notes

- Destination format: `91XXXXXXXXXX` (no `+`, spaces, or hyphens)
- Campaign name is **not** hardcoded — must come from `AISENSY_OTP_CAMPAIGN_NAME`
- Implementation: `src/lib/whatsapp/aisensy.ts`
- Used by: signup OTP, forgot PIN, admin PIN reset (`createAndSendOtp` → `sendCustomerWhatsappOtp`)
- Meta Cloud env vars removed (not used by other notification flows)
- Unit tests: `src/lib/whatsapp/aisensy.test.ts` (`pnpm test`)

---

## 12. Removed / retired endpoints (HTTP 410)

| Retired | Replacement |
|---|---|
| `POST /api/auth/signup` | `/api/auth/customer/*` + `/customer/signup` |
| `POST /api/auth/oauth/customer` | removed for customers |
| `POST /api/auth/send-whatsapp-otp` | `/api/auth/customer/send-signup-otp` |
| `POST /api/auth/verify-whatsapp-otp` | `/api/auth/customer/verify-signup-otp` |
| `POST /api/auth/forgot-password` | `/customer/forgot-pin` |
| `POST /api/auth/reset-password` | forgot-pin reset |
| `POST /api/auth/resend-verification` | N/A |
| `POST /api/customer/auth/*` (legacy) | `/api/auth/customer/*` |

Pages: `/login` → `/customer/login`, `/signup` → `/customer/signup`.

Legacy UI still on disk (unused for entry): `unified-login.tsx`, `whatsapp-auth-flow.tsx`, `customer-auth.tsx`, Google icon — safe to delete after QA.

---

## 13. Modified / added files (high level)

**Added**

- `supabase/migrations/20260718180000_customer_whatsapp_pin_auth.sql`
- `src/lib/auth/{phone,pin,otp-store,whatsapp-otp,session-cookies,security-log,request-meta}.ts`
- `src/app/api/auth/customer/**`
- `src/app/api/auth/ap/**`
- `src/app/api/admin/agency-partners/{create,reset-password}`
- `src/app/api/admin/customers/{send-pin-reset,logout-sessions,update-status}`
- `src/app/customer/{login,signup,forgot-pin}`
- `src/app/admin/login`, `src/app/ap/change-password`
- `src/components/auth/{otp-input,customer-*,ap-login-form,admin-login-form}`
- `src/components/admin/admin-customer-auth-actions.tsx`
- `AUTH_REDESIGN_REPORT.md`

**Modified**

- `src/middleware.ts`
- `.env.example`
- `src/components/admin/create-ap-form.tsx` (username + create API)
- `src/app/admin/customers/[id]/page.tsx` (auth security panel)
- Legacy auth API routes → 410 stubs
- `src/app/login/page.tsx`, `src/app/signup/page.tsx` → redirects

---

## 14. Testing checklist

- [ ] Signup: new number → WhatsApp OTP → PIN → auto login → `/customer/dashboard`
- [ ] Duplicate mobile: “Is WhatsApp number se account pehle se registered hai…”
- [ ] Login with PIN only (no OTP)
- [ ] 5 wrong PINs → 15 min lock; success resets counter
- [ ] Forgot PIN: generic OTP message; reset; sessions invalidated; redirect login
- [ ] Weak PINs blocked (123456, 000000, last 6 of mobile, …)
- [ ] AP username login; inactive/suspended blocked; first login password change
- [ ] Admin: create AP; block/unblock customer; send PIN reset; logout sessions
- [ ] Wrong role redirected to own dashboard
- [ ] Dashboard / applications / payments / wallet still work after login

---

## 15. Security checklist

- [x] PIN not plaintext / not in logs / not localStorage
- [x] OTP hashed; prior OTP invalidated; post-verify invalidate
- [x] OTP rate limits (5/phone/hr, 10/IP/hr, 60s cooldown, 5 attempts, 5 min TTL)
- [x] Service role server-only
- [x] Zod on auth APIs
- [x] Audit events table
- [x] Internal emails never shown in customer UI
- [x] Account lockout + global sign-out on PIN reset / block
- [x] Middleware + server role checks (not client-only)

---

## 16. Existing customer migration strategy

1. Deploy migration (additive).
2. `profiles.phone` backfilled from `mobile` when present.
3. Customers who still have email/password Auth passwords:
   - One-time **Forgot PIN** with registered WhatsApp → set new 6-digit PIN (updates Auth password to HMAC).
4. Customers without phone: admin captures WhatsApp, then trigger send-pin-reset.
5. Do not mass-email `@customer.rnos.internal`.
6. CRM `customers` rows preserved; new signups link `user_id` by mobile.

---

## 17. Build / lint / TypeScript

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npx next build` | Pass |
| Auth-focused lint | Clean (unrelated admin warnings may remain) |

---

## 18. Production readiness report

**Ready when:**

1. `AUTH_HMAC_SECRET` set (≥32 chars) in production secrets.
2. AiSensy: `AISENSY_API_KEY` + Live Authentication campaign in `AISENSY_OTP_CAMPAIGN_NAME`.
3. Migration applied on staging → smoke real WhatsApp → production.
4. Admin creates APs only via panel (no self-signup).
5. Manual QA of checklist §14 completed.

**Non-goals / follow-up (optional cleanup after QA):**

- Delete unused `unified-login`, Google OAuth helpers, MSG91 leftovers, `auth-v2` if unused.
- Schedule `cleanup_expired_auth_otps()` via cron / pg_cron.

**Regression risk:** Low for dashboards — session remains Supabase SSR; only login entrypoints and customer credential model changed.
