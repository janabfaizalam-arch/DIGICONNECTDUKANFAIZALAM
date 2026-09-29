# Production-readiness, privacy & trust audit

Audit date: 25 September 2026. Stack: Next.js 15 (App Router) · React 19 ·
Supabase (Postgres, Auth, Storage) · Razorpay · AiSensy WhatsApp · Vercel.

This is an engineering audit. It does **not** certify compliance with any law.
Items marked *Manual* need a business owner or a qualified lawyer.

## Regulatory context (verified September 2026)

- Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025 (notified
  14 Nov 2025). Phased: Data Protection Board immediately; Consent Manager
  provisions from 14 Nov 2026; notice, consent, data-principal rights,
  grievance redressal and most other obligations from **13/14 May 2027**.
  Grievances must be resolved within 90 days.
- CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023
  (false urgency, drip pricing, etc.).

## Checklist

| # | Area | Finding | Priority | Status |
|---|---|---|---|---|
| 1 | Storage | `documents` bucket had storage.objects SELECT policies for **anon** and **all authenticated users** → customer Aadhaar/PAN uploads listable and downloadable with the public anon key | P0 | Fixed — migration `20260926090000_close_documents_bucket_reads.sql` (**must be applied**) |
| 2 | Storage | Anonymous INSERT policy into `documents/public-leads` | P0 | Fixed (same migration) |
| 3 | Payments | `/api/create-order` created a Razorpay order for any client-supplied amount, unauthenticated, when no service/application was given | P0 | Fixed — request now rejected (400) |
| 4 | Logging | Credit form logged PAN, mobile, DOB to browser console on every render | P0 | Fixed |
| 5 | Logging | Customer email + mobile in server logs (`consolidateCustomerRows`), customer name + mobile in client payment logs, full Razorpay order object logged | P1 | Fixed (masked / removed) |
| 6 | Leads | Lead uploads stored a "public URL" for a private bucket; raw storage errors returned to caller | P1 | Fixed — no public URL, generic errors |
| 7 | Tracking | GA4 and Meta Pixel loaded on every page before any choice; GA consent defaulted to granted; Pixel `<noscript>` beacon | P1 | Fixed — consent-gated, ad storage denied, Google signals off, noscript removed |
| 8 | Consent | No cookie banner / preference centre | P1 | Fixed — banner (Accept / Reject / Manage, equal weight), preference dialog, footer "Cookie Settings", withdrawal deletes tracker cookies |
| 9 | Legal | Privacy / Terms were 3–6 sentences; no Cookie, Refund, Disclaimer or Contact/Grievance pages; footer "Refund" linked to Terms | P1 | Fixed — six pages, needs legal review |
| 10 | Data rights | No way to request access/correction/erasure/withdrawal/nomination | P1 | Partly fixed — request form on `/contact` hands off to email/WhatsApp; fulfilment is manual |
| 11 | Fake content | GST page: invented "4.9★ Google rating from 1,248 reviews", "5,000+ businesses", "99% approval", four named testimonials | P1 | Removed |
| 12 | Dark patterns | GST page: countdown resetting every midnight; crossed-out reference prices (₹4,999 / ₹6,999 / ₹18,499) with "Save ₹…" | P1 | Removed |
| 13 | Claims | Footer "Certified ISO 9001:2015", "GSTIN Verified", "India's premium marketplace"; GST "Government Assistance Assured", "zero rejection rate", "24/7 VIP", "our CAs"; hero visual labelled "Government Portal" | P1 | Removed / reworded |
| 14 | Fake content | Unused components with invented names/stats (`testimonials-section`, `wallet-cashback`, `cibil-finance-center`) | P2 | Deleted |
| 15 | Forms | Footer newsletter form discarded the email and showed "Subscribed" | P1 | Removed |
| 16 | Forms | Play Store / App Store badges with no store listing | P2 | Replaced with "Get the Android app" |
| 17 | Forms | Lead form: placeholder-only fields, no autocomplete, vague "Get Started", silent feedback | P1 | Fixed |
| 18 | Forms | No privacy notice on lead, credit, partner, WhatsApp-OTP forms | P1 | Added purpose-specific notice |
| 19 | A11y | `maximumScale: 1` blocked pinch-zoom (SC 1.4.4) | P1 | Fixed |
| 20 | A11y | No global focus ring fallback; credit consent checkbox `focus:ring-0`; icon-only Back button unnamed | P1 | Fixed |
| 21 | Embeds | YouTube via youtube.com (cookies on load); Vimeo without `dnt` | P2 | Fixed — youtube-nocookie, Vimeo `dnt=1` |
| 22 | SEO | Two contradicting Organization JSON-LD blocks; self-serving AggregateRating from own testimonials | P2 | Fixed — single accurate Organization schema, rating removed |
| 23 | SEO | Legal pages missing from sitemap | P3 | Fixed |
| 24 | Headers | No COOP | P3 | Added `same-origin-allow-popups` |

