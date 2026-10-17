# Admin Panel 2026 — Audit & Implementation Plan

**Date:** 2026-10-01
**Baseline commit:** `5524ef3`
**Scope:** the 62-section "DigiConnect OS" redesign brief.

This is Phase 1 of that brief: audit first, plan second, implement third. Nothing
in the application has been changed by this document.

---

## 1. What we are actually working with

Measured, not estimated:

| | |
|---|---|
| Total `src` lines | 215,186 |
| Pages (`page.tsx`) | 192 — of which **78 are admin** |
| API routes | 237 — of which **134 are `/api/admin`** |
| Components | 305 (63 admin-specific) |
| `lib` modules | 302 |
| Test files | 146 (1,862 passing tests) |
| Supabase migrations | 126 |

**The brief is a programme, not a task.** 62 sections across 14 phases over a
215k-line production system carrying live customer PII, KYC documents, wallets
and payouts. Treating it as one change would mean a long-lived branch diverging
from a repo that merged 14 PRs in the last fortnight. The plan below sequences
it so each phase ships independently and nothing sits unmerged for weeks.

---

## 2. Already built — do not rebuild

The brief asks for several things that exist. Rebuilding them would destroy
working code and waste the budget. Each was opened and read, not just matched by
filename:

| Brief section | Already exists | Size |
|---|---|---|
| §7 Command palette | `components/admin/admin-command-palette.tsx` | 317 lines |
| §6, §39 Global search | `components/admin/admin-global-search.tsx` | 155 lines |
| §30 Notification centre | `components/admin/admin-notifications-bell.tsx` | 176 lines |
| §8 Dashboard | `components/admin/admin-dashboard-view.tsx` | 528 lines |
| §9 Charts | `components/admin/admin-trend-chart.tsx` (Recharts) | 217 lines |
| §14 CRM | `components/admin/admin-operations-crm.tsx` | 865 lines |
| §14 Pipeline (kanban) | `app/admin/leads/pipeline/page.tsx` | 392 lines |
| §18 Automation | `app/admin/automation/page.tsx` | 321 lines |
| §27 Tickets | `app/admin/tickets/page.tsx` | 442 lines |
| §16 WhatsApp console | `app/admin/communications/page.tsx` | 338 lines |
| §43 Audit logging | `lib/ap-audit.ts` | 69 lines |
| §11–13, §20 AI | `lib/ai/gemini.ts`, `service-copy.ts`, `photo-edits.ts` | — |

**AI is already wired to Google Gemini**, not OpenAI, with no SDK dependency —
direct REST. It drafts service copy, edits photos and powers the marketing-agents
console. §42's agent/tool architecture does *not* exist yet; that is new work.

The brief's §57 suggests the OpenAI Platform tool. **Recommendation: keep
Gemini.** Swapping providers is a migration with no user-visible benefit; the
gap is tool-calling and grounding, which can be built on the existing provider.

---

## 3. Findings

### 3.1 Design system — the single biggest problem (§4, §45, §47)

| Measure | Count |
|---|---|
| CSS custom properties in `globals.css` | 291 |
| **Competing token namespaces** | **12** |
| Hardcoded Tailwind colour utilities in admin | **3,776** |
| Distinct hardcoded colour classes | 143 |
| Admin files using `var(--…)` at all | 26 |

The namespaces: `--dc-`, `--dcp-`, `--lc-`, `--lg-`, `--home-`, `--glass-`,
`--mobile-`, `--whatsapp-`, `--soft-`, `--premium-`, plus shadcn's
`--background/--card/--accent` set.

So there is already a token system — four of them, none authoritative, and the
admin surface largely ignores all of them in favour of `bg-slate-50`,
`text-emerald-700`, `border-amber-200` written inline 3,776 times. This is
exactly what §4 forbids, and it is why the panel looks inconsistent: nothing
enforces consistency.

**This finding gates most of the brief.** §3 visual direction, §45 design system
and §47 visual quality cannot be delivered while 143 colour classes are sprayed
across 78 pages. Fix the tokens first or every later phase re-does the work.

### 3.2 No shared DataTable (§46)

There is only the shadcn primitive `components/ui/table.tsx`. **27 admin files
hand-roll their own table**, each with its own column markup, status badges,
empty state and (in 6 cases) a separately hand-written `lg:hidden` mobile card
layout that must be kept in sync by hand.

§46 asks for sorting, filtering, pagination, column visibility, row selection,
bulk actions, export and saved views. Today none of that exists anywhere, and
adding it per-page across 27 files is not viable. One component, adopted
incrementally, is.

### 3.3 Performance — real, measurable (§34)

`lib/ap-data.ts: getAdminAgencyPartnerList()` fetches **every** partner, **every**
application and **every** commission with no `limit`, then for each partner runs
`.filter()` across the full applications and commissions arrays — an O(partners ×
applications) scan in JavaScript on every page load.

At today's 38 partners this is invisible. At 500 partners and 50k applications it
is ~25M array operations per request, plus three unbounded table reads. The same
shape appears elsewhere: across `admin-crm.ts`, `ap-data.ts` and
`admin-customers.ts` there are **63 selects, of which only 25 bound their result
set** — roughly 38 unbounded table reads.

