# 360° Deep Audit — Logic & Flow

Scope: full repository sweep (954 TS/TSX files, 231 API routes, 166 pages), driven by
typecheck, lint, the Vitest suite, a production build, and manual tracing of the
auth, payment, wallet, customer-identity and notification flows.

Baseline before this pass: typecheck clean, lint clean (warnings only), build passing,
**19 failing tests across 7 files**.
After this pass: typecheck clean, lint clean, build passing, **510/510 tests passing**.

---

## 1. Fixed — customer records were unreachable (`customers.user_id` does not exist)

**Severity: high — broke a whole feature and silently dropped data links.**

`supabase/migrations/20260706000000_customer_auth_system.sql` drops and recreates
`public.customers` **without** a `user_id` column. Auth linkage in the production
schema is `customers.id == auth.users.id` (later migrations state this explicitly).

Six code paths still filtered on `customers.user_id`. PostgREST returns error 42703;
each caller discarded the error and read it as "no customer found":

| Path | Symptom |
| --- | --- |
| `api/customer/vault` (GET) | Returned HTTP 500 on every request — the document vault was completely non-functional |
| `api/customer/vault` (POST/DELETE) | 404 "Customer record not found" for every upload/delete |
| `api/customer/vault/ocr` (GET/POST) | 404 on every OCR request |
| `api/create-order` (wallet-only + pending branches) | `applications.customer_id` written as `null` |
| `api/applications` | `applications.customer_id` written as `null` |

`customer_id` being null propagates: admin Customer-360, invoices and commission
attribution all lose the customer link.

**Fix:** added `resolveCustomerIdForUser()` in `src/lib/customer-identity.ts` — a single
canonical resolver (`customers.id` → mobile → legacy `user_id`, tolerating the
missing column) and routed all six call sites through it. Covered by
`src/lib/customer-identity-resolve.test.ts`.

## 2. Fixed — Razorpay webhook could undo a completed payment

**Severity: high — money/state corruption.**

`api/razorpay/webhook` applied every event unconditionally:

- `paid_at: status === "verified" ? paidAt : null` — a `payment.failed` event for an
  abandoned first attempt (Razorpay sends these *after* a successful retry) wiped
  `paid_at` and set the application to `payment_failed`, **after it was paid**.
- `status: … "submitted"` — a replayed or out-of-order `payment.captured` reset an
  application that had already advanced to `in_progress`/`completed` back to `submitted`.

**Fix:** a verified payment is now terminal. Non-verified events carry
`.neq(..., "verified")` guards, `paid_at` is only ever written (never nulled), and the
workflow `status` rewrite is scoped to payment-stage statuses only. Payment facts
(`payment_status`, razorpay ids) still apply at any stage, so no update is lost.

## 3. Fixed — re-verifying a paid order returned an error

**Severity: medium — user-facing failure on a successful payment.**

`api/verify-payment` recomputed the 50% wallet-redeem cap against the *current*
balance before checking `alreadyVerified`. Since the first pass already debited the
wallet, a retry/refresh of a wallet-assisted payment recomputed a lower cap and
returned `400 "Wallet redeem cannot exceed 50%…"` for a payment that had in fact
succeeded. The cap check now runs only on the first (non-verified) pass.

## 4. Fixed — auto-generated invoices carried placeholder customer data

**Severity: medium — wrong data on a financial document.**

The same route built invoices from `customer_details` / `customer_email` /
`customer_mobile`, but none of those columns were in the `select`. Every
auto-generated invoice was issued to `"Customer"` / `no-reply@digiconnect.in` /
`0000000000`. The columns are now selected and used, with the snapshot in
`customer_details` as a secondary source.

## 5. Fixed — weak PINs were accepted

**Severity: medium — auth hardening.**

`validateCustomerPin` only checked a 17-entry blocklist, so `987654`, `234567`,
`876543`, `459459` and similar all passed. Added structural rules — all-identical
digits, ascending/descending runs, and short repeated patterns — exported as
`isWeakPin`. Login only validates *format*, so no existing customer is locked out.

Related: `generateSecurePin` (walk-in temporary PINs) had a hardcoded fallback that
could itself emit a now-rejected PIN; it now retries and fails loudly instead.

## 6. Fixed — OTP hashing fell back to a published secret in production

**Severity: medium — security.**