## Verified as already sound (no change)

- OTPs: stored as hashes, short TTL, attempt cap, per-phone and per-IP rate limits, no OTP in logs.
- Session cookies: HTTP-only; customer device/session list with revocation.
- Customer document upload: ownership check, MIME + magic-byte validation, size cap, sanitised filename, 1-hour signed URLs.
- Razorpay: server-side pricing for services/applications; HMAC signature verified with `timingSafeEqual`; order-id ↔ application match; idempotent re-verification; webhook signature checked.
- Credit report consent enforced server-side by the shared Zod schema.
- Security headers: HSTS, nosniff, frame-ancestors / X-Frame-Options, Referrer-Policy, Permissions-Policy.
- Route-exposure contract test inventories every unauthenticated service-role write.

## Manual / business / legal actions

1. **Apply the storage migration to production** and then check Supabase Storage → Policies for `documents`.
2. Have a lawyer review all six policy pages (`src/app/{privacy-policy,terms-and-conditions,cookie-policy,refund-policy,disclaimer,contact}`).
3. Fill `src/lib/compliance/config.ts` TODOs: registered office address, CIN, GSTIN (if to be shown), Grievance Officer name.
4. Confirm the processor list (and hosting regions / DPAs) and the retention periods, then implement retention in code — only Smart Print clean-up is automated today.
5. Decide whether the first-party visit counter should require analytics opt-in (currently runs until the visitor rejects analytics; stores no IP or cookie).
6. Set up a process to fulfil privacy requests within statutory timelines and record them; consider a DB-backed request log before May 2027.
7. Confirm the refund rules and the "full refund on final GST rejection" promise on the GST page.
8. Review `oldPrice` reference prices in `src/lib/services-data.ts` (11 entries) — show a struck-through price only if it was genuinely charged.
9. Confirm the referral-fee statement for credit-card offers.
10. Resolve the unverified assets in `ASSET_INVENTORY.md`.
11. Consider a Content-Security-Policy (start in Report-Only) once third-party origins are settled.
12. `next.config.ts` `images.remotePatterns` allows any HTTPS host (open image-optimiser proxy); restrict to Supabase storage + known CDNs once admin image sources are confirmed.

---

# Phase 2 — security hardening (26–27 September 2026)

Status key: **T** technically verified by reading code · **A** automated-test verified · **M** manually verified in a browser/production build · **P** requires production deployment · **B** requires business confirmation · **L** requires legal review.

## How storage and RLS were verified

Every migration was replayed, in order, into a local PostgreSQL 16 on a Supabase stub
(`supabase/tests/supabase-stub.sql`), and the effective policies were read back from
`pg_policies`. Scenarios then ran as `anon` / `authenticated` with real JWT claims
(`npm run test:rls`, `RLS_TEST_DATABASE_URL=…`). With the fixes removed, 11 of 24 scenarios
fail; with them, all pass.

