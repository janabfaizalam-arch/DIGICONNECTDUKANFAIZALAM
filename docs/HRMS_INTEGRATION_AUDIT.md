# RNOS India — HRMS Integration Audit

**Date:** 15 November 2026
**Scope:** Read-only audit. No code written, no migration created, no schema changed, no deployment.
**Target policy effective date:** 1 January 2027
**Repository state audited:** `main` @ `90b8e40`

---

## 0. The three things to read first

**1. The word "employee" is already a super-admin in this codebase.**
Three independent layers — two in TypeScript, one in PostgreSQL — map the role strings
`staff`, `team`, `employee`, `processor` and `super_admin` onto `admin`. Creating an
`employee` role the obvious way does not create a limited user; it creates a full
administrator with every CRM capability, including `roles.manage` and `payments.edit`.
This is not a bug to be worked around later — it is the first thing Phase 0 must fix,
and it cannot be fixed by addition alone. See §5.1.

**2. The proposed leave policy is probably below the statutory floor.**
The four Labour Codes came into force on **21 November 2025**, and the central rules were
notified in **May 2026**. Under the OSH Code the accrual is **one day of annual leave per
twenty days worked** with a **30-day carry-forward cap**. For a six-day week that is
roughly 15–18 days a year, not 12, and the carry-forward floor is 30, not 6. A policy may
be *more* generous than the statute; it may not be less. The proposed 12/6 figures need
legal sign-off before a single line is written. See §9.2.

**3. 1 January 2027 is six and a half weeks away.**
Sixteen modules, a payroll engine, a role-model repair and statutory validation cannot
responsibly land in that window. §10 proposes what *can*: a compliance-correct attendance
and leave core live on 1 January, with payroll following once the wage-definition question
is settled.

---

## 1. Current architecture audit

### 1.1 Application framework

| Item | Finding |
|---|---|
| Framework | Next.js **15.5.5**, App Router, React **19.1.0** |
| Language | TypeScript, strict; `npm run type-check` = `tsc --noEmit` |
| Styling | Tailwind CSS **v4** — config-in-CSS (`@theme inline`), no `tailwind.config.*` |
| Data layer | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Validation | `zod` throughout |
| Forms | `react-hook-form` + `@hookform/resolvers` |
| Charts | `recharts` |
| Client fetch | `swr` |
| Money rails | `razorpay` (+ a RazorpayX payout module) |
| AI | `@google/genai` (Gemini) |
| Auth crypto | `argon2` (PIN hashing), `jose` (JWT) |
| Total dependencies | 30 — a deliberately small surface |

The dependency list is lean and current. **No HRMS module requires a new runtime
dependency**, with one possible exception discussed in §8.4 (decimal arithmetic).

### 1.2 Scale of the existing surface

| Measure | Count |
|---|---|
| Admin pages (`src/app/admin/**/page.tsx`) | 92 |
| API routes (`src/app/api/**/route.ts`) | 255 |
| …of which under `/api/admin` | 148 |
| Supabase migrations | 134 (+9 archived) |
| Tables created across migrations | ~180 |
| Test files | 181 |
| …of which contract tests | 46 |
| Scheduled cron jobs (`vercel.json`) | 5 |

This is a large, mature application. HRMS is an addition to a working system, not a
greenfield build, and the audit below is written from that posture.

### 1.3 Deployment

`vercel.json` declares five cron jobs. **Three cron routes exist on disk with no schedule
entry**, which is a live finding independent of HRMS:

| Route on disk | Scheduled in `vercel.json`? |
|---|---|
| `/api/cron/expire-rewards` | yes — `0 2 * * *` |
| `/api/cron/cleanup-prints` | yes — `0 2 * * *` |
| `/api/cron/crm-sync` | yes — `0 3 * * *` |
| `/api/cron/marketing-agents` | yes — `30 4 * * *` |
| `/api/cron/renewal-reminders` | yes — `30 3 * * *` |
| `/api/cron/automation-events` | **no** |
| `/api/cron/comms-outbox` | **no** |
| `/api/cron/lead-followups-due` | **no** |

Either an external scheduler calls those three, or they are not running. HRMS adds at
least four more scheduled jobs (daily attendance close, monthly summary, leave accrual,
payroll run), so **the scheduling story must be established as fact before Phase 1**, not
assumed. Confirm the Vercel plan's cron quota at the same time.

`next.config.ts` sets a full CSP, `frame-ancestors 'none'` everywhere except the homepage
(`'self'`, for the Homepage Studio preview), `X-Frame-Options`, and `nosniff`. HRMS pages
inherit this and need no exception.

---

## 2. Existing reusable components and services

The single most important conclusion of this section: **HRMS should be assembled largely
from parts that already exist and are already tested.** The list below is what to reuse,
with the path, so the implementation phase does not rebuild any of it.

### 2.1 Reuse directly — no change needed

| Need | Existing asset | Path |
|---|---|---|
| Admin page shell, header, back link | `AdminPageHeader` | `src/components/admin/admin-shell.tsx` |
| Page width containers (two widths) | `PageContainer`, `AdminCard` | `src/components/admin/primitives/layout.tsx` |
| Buttons, inputs, selects, fields, skeletons | `AdminButton`, `AdminInput`, `AdminSelect`, `AdminTextarea`, `AdminField`, `AdminSkeleton` | `src/components/admin/primitives/controls-ui.tsx` |
| Responsive data tables with column priority, CSV export | `AdminDataTable`, `AdminColumn` | `src/components/admin/primitives/admin-data-table.tsx` |
| Status colours (one green, one red, both themes, AA-verified) | `STATUS_TONE_CLASS`, `statusTone`, `toneFrom` | `src/lib/admin/status-tone.ts` |
| Empty / error / no-results states | `NoResultsState`, states module | `src/components/admin/primitives/states.tsx` |
| Design tokens, dark mode, reduced motion | `--ds-*` three-layer token system | `src/app/admin-design-tokens.css` |
| Server-side pagination window | `resolvePageWindow`, `splitColumnsByWidth` | `src/lib/admin/table-paging.ts` |
| **Reading >1000 rows safely** | `readPages`, `sumPages`, `countRows` | `src/lib/supabase/paged-read.ts` |
| Currency / date formatting | `safeCurrency`, `safeDate` | `src/lib/admin-format.ts` |
| Immutable audit trail writer | `logAuditEvent` | `src/lib/ap-audit.ts` |
| Auth/security event log + lockout | `logAuthSecurityEvent` | `src/lib/auth/security-log.ts` |
| Admin notification bell | `admin_notifications` table + `src/lib/admin-notifications.ts` | — |
| WhatsApp messaging (AiSensy) | communications outbox | `src/lib/communications/**` |
| Rate limiting | `src/lib/rate-limit.ts` | — |
| File validation on upload | `src/lib/file-validation.ts` | — |