Good news: **67 of 78 admin pages are already React Server Components** (only 11
carry `"use client"`). The server-component foundation §34 asks for is largely in
place.

### 3.4 God components (§45)

| File | Lines |
|---|---|
| `admin-itr-cms-manager.tsx` | 1,845 |
| `admin-dpr-cms-manager.tsx` | 1,479 |
| `admin-agent-services-manager.tsx` | 1,123 |
| `admin-services-list.tsx` | 1,084 |
| `admin-engine-config-tabs.tsx` | 949 |

Ten admin files exceed 700 lines. The two CMS managers are near-identical in
shape — a strong candidate for one shared service-CMS component.

### 3.5 Authorization — three idioms, no hole found (§33)

Across 134 admin API routes:

- `isAdminRole(role)` — 87 routes
- `currentUserHasCapability("x.y")` — 16 routes
- `hasAdminAccess(user)` — 1 route

**No unguarded admin route was found.** An initial grep suggested 17; opening
them showed every one authenticates and then authorises through the
capability system. The finding is **inconsistency**, not exposure: three ways to
express the same intent means a future route can plausibly use none of them and
look normal in review.

Verified clean:
- **No service-role Supabase client anywhere under `src/components/`.**
- Existing `api-route-exposure.test.ts` already fails the build on a new
  unauthenticated service-role write — that guard should be extended, not
  replaced.

### 3.6 Needs live verification — cannot confirm from code

- **RLS coverage.** Of 126 migrations, 12 enable row-level security and 11
  create policies. Whether that covers every table holding customer data cannot
  be read from migration files alone — tables may have been created with RLS
  through the Supabase dashboard. **This must be checked against the live
  database before §53 can be signed off.**
- Egress from this environment is blocked, so nothing here is verified against
  the running site.

### 3.7 Not problems (checked, then cleared)

Worth recording so nobody "fixes" them later:

- `admin/agents`, `admin/partners`, `admin/rewards`, `admin/rewards-referrals`,
  `admin/marketing-agents` are 5–36 line **intentional redirect stubs** for
  backward compatibility, not dead code.
- `admin/services/new-v5` looks orphaned but is linked from `lib/admin/nav.ts`.
- One hardcoded price (`price: 999` in `services/new-v5/page.tsx`) is a form
  default, not a pricing source. Pricing otherwise comes from the database.

---

## 4. Implementation plan

Sequenced so each phase merges on its own and the risky work happens after the
foundations exist. Phases 1–3 unblock everything else; doing them later means
re-doing the phases built on top.

### Phase A — Foundations (highest value, unblocks the rest)

1. **Token consolidation.** One authoritative semantic layer
   (`primary`, `surface`, `border`, `text-*`, `success/warning/danger`) mapped to
   the brand palette (#1268E8, #0B4FB8, #F25A00, #082B63). Existing namespaces
   alias to it rather than being deleted, so nothing breaks on day one.
2. **Shared `DataTable`** with sorting, filtering, pagination, column visibility,
   selection, bulk actions and export — plus a built-in responsive card mode so
   the 6 hand-written mobile layouts disappear.
3. **Shared admin primitives**: `PageHeader`, `KpiCard`, `EmptyState`,
   `Skeleton`, `StatusBadge`, `ChartCard` — several exist in `admin-shell.tsx`
   (592 lines) and need extracting, not rewriting.

### Phase B — Adopt the foundations (mechanical, reviewable)

4. Migrate admin pages onto `DataTable` and the tokens, highest-traffic first:
   Applications → Customers → Partners → Leads → Payments. Each page is its own
   PR. This is where the 3,776 hardcoded classes go.

### Phase C — Correctness & performance

5. Fix `getAdminAgencyPartnerList` (aggregate in SQL, not JS) and bound the ~38
   unbounded selects with pagination.
6. Split the five god components; merge the two near-identical CMS managers.
7. Unify the three authorization idioms behind one helper; extend
   `api-route-exposure.test.ts` to enforce it.

### Phase D — New capability

8. **AI tool/agent layer (§42)** on the existing Gemini client: typed tools
   (`searchCustomers`, `getRevenue`, `draftWhatsAppMessage`, …), never raw SQL,
   with confirmation gates on every mutation and mass action (§41, §48).
9. AI surfaces: Customer 360 summary (§12), lead scoring (§13), insights (§29) —
   each grounded in real queries and labelled as generated.
10. Automation builder upgrade (§18–19) on the existing automation page.

### Phase E — Hardening

11. Live RLS audit against the production schema (§53) — the open question above.
12. Observability surface (§50), accessibility pass (§37), performance budget.

### Sequencing note

Phases A and B are ~70% of the brief's *visible* result and carry the least risk,
because they change presentation, not business rules. Phase D is the most
valuable new capability and the most dangerous — an AI with mutation tools over
wallets and payouts needs the confirmation architecture of §41/§48 built before
the first tool ships, not after.

---

## 5. What this document does not do

- No application code has been changed.
- Nothing is verified against the live site (egress blocked from the build
  environment).
- RLS coverage is **unresolved** and needs database access to settle.
- Canva MCP (§57) requires authorization before it can be used; it is not
  connected in this environment.
