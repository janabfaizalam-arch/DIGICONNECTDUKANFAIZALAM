# DigiConnect Dukan — Audit Report

Date: 2026-07-18
Scope: Full repository discovery and security/architecture audit. Read-only findings plus the fix list applied in this pass (see `CHANGELOG_AUDIT.md`).

---

## 1. Architecture summary

- **Framework**: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, no `tailwind.config.*`).
- **Backend**: Supabase (Postgres + Auth + Storage), ~80 SQL migrations in `supabase/migrations/`, ~148 API route handlers under `src/app/api/`.
- **Payments**: Razorpay (order creation, client checkout, server signature verification, webhook, reconciliation admin).
- **Sidecar**: `print-agent/` — local Node print worker authenticated via `PRINT_AGENT_SECRET_KEY`.
- **Deployment target**: Vercel (`NEXT_PUBLIC_SITE_URL=https://digiconnectdukanfaizalam.vercel.app` in `.env.example`).

### Portals

| Portal | Routes | Auth stack |
|--------|--------|-----------|
| Public site | `/`, `/services/*`, `/blog/*`, `/apply/*`, `/pay/*` | none |
| Customer (legacy, canonical) | `/customer/*`, `/dashboard` | Supabase Auth |
| Customer V2 (experimental) | `/customer-v2/*`, `/customer-auth-v2/*` | Custom JWT cookies (`src/lib/auth-v2/`) |
| Agency Partner | `/ap/*` (legacy `/agent/*` redirects) | Supabase Auth |
| Admin | `/admin/*` | Supabase Auth |

### Roles

Normalized app roles: `admin`, `agency_partner`, `customer` (`src/lib/auth.ts` `normalizeAppRole`).
Legacy aliases still mapped: `super_admin`/`staff`/`team`/`employee`/`processor` → admin; `agent` → agency_partner.
RLS policies in migrations still reference legacy role names (`users.role IN ('super_admin','admin','operator')` etc.) — works but drifts from the app model.

### Auth stacks (three coexist)

1. **Supabase Auth** — admin, AP, legacy customer. Enforced by `src/middleware.ts` + per-route server checks.
2. **Customer JWT v1** — `src/lib/auth/{jwt,session,cookies,pin}.ts` + `/api/customer/auth/*`. Served by `/login/customer` only when `NEXT_PUBLIC_ENABLE_WHATSAPP_AUTH=true` (otherwise the Supabase `UnifiedLoginExperience` renders).
3. **Customer JWT v2** — `src/lib/auth-v2/*` + `/api/customer-auth/*` + `(auth-v2)` route group. Better implementation (issuer/audience/jti, hashed refresh tokens, device sessions, rate limiting).

**Decision required (business)**: pick one customer auth path. V2 is technically superior but not fully rolled out; legacy Supabase customer auth is what production traffic uses. Until decided, all three must remain secure.

### Data access pattern

Most API routes authenticate via Supabase session (or JWT), then use `getSupabaseAdmin()` (service role) for queries, bypassing RLS. RLS exists for direct client access. Consequence: **route-level authorization is the real security boundary** for API calls — every service-role route must check role/ownership itself. Spot checks of `/api/admin/*` routes show consistent `getCurrentUser` + `isAdminRole` checks.

---

## 2. Important routes

- Payment: `/api/create-order`, `/api/verify-payment`, `/api/razorpay/webhook`, `/api/payment-links/*`, `/pay/[code]`, `/pay/application/[id]`
- Wallet/rewards: `/api/wallet`, `/api/wallet/redeem-preview`, `/api/referrals/*`, `/api/coupons/validate`, `/api/cron/expire-rewards`
- Applications: `/api/applications`, `/api/ap/applications/*`, `/api/admin/applications/*`, `/apply/[slug]`
- Auth: `/api/auth/*` (Supabase+WhatsApp OTP), `/api/customer/auth/*` (JWT v1), `/api/customer-auth/*` (JWT v2)
- Admin: ~60 handlers under `/api/admin/*`
- Cron: `/api/cron/expire-rewards`, `/api/cron/cleanup-prints`, `/api/cron/process-notifications` (Bearer `CRON_SECRET`)
- Print: `/api/print/*` (`PRINT_AGENT_SECRET_KEY` for agent endpoints)

## 3. Database entities discovered (from migrations)