`readPages` deserves emphasis. PostgREST silently truncates at `db.max_rows` (1000).
Attendance is the highest-row-count data this application will ever hold — roughly
`employees × working days`, so a 40-person company crosses 1000 rows in **under five
weeks**. Every attendance aggregate must go through `readPages`/`countRows` or be computed
in SQL. A naive `.select()` will produce a *silently wrong* monthly summary, and therefore
a silently wrong bonus and a silently wrong salary.

### 2.2 Reuse as a pattern — adapt, don't copy

| Need | Closest existing precedent | Why it fits |
|---|---|---|
| **Salary disbursement** | `src/lib/payouts/razorpayx.ts`, `src/lib/ap-payouts.ts`, `ap_payouts`, `ap_payout_items` | Already does bank-account snapshots, a status machine (`requested → processing → paid/rejected`), a mandatory payment reference before "paid", wallet reversal on rejection, and a contract test. Salary payout is the same shape. |
| **State machine with guarded transitions** | `src/lib/ap-payout-transitions.ts` | `allowedTransitions`, `describeTransition`, `requiresPaymentReference`. Leave approval and payroll run states need exactly this. |
| **Multi-level approval workflow** | `src/components/admin/admin-operations-crm.tsx` approval hierarchy (Executive → Branch Manager → Operations Manager → Admin) | The UI and state vocabulary for a tiered approval already exist, though currently backed by component state rather than tables. |
| **Document vault with private storage** | `customer_vault_documents`, `application_documents`, the `documents` bucket | The `documents` bucket has **no anon and no authenticated read policy at all** (`20260926090000_close_documents_bucket_reads.sql`) — reads go through the service role and signed URLs. This is the right model for employee documents and should be copied, not relaxed. |
| **KYC-style profile with bank details** | `agency_partners`, `agents` | Already carries `bank_account_name/number/ifsc`, `upi_id`, PAN, Aadhaar, `kyc_status`. The employee profile is a near-identical shape. |
| **Commission/ledger accrual** | `ap_commissions`, `ap_wallet_ledger`, `src/lib/ap-commission-engine.ts` | Append-only ledger with reversal entries rather than mutation. Payroll must use the same discipline. |
| **Per-entity timeline** | `entity_timelines` | Employee history (joined, promoted, warned, exited) fits without a new table shape. |

### 2.3 Do **not** reuse

- **`agents` table.** Despite the name, this is a *retail agent* — `shop_name`,
  `shop_address`, `commission_rules`, `kyc_status`. It is a revenue partner, not an
  employee. Do not overload it.
- **`profiles.commission_rate`.** Partner economics. Salary must not live here.
- **The `admin_notifications` table for employee notifications.** It has no recipient
  column — it is a single global admin feed (`type, title, message, related_type,
  related_id, is_read`). Employee-addressed notifications need a recipient. See §4.7.

---

## 3. Authentication and employee account structure

### 3.1 How authentication actually works today

There are **four** parallel ways a request becomes an authenticated user, resolved in
order by `getCurrentUser()` (`src/lib/auth.ts`):

1. **Supabase Auth session** (`supabase.auth.getUser()`) — the primary path.
2. **Admin PIN JWT** — cookie `ADMIN_ACCESS_TOKEN_COOKIE`, verified by
   `verifyAdminAccessToken`, requires `payload.role === "admin"`.
3. **Customer PIN JWT** — cookie `ACCESS_TOKEN_COOKIE`, `payload.role === "customer"`.
4. **A development mock user** when Supabase is unconfigured and `NODE_ENV === "development"`.

Role is then resolved by `getCurrentUserRole()` in this precedence:
`app_metadata.role` (trusted) → admin allowlist → two hardcoded email special-cases →
`profiles.role` → `users.role` → `"customer"`.

The code is explicit and correct about *never* trusting `user_metadata`, with a comment
explaining why (any signed-in user can rewrite their own `user_metadata` with the anon
key). `trustedTokenRole()` reads `app_metadata` only. This is good hygiene and HRMS must
not weaken it.

### 3.2 There is no employee account today

There is no employees table, no staff UI, and no employee login path. `find src/app -ipath
"*staff*" -o -ipath "*employee*" -o -ipath "*hr*"` returns **nothing**.

What *does* exist is a **dormant, partially-demolished staff system**:

- `public.app_role` is a PostgreSQL enum containing `('super_admin', 'admin', 'agent', 'staff', 'customer')`.
- `public.users.role` has a CHECK constraint allowing the same five values.
- `applications.assigned_staff_id` and `applications.staff_note` columns still exist.
- Migration `20260501110000_staff_panel.sql` created a **properly scoped** staff model —
  `is_staff_role()` plus RLS policies letting a staff member read and update only
  applications where `assigned_staff_id = auth.uid()`.
- Migration `20260519133000_three_role_architecture_cleanup.sql` then **dismantled it**:
  it `UPDATE`d every `staff`/`employee`/`team`/`processor`/`super_admin` row to `admin`
  across `profiles`, `users`, `auth.users` metadata and audit columns, dropped all ten
  scoped staff policies, and dropped `is_staff_role()`.

So the enum value survives, the column survives, the scoping does not. **A row with
`profiles.role = 'staff'` today is a full administrator.**

### 3.3 Decision required: which login does an employee use?

This is a product decision the audit cannot make, and it changes the schema. Three options:

| Option | Mechanism | Pros | Cons |
|---|---|---|---|
| **A. Supabase Auth, new role** | Employee gets an `auth.users` row; `app_metadata.role = 'employee'` | Reuses the trusted-token path, RLS works naturally, password reset exists | Requires the §5.1 alias repair first |
| **B. Employee PIN JWT** | A third PIN cookie beside admin and customer | Matches how admin and customers already log in; mobile-friendly for punch-in | A fourth auth path in a file that already has three; more surface to secure |
| **C. Admin account + employee record** | Employee *is* an admin user, HRMS reads a linked `hr_employees` row | Fastest to build | **Rejected.** Every employee would see every customer, payment and payout. Non-starter. |

**Recommendation: A**, with B as a later additive convenience for punch-in if a PWA
turns out to be insufficient. A is the only option that produces a genuinely limited
account, and it is the only one that lets RLS do real work.

---

## 4. Existing RBAC and permission system

### 4.1 The role model

The canonical runtime role type is three values (`src/lib/auth.ts:139`):

```ts
export type AppRole = "admin" | "agency_partner" | "customer";
```

`CRM_PERMISSION_MATRIX.md` states the intent plainly: *"Finer job titles (Owner, Manager,
Counter, Accountant) are UI/capability aliases mapped onto `admin` until a dedicated role
migration is approved."* HRMS **is** that dedicated role migration finally coming due.

### 4.2 The capability layer

