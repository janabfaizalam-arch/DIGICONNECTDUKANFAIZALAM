# Phase 0A — Production Role Distribution Audit

**Date:** 15 November 2026
**Project:** `oqcudhmnsmqwlfzlrvfw` — confirmed as the repository's target (the only
`*.supabase.co` host referenced in committed files), status `ACTIVE_HEALTHY`, PostgreSQL 17.6.
**Method:** Read-only `SELECT` statements against system catalogues and aggregate counts.
**Mutations:** none — no `UPDATE`, `INSERT`, `DELETE`, `ALTER`, `CREATE` or `DROP` was issued.
**PII:** none extracted. No user id, name, email, phone, address or document value was
selected. Every figure below is a `count(*)` or a catalogue string.

---

## 1. Headline

**Zero production rows currently carry a role value that aliases to admin.**

The audit in `HRMS_INTEGRATION_AUDIT.md` rated "removing the aliases silently demotes live
rows" as a **Critical** risk. The data says otherwise: the alias set is unused in
production, so removing it demotes nobody. **That risk drops to Low.** §7 corrects the
audit accordingly.

One further finding stands: 22 accounts resolve to `customer` purely by fallback, which is
harmless today and is not harmless once employees exist. See §6.

**A second finding in the first version of this report — a claimed schema drift on
`profiles.role` — was wrong and has been withdrawn.** §5 records what it said, why it was
wrong, and the replay that disproved it.

---

## 2. Source availability

| Source | Available | Type | Nullable | Constraint |
|---|:--:|---|:--:|---|
| `public.profiles.role` | yes | `text` | **NOT NULL** | `profiles_role_check` |
| `public.users.role` | yes | `text` | **NOT NULL** | `users_role_check` |
| `auth.users.raw_app_meta_data ->> 'role'` | yes | `jsonb` | nullable | none |
| `auth.users.raw_user_meta_data ->> 'role'` | yes | `jsonb` | nullable | none — **untrusted, not used for authorization** |

Both CHECK constraints are identical and currently enforced:

```sql
CHECK (role = ANY (ARRAY['super_admin','admin','staff','customer','agent','agency_partner']))
```

Other role-bearing columns found in `public` and `auth` (all historical/annotative, none
used for authorization): `audit_logs.actor_role`, `application_status_logs.actor_role`,
`application_documents.uploaded_by_role`, `lead_activities.actor_role`, and
`auth.users.role` — the last is Supabase's own internal column, not an application role,
and must not be confused with one.

---

## 3. Role distribution — redacted

### 3.1 `public.profiles.role` — 457 rows

| Role value | Rows | Share |
|---|---:|---:|
| `customer` | 407 | 89.1% |
| `agency_partner` | 47 | 10.3% |
| `agent` | 2 | 0.4% |
| `admin` | **1** | 0.2% |
| NULL | **0** | — |

### 3.2 `public.users.role` — 460 rows

| Role value | Rows | Share |
|---|---:|---:|
| `customer` | 410 | 89.1% |
| `agency_partner` | 47 | 10.2% |
| `agent` | 2 | 0.4% |
| `admin` | **1** | 0.2% |
| NULL | **0** | — |

### 3.3 `auth.users.raw_app_meta_data ->> 'role'` — 482 rows

This is the **trusted** claim: the only one a user cannot write themselves.

| Role value | Rows | Share |
|---|---:|---:|
| absent / NULL | 469 | 97.3% |
| `agency_partner` | 10 | 2.1% |
| `customer` | 3 | 0.6% |
| `admin` | **0** | — |

### 3.4 `auth.users.raw_user_meta_data ->> 'role'` — 482 rows (untrusted, reported for completeness)

| Role value | Rows | Share |
|---|---:|---:|
| absent / NULL | 427 | 88.6% |
| `agency_partner` | 46 | 9.5% |
| `customer` | 6 | 1.2% |
| `agent` | 3 | 0.6% |
| `admin` | **0** | — |