profiles, users, customers, customer_profiles, customer_devices/sessions (auth v2), agency_partners (+tiers, conversions), applications, application_documents, payments, payment_links, invoices/offline_invoices, services (+fields, workflows, variants, comparisons, packages — V5), reward_wallets + wallet ledger, referral_codes/clicks/attributions, coupons, insurance_quotations, credit_reports (+api logs), print jobs, homepage CMS tables (slides, notices, offer strip, about images), articles, gallery, admin notifications, crm_leads, saas_tenants/saas_domains, branch_wallets, auth_otps, audit/staff logs.

Business rules protected at DB level (verified in migrations): unique `ap_commissions(application_id)`, unique `partner_conversion_logs(application_id)`, customer identity uniqueness, payment link status check constraints, wallet ledger triggers.

---

## 4. Existing strengths

- Razorpay signature verification is server-side, timing-safe, with ownership checks and wallet-cap re-validation (`/api/verify-payment`).
- Webhook signature verification with timing-safe compare; payment/application updates keyed by Razorpay IDs.
- Wallet redeem caps re-computed server-side (`calculateWalletRedeemBreakdown`); ledger tables + triggers exist.
- Middleware does role-aware routing with safe internal-only redirect targets (blocks `//` open-redirects).
- Security headers present (HSTS, nosniff, frame-ancestors, referrer policy).
- Rate limiting exists (`src/lib/rate-limit.ts`, in-memory) and is applied to payment verification and auth-v2.
- Strict TypeScript; consistent route-handler structure; admin routes consistently authorize.

---

## 5. Findings and priorities

### P0 — fixed in this pass

| # | Finding | Location | Status |
|---|---------|----------|--------|
| P0-1 | `/customer-v2` and `/customer-auth-v2` middleware JWT protection unreachable: paths absent from `protectedRoutes`/`authRoutes`, so the public-page early-return fires first. Pages relied on client-side fetch failures only. | `src/middleware.ts` | Fixed |
| P0-2 | Unauthenticated debug endpoint leaking env variable key names | `src/app/api/debug/test-env/route.ts` | Deleted (no references) |
| P0-3 | Unauthenticated debug endpoint creating applications, uploading storage files, returning signed URLs (marked "DELETE AFTER VERIFICATION") | `src/app/api/debug/doc-test/route.ts` | Deleted (no references) |
| P0-4 | Unauthenticated test endpoint mutating wallets/profiles via service role | `src/app/api/test/verify-phase3/route.ts` | Deleted (no references) |
| P0-5 | Customer JWT v1 falls back to public `NEXT_PUBLIC_SUPABASE_ANON_KEY` as signing secret — anyone can forge customer tokens if `JWT_SECRET` unset | `src/lib/auth/jwt.ts` | Fixed — requires `JWT_SECRET` (same contract as auth-v2) |

### P1 — fixed in this pass

| # | Finding | Location | Status |
|---|---------|----------|--------|
| P1-1 | `check-duplicate`: unauthenticated, unlimited scans of all applications' `form_data` by PAN/Aadhaar with service role; returns application IDs, status, matched values (enumeration/PII probe). Zero callers in repo. | `src/app/api/applications/check-duplicate/route.ts` | Hardened: requires login, rate-limited, response minimized |
| P1-2 | Referral HMAC falls back to hard-coded literal secret — referral attribution (₹100 rewards) forgeable | `src/lib/referrals.ts` | Fixed: env secret required in production; derives from service-role key as fallback; dev-only literal |
| P1-3 | AP seed endpoint rewrites the GST service catalog rows in production | `src/app/api/ap/debug/seed/route.ts` | Gated to non-production |
| P1-4 | `.env.example` missing most referenced variables (JWT_SECRET, CRON_SECRET, PRINT_AGENT_SECRET_KEY, ADMIN_EMAILS, analytics, AiSensy, referral policy/secret) | `.env.example` | Expanded |
| P1-5 | No `robots.ts`; admin/AP/customer/auth pages indexable; no sitemap | `src/app/` | Added `robots.ts` + `sitemap.ts` |

### P1 — requires business decision (documented, not changed)

