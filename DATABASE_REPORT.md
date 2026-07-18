# DigiConnect Dukan V6 — Database Report

## Strategy

**Local greenfield baseline.** All V5 migrations were archived to:

`supabase/migration-archive/v5-history/`

Active migration:

`supabase/migrations/00000000000000_core_baseline.sql`

Do **not** apply this baseline to a production database that already contains the V5 schema.

## Final tables

| Table | Purpose |
|---|---|
| `profiles` | Role + identity mirror of `auth.users` |
| `customers` | CRM customer records |
| `agency_partners` | AP business profiles |
| `services` | Single service catalog (7 seeded) |
| `applications` | Service applications + Razorpay fields |
| `application_documents` | Uploaded docs metadata |
| `payments` | Payment ledger |
| `invoices` | Invoice records |
| `wallets` | Authoritative wallet balance |
| `wallet_transactions` | Immutable ledger (idempotent keys) |
| `referrals` / `referral_codes` | Referral graph |
| `coupons` | Discount codes |
| `notifications` | User/admin notices |
| `reviews` | Service reviews |
| `enquiries` | Public contact form |
| `website_settings` | Key/value CMS settings |
| `auth_otps` | WhatsApp OTP hashes |
| `ap_commissions` / `ap_payouts` | Partner earnings |
| `rate_limit_buckets` | Durable rate limits |

## Roles

PostgreSQL enum `app_role`: `admin`, `customer`, `agency_partner`.

Helpers: `is_admin()`, `is_agency_partner()`, `current_app_role()`.

## Wallet rules encoded

- `credit_signup_bonus(user)` → ₹500 idempotent
- `post_wallet_transaction(...)` with unique `idempotency_key`
- Verify-payment posts 20% fresh-payment cashback with payment-id key

## Seeded services

1. `gst-registration`
2. `itr-filing`
3. `msme-registration`
4. `food-license`
5. `driving-licence`
6. `passport`
7. `cm-yuva-loan`

## Storage

Private bucket: `application-documents`

## Validation

```powershell
pnpm supabase db reset
```

Completed successfully on local Docker after baseline install.