Migration `20260926091000` removed `user_metadata` from role resolution in both the
TypeScript and SQL paths. These 55 non-null values therefore grant nothing. They are
listed only to confirm that none of them says `admin` — so even a regression that
re-admitted `user_metadata` would not currently hand anyone administrator access.

### 3.5 Historical role strings in audit columns

| Column | Values present |
|---|---|
| `audit_logs.actor_role` | `admin` ×2 |
| `application_status_logs.actor_role` | `admin` ×60, NULL ×15 |
| `application_documents.uploaded_by_role` | `customer` ×74, `admin` ×24 |
| `lead_activities.actor_role` | `customer` ×2, `system` ×2 |

**No legacy `staff`, `team`, `employee`, `processor` or `super_admin` string survives
anywhere**, including in history. The rewrite performed by
`20260519133000_three_role_architecture_cleanup.sql` completed.

---

## 4. Alias analysis (requirement 5)

### 4.1 The alias set, as actually deployed

The production definition of `current_app_role()` was read back from `pg_proc` and matches
the migration exactly:

```sql
select case
  when role in ('super_admin', 'staff', 'team', 'employee', 'processor') then 'admin'
  when role in ('admin', 'agent', 'customer') then role
  else 'customer'
end
```

The same five strings appear in `adminRoleAliases` (`src/lib/auth.ts`) and `ADMIN_ALIASES`
(`src/lib/crm/permissions-core.ts`).

### 4.2 Which of them can actually exist

This is the finding that changes the risk rating.

| Alias value | Promotes to | Storable in `profiles` / `users`? | Live rows |
|---|---|:--:|---:|
| `super_admin` | `admin` | **yes** — in the CHECK | **0** |
| `staff` | `admin` | **yes** — in the CHECK | **0** |
| `team` | `admin` | **no** — CHECK rejects | 0 |
| `employee` | `admin` | **no** — CHECK rejects | 0 |
| `processor` | `admin` | **no** — CHECK rejects | 0 |
| `admin` (literal) | `admin` | yes | **1** |

Three of the five alias strings **cannot be written at all** — the CHECK constraint on both
tables rejects them. The audit document stated that setting a user's role to `employee`
would grant admin; against this database that write **fails**. The grant would only occur
through `app_metadata`, which requires the service role, or if the CHECK were widened.

That is a meaningful narrowing, and it is corrected in §7.

### 4.3 How the single administrator is actually resolved

`auth.users.raw_app_meta_data ->> 'role'` contains **no `admin` value at all**. The one
administrator therefore does not hold a trusted token claim; access resolves through the
email allowlist (`isAllowlistedAdminEmail` / `PRIMARY_ADMIN`) or the `profiles.role = 'admin'`
row, both later in the precedence chain than the token.

**Operational consequence:** administrator access currently depends on a hardcoded email
allowlist, not on data. That is worth knowing before HRMS adds roles — and it means the
`admin` count of 1 understates nothing, but also that the allowlist is a second, invisible
source of admin truth that any role audit must read from code, not from the database.

---

## 5. ~~New finding — schema drift~~ — **WITHDRAWN: this finding was wrong**

This section originally claimed that production's `profiles.role` is `text` while the
migrations declare it as the `app_role` enum, and concluded that the RLS integration suite
had been testing a column type that does not ship.

**That is incorrect.** It was withdrawn on 15 November 2026 after the migrations were
replayed onto a scratch PostgreSQL 16 — the verification that should have been done before
the claim was published.

The error: only `20260430080000_create_profiles.sql` was read, which does declare the enum.
The chain was not followed. `20260518120000_three_role_security_hardening.sql` converts
**both** columns to `text`, and `20260527163000_fix_profiles_role_constraint.sql` creates
the six-value CHECK on both. The migrations have been producing production's exact schema
all along.

Replay of all 134 migrations from `supabase/tests/supabase-stub.sql`, zero failing
statements, compared against the production catalogue read in §2:

