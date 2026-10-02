# Phase B — Implementation Plan

**Status:** plan only. Nothing in here is implemented, and nothing will be until
this plan is approved.

**Baseline:** `f560c46` on `main` (Phase A merged, PR #118).

**Scope guard.** No AI Copilot, no Gemini/OpenAI migration, no Meta rewrite, no
WhatsApp rewrite, no automation rewrite, no CRM architecture rewrite. The
existing Gemini integration stays exactly as it is.

---

## The single most important finding

**This repository already contains the correct patterns.** `src/lib/admin/dashboard-data.ts`
already uses `count: "exact", head: true` for counts, a `sumPaginated` helper
for money totals, `.range()` paging, and four purpose-built RPCs
(`admin_dashboard_payment_totals`, `admin_dashboard_wallet_liability`,
`admin_dashboard_revenue_series`, `admin_dashboard_partner_commission_pending`).
126 migrations define ~30 server-side functions.

So Phase B is **not** inventing a correctness strategy. It is extending one that
already exists and is already proven in this codebase, to the places that were
written before it. That materially lowers the risk of every item below.

---

## B1 — Table migration inventory

25 admin files hand-roll a table. Counted as files under `src/app/admin` or
`src/components/admin` rendering a raw `<table>` **or** the `ui/table` wrapper —
the wrapper matters, since `admin/commissions` uses it and a `<table` grep alone
misses it.

Legend: **Pag** = has any paging · **Sort** = has sorting · **Filt** = has
search/filter · **Mob** = maintains a separate mobile layout that must be kept
in step by hand.

| # | Route / file | Entity | Pag | Sort | Filt | Mob | Lines | Complexity | Pri |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `/admin/commissions` → `page.tsx` | commissions | — | ✓ | — | **✓** | 138 | Low | **P0** |
| 2 | `/admin/payments` → `page.tsx` | payments | — | ✓ | ✓ | — | 107 | Low | **P0** |
| 3 | `/admin/wallet` → `page.tsx` | wallets/apps/profiles | — | ✓ | ✓ | — | 272 | Medium | **P0** |
| 4 | `components/admin/admin-leads-list.tsx` | leads | — | — | ✓ | **✓** | 188 | Low | **P0** |
| 5 | `components/admin/lead-operations-workspace.tsx` | crm_leads | ✓ | — | ✓ | **✓** | 617 | High | **P0** |
| 6 | `/admin/documents` → `page.tsx` | application_documents | — | ✓ | ✓ | — | 111 | Low | P1 |
| 7 | `/admin/offline-invoices` → `page.tsx` | invoices | — | — | ✓ | — | 102 | Low | P1 |
| 8 | `/admin/partner-applications` → `page.tsx` | agency_partner_applications | — | — | ✓ | — | 198 | Low | P1 |
| 9 | `/admin/branches` → `branches-client.tsx` | branches | — | — | ✓ | — | 218 | Low | P1 |
| 10 | `/admin/commission-rules` → `page.tsx` | commission_rules | — | — | — | — | 168 | Low | P1 |
| 11 | `components/admin/print-jobs-list.tsx` | print_jobs | — | — | ✓ | — | 371 | Medium | P1 |
| 12 | `components/admin/payment-reconciliation-client.tsx` | razorpay recon | — | — | ✓ | — | 292 | Medium | P1 |
| 13 | `/admin/communications` → `page.tsx` | notification_queue | ✓ | — | ✓ | — | 339 | Medium | P1 |
| 14 | `/admin/coupons` → `page.tsx` | coupons | — | — | ✓ | — | 454 | Medium | P1 |
| 15 | `/admin/reports` → `reports-client.tsx` | multi | ✓ | — | ✓ | — | 416 | High | P1 |
| 16 | `components/admin/admin-insurance-quotations-manager.tsx` | insurance_quotations | — | — | ✓ | — | 644 | High | P1 |
| 17 | `/admin/referrals` → `referral-manager.tsx` | referrals | — | — | ✓ | — | 718 | High | P1 |
| 18 | `/admin/agency-partners/[id]` → `partner-crm-client.tsx` | partner CRM | — | — | ✓ | — | 763 | High | P1 |
| 19 | `components/admin/admin-operations-crm.tsx` | CRM ops | — | — | ✓ | — | 866 | High | P1 |
| 20 | `components/admin/admin-services-list.tsx` | services | — | ✓ | ✓ | — | 1085 | High | P2 |
| 21 | `/admin/automation` → `page.tsx` | automation events | — | — | — | — | 322 | Medium | P2 |
| 22 | `components/admin/crm-sync-logs-client.tsx` | crm_sync_jobs | — | — | — | — | 154 | Low | P2 |
| 23 | `components/admin/dpr-reports-client.tsx` | dpr reports | — | — | ✓ | — | 173 | Low | P2 |
| 24 | `components/admin/itr-reports-client.tsx` | itr reports | — | — | ✓ | — | 188 | Low | P2 |
| 25 | `/admin/offline-invoices/[id]` → `page.tsx` | invoice lines | — | — | ✓ | — | 138 | Low | P2 |

### A category the "25" misses

`/admin/applications`, `/admin/customers` and `/admin/leads` are among the
highest-traffic screens in the panel, but they render **card grids**, not
tables, so no `<table>` grep finds them. They are not in the 25 and should not
be silently folded into it — but they are exactly where `AdminDataTable` pays
off most.

| Route | Component | Lines | Current state |
|---|---|---|---|
| `/admin/applications` | `components/portal/admin-applications.tsx` | 589 | card grid; data layer already returns `pageSize` |
| `/admin/customers` | `components/admin/admin-customer-manager.tsx` | 351 | card grid; data layer pages at 500/batch |
| `/admin/leads` | `components/admin/lead-operations-workspace.tsx` | 617 | already in the 25 (#5) |

I recommend treating these as a **separate P1 batch**, decided on after the
first table batch proves the pattern.

### First 3–5 highest-value migrations

Chosen for business impact and for being small enough to review properly:

1. **`/admin/commissions`** (#1) — financial, has a drifting duplicate mobile
   layout, and is the sibling of a screen already migrated in Phase A. Lowest
   risk, highest pattern reuse.
2. **`/admin/payments`** (#2) — financial, high traffic, small file.
3. **`/admin/wallet`** (#3) — financial, and reads three tables unbounded
   (see B2), so the migration and the correctness fix land together.
4. **`components/admin/admin-leads-list.tsx`** (#4) — duplicate mobile layout,
   small, high traffic.
5. **`/admin/documents`** (#6) — small, and document access is security-adjacent.

### PR batching

**3–5 tables per PR, never one 25-table PR.** Proposed sequence:

| PR | Contents | Rationale |
|---|---|---|
| B-1 | #1, #2, #4 | Financial + the two remaining duplicate mobile layouts |
| B-2 | #3, #6, #7 | Wallet correctness travels with its table |
| B-3 | #8, #9, #10 | Small, independent, low risk |
| B-4 | #11, #12, #13 | Operational screens |
| B-5 | #5 alone | 617 lines, three concerns, the last duplicate layout — deserves its own review |
| B-6+ | the P1/P2 remainder | After the pattern is settled |

---

## B2 — Unbounded query inventory

### Methodology, so the number is auditable

A statement chain is counted as unbounded when it runs `.from(table).select(…)`
with **no** `.range()`, `.limit()`, `.single()`, `.maybeSingle()`, `count:` or
`head: true` anywhere in the same chain, across `src/lib`, `src/app/api` and
`src/app/admin`, excluding tests.

**That gives 149 unbounded list reads, not ~38.** The earlier "~38" in the
Phase A report came from a narrower scan and was an undercount; I am correcting
it rather than repeating it. Of those 149, **65 read tables that carry money or
drive counts**, which is where the plan concentrates.

### Correctness-critical — can silently produce wrong numbers

These read a capped table and then sum or count the result. Past 1,000 rows the
answer is wrong with **no error**.

| File:line | Function / screen | Table | Purpose | Why it breaks |
|---|---|---|---|---|
| `src/lib/ap-payouts.ts:60` | payout queue summary | `ap_payouts` | `requestedAmount`, `paidAmount` | Comment says "totals over every payout" — PostgREST caps it at 1,000 |
| `src/app/admin/reports/page.tsx:53` | Operations Intelligence | `applications` | every report figure + CSV export | 4 unbounded reads feeding one screen |
| `src/app/admin/reports/page.tsx:54–56` | " | `agency_partners`, `ap_commissions`, `reward_wallets` | partner/commission/wallet totals | same |
| `src/app/admin/commissions/page.tsx:32` | Agent Commission Ledger | `commissions` | whole ledger + nested joins | no paging at all |
| `src/lib/ap-fraud.ts:124,165,180` | fraud scoring | `agency_partners`, `ap_payouts`, `ap_wallet_ledger` | risk signals | a truncated history understates risk |
| `src/lib/ap/home-data.ts:95,114,124,170` | partner home | `agency_partners`, `applications` | partner's own counts/earnings | wrong once the instance is large |
| `src/lib/ap-data.ts:131,231,496,552,564,638,649` | partner data layer | `agency_partners`, `applications`, `ap_commissions` | partner rollups | **two of these were fixed in Phase A; the rest were not** |
| `src/lib/admin/ap-commissions-data.ts:96` | commissions list | `agency_partners` | partner name lookup | missing names past 1,000 partners |
| `src/lib/admin/dashboard-data.ts:614` | dashboard partner block | `agency_partners` | partner aggregates | the one gap in an otherwise correct file |
| `src/lib/customer-dashboard-data.ts:119` | customer wallet | `wallet_transactions` | balance display | wrong balance for heavy users |
| `src/lib/crm.ts:64,75` | CRM facts | `invoices` | invoice totals | understated revenue |
| `src/app/api/ap/referrals/analytics/route.ts:90,105,128` | referral analytics | `profiles`, `ap_commissions`, `payment_links` | referral earnings | understated payouts |

**Subtotal: ~30 sites that can produce a wrong number an admin would act on.**

### Performance-critical — correct today, expensive

Bounded in practice by a narrow `.eq()` or a small table, but the read grows
with the instance.

| File:line | Table | Note |
|---|---|---|
| `src/lib/services.ts` (6 sites) | `services`, `service_catalog` | small, slow-growing catalogue |
| `src/lib/itr/cms.ts` (7 sites) | ITR CMS tables | CMS content, bounded by editorial volume |
| `src/lib/agent-services.ts` (4 sites) | `agent_services` | grows with agents × services |
| `src/app/api/admin/services/analytics/route.ts` (3 sites) | multi | analytics route, no user waiting on it |
| `src/lib/admin-crm.ts:264,385` | `profiles`, `payments` | lookup maps |

### Safe / unimportant — do not touch

Config, enum-like and single-tenant tables where 1,000 rows will never be
reached: `labour_schemes`, `service_packages`, `service_categories`,
`homepage_*`, `site_*`, `dpr_*`/`itr_*` page settings, `commission_slabs`,
`agency_partner_tiers`.

**Changing these would be churn with review cost and no benefit.** Explicitly
out of scope.

---

## B3 — The 1,000-row correctness sweep

For each aggregate the user named, the recommended fix — and crucially, whether
it needs a migration at all.

| Aggregate | Where | Recommended solution | Migration? |
|---|---|---|---|
| **Application counts** | `/admin/reports`, partner rollups | `count: "exact", head: true` per status — the pattern `admin-dashboard.ts` already uses | **No** |
| **Partner totals** | `getAdminAgencyPartnerList` | Phase A paged it; move to a `partner_rollups` view only if the paged read becomes slow | Later, if measured |
| **Commissions** | `/admin/commissions`, ap-commissions | Server-side pagination + `count: "exact"` for the header totals | **No** |
| **Wallet** | `/admin/wallet`, customer wallet | **Reuse the existing `admin_dashboard_wallet_liability` RPC** instead of summing in JS | **No — it already exists** |
| **Payouts** | `ap-payouts.ts` summary | `sumPaginated` (already in this repo) for amounts, `count: "exact"` for the counts | **No** |
| **Customer counts** | admin dashboard | Already correct (`count: exact, head: true`) — **verify, don't change** | No |
| **Lead counts** | lead workspace | `count: "exact"` on the filtered query | **No** |
| **Payment totals** | `/admin/payments` | **Reuse the existing `admin_dashboard_payment_totals` RPC** | **No — it already exists** |
| **Dashboard analytics** | `dashboard-data.ts` | Already uses RPCs + `sumPaginated`; only the `agency_partners:614` gap needs fixing | No |

**The headline: almost none of this needs a new migration.** Two of the heaviest
aggregates already have purpose-built RPCs that the older screens simply do not
call. Reusing them is lower risk than writing SQL against a schema I cannot
inspect live.

**If a migration does turn out to be needed**, the repo's conventions are:
filename `YYYYMMDDHHMMSS_snake_case_description.sql`, functions named
`admin_*` / `*_core`, `SECURITY DEFINER` where they cross RLS. I would **not**
write one without first reading the live schema — per your standing instruction,
and because 126 migrations plus possible dashboard-applied changes mean the file
history is not authoritative about current state.

---

## B4 — Colour token migration

### Current count

| Measure | Count |
|---|---|
| Admin colour utilities, narrow pattern (`bg/text/border/ring-<palette>-<shade>`) | **3,768** |
| Admin colour utilities, broad pattern (adds `shadow/accent/divide/outline/fill/stroke/placeholder/from/to/via`) | **3,818** |
| Files affected | 110 |

The Phase A report's 3,762 used the narrow pattern; the small difference is the
responsive work touching two files. Both numbers are given so the target is not
measured against a moving definition.

### By palette — the classification

| Palette | Count | Category | Target token |
|---|---|---|---|
| slate | 2,680 | **Surface / Text / Border** — the bulk | `--ds-surface`, `--ds-surface-sunken`, `--ds-text-*`, `--ds-border` |
| blue | 309 | **Brand / Info** | `--ds-primary`, `--ds-info*` |
| emerald | 222 | **Success** | `--ds-success*` |
| amber | 150 | **Warning** | `--ds-warning*` |
| indigo | 114 | **Chart / data-vis** | needs a chart scale (does not exist yet) |
| red + rose | 189 | **Danger** | `--ds-danger*` |
| orange | 95 | **Brand accent** | `--ds-brand-accent` |
| green, violet, gray, purple, teal, sky, cyan | 59 | **Intentional one-off** | leave, or case-by-case |

`slate` at 2,680 is 71% of the work and is **not** a find-and-replace:
`bg-slate-50` is variously a page background, an inset panel and a disabled
control. Each needs a different token, which is why this is batched per screen
rather than run as a codemod.

### Target and batches

**Target: ~3,300 of 3,768 migrated (≈88%), leaving the intentional one-offs and
the chart palette.** Not 100% — claiming zero would mean converting deliberate
one-offs for the sake of a number.

| Batch | Scope | Count | Priority |
|---|---|---|---|
| C-1 | Status colours across all admin (emerald/amber/red/rose) | ~560 | **P0** — these carry meaning; a wrong green on a failed payment is a real bug |
| C-2 | Screens migrated in each B1 table PR, converted in the same PR | ~1,200 | **P1** — no extra review surface |
| C-3 | The 6 heaviest remaining files (`admin-services-list` 207, `admin-operations-crm` 197, `referral-manager` 161, `partner-crm-client` 161, `admin-itr-cms-manager` 132, `admin-agent-services-manager` 121) | ~980 | **P1** |
| C-4 | Remaining surface/text/border slate | ~560 | **P2** |
| C-5 | Define a chart/data-vis scale, then migrate indigo | ~114 | **P2** — needs a design decision first |

---

## B5 — `AdminDateRangePicker`

### Dependencies — the answer is none

`package.json` has **no** date library: no `date-fns`, `dayjs`, `luxon`,
`moment` or `react-day-picker`. The admin surface already uses native
`<input type="date">` in 7 places (`coupons`, `commission-rule-form`,
`lead-operations-workspace`, `renewal-reminder-card`,
`admin-insurance-quotations-manager`, `payment-reconciliation-client`).

**Recommendation: add no dependency.** Two native `<input type="date">` fields
behind the preset buttons gives a real calendar from the OS, correct
localisation, keyboard and screen-reader support, and zero bundle cost. A
hand-built calendar grid would be ~400 lines to reach parity with what the
browser already ships.

### API

```ts
type DateRangePreset =
  | "today" | "yesterday" | "last7" | "last30"
  | "thisMonth" | "lastMonth" | "custom";

type DateRange = { from: string; to: string; preset: DateRangePreset };
// `from`/`to` are inclusive calendar dates as YYYY-MM-DD, never timestamps.
```

### Timezone safety — the part that actually bites

The whole business runs in **IST (UTC+5:30)**, and the database stores UTC.
`new Date("2026-10-02").toISOString()` yields `2026-10-01T18:30:00Z` — so a
naive "today" filter silently includes 5½ hours of the previous IST day and
drops 5½ hours of the current one. **This is how a daily revenue number comes
out wrong.**

The rule the component will enforce:

- Presets are computed in a **fixed business timezone** (`Asia/Kolkata`), not in
  the browser's — otherwise an admin travelling abroad sees different totals for
  "today" than the one in the office.
- The component emits calendar dates; the **boundary conversion to UTC happens
  once, server-side**, as `>= fromIso` and `< toIso_plus_one_day` — a half-open
  interval, so a row at 23:59:59.999 is neither double-counted nor lost.
- `dashboard-data.ts` already uses exactly this `gte`/`lt` shape, so this is
  consistent with the existing code rather than a new convention.
- Pure functions (`resolvePreset`, `toUtcBounds`) live in `src/lib/admin/` and
  are unit-tested across the IST offset, month ends, leap day and DST-affected
  comparison zones — testable without a DOM, like `table-paging.ts`.

### URL state

`?from=2026-09-01&to=2026-09-30&preset=lastMonth`, written through the existing
`useQueryParams` from Phase A (which exists precisely because sequential
single-param writes overwrite each other). Shareable, bookmarkable, and
server-readable so the filtering stays in the query rather than in the client.

**First screen to adopt it:** `/admin/reports`, which already filters by date
and is a B1 P1 migration — the picker lands with a screen that needs it, not
speculatively.

---

## B6 — Live RLS verification

### What is now established

I ran the repository's dormant RLS suite against a real PostgreSQL 16 in this
container: every one of the 126 migrations replayed in order on the Supabase
stub, then each scenario executed as `anon` or `authenticated` with real JWT
claims.

**Result: 22/22 passed.** Coverage includes private buckets, cross-customer
document access (list/download/overwrite/delete), partner KYC isolation, admin
access by database role, service-role reach, and four role-escalation paths
(`user_metadata`, `public.profiles`, `public.users`, self-clearing KYC/lockout).

### What this is, and is not

> **This is migration-level RLS evidence.**
> **This is NOT "live Supabase RLS verified."**

The suite proves the policies **as defined in the migration files** behave
correctly. It cannot see the live instance. If any policy was added, altered or
disabled through the Supabase dashboard — which leaves no migration file — the
live database differs from what was tested and this result would not show it.

**Live RLS verification remains PENDING.**

### What live verification would need

No credential is required in this session, and none should be pasted anywhere.
The safe options, in order of preference:

1. **Run the same suite in CI against a branch database.** Zero new secrets in
   anyone's hands; `RLS_TEST_DATABASE_URL` as a CI secret. Already supported —
   `npm run test:rls` exists.
2. **A read-only `anon`-role connection to a staging project** restored from a
   production schema dump. Verifies live policy state without touching
   production data.
3. **A schema-only diff**: `pg_dump --schema-only` of production compared
   against the replayed migrations. Shows exactly whether the live database has
   drifted from the files — which is the actual open question.

I would **not** recommend connecting this environment to the production database.

### What to verify once access exists

| # | Check |
|---|---|
| 1 | RLS actually `ENABLED` on all ~141 tables the migrations claim |
| 2 | Admin access works through the intended role, not a bypass |
| 3 | Partner isolation — partner A cannot read partner B's KYC, payouts or wallet |
| 4 | Customer isolation — customer A cannot read customer B's documents or applications |
| 5 | Storage policies — every bucket holding personal data is private |
| 6 | Sensitive tables — `agency_partners` (Aadhaar/PAN/bank), `credit_reports`, `customer_vault_documents` |
| 7 | Service-role usage — server routes only, never reachable from a browser |
| 8 | Cross-tenant — `saas_tenants` / `saas_domains` boundaries hold |

Items 3–6 are covered **at migration level** today; 1, 2, 7 and 8 are not
covered by the suite at all and are genuinely unverified.

---

## Priorities

### P0 — correctness, security, business impact

| | Item | Why |
|---|---|---|
| 1 | Fix the ~30 correctness-critical unbounded reads (B2/B3) | Wrong money and counts, shown with no error |
| 2 | Point `/admin/payments` and `/admin/wallet` at the **existing** RPCs | Fixes totals without writing SQL |
| 3 | `ap-payouts.ts` summary totals | Payout money, and the code comment currently claims a guarantee it does not have |
| 4 | Status-colour tokens (C-1) | A wrong green on a failed payment is a real misread |
| 5 | Table batch B-1 (commissions, payments, leads-list) | Removes the last drifting duplicate mobile layouts |
| 6 | Decide the live-RLS route (CI or staging) | Everything else in B6 is blocked on it |

### P1 — high-traffic UX and performance

7. Table batches B-2 → B-4
8. `AdminDateRangePicker`, landing with `/admin/reports`
9. Colour batches C-2 and C-3
10. Decide whether `/admin/applications` and `/admin/customers` move to `AdminDataTable`
11. Performance-critical unbounded reads

### P2 — consistency and low-risk cleanup

12. Table batch B-5 and the P2 remainder
13. Colour batches C-4 and C-5 (chart scale needs a design decision first)
14. Retire `renderMobileCard` where the generated card is as good
15. Revisit `getAdminAgencyPartnerList` → SQL view, only if measurement justifies it

---

## Risks

| Risk | Mitigation |
|---|---|
| **Live database still unverified** — RLS, actual row counts, whether the 1,000-row cap is already biting | B6 route decision; the cap question can be answered in one minute by someone with dashboard access |
| **PostgREST `db.max_rows` may not be 1,000 here** — if it was raised, some "critical" items are less urgent; if lowered, more are | Confirm the project setting before sequencing P0 |
| **`/admin/reports` and `admin-operations-crm` are large** (416 and 866 lines) | Own PRs, not batched |
| **Colour migration is semantic, not mechanical** | Per-screen, in the same PR as that screen's table |
| **Visual QA still cannot reach Vercel** from this environment | Local rendered QA at 7 viewports as in Phase A; a human preview pass stays valuable |
| **Phase A's own responsive system is proven on 2 screens** | Each B1 batch re-runs the 7-viewport check; a third screen may expose a column-width case the two did not |

---

## Explicitly not in Phase B

AI Copilot · Gemini/OpenAI migration · Meta rewrite · WhatsApp rewrite ·
automation rewrite · CRM architecture rewrite · payment architecture rewrite ·
any large database migration.

The existing Gemini integration remains in place and untouched.
