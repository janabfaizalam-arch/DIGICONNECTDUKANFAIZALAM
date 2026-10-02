# Phase A — Design System Foundation

**Branch:** `feature/admin-phase-a-design-system`
**Baseline:** `5524ef3` (`main`)
**Scope:** A1–A10 of the Phase A brief. Foundations only — no AI, WhatsApp,
Meta, automation, CRM, payment or database-wide work, per the brief's
do-not-do list.

---

## 1. What changed

**A1 — Token consolidation.** `globals.css` carries 291 custom properties
across twelve namespaces, none authoritative. A single semantic layer now sits
on top of them in `src/app/admin-design-tokens.css`, built in three parts:
brand primitives → `--ds-*` semantic tokens → a Tailwind `@theme` mapping that
generates `bg-ds-surface`, `text-ds-text-muted`, `border-ds-border` and the
rest.

Nothing was deleted and no namespace was rewritten. Brand values are **aliased**
rather than re-typed, so `#1268E8` still has exactly one definition
(`--dc-blue-600`) and cannot drift. The only new primitive is Deep Blue
`#0B4FB8`, which the brief names and `globals.css` did not have.

Status colours carry three parts each — `--ds-success`, `--ds-success-soft`,
`--ds-success-border` — because that is how the panel actually renders them.
The `bg-emerald-50 / text-emerald-700 / border-emerald-200` triplet repeated
across the admin surface is now expressed once.

Dark mode overrides the semantic layer only, opt-in via `data-theme="dark"`.
Light is unchanged and remains the default; the architecture is ready without
altering what anyone sees today.

**A2 — Shared primitives.** `AdminPageHeader`, `AdminEmptyState` and
`AdminStatCard` already existed in `admin-shell.tsx` and were deliberately not
duplicated. `AdminStatusBadge` was migrated in place rather than replaced.

**A3 — `AdminDataTable`.** Server-driven: it renders a page of rows and never
holds the dataset. Sorting, paging, search and filters are URL parameters the
server component turns into a bounded query.

**A4 — Responsive.** Mobile cards are generated from the same column
definitions (`primary` columns become the heading, the rest labelled rows), so
pages no longer maintain a second layout. `renderMobileCard` remains for the
screen where the generated card reads worse.

On desktop the table collapses rather than clips. The admin content area is
narrower than the viewport — AdminShell's sidebar takes 280px — so tables that
declare more column width than that are `table-fixed` and obey it, pushing
Actions behind a horizontal scrollbar. `splitColumnsByWidth` sums the declared
widths against the measured area and moves columns into an expandable per-row
details panel until they fit. Nothing is dropped: every value stays reachable
at every width.

The decision is width-driven on purpose. Having each page declare a `hideBelow`
pixel threshold only moves the guess — the commissions table's always-on
columns alone declared 740px against the 652px it gets at a 1024px viewport, so
no threshold could have saved it. `hideBelow` is kept as a readability floor
and as the order in which columns give way; the fitting is arithmetic.

**A7 — Partner list performance,** and a correctness bug found alongside it
(section 4).

**A8 — Security.** No authorization behaviour was changed. The three idioms
(`isAdminRole` ×87, `currentUserHasCapability` ×16, `hasAdminAccess` ×1) are
documented in `ADMIN_2026_AUDIT_AND_PLAN.md` and deliberately **not** unified
in this phase.

---

## 2. Files and components created

| File | Purpose |
|---|---|
| `src/app/admin-design-tokens.css` | The authoritative semantic token layer |
| `src/components/admin/primitives/layout.tsx` | `PageContainer`, `AdminSectionStack`, `AdminSection`, `AdminCard`, `ResponsiveScrollArea` |
| `src/components/admin/primitives/states.tsx` | `TableLoadingState`, `LoadingState`, `ErrorState`, `NoResultsState` |
| `src/components/admin/primitives/controls.tsx` | `SearchInput`, `FilterSelect`, `FilterBar`, `ActionMenu`, `ConfirmDialog`, `useQueryParam(s)` |
| `src/components/admin/primitives/admin-data-table.tsx` | `AdminDataTable` |
| `src/lib/admin/table-paging.ts` | `resolvePageWindow`, `csvField`, `toCsv`, `splitColumnsByWidth`, `parseWidthPx` |
| `src/lib/ap/partner-rollups.ts` | `buildPartnerRollups`, `rollupFor` |