`src/lib/crm/permissions-core.ts` defines **30 capabilities** (`customers.view`,
`payments.edit`, `staff.manage`, `roles.manage`, `audit.view`, `exports.run`, …) and three
static capability sets. It is a pure module with no server imports, which makes it cheap to
unit-test — a good foundation to extend rather than replace.

Its weakness is that capabilities are **derived from role alone**. There is no per-user
grant, no scope object, no deny list. For HRMS that is insufficient: "this manager may
approve leave for their own team but may not see payroll" is not expressible today.

### 4.3 The alias trap — the audit's most important finding

The same alias set appears in **three** places, and all three promote to admin:

**(a) `src/lib/auth.ts:141`**
```ts
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);
```

**(b) `src/lib/crm/permissions-core.ts:34`**
```ts
const ADMIN_ALIASES = new Set(["admin", "super_admin", "staff", "team", "employee", "processor"]);
```

**(c) PostgreSQL `public.current_app_role()`**, as rewritten by
`20260926091000_block_role_self_escalation.sql`:
```sql
select case
  when role in ('super_admin', 'staff', 'team', 'employee', 'processor') then 'admin'
  when role in ('admin', 'agent', 'customer') then role
  else 'customer'
end
```

**Consequence:** setting any user's role to `'employee'` — in `profiles`, in `users`, or in
`app_metadata` — grants `isAdminRole() === true`, passes the `/admin` middleware gate,
and returns all 30 CRM capabilities. The RLS helper agrees. There is no layer that
disagrees.

**Why removing the aliases is itself dangerous:** the fallback in each layer is
`'customer'`, not an error. Any production row still carrying one of these strings would be
*silently demoted to customer* the moment the alias is dropped — losing access rather than
gaining it, but losing it without warning. The `20260519133000` migration converted the
known rows to `admin`, but that was eighteen months ago and the enum still accepts `staff`.

**Required before any HRMS role work (Phase 0):**
1. Query production for the live distribution of `profiles.role`, `users.role` and
   `auth.users.raw_app_meta_data->>'role'`. Count every distinct value. *This is a read,
   and it is the one production interaction this audit recommends.*
2. Only then remove the aliases, in all three layers in one change, with the RLS
   integration test extended to prove an `employee` row is **not** an admin.
3. Keep `super_admin` mapped to admin if and only if the query shows live rows using it.

### 4.4 Role self-escalation is already blocked

`20260926091000_block_role_self_escalation.sql` is a well-reasoned migration. It removed
`user_metadata` from role resolution and added a trigger refusing changes to privileged
columns (`role`, `kyc_status`, lockout counters, risk and reward flags) unless the caller
is the service role, a database owner, or already an admin. HRMS inherits this protection.
**`hr_employees.salary` and the payroll tables must be added to that trigger's protected
column set.**

### 4.5 Where authorization is actually enforced

Three idioms coexist, documented in the Phase A audit and still true:

1. **Middleware** (`src/middleware.ts`, 660 lines) — route-prefix gating, redirects.
2. **Per-page server guard** — `getCurrentUser()` → `getCurrentUserRole()` → `isAdminRole()`
   → `redirect()`, repeated at the top of each admin page.
3. **Per-route API guard** — enforced by a contract test (`src/lib/api-route-exposure.test.ts`)
   that walks every `route.ts` and fails the build if it shows no recognised guard pattern.

**Critical architectural note:** **114 of the 266 files** under `src/app/admin` and
`src/app/api/admin` call `getSupabaseAdmin()` — the **service-role client, which bypasses
RLS entirely**. RLS is therefore a *second*
line of defence for direct PostgREST access, not the primary boundary for the panel. The
primary boundary is the TypeScript guard at the top of each page and route.

For HRMS this means: **RLS alone will not protect salary data from an over-broad admin
page.** Both layers must be written, and the TypeScript layer is the one that matters most.

### 4.6 Audit logging

Two independent trails exist:

- **`audit_logs`** via `logAuditEvent()` — `actor_id`, `actor_role`, `action`,
  `entity_type`, `entity_id`, `old_data`, `new_data`, `metadata`. Described as
  "immutable append-only". **It swallows its own errors** (`catch { console.error }`) so
  that audit failure never blocks the main flow. That is the right call for commission
  logging and the **wrong** call for payroll: a salary change whose audit write failed must
  fail the transaction. HRMS needs a strict variant.
- **`auth_security_events`** via `logAuthSecurityEvent()` — login attempts, lockouts.

Table-specific trails also exist (`commission_audit_logs`, `credit_audit_logs`,
`service_audit_logs`, `reward_audit_logs`, `communication_ops_audit`), so a dedicated
`hr_audit_logs` is consistent with house style.

### 4.7 Notification infrastructure

| Channel | Asset | Fit for HRMS |
|---|---|---|
| Admin bell | `admin_notifications` | Global feed, **no recipient column** — usable for "leave request pending" to admins, not for employee-addressed messages |
| WhatsApp | AiSensy outbox, `whatsapp_messages`, `communication_delivery_events`, retry/cancel, cron `comms-outbox` | **Strong fit** — salary slip ready, leave approved, late-coming alert |
| Queue | `notification_queue` | Present; confirm whether live before depending on it |
| Customer preferences | `customer_communication_preferences` + history | The consent pattern to copy for employee communication preferences |

**Gap:** there is no per-employee notification inbox. Either add a recipient column to a
new `hr_notifications` table or generalise `admin_notifications`. Recommend the former —
do not change a table 92 admin pages may read.

---

## 5. Proposed HRMS architecture

### 5.1 Phase 0 — the role model repair (blocking prerequisite)

Nothing else in this plan is safe until this lands.

1. **Measure production** — distinct values and counts for `profiles.role`, `users.role`,
   `auth.users.raw_app_meta_data->>'role'`. Read-only.
2. **Introduce `employee` as a genuine fourth role**, not an alias:
   - extend `AppRole` to `"admin" | "agency_partner" | "customer" | "employee"`
   - remove `employee`, `staff`, `team`, `processor` from all three alias sets
   - add `'employee'` to the `app_role` enum and the `users.role` CHECK
   - rewrite `current_app_role()` to return `'employee'` for employee rows
3. **Extend the capability layer** with a scope-aware signature:
   ```
   can(actor, capability, scope?)    // scope: { employeeId } | { teamId } | { branchId }
   ```
   keeping `roleHasCapability` as the role-level default and adding per-user grants.
4. **Prove it with tests** — an `employee` row must fail `isAdminRole()`, fail the
   `/admin` middleware gate, and receive an empty CRM capability set. Add to the RLS
   integration suite so the database agrees.

**Estimated size:** 1 PR, touching `auth.ts`, `permissions-core.ts`, `middleware.ts`, one
migration, and roughly 15 tests. This is the highest-risk change in the whole programme
because it touches live authorization — it must go in alone, with nothing else in the PR.

### 5.2 Module architecture

