# Changelog — Audit & Hardening Pass

Date: 2026-07-18
Companion document: `AUDIT_REPORT.md`

---

## 1. Middleware: Customer V2 route protection (P0)

- **Area**: Authentication / middleware
- **Problem**: `/customer-v2/*` (dashboard, profile, devices, referral) and `/customer-auth-v2/*` pages were never protected at the edge. The middleware's public-page fast-path returned before the JWT check because these paths are not in `protectedRoutes`/`authRoutes`.
- **Root cause**: The JWT block was placed after the early return, and the early-return condition didn't account for the V2 paths.
- **Fix**: Compute `isCustomerRoute`/`isCustomerAuthRoute` before the fast-path and include them in its condition. The JWT verification logic itself is unchanged.
- **Files**: `src/middleware.ts`
- **Security impact**: Unauthenticated visitors to `/customer-v2/*` are now redirected to `/customer-auth-v2/login`; logged-in customers visiting the auth pages are redirected to their dashboard.
- **Performance impact**: None for public pages (fast-path preserved).
- **Testing**: Static review; manual verification needed: visit `/customer-v2/dashboard` logged-out (expect redirect to login), log in, revisit (expect page), visit `/customer-auth-v2/login` while logged in (expect redirect to dashboard).

## 2. Removed unauthenticated debug/test endpoints (P0)

- **Area**: API security
- **Problem**:
  - `/api/debug/test-env` — listed environment variable key names to anyone.
  - `/api/debug/doc-test` — unauthenticated; created application rows, uploaded files to the documents bucket, returned signed URLs (self-labelled "TEMPORARY DEBUG ROUTE — DELETE AFTER VERIFICATION").
  - `/api/test/verify-phase3` — unauthenticated; mutated real reward wallets and profiles via the service-role client.
- **Fix**: Deleted all three route files. Verified zero references anywhere in the repo (code, scripts, docs).
- **Files**: `src/app/api/debug/test-env/route.ts`, `src/app/api/debug/doc-test/route.ts`, `src/app/api/test/verify-phase3/route.ts` (deleted)
- **Database impact**: None (removal only; these endpoints could previously write test rows into production tables).
- **Testing**: Confirmed no imports/fetches reference these paths.

## 3. Production gate for AP seed endpoint (P1)

- **Area**: API security / data integrity
- **Problem**: `/api/ap/debug/seed` rewrites the live GST Registration service row, deletes and recreates its `service_fields` and `service_workflows`. It required an active agent login but was callable in production.
- **Fix**: Returns 404 when `NODE_ENV === "production"`. Development behavior unchanged.
- **Files**: `src/app/api/ap/debug/seed/route.ts`

## 4. Customer JWT v1: removed public-key signing fallback (P0)