### Primitives from the brief that were **not** built

Honest list, with reasons rather than stubs:

- **`DateRangePicker`** — needs a calendar, locale handling and range
  semantics. A weak one is worse than none; it belongs with the batch that
  migrates a screen that actually filters by date.
- **`CommandAction`, `AIActionButton`** — these are the AI surface. The brief's
  own do-not-do list defers AI to a later phase, and shipping the buttons
  before the confirmation architecture (§41/§48) would invite wiring them up.

---

## 3. Files migrated

Two screens, both chosen because they carried the duplication the table is
meant to remove.

**`/admin/agency-partners`** — had a hand-written desktop table *and* a
separate `lg:hidden` card grid built from the same ten columns. Three
behaviour changes, all fixes:

- Search was a `<form>` that submitted the page; it is now the shared debounced
  input writing the same `q` and `type` params.
- The page renders 25 rows instead of the whole directory.
- Rows crossing to the client are projected down to the twelve fields the table
  draws. `APListItem` carries Aadhaar, PAN, bank account and IFSC — handing the
  whole record to a client component would serialise all of it into the RSC
  payload, readable in the browser, for every partner on screen.

**`/admin/ap-commissions`** — the same duplication, and the mobile copy had
already drifted: it dropped the sale amount and the earned date, and showed
"In wallet" but **never the "Not in wallet" warning**, so the one state an
admin most needs to catch was invisible on a phone.

`getAdminAgencyPartnerList`, `filterAgencyPartners`, `listAdminApCommissions`
and the Excel export are untouched.

---

## 4. Performance — and a correctness bug

`getAdminAgencyPartnerList` ran `applications.filter(...)` and
`commissions.filter(...)` once per partner: O(partners × applications). At 38
partners invisible; at 500 partners and 50,000 applications roughly **25
million array operations per page load**. Indexing each table once is O(A + C).

**The more serious problem was correctness.** Both source queries were
unbounded, and PostgREST caps an unbounded select at `db.max_rows` — **1000 by
default** — returning the truncated set with no error. Past a thousand
applications, every partner's totals were quietly understated. The reads now
page through the full set with a logged ceiling.

> If this instance already has more than 1,000 application rows, the partner
> list has been showing wrong numbers and this phase fixes them. Worth checking
> against the live data.

One deliberate behaviour change: status matching is now case-insensitive. Every
value in `APPLICATION_STATUS_OPTIONS` is lowercase, so this is a no-op for any
row the application wrote; it only rescues a legacy or imported `"Completed"`,
which the original counted as neither completed nor closed.

**Still application-side, not SQL.** Moving the aggregation into a view or RPC
needs a migration, and this environment cannot reach the database to verify one
against a schema carrying wallets and payouts. At current size the distinction
is not observable.

---

## 5. Tests

**+46 tests, 0 removed, 0 weakened.**

| Suite | Tests | Covers |
|---|---|---|
| `src/lib/ap/partner-rollups.test.ts` | 12 | Every counting rule the original expressed, null/blank partner keys, NaN amounts, and a 20,000-row linearity check |
| `src/lib/admin/table-paging.test.ts` | 34 | Page clamping (past-the-end, zero, negative, fractional, non-numeric), slice bounds reassembling the dataset exactly once, CSV quoting of commas, quotes, newlines and leading zeros, BOM, and the responsive column split: that the kept columns always fit the area, that no column is lost from both lists, that a wider area never shows less, and that Actions survives every width |

The vitest environment is `node` with no DOM, so React components cannot be
rendered. The parts of `AdminDataTable` that carry real bug risk — paging
arithmetic and CSV encoding — were extracted into pure functions and tested
directly, rather than asserting on component source.

**One existing test was retargeted, not relaxed.**
`ap-commissions-ui.test.ts` pinned the string `"Not in wallet"` to `page.tsx`;
the markup moved to the table component, so the assertion follows it there and
**gains** one: that the warning stays gated on `creditedToWallet` rather than
on the status.

---

## 6. Build result

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `next lint` | clean on every changed file (2 pre-existing warnings remain in unrelated files) |
| `vitest run` | **1,910 passed**, 22 skipped, 0 failed |
| `next build` | compiled successfully |

Token output was verified in the built CSS rather than assumed:
`.bg-ds-success-soft{background-color:var(--ds-success-soft)}` is generated, and
the chain `--ds-brand-primary → --dc-blue-600 → #1268e8` resolves.