```
src/lib/hr/
  employees/        profile CRUD, employment lifecycle, documents
  attendance/       punch engine, day-close, late rules, monthly summary
  leave/            entitlement, accrual, balance, request workflow, encashment
  payroll/          salary structure, run engine, slip generation, disbursement
  policy/           versioned, dated rule resolution  ← the compliance spine
  reports/          HR reporting
  notifications/    employee-addressed messaging

src/app/admin/hr/           admin + HR manager screens
src/app/employee/           the employee's own portal (new route group)
src/app/api/hr/             HRMS API routes
```

### 5.3 The policy engine — the most important design decision

**Do not hardcode any rule.** Not 12 days, not ₹1,000, not 25 days, not 1.5×.

The user's own brief says the legal position is unvalidated, and §9 shows it genuinely is.
A hardcoded rule means a migration and a deploy every time a statute, a state rule or a
company decision moves — and these are moving right now.

Instead, `hr_policies` stores **versioned, date-effective rule sets**, and every
calculation resolves its rule *as of the date being calculated*:

```
resolvePolicy(key, asOfDate) -> value
```

This gives, for free: the 1 January 2027 effective date; correct recalculation of
historical months after a rule change; an audit answer to "which rule produced this
figure?"; and the ability to change a number without a deploy. The quarterly reward,
the bonus amounts, the leave entitlement, the encashment multiplier and the late-coming
grace all become rows.

**It also directly satisfies the brief's instruction not to hardcode legally unverified
rules.**

### 5.4 Attendance capture

Decisions required before implementation (see §12):

- **Punch mechanism** — web PWA, geofence, selfie, biometric device, or IP allowlist?
- **Multi-branch** — `branch_wallets` and `/admin/branches` exist; is attendance per branch?
- **Shifts** — single fixed shift or rosters?
- **Grace period** — what time is "late", and is there a grace window?
- **Half-day** — does a half-day exist, and how does it affect the bonus?

The schema in §6 is deliberately capture-agnostic: it records a punch with an optional
location, device and method, so a biometric integration later is an added `method` value,
not a migration.

---

## 6. Database schema proposal

Table count: 14 new tables, all prefixed `hr_` to keep them unambiguous among the ~180
existing. **No existing table is modified except as noted in §11.**

### 6.1 Identity and profile

```
hr_employees
  id                  uuid pk
  user_id             uuid unique references auth.users(id)   -- the login
  employee_code       text unique not null                     -- RNOS-EMP-0001
  full_name           text not null
  personal_email      text
  work_email          text
  mobile              text not null
  date_of_birth       date
  gender              text
  blood_group         text
  emergency_contact   jsonb
  address             jsonb
  branch_id           uuid references ...                      -- see §12
  department          text
  designation         text
  employment_type     text    -- permanent | probation | fixed_term | intern | consultant
  date_of_joining     date not null
  probation_end_date  date
  date_of_exit        date
  exit_reason         text
  reporting_to        uuid references hr_employees(id)
  status              text not null default 'active'
                      check (status in ('active','probation','notice','exited','suspended'))
  pan_number          text
  aadhaar_last4       text          -- NEVER the full number; see §9.5
  uan_number          text          -- EPF
  esic_number         text
  bank_account_name   text
  bank_account_number text
  bank_ifsc           text
  bank_name           text
  created_at / updated_at / created_by
```

`hr_employee_documents` — mirrors `application_documents`: `employee_id`, `doc_type`,
`storage_path`, `file_name`, `mime_type`, `size_bytes`, `uploaded_by`, `verified_by`,
`verified_at`, `expires_at`. Files live in a **new private bucket `hr-documents`** with
the same zero-public-read policy as `documents`.

### 6.2 Attendance

```
hr_attendance_punches          -- raw, append-only, never updated
  id, employee_id, punched_at timestamptz, direction ('in'|'out'),
  method ('web'|'pwa'|'biometric'|'manual'), latitude, longitude,
  accuracy_m, ip_address, user_agent, device_id,
  branch_id, created_by, note

hr_attendance_days             -- one derived row per employee per date
  id, employee_id, work_date date,
  first_in timestamptz, last_out timestamptz,
  worked_minutes integer,
  status ('present'|'absent'|'half_day'|'weekly_off'|'holiday'|'on_leave'),
  late_minutes integer not null default 0,
  is_late boolean not null default false,
  early_exit_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  leave_request_id uuid,
  regularised_by uuid, regularisation_reason text,
  policy_version_id uuid,     -- which rules produced this row
  unique (employee_id, work_date)

hr_attendance_monthly          -- the bonus and payroll input
  id, employee_id, year, month,
  working_days, present_days, absent_days, half_days,
  late_count, leave_days, holiday_days, weekly_offs,
  punctual_days,
  bonus_punctuality_amount numeric(12,2),
  bonus_attendance_amount  numeric(12,2),
  computed_at, policy_version_id, locked boolean default false,
  unique (employee_id, year, month)
```

The raw/derived split matters: punches are evidence and are never edited; a correction is a
*regularisation* recorded on the derived day row with an actor and a reason. This is what
makes the attendance trail defensible.

### 6.3 Leave

```
hr_leave_types          -- earned | casual | sick | maternity | paternity | unpaid | comp_off
  id, code, label, is_paid, accrual_method, max_carry_forward,
  encashable, requires_document_after_days, gender_restriction, active

hr_leave_balances
  id, employee_id, leave_type_id, year,
  opening_balance, accrued, carried_forward, taken,
  encashed, lapsed, closing_balance,
  unique (employee_id, leave_type_id, year)

hr_leave_requests
  id, employee_id, leave_type_id, from_date, to_date,
  days numeric(4,1),            -- 0.5 for half-day
  reason text, document_path text,
  status ('draft'|'pending'|'approved'|'rejected'|'cancelled'|'withdrawn'),
  applied_at, decided_at, decided_by, decision_note,
  current_approval_level integer

hr_leave_approvals      -- one row per level; supports the multi-level workflow
  id, leave_request_id, level integer, approver_id,
  status ('pending'|'approved'|'returned'|'rejected'),
  acted_at, remarks

hr_leave_ledger         -- append-only; every balance movement
  id, employee_id, leave_type_id, year,
  entry_type ('accrual'|'opening'|'carry_forward'|'taken'|'encashed'|'lapsed'|'adjustment'|'reversal'),
  days numeric(5,1), reference_type, reference_id,
  policy_version_id, created_by, created_at
```

The ledger is the source of truth; `hr_leave_balances` is a materialised view of it. This
is the same discipline `ap_wallet_ledger` already uses, and it is what lets a wrong
approval be *reversed* rather than *edited*.

### 6.4 Payroll