| | Replayed from migrations | Production | Match |
|---|---|---|:--:|
| `profiles.role` | `text` NOT NULL default `'customer'::text` | same | yes |
| `users.role` | `text` NOT NULL default `'customer'::text` | same | yes |
| `profiles_role_check` | 6 values | same 6 | yes |
| `users_role_check` | 6 values | same 6 | yes |
| `app_role` enum labels | `super_admin, admin, agent, customer, staff` | same | yes |
| `current_app_role()` | byte-identical | — | yes |
| `is_staff_role()` | absent | absent | yes |
| guard triggers | both present | both present | yes |

**Consequences of the withdrawal:**

- The RLS integration suite **is** representative. It always was.
- Remediation **Step 1 ("reconcile the schema drift") has nothing to do and is dropped.**
  The plan in §9 is four steps on paper and three in practice.
- Nothing else in this report depends on it. The §3 distributions, the §4 alias analysis
  and the §6 reconciliation were each measured directly and are unaffected.

The `app_role` enum does still exist while backing neither column — that part was accurate.
It is harmless and out of scope; leave it, or retire it deliberately in its own change.

## 6. Identity-table reconciliation

| Metric | Count |
|---|---:|
| `auth.users` | 482 |
| `public.users` | 460 |
| `public.profiles` | 457 |
| `profiles.role` ≠ `users.role` (both rows present) | **0** |
| In `profiles`, missing from `users` | 0 |
| In `users`, missing from `profiles` | 3 |
| `auth.users` with no `profiles` row | 25 |
| `auth.users` with **neither** a `profiles` nor a `users` row | **22** |
| …of those 22, carrying an `app_metadata` role | **0** |

The two application tables agree perfectly where both rows exist — there is no split-brain
between `profiles.role` and `users.role`.

**22 authenticated accounts resolve to `customer` purely by fallback.** `getCurrentUserRole`
returns `'customer'` when profiles, users and the token claim all come up empty. Today that
is harmless — they are customers. Under HRMS it is not: an employee whose `profiles` row
failed to create would **silently become a customer** rather than failing, and would be
denied their own attendance and payslips with no error explaining why. Phase 0 should make
"no identity row" distinguishable from "customer".

---

## 7. Corrections to `HRMS_INTEGRATION_AUDIT.md`

| Audit risk | Audit rating | Corrected rating | Basis |
|---|---|---|---|
| #2 — removing aliases silently demotes live rows | **Critical** | **Low** | 0 live rows carry any aliasing value, in any of the three sources |
| #1 — `employee` role grants full admin | **Critical** | **High** (narrower) | `employee`, `team`, `processor` are rejected by the CHECK on both tables; only `super_admin` and `staff` are writable, and writing either needs the service role or an existing admin (guard trigger) |
| ~~Migration/production schema drift on `profiles.role`~~ | ~~Medium-high~~ | **WITHDRAWN** | §5 — the claim was wrong; the migrations do produce production's schema, proven by replay |
| — | — | **New: Medium** | 22 accounts resolve to `customer` by fallback; "missing identity" is indistinguishable from "customer" (§6) |

The audit's §4.3 instruction — *"query production for the live distribution … only then
remove the aliases"* — is now discharged. **The measurement is done and the answer is: safe
to proceed.**

---

## 8. Blast radius of the role helpers

Changing `current_app_role()` is not a small change, even though no row behaviour shifts:

| Metric | Count |
|---|---:|
| RLS policies referencing `is_admin_role()` | **101** |
| RLS policies referencing `current_app_role()` directly | 1 |
| RLS policies referencing `is_agent_role()` | 0 |
| Distinct tables covered by those policies | **90** |
| Total RLS policies in `public` | 284 |
| `public` tables with RLS enabled | **176** |

`is_staff_role()` was confirmed **absent** from production — dropped as
`20260519133000` intended.

`is_agent_role()` contains dead code: it tests `current_app_role() in ('super_admin',
'admin', 'agent')`, but `current_app_role()` can never return `'super_admin'` — that value
is mapped to `'admin'` one function earlier. The branch is unreachable. Harmless, and worth
removing in the same change so the next reader is not misled.

---

## 9. Recommended RBAC remediation plan