| # | Finding | Why it matters | Options |
|---|---------|----------------|---------|
| P1-6 | `NEXT_PUBLIC_ADMIN_EMAILS` used in middleware/auth as an admin fallback and exposed to the browser | Leaks admin emails; client-visible authz input | (a) Move to server-only `ADMIN_EMAILS` and stop reading the public var (code already prefers `ADMIN_EMAILS`) then remove the public var from Vercel; (b) stop email-based admin fallback entirely and rely on `role` metadata. Recommended: (a) then (b) after verifying every admin has `role=admin`. Files: `src/middleware.ts`, `src/lib/auth.ts`, `src/components/{site-header,bottom-nav}.tsx` |
| P1-7 | Three parallel customer auth systems | Duplicate logic, inconsistent security posture, confusing UX | Keep Supabase Auth as canonical and remove v1 (`/api/customer/auth/*`, used only by `customer-auth.tsx`); decide fate of v2 experiment. Requires knowing production usage. |
| P1-8 | Dev mock user in `getCurrentUser()` when Supabase env missing | Mis-testing auth locally; no production impact (gated to `NODE_ENV=development`) | Remove once local dev consistently has Supabase configured |

### P2 — recommended next

- CSP is minimal (`frame-ancestors` only). Build a tested CSP allowing Razorpay checkout, GA, Meta Pixel, Supabase.
- `images.remotePatterns` allows any HTTPS host. Restrict to Supabase storage + known CDNs after inventorying admin-managed image URLs.
- In-memory rate limiting resets per serverless instance — move sensitive limits (OTP, login, payment) to a durable store (Postgres/Upstash).
- RLS policies reference legacy roles (`super_admin`, `staff`, `operator`); align with the three-role model in a dedicated migration.
- `/api/recent-applications` serves generated fallback "applications" (fake data) to the public homepage ticker when DB is empty — should be marked demo or removed (Rule 6).
- `/api/customer/vault/ocr` returns a hard-coded masked Aadhaar sample in its POST flow (mock OCR) — mark as demo or complete the integration.
- Duplicate legacy `/agent/*` pages still shipped though middleware redirects them — remove after confirming no deep links.
- `sw.js` service worker + `manifest.json` exist: audit cache strategy for authenticated/payment responses before wider PWA promotion.
- Console logging includes payment IDs/order IDs (acceptable) but review for PII before adding a log drain.

### P3 — improvements

- README is stale (describes the original lead-form site).
- Legacy migrations name-drop repairs ("remove_broken_identity_triggers") — consider a squashed baseline for new environments.
- `task.md` (V5 checklist) is complete; archive it.
- Add unit tests for `calculateWalletRedeemBreakdown`, referral signing, coupon validation; the repo has no test runner today (only `scripts/smoke-test.mjs`).

---

## 6. UX / performance / accessibility / SEO observations

- **Client-component weight**: admin shell, dashboards, and homepage sections are client components with framer-motion; homepage would benefit from moving static sections to Server Components (P2).
- **Fonts**: `next/font` used correctly (Inter + Poppins, limited weights). Good.
- **Images**: `next/image` used in most components; remote host wildcard weakens optimization guarantees (see P2).
- **Viewport**: `maximumScale: 1` prevents pinch-zoom — accessibility violation (WCAG 1.4.4); recommend removing (kept for now; low-risk change to bundle with a design pass).
- **Metadata**: root metadata is complete (OG, Twitter, manifest); per-page metadata exists on major public pages; private areas now excluded via `robots.ts`.
- **Loading/error states**: route-level `loading.tsx`/`error.tsx` coverage is partial; forms generally have inline validation and disabled submit states (wizards verified).
- **Reduced motion**: framer-motion used widely without `useReducedMotion` guards (P2, design pass).

---

## 7. Validation status for this pass

- Shell/terminal execution was unavailable in this environment; `npm run type-check`, `lint`, and `build` could not be executed here. All edits were reviewed via IDE diagnostics (no new TypeScript/ESLint errors reported on changed files).
- **Run before deploying**: `npm run type-check && npm run lint && npm run build`.

## 8. Deployment notes for this pass

1. Ensure `JWT_SECRET` is set in production (it is already mandatory for auth-v2; JWT v1 now requires it too).
2. Set `REFERRAL_SIGNING_SECRET` in production (recommended). Without it, the referral HMAC now derives from the service-role key instead of a public literal; existing referral cookies signed with the old default will re-attribute on next click (30-day cookies, low impact).
3. No database changes in this pass.
4. Deleted routes: `/api/debug/test-env`, `/api/debug/doc-test`, `/api/test/verify-phase3` (no callers). `/api/ap/debug/seed` now returns 404 in production.