```
hr_salary_structures    -- date-effective; never updated in place
  id, employee_id, effective_from date, effective_to date,
  ctc_annual numeric(12,2),
  basic numeric(12,2), hra numeric(12,2), da numeric(12,2),
  special_allowance numeric(12,2), other_allowances jsonb,
  employer_pf numeric(12,2), employer_esi numeric(12,2),
  created_by, created_at, approved_by, approved_at

hr_payroll_runs
  id, year, month, status ('draft'|'calculated'|'approved'|'disbursed'|'cancelled'),
  total_gross, total_deductions, total_net, employee_count,
  calculated_at, calculated_by, approved_at, approved_by,
  policy_version_id, locked boolean default false,
  unique (year, month)

hr_payslips
  id, payroll_run_id, employee_id,
  paid_days, lop_days,
  earnings jsonb,          -- itemised, snapshot of the structure used
  deductions jsonb,        -- PF, ESI, TDS, advance, LOP
  bonuses jsonb,           -- attendance + punctuality + quarterly
  gross numeric(12,2), total_deductions numeric(12,2), net numeric(12,2),
  pdf_path text,
  disbursement_status, disbursement_reference, disbursed_at,
  unique (payroll_run_id, employee_id)

hr_payroll_components   -- line-level audit of every figure
  id, payslip_id, component_code, component_label,
  component_type ('earning'|'deduction'|'employer_contribution'),
  amount numeric(12,2), formula_note text, policy_version_id
```

### 6.5 Policy and audit

```
hr_policies
  id, key text, value jsonb, effective_from date, effective_to date,
  legal_basis text,        -- 'OSH Code s.32' | 'company policy' | 'UP S&E Act s.10'
  verified_by text, verified_on date,
  created_by, created_at, notes
  unique (key, effective_from)

hr_audit_logs
  id, actor_id, actor_role, action, entity_type, entity_id,
  old_data jsonb, new_data jsonb, metadata jsonb,
  ip_address, created_at
```

`legal_basis` and `verified_by` are not decoration. They are how the system answers
"who said 12 days was correct, and when?" — the exact question the brief raises.

### 6.6 Indexing and volume

| Table | Rows after 1 year, 40 employees | Required index |
|---|---|---|
| `hr_attendance_punches` | ~25,000 | `(employee_id, punched_at desc)` |
| `hr_attendance_days` | ~12,500 | `(employee_id, work_date desc)`, `(work_date)` |
| `hr_attendance_monthly` | 480 | `(year, month)` |
| `hr_leave_ledger` | ~2,000 | `(employee_id, leave_type_id, year)` |
| `hr_payslips` | 480 | `(payroll_run_id)`, `(employee_id, …)` |

Every one of these crosses `db.max_rows = 1000`. §2.1 applies to all of them.

---

## 7. RBAC permissions matrix

### 7.1 Proposed HR capabilities

New capabilities, in the existing `domain.action` style:

```
employees.view            employees.view_own
employees.create          employees.edit          employees.terminate
employees.view_sensitive                        -- PAN, Aadhaar4, bank, salary
attendance.view           attendance.view_own
attendance.punch          attendance.regularise   attendance.export
leave.request             leave.view              leave.view_own
leave.approve_l1          leave.approve_l2        leave.cancel
leave.adjust_balance      leave.encash
payroll.view              payroll.view_own
payroll.run               payroll.approve         payroll.disburse
payroll.edit_structure
hr.reports                hr.settings             hr.audit_view
```

### 7.2 Proposed roles

Four HR-facing roles layered on the repaired role model. `hr_manager` and `team_lead` are
**capability grants on top of `employee`**, not new top-level `AppRole` values — this
keeps `AppRole` at four and puts the finer distinctions where §4.2 says they belong.

| Capability | admin | hr_manager | team_lead | employee | agency_partner | customer |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `employees.view` | Y | Y | S (team) | N | N | N |
| `employees.view_own` | Y | Y | Y | Y | N | N |
| `employees.create` | Y | Y | N | N | N | N |
| `employees.edit` | Y | Y | N | self (limited) | N | N |
| `employees.terminate` | Y | Y | N | N | N | N |
| `employees.view_sensitive` | Y | Y | **N** | self | N | N |
| `attendance.view` | Y | Y | S (team) | N | N | N |
| `attendance.view_own` | Y | Y | Y | Y | N | N |
| `attendance.punch` | N | Y | Y | Y | N | N |
| `attendance.regularise` | Y | Y | S (team) | N | N | N |
| `attendance.export` | Y | Y | N | N | N | N |
| `leave.request` | N | Y | Y | Y | N | N |
| `leave.view` | Y | Y | S (team) | N | N | N |
| `leave.approve_l1` | Y | Y | S (team) | N | N | N |
| `leave.approve_l2` | Y | Y | N | N | N | N |
| `leave.adjust_balance` | Y | Y | N | N | N | N |
| `leave.encash` | Y | Y | N | N | N | N |
| `payroll.view` | **see note** | Y | N | N | N | N |
| `payroll.view_own` | Y | Y | Y | Y | N | N |
| `payroll.run` | N | Y | N | N | N | N |
| `payroll.approve` | Y | N | N | N | N | N |
| `payroll.disburse` | Y | N | N | N | N | N |
| `payroll.edit_structure` | Y | Y | N | N | N | N |
| `hr.reports` | Y | Y | N | N | N | N |
| `hr.settings` | Y | Y | N | N | N | N |
| `hr.audit_view` | Y | N | N | N | N | N |

**Y** = allowed · **N** = denied · **S** = scoped (own team / own record)

### 7.3 Three deliberate separations

1. **An approver cannot approve their own leave.** `leave.approve_l1` must additionally
   check `approver_id != employee_id` at every level. Enforce in the pure module and test it.
2. **`payroll.run` and `payroll.approve` are never held by the same role.** The person who
   calculates salary is not the person who releases it. `hr_manager` runs, `admin`
   approves and disburses. This is the single most valuable control in the whole matrix.
3. **`team_lead` must not have `employees.view_sensitive`.** A team lead approving leave has
   no business reading a colleague's salary, PAN or bank account.

### 7.4 The open question the business must answer

**Should every `admin` see every salary?**

Today there is one admin role and it sees everything. If RNOS has more than one
administrator, payroll visibility is a real exposure the current model cannot express.
Options: (a) accept it; (b) gate `payroll.view` behind an explicit per-user grant even for
admins; (c) add a `payroll_officer` grant and remove bulk `payroll.view` from plain admin.

**Recommendation: (b).** It costs one extra grant row and prevents the most likely
HR data incident this system will ever have.

---

## 8. API routes proposal

All under `/api/hr`, following the existing conventions: `zod` body validation, an
explicit guard at the top of every handler (enforced by `api-route-exposure.test.ts`),
`getSupabaseAdmin()` for the write, and `logAuditEvent` for anything that changes state.

### 8.1 Employee