The data permits a safer sequence than the audit assumed, because there is nothing to
migrate. Four steps, each independently revertible.

### Step 1 — ~~Reconcile the schema drift~~ **(dropped — there is no drift)**

Withdrawn with §5. The migrations already produce production's schema, so there is nothing
to reconcile and no migration history to rewrite. The plan is three steps, not four.

### Step 2 — Narrow the CHECK constraints *(defence in depth, no behaviour change)*

Both CHECKs currently admit `super_admin` and `staff`, which 0 rows use and which promote
silently to admin. Narrow both to the values actually in use plus the one being added:

```
('admin', 'agency_partner', 'agent', 'customer', 'employee')
```

**Why before the alias removal:** after this, the database itself refuses to store a
promoting value, so Step 3 cannot be undone by a stray write.
**Risk:** low — verified 0 affected rows. The statement will fail loudly, not silently, if
a row appears between audit and execution, which is the desired behaviour.
**Verification:** re-run §3.1 and §3.2 immediately before applying; the constraint addition
is itself the test.

### Step 3 — Remove the admin aliases in all three layers, in one change

- `adminRoleAliases` in `src/lib/auth.ts`
- `ADMIN_ALIASES` in `src/lib/crm/permissions-core.ts`
- `current_app_role()` in PostgreSQL

Remove `staff`, `team`, `employee`, `processor` **and** `super_admin` — §3 shows all five
are unused. Keep the `agent → agency_partner` mapping; 2 rows depend on it.

Drop the unreachable `'super_admin'` branch from `is_agent_role()` in the same change.

**Risk:** the change itself is behaviour-neutral against current data, but it rewrites a
function that 101 policies across 90 tables depend on. Treat it as high-blast-radius even
though it is low-impact.
**Verification:** the RLS integration suite, extended with a case asserting that a
`profiles.role = 'employee'` row is **not** admin, in SQL and in TypeScript. Run it against
the Step-1-corrected migration set.

### Step 4 — Introduce `employee` as a real fourth role

Only now is this safe: the aliases are gone, so `employee` means `employee`.

- `AppRole` += `"employee"`
- `current_app_role()` returns `'employee'` for employee rows
- Capability layer returns an **empty** set for `employee` by default — HR capabilities are
  granted explicitly, never inherited
- Middleware: `employee` is denied `/admin/*` and allowed `/employee/*`
- Make "no identity row" distinguishable from "customer" (§6) so a broken employee account
  errors instead of silently demoting

**Verification:** the §7 regression test from the audit — an `employee` row must fail
`isAdminRole()`, fail the `/admin` gate, and receive an empty capability set.

### What this plan deliberately does not do

- **It does not touch the 1 admin row or the email allowlist.** Administrator access is
  unchanged throughout.
- **It does not migrate any data.** There is nothing to migrate — that is the whole finding.
- **It does not widen anyone's access at any step.** Steps 1–3 only narrow; Step 4 adds a
  role that starts with no capabilities.

### Sequencing note

Steps 1 and 2 are safe to ship immediately and independently of HRMS — they close a real
latent hole (`staff` and `super_admin` being writable and auto-promoting) regardless of
whether HRMS is ever built. Steps 3 and 4 belong to Phase 0 proper and need the user's
go-ahead.

---

## 10. Queries used

Seven read-only statements, all `SELECT`:

1. `information_schema.columns` — column availability and types
2. `pg_constraint` / `pg_enum` / `pg_trigger` — constraints, enum labels, guard triggers
3. `pg_get_constraintdef` — full CHECK definitions
4. Aggregate `count(*) … group by role` over `profiles`, `users`, `auth.users` metadata
5. Aggregate counts over the four historical actor-role columns
6. `pg_get_functiondef` — deployed source of the role helper functions
7. `pg_policies` — policy counts by referenced helper; identity-table reconciliation counts

No statement selected a user identifier or any personal field. No statement wrote.

---

*Read-only audit. No records updated, inserted or deleted. No role aliases or RBAC logic
changed. No migration, no code change, no deployment.*