---

## 9. Pass 2 (2026-07-18, second pass) — verification results and status updates

**Verification**: all eight Pass-1 fixes were independently re-verified against the working tree and confirmed accurate (details in `CHANGELOG_AUDIT.md` §9). No Pass-1 conclusion required correction.

**Correction to §7/§8 commands**: the package manager is **pnpm** (root `pnpm-lock.yaml`, lockfile v9), not npm. Use `pnpm install --frozen-lockfile && pnpm run type-check && pnpm run lint && pnpm run build`. `node_modules/` is absent in this checkout. Shell execution remains broken in the agent environment — see `TOOLING_BLOCKER.md`.

**Status changes**:

| Finding | Previous status | New status |
|---|---|---|
| P1-6 admin email authz (`NEXT_PUBLIC_ADMIN_EMAILS`) | Business decision | **Fixed** — option (a) implemented; public var no longer read anywhere. Vercel cleanup required (see changelog §11) |
| P1-7 auth consolidation | Business decision | **Planned** — `AUTH_CONSOLIDATION_PLAN.md` created; recommendation: Supabase Auth canonical; no code removed yet |
| P2 durable rate limiting | Recommended | **Implemented** for OTP/payment/duplicate-check endpoints (Postgres-backed, migration `20260718000000`); remaining endpoints still in-memory |
| P2 CSP | Recommended | **Report-only CSP shipped** in `next.config.ts`; promote to enforced after production observation |
| P2 image remotePatterns wildcard | Recommended | **Fixed** — allowlist of evidenced hosts; watch for admin-content hosts after deploy |
| P2 fake homepage ticker data | Recommended | **Fixed** — synthetic fallback removed; feed is real-data-only |
| P2 mock OCR | Recommended | **Fixed** — POST returns 503 in production |
| P2 legacy `/agent/*` pages | Recommended | **Fixed** — 12 dead page files deleted; middleware redirects retained; in-app links now target `/ap/*` |
| P2 service-worker audit | Recommended | **Done** — already conservative; private-path list extended, cache version bumped |
| §6 `maximumScale: 1` | Deferred | **Fixed** — pinch-zoom no longer blocked |

**New finding fixed in Pass 2 (P0-class)**: client-editable `user_metadata.role` was trusted for authorization in middleware/`isAdminUser`/`getCurrentUserRole`, three CSC Olympiad PDF routes, and the `current_app_role()` SQL function backing many RLS policies. Any logged-in user could self-assign an elevated role via `supabase.auth.updateUser`. All app-code paths now trust only server-controlled `app_metadata` + database rows (customer self-claims still honored as lowest privilege); migration `20260718001000_role_resolution_hardening.sql` removes the SQL fallback. See changelog §12.

**Design system (Phase 4) started**: status/motion/focus tokens, `:focus-visible` outline, skip link + `#main-content`, `Badge`/`Alert` components, `Button` destructive/sm variants, `Input` invalid/disabled states. Page redesign (Phase 5) deliberately deferred until the build environment works.

**Validation**: IDE diagnostics clean on all changed files; static call-site review complete. Runtime validation (typecheck/lint/build/smoke) remains pending — do not treat any change as production-validated until the `TOOLING_BLOCKER.md` §4 commands run cleanly.

---

## 10. Pass 4 (2026-07-18) — post-build architecture hardening

Tooling is restored (see updated `TOOLING_BLOCKER.md`). Commands executed successfully: type-check, `eslint .`, production build, smoke. Details in `PASS4_RUNTIME_VALIDATION.md`.

| Area | Outcome |
|---|---|
| Edge JWT warning | **Resolved** — middleware no longer imports `jose`; customer JWT UI redirected to Supabase |
| Legacy agent | **Consolidated** — AP canonical; agents admin/API/pages removed or 410; redirects kept |
| Leads module | **Removed from product** — enquiry API at `/api/enquiry`; CRM UI/API 410; tables retained |
| Customer auth | **Consolidated** — Supabase only; JWT v1/v2 APIs 410; plan marked executed |
| Debug seed | **Always 404** |
| Lint toolchain | **`eslint .`** (not `next lint`) |
| UI redesign | **Not started** (explicit Pass 4 scope) |

**Production readiness**: anonymous smoke + build validated. Authenticated authorization matrix and live payment-security tests are still required before calling the release production-ready.