---

## 7. Remaining hardcoded colours

| | |
|---|---|
| Baseline (`origin/main`) | **3,881** |
| Now | **3,762** |
| Removed this phase | **119** |
| `ds-` token utilities now in use | 230, across 10 files |

119 of 3,881 is ~3%. That is the honest state: the migration has **started
systematically** — the tokens exist, the pattern is proven on two screens, and
the badge component every table uses is converted — but the bulk is Phase B,
where it is mechanical and reviewable one page at a time.

They are being replaced by meaning, not find-and-replace: `bg-slate-50` is
variously a page background, an inset panel and a disabled control, and each
needs a different token.

---

## 8. Remaining tables

**25 admin files still hand-roll a table** (excluding the shared component).

**Four still pair a table with a hand-written mobile card layout:**
`admin/commissions`, `admin/ap-commissions`'s sibling ledger,
`components/admin/lead-operations-workspace.tsx`,
`components/admin/admin-leads-list.tsx`.

> **Correction to the audit.** `ADMIN_2026_AUDIT_AND_PLAN.md` said six files
> carried a duplicated mobile layout. That count came from a naive `lg:hidden`
> grep that also matched `admin-shell.tsx`'s responsive navigation, which is
> not a table layout at all. The real figure was five; two are now migrated,
> leaving four (one is a different file than the original list implied).

---

## 9. Recommended Phase B

1. **Migrate the remaining 25 tables, one PR each**, highest traffic first:
   Applications → Customers → Leads → Payments. Applications already has
   server-side pagination in `getAdminApplicationRows`, so it is mostly
   presentation.
2. **Push the page window into the data layer** for the two screens migrated
   here — they currently slice after the query returns.
3. **Move the partner rollups into SQL** (a view or RPC). This is the migration
   deliberately deferred; it needs database access to verify.
4. **Bound the remaining ~38 unbounded selects**, which carry the same silent
   1000-row truncation found in section 4. This is a correctness sweep, not a
   performance one.
5. **Add `DateRangePicker`** with the first screen that filters by date.

---

## 10. Visual QA — what was and was not verified

**Verified: local rendered QA.** The built production bundle (`next build` +
`next start`) was driven with Chromium through Playwright, rendering the real
`AdminShell`, the real page components and the built CSS — not a mock and not a
static reading of the source. Measured at **1440, 1280, 1024, 834, 768, 390 and
375px**:

| | 1440 | 1280 | 1024 | 834 / 768 / 390 / 375 |
|---|---|---|---|---|
| Sidebar | 280 | 280 | 280 | 0 |
| Partner table area | 1068 | 908 | 652 | card layout |
| Table overflows its area | no | no | no | n/a |
| Any cell clipped | no | no | no | no |
| Page scrolls horizontally | no | no | no | no |
| Text under 10px | none | none | none | none |

Both tables on the screen were measured, not just the first. Expanding a row
was then checked at 1440, 1280 and 1024: every column is reachable either in
the table or in the details panel — **nothing missing at any width** — and the
sticky Actions cell is inside the scroll container in every case.

**The 1280px arithmetic**, which is the case that prompted this: viewport 1280
− sidebar 280 = 1000 content, − page padding = 952 card, − card padding = 908
table area. The partner table declared 1176px of columns against that 908, so
it clipped. It now keeps 908px of columns and moves Email, Tier & type and
Applications into the details panel.

**Not verified: Vercel.** Egress from this environment blocks both `rnos.in`
and `*.vercel.app`, so **no deployed page was opened**. What can be said about
Vercel is limited to build and check status. This is not a claim of visual QA
on the preview deployment.

---

## 11. Security items pending

- **Live Supabase RLS verification is pending** because database access is
  unavailable from the current environment. 12 of 126 migrations enable RLS and
  11 create policies, but tables may have been secured through the Supabase
  dashboard, which migration files cannot show. **RLS is not marked verified.**
- **Authorization idioms remain three.** Unifying them is Phase C, as the brief
  directs. No route's guard was changed in this phase.
- No authorization regression: no route handler, guard or capability check was
  touched. The only server-side change is `getAdminAgencyPartnerList`'s read
  strategy.
- One genuine hardening landed as a side effect: the partner table no longer
  ships Aadhaar, PAN and bank details into the client payload.
