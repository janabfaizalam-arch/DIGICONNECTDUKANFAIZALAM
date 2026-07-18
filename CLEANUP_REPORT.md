# DigiConnect Dukan V6 — Cleanup Report

Date: 2026-07-18  
Branch: `supabase-deep-fix`

## Summary

Reduced the product from a large multi-feature platform to a focused 3-role / 7-service core.

| Metric | Before (approx.) | After |
|---|---|---|
| Pages (`page.tsx`) | 109 | 42 |
| API routes (`route.ts`) | 127 | 19 |
| Active SQL migrations | 83 | 1 |
| Roles in live authz | many aliases | admin, customer, agency_partner |
| Public services | 20+ | 7 |

## Deleted / archived migrations

- Moved all prior migrations to `supabase/migration-archive/v5-history/` (83 files)
- Active: `supabase/migrations/00000000000000_core_baseline.sql` only

## Removed services

CSC Olympiad, PAN, PVC, Insurance, Credit Cards, CIBIL, Vishwakarma, Startup, Labour, Voter, Certificates, eShram, DSC, DPR, Bank Account, and all other non-core services.

**Kept:** GST Registration, ITR Filing, MSME Registration, FSSAI/Food License, Driving Licence, Passport Assistance, CM YUVA Loan Assistance.

## Deleted page areas (examples)

- `/blog`, `/credit-cards`, `/insurance-quotation`, `/combo`, `/download-app`, `/featured-services`, `/print`, `/apply`, `/dashboard`, `/customer-login`, `/admin-login`
- Admin: agent-services, CSC, credit-reports, gallery/slides modules, print-jobs, tickets, articles, service-builder, offline-invoices, payment-reconciliation, leads, rewards duplicates
- AP: team, payment-links, referrals, knowledge, services catalog pages, profile/notifications extras
- Customer: credit-reports

## Deleted API areas (examples)

- `api/csc-olympiad`, `api/credit`, `api/print`, `api/agent`, `api/customer-auth`, `api/customer/*` vault/credit, `api/admin/*` (legacy CRM bulk), `api/debug`, `api/test`, `api/staff`, `api/lead`, `api/crm`

## Removed packages

From `package.json`:

- `swr`, `pdf-parse`, `argon2`, `jose`, `framer-motion`, `embla-carousel-react`, `recharts`, `qrcode.react`, `@types/qrcode.react`

## Removed database tables (relative to V5)

Dropped from the live migration path (not present in V6 baseline):  
`service_catalog`, `agent_services`, `reward_wallets`, `customer_vault_documents`, print jobs, credit reports, insurance quotations, homepage CMS tables, staff/leads tables, PIN auth satellite stacks as primary identity, and other V5 specialty modules.

Canonical V6 tables are listed in `DATABASE_REPORT.md`.

## Auth cleanup

- Deleted `src/lib/auth/` and `src/lib/auth-v2/` JWT/PIN stacks
- One login path: Supabase Auth via `/login` + `/api/auth/*`
- WhatsApp OTP routes retained