```
GET    /api/hr/employees                  employees.view        list, paginated
POST   /api/hr/employees                  employees.create
GET    /api/hr/employees/[id]             employees.view | view_own
PATCH  /api/hr/employees/[id]             employees.edit
POST   /api/hr/employees/[id]/terminate   employees.terminate
GET    /api/hr/employees/[id]/documents   employees.view | view_own
POST   /api/hr/employees/[id]/documents   employees.edit | self
GET    /api/hr/me                         (any employee)        own profile
```

### 8.2 Attendance

```
POST   /api/hr/attendance/punch           attendance.punch      { direction, lat, lng, accuracy }
GET    /api/hr/attendance/today           attendance.view_own
GET    /api/hr/attendance                 attendance.view       ?employeeId&from&to
POST   /api/hr/attendance/regularise      attendance.regularise { date, status, reason }
GET    /api/hr/attendance/monthly         attendance.view       ?year&month
GET    /api/hr/attendance/export          attendance.export
POST   /api/cron/hr-attendance-close      CRON_SECRET           nightly day-close
POST   /api/cron/hr-monthly-summary       CRON_SECRET           1st of month
```

### 8.3 Leave

```
GET    /api/hr/leave/balance              leave.view_own
POST   /api/hr/leave/requests             leave.request
GET    /api/hr/leave/requests             leave.view | view_own
PATCH  /api/hr/leave/requests/[id]        leave.request         (withdraw, while pending)
POST   /api/hr/leave/requests/[id]/decide leave.approve_l1/l2   { decision, remarks }
POST   /api/hr/leave/adjust               leave.adjust_balance
POST   /api/hr/leave/encash               leave.encash
POST   /api/cron/hr-leave-accrual         CRON_SECRET           monthly/annual accrual
```

### 8.4 Payroll

```
GET    /api/hr/payroll/structures/[employeeId]  payroll.edit_structure | view_own
POST   /api/hr/payroll/structures               payroll.edit_structure
POST   /api/hr/payroll/runs                     payroll.run        { year, month } → draft
POST   /api/hr/payroll/runs/[id]/calculate      payroll.run
POST   /api/hr/payroll/runs/[id]/approve        payroll.approve    (≠ calculator)
POST   /api/hr/payroll/runs/[id]/disburse       payroll.disburse   → RazorpayX
GET    /api/hr/payslips                         payroll.view | view_own
GET    /api/hr/payslips/[id]/pdf                payroll.view | view_own  (signed URL)
```

**Punch endpoint hardening** — `/api/hr/attendance/punch` is the one HRMS route that will
be called from an employee's phone, repeatedly, from outside the office network. It needs
`src/lib/rate-limit.ts`, strict `zod` bounds on coordinates, server-side time only (never a
client-supplied timestamp), and idempotency so a double tap does not create two punches.

---

## 9. Payroll calculation design

### 9.1 Core formula (structure, not final figures)

```
paid_days      = working_days − lop_days
gross          = Σ earnings × (paid_days / working_days)
bonuses        = punctuality + full_attendance + quarterly   ← policy-resolved
deductions     = employee_pf + employee_esi + tds + advances + other
net            = gross + bonuses − deductions
```

Every component writes an `hr_payroll_components` row carrying the `policy_version_id`
that produced it, so any figure can be explained months later.

### 9.2 The statutory position — and why the proposed rules need legal sign-off

The brief asks for this validation, and it is warranted. **The law changed materially
twelve months ago and the rules under it were notified six months ago.**

| Finding | Source | Confidence |
|---|---|---|
| The four Labour Codes took effect **21 November 2025**, consolidating 29 Acts | PIB press release; multiple law-firm notes | **High** — government source |
| Central rules under all four Codes notified **8–9 May 2026** | Law-firm and advisory trackers | Medium-high |
| **State** rules vary; several states had notified by March 2026 | Implementation trackers | **Uttar Pradesh's position is NOT established by this audit** |
| OSH Code s.32: annual leave accrues at **1 day per 20 days worked**; eligibility **180 days** (down from 240) | Multiple consistent secondary sources | Medium-high — statute text not read directly |
| OSH Code: carry-forward capped at **30 days**; excess encashable | Same | Medium |
| Encashment is computed on **wages as defined in the Code on Wages** | Same | Medium |
| Code on Wages 50% rule — **interpretation is genuinely disputed**: "basic must be ≥50% of CTC" vs "excluded allowances must not exceed 50% of total remuneration" | S.S. Rana & Co. and Deloitte take the narrower reading; most payroll vendors take the broader one | **Low — unresolved** |
| EPF registration **20+** employees; ESI **10+** (₹21,000 wage ceiling) | Payroll advisories | Medium |
| EPF wage ceiling possibly raised to **₹25,000 from 17 September 2026** | Several 2026 guides cite S.O. 5109(E); older guides still say ₹15,000 | **Low — must be checked against the gazette** |
| Gratuity: 15 days' wages per completed year after 5 years, ₹20 lakh cap; fixed-term eligibility reduced to 1 year | Payroll advisories | Medium |
| **POSH Act** internal-committee threshold | **Not covered by this research** | **Unverified** |
| **Uttar Pradesh professional tax** | **Not covered by this research** | **Unverified** |

### 9.3 Direct conflicts with the proposed policy

**Leave — 12 days annual entitlement.**
At 1 day per 20 days worked on a six-day week (~26 working days/month, ~300/year), accrual
is **~15 days**, not 12. A company policy may exceed the statutory floor; it may not fall
below it. **The proposed 12 is likely below the floor and must not be implemented as
specified without legal confirmation.**

**Leave — 6 days maximum carry forward.**
The OSH Code's carry-forward cap appears to be **30 days**, and a cap in a statute of this
kind is a worker protection, not a ceiling on employer generosity. Capping at 6 would
likely extinguish leave the employee is entitled to retain. **High risk. Must be confirmed
before build.**

**Encashment at 1.5× daily salary.**
Paying *more* than the statutory rate is generally permissible. The risk is the **base**:
statutory encashment is computed on *wages as defined by the Code on Wages*, and if the
company's "daily salary" means basic-only while the statute means a wider figure, 1.5×
a narrow base can still be *less* than 1.0× the correct base. **Define the base before the
multiplier.**

**Attendance bonus — "26 days 100% attendance: ₹1,000".**
This needs clarification independent of the law. With a mandatory weekly day off, a
30-day month contains ~26 working days — so "26 days" may be unachievable in a 28-day
month and automatic in a 31-day one. **Express the rule as a percentage of that month's
working days, not a fixed day count**, or the bonus becomes a calendar lottery.

**Attendance bonus — "One absence: ₹500 bonus provision".**
The brief itself flags this as needing clarification, and it does. The two readings are
"₹500 if you have at most one absence" and "₹500 deducted from the ₹1,000 if you have one
absence". They produce different payroll. **Business must decide.**

