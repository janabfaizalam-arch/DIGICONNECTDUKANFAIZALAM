# CRM Deep Audit — Logic & Flow

Scope: the whole CRM surface — leads (ingest, search, pipeline, assignment,
follow-ups, conversion), the walk-in flow, communications outbox, automation
rules, and the Google Sheets sync queue. Driven by typecheck, lint, the Vitest
suite, a production build, and line-by-line tracing of each mutation path.

**The suite was already green at 531/531 before this pass.** Every bug below sat
behind passing tests — several are cases where correct logic exists in a pure
module but the mutation path never calls it.

After this pass: typecheck clean, lint clean, **550/550 tests passing**, build
succeeds.

---

## 1. Fixed — lead search by phone number was completely broken

**Severity: critical — the single most-used CRM action failed every time.**

`listCanonicalLeads` decided whether to include an `id.eq.<term>` condition with:

```ts
const uuidLike = /^[0-9a-f-]{8,}$/i.test(q);
```

Digits `0-9` are a subset of `0-9a-f`, so **any 8+ digit number matches** — including
every Indian mobile number. Searching `9876543210` produced `id.eq.9876543210`,
Postgres rejected it with *invalid input syntax for type uuid*, the whole query
errored, and the operator saw "Could not load leads."

Replaced with `buildLeadSearchFilter()` in `leads-core.ts`, which only adds
`id.eq.` for a canonical UUID and strips the characters that would corrupt a
PostgREST `or=(...)` list (`,` `(` `)` `%` `*` `\`). Covered by
`lead-search-filters.test.ts`.

## 2. Fixed — completed follow-ups stayed "overdue" forever

**Severity: high — the overdue queue never drained.**

`scheduleLeadFollowUp` pointed `leads.next_follow_up_at` at the booked time, but
neither `completeLeadFollowUp` nor `cancelLeadFollowUp` ever moved it. Once the
scheduled time passed, `isFollowUpOverdue` kept returning true, so a lead whose
follow-up was *done* stayed in the overdue KPI and the overdue queue permanently.
The queue filled with finished work and could never be cleared.

Both paths now call `refreshNextFollowUpPointer()`, which repoints the lead at its
earliest still-scheduled follow-up, or clears it when none remain.

## 3. Fixed — booking a follow-up stranded late-stage leads

**Severity: high — irreversible pipeline data loss.**

Scheduling a follow-up forced `pipeline_stage = "follow_up_scheduled"` for any
non-terminal lead. The transition table allows `follow_up_scheduled` to move only
to `new`, `contact_attempted`, `contacted`, `qualified` or `lost` — there is **no
path back** to `service_selected`, `documents_awaited` or `application_created`.

So booking a call on a lead that was awaiting documents permanently knocked it
back down the funnel with no way to restore it. Stages at or past qualification
are now preserved; only early-stage leads are marked `follow_up_scheduled`.

## 4. Fixed — the stage machine was bypassed on one write path

**Severity: high — documented rules were unenforceable.**

`canTransitionLeadStage` implements the full pipeline machine (legal transitions,
terminal-stage protection, `allowReopen`) and is unit-tested. `transitionLeadStageSafe`
wraps it. But `POST /api/admin/crm/leads` called the **raw** `transitionLeadStage`
instead, so the Kanban create path could put a lead straight into `won` or `lost`,
skipping the funnel entirely.

Worse, the route ignored the return value: when the raw call rejected the change
(e.g. `lost` with no lost reason) the API still answered *"Lead saved
successfully."* while the lead silently stayed in `new`.

The route now goes through `transitionLeadStageSafe` and reports a `207` with the
real reason when the stage could not be applied.

## 5. Fixed — unassigning a lead did not remove partner access

**Severity: high — authorization leak.**

Partner scoping matches on `agent_id` **or** `assigned_to` **or** `partner_id`.
`reassignLead` wrote:

```ts
agent_id: input.assigneeUserId ?? existing.agent_id,
```

so "move to unassigned queue" cleared `assigned_to` but left `agent_id` pointing at
the previous owner — who kept full read and write access to a lead that had been
taken away from them. `agent_id` now follows the assignee, and `assigned_at` is
nulled on unassign instead of recording a bogus assignment time.

## 6. Fixed — `status` and `pipeline_stage` silently diverged

**Severity: high — data integrity.**

The legacy `PATCH /api/admin/leads/[id]` status path wrote only `leads.status`.
Reads prefer `pipeline_stage`, so the update appeared to do nothing, and analytics
that count `won` / `converted_at` disagreed with the pipeline the operator saw. It
also wrote no history at all.

The path now derives `pipeline_stage` via `mapLegacyStatusToStage`, writes both
columns together, and records a `lead_activities` entry so the audit trail is
complete.

## 7. Fixed — date filters were off by 5.5 hours

**Severity: medium — wrong rows, silently.**

`createdFrom` used `new Date("2026-08-07").toISOString()` — UTC midnight, i.e.
05:30 IST — dropping every lead created in the first 5.5 hours of the business
day. `createdTo` used `setHours(23,59,59,999)` in the *server's* timezone (UTC on
Vercel), pulling in the early hours of the following IST day.

The module already imported `getAsiaKolkataDayRange` for the follow-up queue but
not for this. Added `getAsiaKolkataRangeForDates()`, which anchors day-only inputs
to `+05:30` and passes full timestamps through untouched.

## 8. Fixed — lead dedupe buckets split the working morning

`buildLeadIngestionKey` bucketed on the UTC day, which rolls over at 05:30 IST. Two
submissions from the same working morning could land in different buckets (creating
a duplicate lead), while a late-night and next-morning enquiry shared one. Now
buckets on the Asia/Kolkata calendar day.

## 9. Fixed — KPI failures silently reported zero

The KPI counts were wrapped in `try/catch` with a fallback, but Supabase resolves
with an `error` field rather than throwing, so the `catch` was unreachable. On any
count failure every KPI silently became `0`. The results' `error` fields are now
inspected and the page-local fallback actually runs.

## 10. Fixed — the unassigned KPI disagreed with the unassigned list

The KPI counted unassigned leads excluding `won`/`lost`; the list filter did not.
Clicking the KPI showed a different (larger) set than the number promised. The list
now applies the same open-work definition.

## 11. Fixed — cancelling a follow-up returned 500 on a lost race

`cancelLeadFollowUp` treated "no row updated" as a server error. When another actor
cancelled first, the caller got a 500 instead of the settled state. Now mirrors
`completeLeadFollowUp`: re-reads and returns the cancelled row, or a 409.

---

## Verified as correct — no change needed

- **`crm_sync_jobs` claiming is atomic.** `claimJob` uses a conditional
  `UPDATE … WHERE status='pending'` returning the row, so concurrent processors
  cannot double-send a sheet row. `scheduleCrmSyncMany` does register one `after()`
  processor per application, which is redundant work but not a correctness problem;
  changing the batching would trade durability for tidiness, so it is left alone.
- **`transitionLeadStageSafe` gating** on the canonical and legacy `[id]` routes is
  correct, including the `applications.assign` check behind `allowReopen`.
- **Communications delivery mode fails closed.** Unset or invalid
  `CRM_NOTIFICATION_DELIVERY_MODE` resolves to `disabled` and never reaches the
  provider — confirmed by contract tests and by reading the dispatcher.
- **Walk-in PIN handling** never logs, persists, or puts the temporary PIN in a URL.

## Findings NOT changed — these need your decision

### A. `leads.view` gates lead *writes*

`transitionLeadStage`, `scheduleLeadFollowUp`, `completeLeadFollowUp` and
`cancelLeadFollowUp` all authorize with the **read** capability `leads.view`. There
is no `leads.edit` / `leads.manage` in `CrmCapability`.

In practice partners are still bounded by the per-lead ownership check, so this is
not currently exploitable — but the capability model says "can view" where it means
"can mutate", and any future role granted read access would silently gain write
access. Adding a distinct write capability touches the whole permission matrix and
the role definitions, so it is flagged rather than changed.

### B. Legacy `status` vocabulary is wider than the pipeline

`PATCH /api/admin/leads/[id]` accepts 14 legacy statuses, but
`mapLegacyStatusToStage` collapses several of them (`payment_pending`,
`payment_verified`, `lead_submitted`, `submitted_to_department`, …) into `new` or
`application_created`. Fix 6 keeps the two columns consistent, but the mapping is
lossy by construction. Retiring the legacy status column — or widening the stage
vocabulary — is a migration-level decision.

### C. Stage round-trips are lossy

`contact_attempted`, `service_selected` and `follow_up_scheduled` have no distinct
legacy status, so a stage → legacy → stage round-trip loses them. This only matters
where legacy `status` is treated as the source of truth; after fix 6 the canonical
writer always sets both. Worth removing the mirror entirely once nothing reads
`status`.
