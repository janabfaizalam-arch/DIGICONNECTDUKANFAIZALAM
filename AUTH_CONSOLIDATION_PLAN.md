# Customer Authentication Consolidation Plan

Date: 2026-07-18  
Status: **Pass 4 executed** — Supabase Auth is the live canonical customer stack. Parallel JWT UI/API surfaces are redirected or return 410.

---

## 1. Canonical architecture (after Pass 4)

| Item | Canonical value |
|---|---|
| Identity provider | **Supabase Auth** |
| Login route | `/login/customer` (aliases: `/customer-login` → same; `/login` unified tab) |
| Signup route | `/signup` (+ OAuth / WhatsApp OTP via `/api/auth/*` when enabled) |
| Session format | Supabase SSR cookies (`sb-*-auth-token` chunks) |
| Refresh flow | Supabase session refresh via `@supabase/ssr` in middleware + server clients |
| Dashboard namespace | `/customer/*` (home: `/customer/dashboard`) |
| Password reset | `/forgot-password`, `/reset-password`, `/api/auth/*` |
| Middleware auth | Supabase `getUser()` only — **no jose / JWT v2 on Edge** |

WhatsApp OTP (optional UX) continues through `/api/auth/send-whatsapp-otp` and `/api/auth/verify-whatsapp-otp` and must establish **Supabase** sessions — not parallel JWT cookies.

---

## 2. Retired stacks (Pass 4)

### Stack B — Customer JWT v1
- UI branch removed from `/login/customer` (no `CustomerAuthUI` gate).
- APIs under `/api/customer/auth/*` → **410 Gone** (`CUSTOMER_AUTH_V1_GONE`).
- Library code under `src/lib/auth/{jwt,session,cookies}.ts` may remain on disk but is not wired to live login routes.

### Stack C — Customer JWT v2
- Pages under `(auth-v2)` deleted.
- Middleware redirects `/customer-v2/*` → `/customer/dashboard`, `/customer-auth-v2/*` → `/login/customer`.
- APIs under `/api/customer-auth/*` → **410 Gone** (`CUSTOMER_AUTH_V2_GONE`).
- Edge helper `src/lib/auth-v2/jwt-edge.ts` kept for documentation / future Edge use; middleware does not import it.
- DB tables (`customer_sessions`, `customer_devices`, etc.) **retained** for history; no drop migration in Pass 4.

### Existing sessions
- Users who only ever used Supabase Auth: unaffected.
- Users holding `v2_customer_*` or `customer_*` JWT cookies: those APIs no longer issue/refresh tokens; they must sign in at `/login/customer`. Cookies expire naturally.

---

## 3. Partner / admin (related)

- Agency Partner canonical: `/ap/*`, `/ap/login`, `/admin/agency-partners`.
- Legacy `/agent/*` and `/login/agent` redirect to AP.
- `/api/auth/agent-login` retained as a thin credential helper that returns `destination: /ap/dashboard` (not a second partner model).

---

## 4. Required environment

| Variable | Role |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin |
| `JWT_SECRET` | Still required if any leftover JWT library code loads; not used for middleware customer gate |
| `NEXT_PUBLIC_ENABLE_WHATSAPP_AUTH` | May still toggle WhatsApp UX inside unified login; must not revive JWT v1 |

---

## 5. Tests (Pass 4 smoke covers anonymous path)

- [x] Anonymous `/login/customer` 200
- [x] `/customer-auth-v2/login` and `/customer-v2/dashboard` redirect
- [x] `/api/customer-auth/login` and `/api/customer/auth/login` return 410
- [ ] Authenticated customer login → `/customer/dashboard` (needs credentials)
- [ ] OAuth + WhatsApp OTP → Supabase session (needs providers configured)
- [ ] Password reset end-to-end

---

## 6. Rollback

1. Restore deleted `(auth-v2)` / JWT API trees from git.
2. Revert middleware customer-v2 redirects and reintroduce Edge JWT verification via `jwt-edge.ts` (not full `jose`) if Edge JWT is required.
3. Re-enable `/login/customer` JWT UI branch only behind an explicit feature flag after security review.

Rollback does **not** require dropping or recreating database tables.
