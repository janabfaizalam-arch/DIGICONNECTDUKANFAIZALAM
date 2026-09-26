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
| 1 | Storage | `documents` bucket had storage.objects SELECT policies for **anon** and **all authenticated users** → customer Aadhaar/PAN uploads listable and downloadable with the public anon key | P0 | Fixed — migration `20260925120000_close_documents_bucket_reads.sql` (**must be applied**) |
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