- **Area**: Authentication
- **Problem**: `src/lib/auth/jwt.ts` fell back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a public value) as the HMAC signing secret when `JWT_SECRET` was unset — customer tokens were forgeable in that configuration.
- **Fix**: `JWT_SECRET` is now mandatory (lazy check, same contract as `src/lib/auth-v2/jwt.ts`, so builds don't fail on missing env). Verification returns null on failure as before.
- **Files**: `src/lib/auth/jwt.ts`
- **Deployment note**: `JWT_SECRET` must be set in production. It is already required by auth-v2, so any environment running V2 flows has it. The v1 flow is only active when `NEXT_PUBLIC_ENABLE_WHATSAPP_AUTH=true`.
- **Compatibility**: If production had been signing v1 tokens with the anon-key fallback, those sessions become invalid and users re-login. This is the intended security outcome.

## 5. Hardened duplicate-application check (P1)

- **Area**: API security / privacy
- **Problem**: `/api/applications/check-duplicate` was unauthenticated and scanned all applications' `form_data` for a given service against caller-supplied identifiers (PAN/Aadhaar), returning matched application IDs, statuses, and values — an enumeration and PII-probing oracle. No in-repo callers exist.
- **Fix**: Requires a logged-in user; rate-limited (10/min per user+IP); identifiers capped at 5; response reduced to `{ duplicateFound, ownApplicationId }` — other customers' application details and matched values are no longer disclosed.
- **Files**: `src/app/api/applications/check-duplicate/route.ts`
- **Compatibility**: Response shape changed (`duplicates` array removed). No known consumers; if an external client used it, it must adapt to the minimized response.

## 6. Referral signing secret hardening (P1)

- **Area**: Referrals / rewards integrity
- **Problem**: The referral-attribution HMAC key defaulted to the hard-coded literal `default_referral_signing_secret_key`, making referral cookies (which drive ₹100 referrer rewards) forgeable wherever `REFERRAL_SIGNING_SECRET` was unset.
- **Fix**: Key resolution now prefers `REFERRAL_SIGNING_SECRET`, then a key derived from `SUPABASE_SERVICE_ROLE_KEY` (server-only secret), then a dev-only literal; production without either secret throws.
- **Files**: `src/lib/referrals.ts`
- **Compatibility**: Referral cookies signed with the old default fail verification after deploy; the attribution cookie is simply re-established on the next referral-link click. No database impact.

## 7. `.env.example` expanded (P1)

- **Area**: Configuration / documentation
- **Problem**: The example env documented 9 of ~25 referenced variables; `JWT_SECRET`, `CRON_SECRET`, `PRINT_AGENT_SECRET_KEY`, `ADMIN_EMAILS`, referral, AiSensy, Google Places, and analytics variables were undocumented.
- **Fix**: Rewrote `.env.example` grouped by concern, with public/server-only separation, placeholder values only, and inline guidance.
- **Files**: `.env.example`

## 8. Robots and sitemap added (P1)

- **Area**: SEO / privacy
- **Problem**: No `robots.ts` or sitemap existed; admin, AP, customer, auth, payment, and invoice pages were crawlable/indexable.
- **Fix**: Added `src/app/robots.ts` (disallows `/admin`, `/ap/`, `/agent/`, `/customer*`, `/dashboard`, `/apply/`, auth pages, `/pay/`, `/invoice/`, `/print`, `/api/`) and `src/app/sitemap.ts` (static public pages + published services + published blog articles, revalidated daily, resilient to DB unavailability).
- **Files**: `src/app/robots.ts`, `src/app/sitemap.ts` (new)

---

## Validation performed

- IDE diagnostics (TypeScript + ESLint) on all changed files: no errors.
- Static review of all call sites for changed modules (`lib/auth/jwt` → `lib/auth/session` only; `signReferralToken`/`verifyReferralSignature` → referral click + WhatsApp OTP verify routes; deleted routes → zero references).
- **Not run in this environment** (shell execution unavailable): `npm run type-check`, `npm run lint`, `npm run build`. Run these before deploying.

## Remaining limitations / follow-ups

Tracked in `AUDIT_REPORT.md` §5 (P1 business decisions, P2/P3 recommendations). Highest priority next: admin-email authorization cleanup (P1-6), customer-auth consolidation decision (P1-7), durable rate limiting, tested CSP, RLS role alignment, unit tests for wallet/referral/coupon math.

---
---

# Pass 2 — Verification, tooling diagnosis, P1 completion, design-system batch 1

Date: 2026-07-18 (second pass)

## 9. Independent verification of Pass 1 (all claims confirmed)

Every Pass-1 claim was re-verified against the working tree:

| # | Claim | Verified |
|---|---|---|
| 1 | Middleware V2 protection ordering | ✅ `src/middleware.ts` — V2 checks precede the public bypass |
| 2 | Debug/test endpoints deleted | ✅ `src/app/api/{debug,test}/**` contains zero files; no references |
| 3 | `JWT_SECRET` mandatory in JWT v1 | ✅ lazy `getEncodedSecret()`, no anon-key fallback |
| 4 | check-duplicate auth + privacy | ✅ login required, rate limited, minimized response |
| 5 | Referral signing secret chain | ✅ dedicated secret → derived from service-role key → dev-only literal → production throw |
| 6 | AP seed production gate | ✅ 404 when `NODE_ENV === "production"` |
| 7 | `.env.example` completeness | ✅ (updated again in this pass — see #11) |
| 8 | robots.ts / sitemap.ts | ✅ correct shape; sitemap tolerates DB failure |

No inaccurate conclusions found; `AUDIT_REPORT.md` stands.

## 10. Shell execution blocker diagnosed and documented

- Shell spawns never start (no terminal output file is ever created; file-write probes produce nothing). Root cause is environmental, not project config.
- Key toolchain fact discovered: **the package manager is pnpm** (root `pnpm-lock.yaml`, lockfile v9). There is no root `package-lock.json`. `node_modules/` is absent — dependencies have never been installed in this checkout.
- Created **`TOOLING_BLOCKER.md`** with observed behavior, probable causes, exact manual commands (`pnpm install --frozen-lockfile`, `pnpm run type-check|lint|build`), failure interpretation table, and Windows-specific troubleshooting.
- **Validation debt**: no change in either pass has runtime validation. Static review + IDE diagnostics only.

## 11. Admin authorization cleanup (P1)

- **Problem**: `NEXT_PUBLIC_ADMIN_EMAILS` (a client-bundled variable) participated in authorization fallbacks in `src/lib/auth.ts` and `src/middleware.ts`, and leaked the admin email list into client role-resolution in `site-header.tsx` / `bottom-nav.tsx`.
- **Fix**: All reads of `NEXT_PUBLIC_ADMIN_EMAILS` removed. Server code uses a new `getAdminEmailAllowlist()` helper reading server-only `ADMIN_EMAILS`. Client components resolve display-role from metadata + database rows only (middleware remains the enforcement boundary).
- **Files**: `src/lib/auth.ts`, `src/middleware.ts`, `src/components/site-header.tsx`, `src/components/bottom-nav.tsx`, `.env.example`
- **Deployment requirement**: ensure `ADMIN_EMAILS` is set in Vercel (server-only) with the full admin list **before** deploying, then delete `NEXT_PUBLIC_ADMIN_EMAILS` from Vercel. If production only had the public variable, admins without a role in metadata/DB would otherwise lose access.
- **Display note**: an admin with no role in metadata or profiles/users rows will see a generic dashboard CTA in the header (display only); server routing is unaffected.

## 12. Client-editable role metadata removed from authorization (P0-class)

- **Problem**: `user_metadata.role` is rewritable by any logged-in user (`supabase.auth.updateUser({ data: { role: "admin" } })`). It was trusted by:
  - `src/middleware.ts` role fast-path (admin/AP routing),
  - `src/lib/auth.ts` `isAdminUser()` and `getCurrentUserRole()`,
  - three CSC Olympiad PDF routes (ownership bypass for "admin"/"agent"),
  - `public.current_app_role()` SQL function used by many RLS policies (last-resort fallback).
- **Fix**:
  - App code now trusts only `app_metadata.role` (settable exclusively via service-role admin API) for the fast path; a self-claim of `customer` (lowest privilege) is still honored to avoid DB lookups on every customer request. Higher roles must be proven by `app_metadata` or database rows.
  - CSC Olympiad routes (`certificate`, `admit-card`, `prep-material`) use `getCurrentUserRole()` + `isAgentRole()` instead of raw metadata.
  - New migration **`supabase/migrations/20260718001000_role_resolution_hardening.sql`** redefines `current_app_role()` without the `user_metadata` fallback (documented with rollback SQL).
- **Files**: `src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/csc-olympiad/{certificate,admit-card,prep-material}/route.ts`, new migration
- **Compatibility**: legacy admin accounts had `raw_app_meta_data.role` set by migration `20260519133000`; AP/admin accounts have DB rows. No legitimate access change identified. AP/admin requests without an `app_metadata` claim now cost one extra DB lookup.

## 13. Durable rate limiting (P1)

- **Problem**: All rate limiting was in-memory (`src/lib/rate-limit.ts`, `src/lib/auth-v2/rate-limit.ts`) — resets per serverless instance/cold start, so OTP and payment endpoints were effectively unlimited under distributed load.
- **Fix**: New migration **`supabase/migrations/20260718000000_durable_rate_limiting.sql`** creates `rate_limit_buckets` (RLS-locked, no client grants) and an atomic `check_rate_limit(key, limit, window_ms)` SECURITY DEFINER function (EXECUTE granted to `service_role` only), with fixed-window counting, retry-after seconds, and opportunistic cleanup. New `src/lib/rate-limit-durable.ts` wraps it and **falls back to the in-memory limiter if the DB is unreachable** (degrades protection rather than blocking users).
- **Wired into** the highest-risk endpoints: `/api/auth/send-whatsapp-otp`, `/api/auth/verify-whatsapp-otp`, `/api/create-order`, `/api/verify-payment`, `/api/applications/check-duplicate`. Other endpoints keep the in-memory limiter (documented follow-up).
- **Deployment**: run the migration before deploying; without it, the durable helper logs an error and falls back to in-memory (fail-open by design).

## 14. Security headers: evidence-based report-only CSP (P2)

- **Fix**: `next.config.ts` adds a **`Content-Security-Policy-Report-Only`** header enumerating every external origin found in the codebase (Razorpay checkout/API/telemetry, GA, Meta Pixel, Supabase REST/WSS, Google Fonts for the AP share view, unifers bifrost). The existing enforced `frame-ancestors 'none'` + HSTS + nosniff + referrer/permissions policies are preserved.
- **Promotion path**: after deploying, watch the browser console / CSP reports through a full checkout + login + analytics session; then move the policy into the enforced `Content-Security-Policy` header.
- **Files**: `next.config.ts`

## 15. Image remote patterns restricted (P2)

- **Problem**: `images.remotePatterns` allowed `hostname: "**"` — any HTTPS host could be proxied/optimized through the site.
- **Fix**: Restricted to evidenced hosts: `**.supabase.co` (storage), `images.unsplash.com` (V5 seed banners + trending imagery), `digiconnectdukan.com`/`www` + `rnos.in`/`www` (brand assets), `lh3.googleusercontent.com` + `graph.facebook.com` (OAuth avatars).
- **Risk**: admin-uploaded content referencing an unlisted host will fail to render through `next/image` after deploy. Check homepage slides/service banners after deploying; add any legitimately needed host to the list.
- **Files**: `next.config.ts`

## 16. Fake production content removed (P1)

- **`/api/recent-applications`**: deleted the synthetic fallback generator that fabricated up to 10 fake "recent applications" with randomized timestamps whenever fewer than 5 real rows existed. The feed now returns only real, privacy-safe rows (service name/status/time) filtered to meaningful statuses. `RecentSuccessStories` renders nothing when there is no genuine activity.
- **Mock OCR** (`/api/customer/vault/ocr` POST): now returns 503 in production — it wrote hard-coded fake Aadhaar/PAN/GST extractions into customers' vaults with fabricated confidence scores. Development behavior unchanged for UI work.
- **Files**: `src/app/api/recent-applications/route.ts`, `src/components/homepage/recent-success-stories.tsx`, `src/app/api/customer/vault/ocr/route.ts`

## 17. Service worker cache audit + hardening (P2)

- **Audit result**: the SW was already conservative — same-origin GET only, network-first navigations with offline fallback, cache-first only for static assets, private prefixes excluded. No caching of authenticated API/HTML found.
- **Hardening**: private-path exclusions extended (`/ap`, `/pay/`, `/apply`, `/print`, `/customer-auth-v2`); cache name bumped to `digiconnect-static-v2` so the activate handler purges v1 caches on update.
- **Files**: `public/sw.js`

## 18. Legacy /agent/* cleanup (P2)

- **Audit**: middleware redirects every `/agent/*` path to `/ap/*` before rendering, making the 12 page files under `src/app/agent/**` unreachable dead code (duplicate partner UI querying legacy `profiles.role='agent'`). No imports referenced them.
- **Fix**: deleted all 12 files; middleware redirect map retained (bookmarks/deep links still work). In-app links updated to point at `/ap/*` directly (avoids a redirect hop): `site-header.tsx` agent nav, `hero-section.tsx` dashboard CTA, `login/agent/page.tsx`, `admin-applications.tsx`, `unified-login.tsx` fallback.
- **Files**: `src/app/agent/**` (deleted), `src/components/site-header.tsx`, `src/components/hero-section.tsx`, `src/app/login/agent/page.tsx`, `src/components/portal/admin-applications.tsx`, `src/components/auth/unified-login.tsx`

## 19. Design system batch 1 (Phase 4 start)

- **Tokens** (`globals.css`): status color scale (`--success/--warning/--error/--info` + soft variants), focus-ring token, motion scale (`--motion-fast/base/slow`, `--ease-spring`), global `:focus-visible` outline for keyboard users.
- **Accessibility**: removed `maximumScale: 1` from the viewport (WCAG 1.4.4 — pinch-zoom must not be blocked); added a skip-to-content link and `#main-content` landmark in the root layout.
- **Components**: new `Badge` (neutral/success/warning/error/info) and `Alert` (info/success/warning/error with icons and `role="alert"`/`"status"`); `Button` gains `destructive` variant + `sm` size; `Input` gains `aria-invalid` error styling and disabled states.
- **Files**: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/{badge,alert,button,input}.tsx`
- **Scope note**: page redesigns (Phase 5) intentionally not started — they need a working build environment to validate without regression risk.

## 20. AUTH_CONSOLIDATION_PLAN.md created (P1)

Full mapping of the three customer auth stacks (Supabase Auth, JWT v1, JWT v2): routes, cookie names, session formats, DB dependencies, security comparison, active consumers. Recommendation: **Supabase Auth canonical**; phased, reversible retirement of v1 (flag-gated) and archival of v2 (unlinked), with rollback strategy and required tests. No auth code was removed in this pass.

---

## Pass 2 validation

- IDE diagnostics (TypeScript + ESLint) on every changed file: clean.
- Static call-site review for all changed modules (admin allowlist consumers, rate-limit call sites, deleted `/agent` pages, olympiad routes).
- **Runtime validation remains pending** — see `TOOLING_BLOCKER.md` §4 for the exact pnpm commands the owner must run. No claim of "build passed" is made.

## Pass 2 deployment checklist

1. Set `ADMIN_EMAILS` in Vercel (server-only), then remove `NEXT_PUBLIC_ADMIN_EMAILS`.
2. Apply migrations `20260718000000_durable_rate_limiting.sql` and `20260718001000_role_resolution_hardening.sql` (both additive; rollback SQL documented in-file).
3. `pnpm install --frozen-lockfile && pnpm run type-check && pnpm run lint && pnpm run build`.
4. Deploy; verify homepage slides/banners render (image host restriction), complete a Razorpay test payment while watching the console for CSP report-only violations, confirm `/agent/dashboard` redirects to `/ap/dashboard`, and confirm OTP endpoints rate-limit across refreshes.
5. After a clean CSP observation window, promote the report-only policy to enforced.

---
---

# Pass 4 — Post-build architecture and runtime hardening

Date: 2026-07-18

## 21. Edge JWT / jose CompressionStream warning eliminated

- **Problem**: Middleware dynamically imported `@/lib/auth-v2/jwt` (`jose`), pulling `deflate.js` / `CompressionStream` into the Edge bundle.
- **Fix**: Retired JWT v2 UI paths via middleware redirects to Supabase customer routes. Middleware no longer imports `jose` or any JWT verifier. Added Edge-safe Web Crypto helper `src/lib/auth-v2/jwt-edge.ts` (unused by middleware today; documents the boundary).
- **Files**: `src/middleware.ts`, `src/lib/auth-v2/jwt-edge.ts`
- **Build evidence**: Pass 4 `next build` shows no CompressionStream warning; middleware bundle ~92.5 kB.

## 22. Legacy agent architecture consolidated to AP

- Deleted unreachable `/agent/**` pages again; middleware redirects remain.
- Deleted `/admin/agents/**` UI; middleware redirects to `/admin/agency-partners/**`.
- Deleted live `/api/agent/**` and `/api/admin/agents/**` implementations; replaced with 410 Gone handlers.
- Deleted `/api/auth/agent-access`; `/api/auth/agent-login` kept as thin helper with destination `/ap/dashboard`.
- Partner password reset now uses `resetPartnerPasswordAction` on agency-partners (no longer calls dead agents API).
- Kept `/admin/agent-services` (AP catalog naming only).

## 23. Leads module removed from product surface

- Deleted admin/AP Leads UI; middleware redirects to dashboards.
- CRM/AP lead APIs and `/api/crm/event` return 410.
- Public enquiry preserved as **`POST /api/enquiry`** (writes historical `leads` table); `/api/lead` returns 410.
- Nav: removed CRM Pipeline from admin shell and settings cards.
- Tables `leads` and `crm_leads` retained (no destructive migration).

## 24. Customer auth consolidation executed

- Canonical: Supabase Auth at `/login/customer` + `/customer/*`.
- Removed `(auth-v2)` pages; JWT v1/v2 APIs return 410 via catch-alls.
- Removed `CustomerAuthUI` branch from login page.
- Updated `AUTH_CONSOLIDATION_PLAN.md` to executed status.

## 25. Debug seed hard-disabled

- `/api/ap/debug/seed` always returns 404 (including development).

## 26. ESLint CLI migration + core-config cleanup

- `package.json` `"lint": "eslint ."`.
- `eslint.config.mjs` ignores `.next`, `node_modules`, `print-agent`, `android`, `scripts`, `supabase`, `next-env.d.ts`.
- Fixed unused imports/vars in `src/app/admin/settings/core-config/page.tsx`.

## 27. Smoke script expanded

- Checks `/ap/login`, legacy redirects, 410 JWT/lead APIs, 404 debug seed.

## Pass 4 validation

- `pnpm run type-check` → 0
- `pnpm run lint` → 0
- `pnpm run build` → 0 (167 static pages)
- `pnpm run smoke` → 0

Full detail: `PASS4_RUNTIME_VALIDATION.md`. Authenticated role matrix and live Razorpay tests remain pending.