**Statutory bonus is separate.**
An attendance incentive does **not** discharge the statutory annual bonus obligation under
the Code on Wages. If RNOS is covered, that is a *separate* liability and a separate
payroll component. **Confirm coverage.**

### 9.4 Money arithmetic

Existing money columns are `numeric(n,2)` — rupees, not paise. The house default is
`numeric(10,2)` (122 uses across the migrations) with `numeric(12,2)` for larger
aggregates (52 uses). Salary fits `numeric(12,2)`; keep the two-decimal rupee convention
for consistency.
**But:** JavaScript `number` is IEEE-754 double. Proration (`gross × paid/working`) and
percentage deductions will produce values like `18333.333333333332`.

Rules for the payroll engine:
- Round **once**, at each component boundary, to 2 decimals — never accumulate unrounded.
- Define the rounding mode explicitly (half-up is conventional for Indian payroll).
- Assert that `Σ components === gross` and `gross + bonuses − deductions === net`, in code
  and in tests, so a rounding drift fails loudly rather than appearing in a salary slip.
- Consider computing in integer paise internally and presenting in rupees. This removes
  the class of bug entirely and needs no new dependency.

### 9.5 Data minimisation

The schema above stores `aadhaar_last4`, **not** the full Aadhaar number. The existing
`agents` and `agency_partners` tables store `aadhaar_number` in full; the partner
applications screen already masks it on display (`··{slice(-4)}`). For employees, **do not
store the full number** unless a statutory filing demonstrably requires it — and if it
does, that is a decision to take explicitly, with encryption, not by copying an older
table's shape.

---

## 10. Phased implementation plan

### 10.1 The timeline problem, stated plainly

Today is **15 November 2026**. The policy effective date is **1 January 2027** — about
**six and a half weeks**, including the holiday period.

Sixteen modules, a payroll engine, a live-authorization repair and unresolved statutory
questions do not fit in that window at the standard of verification this codebase holds
itself to (46 contract tests, a real-Postgres RLS suite, a nav contract that fails the
build). Attempting it would mean shipping a payroll engine built on rules nobody has
confirmed.

**What 1 January actually requires** is that attendance and leave are being *recorded*
correctly from day one, because those records are the input to everything else and cannot
be reconstructed later. Payroll can follow. A salary slip for January can be produced in
February from January's correctly captured attendance; January's attendance cannot be
captured in February.

That reframing is what makes the date achievable.

### 10.2 Phases

| Phase | Scope | Gate to start | Rough size |
|---|---|---|---|
| **0. Role model repair** | §5.1 — `employee` as a real role, aliases removed from all three layers, scope-aware `can()`, tests | Production role-distribution query complete | 1 PR, alone |
| **0b. Legal validation** | §12 questions answered by a labour-law advisor; UP state rules confirmed; `hr_policies` seeded with `legal_basis` | — runs in parallel with 0 | External |
| **1. Employee master** | `hr_employees`, documents, `hr-documents` bucket + RLS, admin CRUD, nav registration | Phase 0 merged | 2 PRs |
| **2. Attendance capture** | Punches, day-close cron, late rules, employee punch UI, admin register | Phase 1 merged; punch mechanism decided | 2–3 PRs |
| **3. Leave core** | Types, ledger, balances, request + approval workflow | Phase 1 merged; **0b complete for entitlement figures** | 2–3 PRs |
| **4. Monthly summary + bonus** | `hr_attendance_monthly`, bonus computation from policy | Phases 2 and 3 merged | 1–2 PRs |
| **5. Payroll** | Structures, run engine, components, slips | **0b complete for the wage definition** | 3–4 PRs |
| **6. Disbursement** | RazorpayX reuse, two-person approval | Phase 5 merged | 1–2 PRs |
| **7. Reports, settings, notifications** | HR reports, policy admin UI, WhatsApp notifications | Phase 4 merged | 2 PRs |
| **8. Encashment + carry-forward** | Year-end processing | Phase 3 merged; 0b complete | 1 PR |

### 10.3 What is live on 1 January 2027 under this plan

Phases 0, 1, 2 and 3 — **employee master, attendance capture, and leave recording with
approvals** — are achievable in six weeks *if* Phase 0b (legal validation) starts
immediately and runs in parallel. That is the honest answer: attendance and leave live and
correct from 1 January; payroll in February for January.

**If payroll must also run on 1 January**, then the leave entitlement, carry-forward and
wage-definition questions have to be answered within roughly ten days, and the build will
be correspondingly less verified. That is a business decision about risk, and it should be
made explicitly rather than discovered in week five.

---

## 11. Files that would need modification

### 11.1 Modified (Phase 0 — the risky ones)

| File | Change | Risk |
|---|---|---|
| `src/lib/auth.ts` | `AppRole` += `"employee"`; remove `employee/staff/team/processor` from `adminRoleAliases` | **Critical** — live authorization |
| `src/lib/crm/permissions-core.ts` | Same alias removal; scope-aware `can()`; HR capabilities | **Critical** |
| `src/middleware.ts` | `/employee/*` gating; `/admin/hr/*` capability gate | **High** |
| New migration | `app_role` += `employee`; `users.role` CHECK; rewrite `current_app_role()`; extend the privileged-column trigger with salary columns | **Critical** |
| `src/lib/security/role-trust.test.ts` | Prove `employee` is not admin | — |
| `src/lib/security/rls.integration.test.ts` | HR table scenarios | — |

### 11.2 Modified (additive, low risk)

| File | Change |
|---|---|
| `src/lib/admin/nav.ts` | New **"People"** group — or a third workspace. **Mandatory:** `nav.contract.test.ts` fails the build if an admin page is not placed. |
| `src/lib/admin/nav.contract.test.ts` | New routes in the expected set |
| `vercel.json` | 3–4 HR crons — **and resolve the three unscheduled routes in §1.3 first** |
| `src/lib/api-route-exposure.test.ts` | Guard patterns for `/api/hr` if a new helper is introduced |
| `CRM_PERMISSION_MATRIX.md` | Supersede the "aliases mapped onto admin" statement |

### 11.3 Explicitly NOT modified

`agents`, `agency_partners`, `profiles.commission_rate`, `ap_commissions`,
`ap_wallet_ledger`, `applications`, `payments`, the Razorpay checkout path, the WhatsApp
templates, the automation engine, the AI copilot. **HRMS is additive.** The one shared
surface is the role model, and that is why Phase 0 is isolated.

### 11.4 New files (indicative)

~14 migrations, ~25 `src/lib/hr/**` modules, ~18 admin pages, ~8 employee-portal pages,
~30 API routes, ~40 test files.

---

## 12. Testing strategy

### 12.1 Mirror the house standard

The bar in this repository is high and HRMS should meet it, not lower it.