14 historical migrations fail on a fresh database (they reference tables created outside
migrations, e.g. `reward_wallets`). The migration history therefore does not fully
reproduce production — production may hold policies or columns the files do not show.
**Run the queries in "Production verification" below against production.**

## Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 25 | App trusted `user_metadata.role` (user-editable) in `getCurrentUserRole`, `isAdminUser`, admin membership, middleware, customer lookup, CSC Olympiad routes → any signed-in user could become admin | Critical | Fixed (T, A) |
| 26 | RLS let users update any column of their own `profiles` / `users` row, including `role`; `current_app_role()` fell back to `user_metadata` | Critical | Fixed by migration `20260926091000` (A on replayed DB; **P**) |
| 27 | `ap-kyc-documents` "Admin can read all KYC documents" had no admin check → any signed-in user could read all partner KYC | Critical | Fixed by migration `20260926090000` (A; **P**) |
| 28 | `/api/services` PUT/POST/DELETE unauthenticated, service role → anyone could reprice/delete services | Critical | Fixed (T, A) |
| 29 | Admin PIN (6 digits, published number) had no rate limit or lockout | High | Per-account DB lockout + per-IP limit (T, A) |
| 30 | `/api/applications/check-duplicate` anonymous PAN/Aadhaar oracle over all applications | High | Staff-only, rate-limited (A) |
| 31 | `/api/admin/packages` GET unauthenticated, exposed agent cost / partner payout | Medium | Admin-only; public `/api/packages` with public columns (A) |
| 32 | Storage migration shared a version with `20260925120000_marketing_agents` → `db push` would fail | High (deploy) | Renamed; uniqueness test (A) |
| 33 | No CSP; `images.remotePatterns: "**"` open proxy | Medium | CSP (structural enforced, allowlist report-only), image allowlist + SafeImage (A, M: 0 violations on 18 pages enforced; optimiser returns 400 for foreign hosts) |
| 34 | `crm/event`: unauthenticated lead creation/renaming, raw DB errors | Medium | Rate limit, event allowlist, no rename, generic errors (A) |
| 35 | `services/track` stored raw IP addresses (contradicts privacy policy) | Medium (privacy) | IP no longer stored (A). Existing rows still hold IPs — **B**: decide whether to null them |
| 36 | Credit report download: header built from unsanitised name (crash / malformed header); 403 vs 404 existence leak | Low | Fixed (A) |
| 37 | Customer/partner routes returned raw DB/provider error messages | Low | Fixed for customer/partner routes (T). ~60 admin-only routes still echo DB error text — low risk, left as is |
| 38 | UPI QR webhook settled applications without comparing amount | Low (QR is fixed-amount) | Under-payment no longer settles (T) |
| 39 | No privacy-request log | Medium (DPDP readiness) | `privacy_requests` table (service-role only), public POST, admin workflow with verification gate (A) — in follow-up PR |
| 40 | No retention automation beyond Smart Print | Medium | Config-gated cron; nothing deleted until `RETENTION_*_DAYS` set (A; **B/L** to set periods) |

## API route audit

