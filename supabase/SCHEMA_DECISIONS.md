# Schema Decisions (V6)

Superseded by root [`DATABASE_REPORT.md`](../DATABASE_REPORT.md).

V6 canonical choices:

- Identity: `auth.users` + `public.profiles`
- Customers: `public.customers`
- Services: single `public.services` table (7 seeded)
- Wallet: `public.wallets` + `public.wallet_transactions`
- Partners: `public.agency_partners`
- Roles: `admin` | `customer` | `agency_partner` only
