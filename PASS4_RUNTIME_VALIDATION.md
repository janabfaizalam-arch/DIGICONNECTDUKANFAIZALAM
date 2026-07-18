# Pass 4 — Runtime Validation Report

Date: 2026-07-18  
Environment: Windows local (`D:\digiconnectdukanfaizalam`), Node v24.18.0, pnpm 11.14.0, Next.js 15.5.20

---

## Exact commands and exit codes

| Command | Exit code | Notes |
|---|---|---|
| `pnpm run type-check` | **0** | After clearing stale `.next/types` from deleted routes |
| `pnpm run lint` (`eslint .`) | **0** | Migrated off deprecated `next lint` |
| `pnpm run build` | **0** | 167 static pages generated (was 207); no Edge `CompressionStream` warning |
| `pnpm run smoke` | **0** | Starts `next start -p 3100`, checks public/protected/legacy/API retirement |

---

## Build warnings observed

- Webpack cache serialization warnings for large strings (performance hint only; not a functional failure).
- **Absent after Pass 4:** `jose` / `CompressionStream` / `DecompressionStream` Edge middleware warnings (middleware no longer imports `jose`).

---

## Route removals / redirects

### Removed page trees
- `src/app/agent/**`
- `src/app/admin/agents/**`
- `src/app/admin/leads/**`
- `src/app/ap/leads/**`
- `src/app/(auth-v2)/**` (`/customer-v2`, `/customer-auth-v2`)
- `src/app/agent-login/**`, `src/app/login/agent/**`
- Active JWT API implementations under `/api/customer-auth/*` and `/api/customer/auth/*`

### Middleware redirects (307)
| From | To |
|---|---|
| `/agent/*`, `/login/agent`, `/agent-login` | `/ap/*` or `/ap/login` |
| `/admin/agents`, `/admin/agents/new`, `/admin/agents/[id]` | `/admin/agency-partners…` |
| `/admin/leads*`, `/ap/leads*` | `/admin` or `/ap/dashboard` |
| `/customer-v2/*` | `/customer/dashboard` |
| `/customer-auth-v2/*` | `/login/customer` |

### API retirement (410 Gone / 404)
| Endpoint | Status |
|---|---|
| `/api/customer-auth/*` | 410 |
| `/api/customer/auth/*` | 410 |
| `/api/agent/*` | 410 |
| `/api/admin/agents`, `/api/admin/agents/*` | 410 |
| `/api/lead` | 410 (moved to `/api/enquiry`) |
| `/api/admin/leads/*`, `/api/admin/crm/leads`, `/api/ap/leads`, `/api/crm/event` | 410 |
| `/api/ap/debug/seed` | **404 always** |
| `/api/auth/agent-access` | 410 |
| `/api/auth/agent-login` | **kept** as thin AP credential helper; destination `/ap/dashboard` |

### Kept (name is legacy, function is canonical)
- `/admin/agent-services` + `/api/admin/agent-services` — AP service catalog (still used by `/ap/services` and checkout).

### Database retained for history (no drop migrations)
- `public.leads` — still written by `/api/enquiry`
- `public.crm_leads` — no longer written by app UI/API; table retained
- Customer JWT v2 tables (`customer_sessions`, `customer_devices`, etc.) — unused by live routes; retained

---

## Auth architecture before / after

| Concern | Before | After |
|---|---|---|
| Canonical customer login | Parallel: Supabase + JWT v1 (flag) + JWT v2 UI | **Supabase Auth only** at `/login/customer` |
| Customer dashboard | `/customer/*` + `/customer-v2/*` | **`/customer/*` only** |
| Session cookies | Supabase + `customer_*` + `v2_customer_*` | **Supabase session cookies** (JWT cookie APIs return 410) |
| Partner portal | `/ap/*` + dead `/agent/*` pages | **`/ap/*`**; `/agent*` redirects |
| Partner admin | `/admin/agency-partners` + `/admin/agents` | **`/admin/agency-partners` only** |
| Edge JWT | Middleware dynamically imported `jose` (`auth-v2/jwt`) | **No JWT verification in middleware**; Edge-safe helper exists at `src/lib/auth-v2/jwt-edge.ts` for any future Edge need; Node signing remains in `jwt.ts` for unused library code |

---

## Edge versus Node runtime boundaries

| Runtime | Allowed | Forbidden / not imported |
|---|---|---|
| **Edge (`src/middleware.ts`)** | `@supabase/ssr`, URL/cookie redirects, role allowlist via env `ADMIN_EMAILS`, DB reads through Supabase JS | `jose` (brings CompressionStream), `argon2`, Node `crypto`, durable rate-limit RPC, JWT v2 session stores |
| **Node (Route Handlers / Server Actions)** | `jose` signing/verify, `argon2`, Razorpay SDK, PDFKit, Postgres rate-limit RPC, service-role admin client | Must not be pulled into middleware |

`src/lib/auth-v2/jwt-edge.ts` documents a Web Crypto–only HS256 verifier if Edge verification is ever required again without bundling `jose`.

---

## Smoke results (anonymous)

Public 200: `/`, `/services`, `/services/gst-registration`, `/apply/gst-registration`, `/login/customer`, `/ap/login`, `/admin-login`, `/unauthorized`  
Protected 307: `/admin`, `/admin/applications`, `/ap/dashboard`, `/customer/dashboard`  
Legacy 307: `/login/agent`, `/agent/dashboard`, `/admin/agents`, `/admin/leads`, `/ap/leads`, `/customer-v2/dashboard`, `/customer-auth-v2/login`  
API: JWT auth 410, `/api/lead` 410, `/api/ap/debug/seed` 404

---

## Validation not fully performed in this pass

These require authenticated sessions, Razorpay keys, and/or applied DB migrations — **not claimed as verified here**:

- Customer / AP / admin happy-path login with real credentials
- Role escalation via `user_metadata` blocked at runtime against a live Supabase project
- Payment create-order / verify-payment / webhook signature and idempotency against Razorpay
- Durable rate-limit enforcement across multiple serverless instances (migration must be applied in Supabase)
- Full WCAG / Lighthouse / multi-device visual review

---

## Production readiness decision

**Not production-ready as a blanket claim.**

Architecture and route consolidation are validated by type-check, lint, production build, and anonymous smoke tests.  
Before production deploy, complete: authenticated role matrix, payment signature tests, apply Pass-2/Pass-4 related Supabase migrations if not already applied, and remove `NEXT_PUBLIC_ADMIN_EMAILS` from Vercel after setting server-only `ADMIN_EMAILS`.