`hashOtp` fell back to the literal `"otp-fallback-dev-only"` when `AUTH_HMAC_SECRET`
was unset, making a stored OTP hash brute-forceable across the 6-digit space in
seconds. It now throws in production, matching `derivePinPassword`; the fallback
remains for local development. `AUTH_HMAC_SECRET` is already required in production
(PIN auth throws without it), so this changes no working deployment.

## 7. Fixed — rate-limit buckets grew without bound

`src/lib/rate-limit.ts` only ever replaced a bucket when the same key returned, so a
long-lived instance accumulated one entry per IP forever. Added a periodic sweep of
expired buckets. Covered by `src/lib/rate-limit.test.ts`.

## 8. Fixed — 19 failing tests

Each was triaged as source-bug vs test-bug:

| Test | Verdict |
| --- | --- |
| `walk-in-pin-security` — weak PINs | **Source bug** → fixed in `pin.ts` (§5) |
| `application-notify` (7 cases) | **Test bug** — asserts the direct-send path, but the dispatcher fails closed to `disabled` when `CRM_NOTIFICATION_DELIVERY_MODE` is unset. Mode now pinned in the test. |
| `digiconnect-loader` (6 cases) | **Test bug** — `path.resolve(__dirname, "../..")` landed in `src/`, producing `src/src/…`. |
| `parse-api-response` — 204 | **Test bug** — `new Response("", {status: 204})` throws in undici; 204/205/304 need a null body. |
| `automation.contract` — transition matrix | **Test bug** — compared `queue.outboxSends` against `direct.requestSends` (two different modes), so the assertion could never hold. Now asserts exclusivity *within* each mode, which is the documented contract. |
| `date-range` — admin nav IA | **Stale test** — nav was deliberately redesigned from 6 groups to 10; test updated to the current IA. |
| `walk-in-create-response` — `customers.user_id` | **Test bug** — the regex scanned 200 chars past `from("customers")` and caught the adjacent `customer_profiles` query's legitimate `user_id`. Scan now stops at the next `.from(`. |

---

## Findings NOT changed — these need your decision

### A. Coupons are stored in a JSON file on disk (`src/lib/coupons.ts`)

`getCoupons`/`saveCoupons` read and write `src/lib/coupons-db.json` inside the
deployment bundle. On Vercel the filesystem is read-only outside `/tmp`, so:

- **admin coupon create/edit silently does not persist** — `saveCoupons` returns
  `false` and the change is lost on the next request;
- each serverless instance would see different state even if writes worked.

Two further gaps in the same module:

- **`usedCount` is never incremented anywhere**, so `usageLimit` is dead logic — a
  coupon capped at N uses never exhausts.
- **`perUserUsageLimit` is never enforced.** `validateCoupon` accepts a `userId` in its
  type but does not destructure or use it, so a one-per-customer coupon can be reused
  without limit.

Fixing this properly means moving coupons to Supabase with a redemption ledger — a
schema change that touches money, so I have left the behaviour as-is rather than
guess at the model. Recommend a `coupons` + `coupon_redemptions` table with the
redemption written inside the payment-verification path.

### B. `syncCustomerIdentity` writes to the pre-2026-07 schema

`src/lib/customer-identity.ts` still writes `user_id` and `full_name` to `customers`
(production has neither; it uses `name`). It is written defensively — every write is
wrapped in missing-column tolerance and it logs rather than throws — so login is not
broken, but it can never actually create or update a customer row on the current
schema. Realigning it is a rewrite of the login-path write logic and wants a live
database to verify against, so it is flagged rather than changed.

### C. Rate limiting is per-instance, not global

`checkRateLimit` uses an in-process `Map`. On serverless, limits are effectively
multiplied by the number of warm instances. Fine as a burst damper; not a control you
can rely on for abuse prevention. A shared store (Upstash/Redis, or a Postgres
counter) would be needed for real enforcement.

### D. Duplicate side-effects across payment paths

`api/verify-payment` and `api/razorpay/webhook` both reserve commissions, update
payment links, and trigger WhatsApp. Commission creation *is* idempotent
(`ap_commissions` unique on application) and WhatsApp dedupes on its idempotency key,
so this is currently safe — but it is duplicated logic in two places that must stay in
sync. Worth extracting into one shared `onPaymentVerified(applicationIds)` module.