| Layer | Approach | Precedent |
|---|---|---|
| **Pure logic** | Extract every calculation into a pure module and unit-test it with no database. vitest runs `environment: "node"` — **there is no DOM**, so this is not optional. | `src/lib/ap/payout-summary.ts`, `src/lib/admin/status-tone.ts` |
| **Contract tests** | Pin invariants that must not drift | 46 existing contract tests |
| **RLS** | Add HR scenarios to the real-Postgres suite that replays all migrations | `src/lib/security/rls.integration.test.ts` |
| **Route guards** | Every `/api/hr` route must satisfy the exposure contract | `src/lib/api-route-exposure.test.ts` |
| **IDOR** | Employee A must not read employee B — by id, by export, by signed URL | `src/lib/security/idor.routes.test.ts` |
| **Visual** | Playwright for the punch screen and the salary slip | `tests/visual/` |

### 12.2 The HRMS-specific tests that matter most

**Payroll golden cases.** A fixed set of employees × months with hand-computed expected
output, asserted to the paisa. Include: a mid-month joiner, a mid-month leaver, a month
with LOP, a month with unpaid leave, a month crossing a salary revision, a month crossing
a policy change, and a leap-year February. **If a figure cannot be hand-computed, the rule
is not yet specified well enough to build.**

**Rounding invariants.** `Σ components === gross`; `gross + bonuses − deductions === net`.
Property-tested across randomised structures.

**The separation-of-duties test.** The same user cannot both `payroll.run` and
`payroll.approve` a given run. The same user cannot approve their own leave.

**Leave ledger invariant.** For every employee-year, `opening + accrued + carried_forward
− taken − encashed − lapsed === closing`, recomputed from the ledger and compared to the
materialised balance.

**Pagination truncation.** A test that seeds **1,200** attendance rows and asserts the
monthly summary is correct — this is the test that would have caught the entire class of
bug §2.1 describes, and attendance is where it will bite.

**Policy resolution by date.** A rule changed on 1 April must produce the old value for
March and the new value for April, and recomputing March later must still produce the old
value.

**The alias regression test.** A `profiles.role = 'employee'` row must fail
`isAdminRole()`, fail the `/admin` middleware gate, and return an empty CRM capability
set — asserted in TypeScript *and* in the RLS suite.

---

## 13. Open decisions required before implementation

These block specific phases. They are listed in the order they are needed.

**Legal (blocks Phases 3, 5, 8) — for a labour-law advisor, not for this audit:**
1. Does the UP state have notified rules under the four Labour Codes, and what do they say about leave?
2. Is 12 days' annual entitlement below the statutory floor for RNOS's establishment type?
3. Is a 6-day carry-forward cap lawful against the Code's 30-day provision?
4. Which wage definition applies to leave encashment, and what is "daily salary"?
5. Is RNOS covered by EPF (20+), ESI (10+), Gratuity (10+), POSH (IC requirement)?
6. What is the current EPF wage ceiling — ₹15,000 or ₹25,000?
7. Does Uttar Pradesh levy professional tax?
8. Is RNOS liable for statutory bonus, separately from the attendance incentive?

**Business (blocks Phases 2, 4):**
9. Punch mechanism — PWA, geofence, selfie, biometric, IP allowlist?
10. Is attendance per branch? Do `branch_wallets` / `/admin/branches` define the branch list?
11. Shifts — one fixed shift or rosters?
12. What time is "late", and is there a grace window?
13. Does a half-day exist, and how does it affect the bonus?
14. "One absence: ₹500" — bonus *if* at most one absence, or ₹500 *reduced from* ₹1,000?
15. "26 days" — fixed count, or a percentage of that month's working days?
16. Quarterly best-attendance reward — amount, tie-breaking, how many winners?

**Architectural (blocks Phase 0):**
17. Employee login — Supabase Auth with a new role (recommended), or a third PIN JWT?
18. Should every `admin` see every salary? (§7.4 — recommendation: no.)
19. How many people currently hold each role value in production? *(Read-only query.)*

---

## 14. Risk register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | `employee` role grants full admin through three alias layers | **Critical** | Phase 0, isolated PR, tested in TS and SQL |
| 2 | Removing aliases silently demotes live rows to `customer` | **Critical** | Measure production first; migrate explicitly |
| 3 | Leave policy below statutory floor | **Critical** | Phase 0b; `hr_policies` with `legal_basis`; no hardcoded rules |
| 4 | Payroll built on a disputed wage definition | **High** | Block Phase 5 on legal sign-off |
| 5 | Six-week timeline vs 16 modules | **High** | §10.3 — attendance/leave live 1 Jan, payroll in Feb |
| 6 | PostgREST 1000-row truncation producing silently wrong summaries | **High** | `readPages`/`countRows` everywhere; the 1,200-row test |
| 7 | Service-role client bypasses RLS — a weak page guard exposes salary | **High** | Guard in TS *and* RLS; IDOR tests |
| 8 | Salary visible to every admin | **High** | §7.4 recommendation (b) |
| 9 | Float rounding drift in payroll | **Medium-high** | Integer paise internally; sum invariants in tests |
| 10 | Biometric / geolocation punch data is sensitive personal data | **Medium-high** | Minimise; retention policy; DPDP review; store `aadhaar_last4` only |
| 11 | Audit writes swallow their own errors | **Medium** | Strict variant for payroll — failed audit fails the transaction |
| 12 | Cron reliability unproven (3 unscheduled routes) | **Medium** | Resolve §1.3 before depending on crons |
| 13 | Nav contract test fails the build if a page is unplaced | **Low** | Known; register in `nav.ts` with each page |
| 14 | Payroll run re-executed, double-paying | **Medium** | Unique `(year, month)`; `locked` flag; idempotent disbursement |
| 15 | Attendance edited after payroll run | **Medium** | Lock `hr_attendance_monthly` on payroll approval; corrections become next-month adjustments |

---

## 15. Recommendation

1. **Start Phase 0b today.** The legal questions in §13 are on the critical path for three
   phases and are the only ones this team cannot answer itself. Six weeks is enough for
   attendance and leave *only if* this starts now.
2. **Do Phase 0 next, alone.** The role repair touches live authorization. It gets its own
   PR, its own review, and its own tests, with nothing else riding along.
3. **Build the policy engine before the first rule.** Every number in the brief is marked
   "proposed" or "clarify". A versioned, date-effective, `legal_basis`-carrying policy table
   is what turns that uncertainty from a blocker into a configuration change.
4. **Re-scope 1 January** to attendance and leave, with payroll in February. State this to
   stakeholders now rather than in week five.
5. **Answer §7.4 before Phase 5.** Whether every admin sees every salary is a decision, and
   making it by default is the most likely way this system causes an HR incident.

---

*Audit only. No code written, no migration created, no schema changed, no production data
touched, no deployment. Legal findings are from secondary web sources with confidence
levels stated in §9.2 and must be confirmed by a qualified labour-law advisor before any
rule is implemented.*