All routes (240 as of 29 September 2026, after the WhatsApp/CRM work in #105, #107 and #108) inventoried by `scripts/security/api-inventory.mjs` → `API_ROUTE_INVENTORY.md`
(authentication, authorisation, validation, rate limit, service role, flags). Every
`review` row was read by hand: 0 remain; 11 are deliberate public surfaces with recorded
reasons; `check` rows are admin-only error echo, logout endpoints, or admin routes that
legitimately take a target id. A test fails if any route needs review again.

Route-level tests (real handlers, in-memory Supabase applying each query's filters) cover:
cross-customer credit report / document / application / payment access, tampered and
missing payment amounts, forged Razorpay signatures, forged roles, the locked routes, and
the login lockout.

Not verifiable here: signed-URL expiry is enforced by Supabase Storage (our TTLs are ≤ 1 h
and asserted); Razorpay checkout under CSP (third parties unreachable from the test
environment — hence report-only first).

## Secrets

Working tree and full git history scanned for Razorpay, Supabase service/secret, Google API,
private-key, OpenAI/GitHub/Slack token and credentialed DB-URL patterns: **none found**. Only
`.env.example` files are tracked. No privileged variable is `NEXT_PUBLIC_`. The production
client bundle contains no server secret. Note: `NEXT_PUBLIC_ADMIN_EMAILS` puts admin email
addresses in the public bundle (not a secret; consider removing).

## Authorization model (after fixes)

Role order: `app_metadata.role` (service-role-only) → admin email allowlist →
`profiles.role` / `users.role` (now write-protected) → customer. `user_metadata` never
grants anything. Partner portal access is additionally membership-based
(`agency_partners`). Server routes enforce authorisation; middleware and client role hints
are UX only.

## Production verification (run in the Supabase SQL editor after deploying)

```sql
-- 1. Private buckets are private
select id, public from storage.buckets
where id in ('documents','application-documents','application-final-documents','kyc-documents','ap-kyc-documents','credit-reports','print-jobs');
-- 2. No anon/all-authenticated reads on private buckets
select policyname, cmd, roles, qual from pg_policies where schemaname = 'storage'
order by policyname;
-- 3. current_app_role no longer reads user_metadata
select pg_get_functiondef('public.current_app_role'::regproc) ilike '%user_metadata%' as still_trusts_user_metadata;
-- 4. Guard trigger present
select tgname from pg_trigger where tgname in ('guard_privileged_profile_columns','guard_privileged_user_columns');
-- 5. Who is an admin now (review this list)
select id, email, role from public.profiles where role in ('admin','super_admin','staff','team','employee','processor');
```

## Deployment steps

1. Back up the database.
2. `supabase db push` (or run, in order: `20260926090000_close_documents_bucket_reads.sql`,
   `20260926091000_block_role_self_escalation.sql`, then `20260926093000_privacy_requests.sql`).
3. Run the production verification queries above.
4. Confirm every real admin appears in query 5 or has `app_metadata.role = 'admin'` or is in
   `ADMIN_EMAILS`.
5. Watch logs for `[csp-violation]` for a week of normal traffic including payments; then set
   `CSP_ENFORCE=true`.
6. Set `RETENTION_*_DAYS` only after the business/legal owner decides the periods.

## Remaining risks

- Rate limiting is in-memory per serverless instance (except the DB-backed login lockouts);
  a distributed attacker can exceed per-IP limits. Consider a shared store (e.g. Upstash).
- CSP keeps `'unsafe-inline'` for scripts; a nonce-based policy needs dynamic rendering.
- Migration drift: production may differ from the replayed history (see above).
- Admin-only routes still return raw DB error text.
- Existing `service_clicks_log` rows contain IP addresses.

## Final verification (29 September 2026, PR #106 merged with main at #108)

- Re-read by hand the routes added since #99: `/api/webhooks/meta-whatsapp` (GET verify
  token compared in constant time; POST requires a valid `X-Hub-Signature-256` over the raw
  body, size-capped, rate-limited, idempotent on wamid, no bodies logged),
  `/api/invoices/[id]/pdf` (owner, admin, or an HMAC-signed 30-day link token; one 404 for
  every failure), admin renewals / WhatsApp / OTP-diagnostic routes (admin session,
  rate-limited where they send messages), `/api/cron/renewal-reminders` (`CRON_SECRET`).
  `/api/webhooks/aisensy` no longer exists.
- Privacy-request admin screen and API now use `hasAdminAccess` (demoted admins refused even
  when their token still says admin), like the credit-report and print-job admin paths.
- `privacy_requests` has RLS enabled and **no policies by design**: anon, customers and
  admins' own browser sessions are all refused at the database (tested); admin screens read
  it on the server with the service role after `hasAdminAccess`. An admin SELECT policy
  would only widen this.
- Payment, upload, session and CSP/image code unchanged since #99; OTP changes only swap the
  provider (hashing, expiry and rate limits unchanged). No new secrets in history (one
  match is a test fixture token).
