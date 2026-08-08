# Digi Partner Panel — Deep Audit

Scope: the whole partner panel and the money path behind it — customer create
and lookup, dashboard and graphs, CRM/leads, services and the apply form,
application transitions, invoices, commission calculation, wallet ledger, payout
request and redemption.

Baseline before this pass: typecheck clean, lint clean, 531/531 tests passing.
After: typecheck clean, lint clean, **550/550 tests passing**, build succeeds.

Every bug below sat behind a green suite.

---

## 1. Fixed — commissions never reached the partner wallet

**Severity: critical — the earn → wallet → payout chain was broken end to end.**

The chain was supposed to run:

```
payment verified → ap_commissions row → wallet credit → payout request → paid
                                        ^^^^^^^^^^^^^
                                        this step did not exist
```

`createCommissionForApplication` correctly inserted an `ap_commissions` row with
`status='pending'`, and the partner's commissions page displayed it. But
**`creditCommission()` — the only function that appends `commission_credit` to
`ap_wallet_ledger` — had no caller anywhere in the codebase.**

Nothing ever transitioned `ap_commissions` out of `pending` either. The one admin
commission route, `/api/admin/commissions/[id]`, updates a **different table**
(`commissions`, the legacy CRM one) and never touches the partner wallet.

Consequences for every partner:

- wallet balance stayed at ₹0 no matter how much they earned;
- the ₹500 payout minimum was therefore unreachable;
- **no partner could ever withdraw anything.**

Added `setApCommissionStatus()` in the commission engine, exposed through a new
admin route `PATCH /api/admin/ap-commissions/[id]`. Approving (or paying) a
commission credits the wallet exactly once; cancelling or reversing an already
credited commission claws the money back out. The wallet is settled *before* the
status is written, so a wallet failure cannot leave a commission marked paid with
no money moved.

## 2. Fixed — a partner could withdraw more than their balance

**Severity: critical — financial.**

`debitPayout` read the balance, checked it in application code, then inserted a
payout:

```ts
const balance = await getWalletBalance(...);   // read
if (balance < params.amount) return error;      // check
… insert payout … append debit …                // act
```

Two concurrent requests both read the same balance, both passed, and both
withdrew. The "you already have a pending request" guard in the route had exactly
the same race. The code comment claimed the operation was atomic; it was not.

Fixed at the database level: migration
`20260808050000_ap_payout_concurrency_guard.sql` adds a partial unique index on
`ap_payouts(agency_partner_id) WHERE status IN ('requested','processing')`, so at
most one active payout per partner is a storage guarantee no matter how many app
instances run. `debitPayout` now surfaces the unique violation as *"You already
have an active payout request under process."*

The migration is deploy-safe: if a partner already holds duplicate active
payouts, it raises a warning naming them and skips index creation rather than
failing the deploy. Resolve those rows and re-run to install the index.

## 3. Fixed — wallet balance silently truncated

**Severity: high — wrong money, silently.**

Two different balance implementations existed:

| Used by | Row limit |
| --- | --- |
| `ap-data.getAPWalletBalance` — the balance the partner **sees** | 10 000 |
| `ap-wallet.getWalletBalance` — the balance **enforced at withdrawal** | unbounded → capped by PostgREST |

Both summed a single response, so once a partner's ledger grew past the cap the
balance was computed from only the first page — understated, permanently, and
differently in the UI than at withdrawal.

Replaced with one canonical `calculateWalletBalance()` that **pages** the whole
ledger, and `getAPWalletBalance` now delegates to it. Added a supporting
`(agency_partner_id, created_at)` index.

## 4. Fixed — a failed balance read was treated as a zero balance

`getWalletBalance` returned `0` on query error. That value then flowed into
`appendLedgerEntry`, which wrote it into the ledger's `running_balance` audit
column — so one failed read silently corrupted the ledger history (a ₹500 credit
on a ₹10 000 partner would record `running_balance = 500`).

`calculateWalletBalance` now reports failure explicitly. Appends refuse to run on
an unreadable balance, and the withdrawal path blocks rather than guessing.

## 5. Fixed — commission credits were not idempotent

A retried approval would have appended a second `commission_credit`, paying the
partner twice. `creditCommission` and `reverseCommissionCredit` now short-circuit
on an existing ledger entry for the same commission id.

## 6. Fixed — payout accepted non-positive amounts

`debitPayout` never validated the amount. A negative value passed the
`balance < amount` comparison, and the debit path applies `Math.abs()`, so a
negative "withdrawal" would have **debited** the partner. The API route validated
this, but the library function is called from elsewhere and must defend itself.
Now rejects anything that is not a finite amount greater than zero, and the
migration adds a `CHECK (amount > 0)` constraint (`NOT VALID`, so existing rows
are untouched).

## 7. Fixed — customer signup could steal another user's applications

**Severity: high — ownership transfer.**

`linkCustomerApplicationsByMobile` matched partner-created applications by mobile
with:

```ts
.or(`user_id.is.null,user_id.neq.${params.customerUserId}`)
```

then set `user_id` on all of them. The `neq` branch means applications **already
owned by a different user** were re-assigned to whoever next signed up with that
mobile — taking their documents and payment history with them. The mobile on an
application is typed by a partner, not a verified identity, so this was reachable.

Linking is now restricted to genuinely unclaimed rows (`user_id IS NULL`), and the
condition is re-asserted in the `UPDATE` itself so a concurrent signup cannot
claim the same rows twice. Counts, audit log and mobile-link records now reflect
the rows actually claimed rather than the rows matched.

---

## Verified as correct — no change needed

- **Commission calculation.** The rule hierarchy (partner → campaign → service →
  tier → global), validity windows, tiered brackets and min/max clamping all
  behave as documented.
- **Commission reservation is idempotent** — guarded by both a pre-check and a
  `23505` fallback, so the payment webhook and verify-payment path cannot
  double-reserve.
- **Payout request route** correctly requires an active, KYC-approved partner and
  enforces the ₹500 minimum.
- **Ledger entry-type maths** — debits apply by magnitude regardless of the sign
  stored, which matters because historic rows carry both. Now pinned by tests.

## Findings NOT changed — these need your decision

### A. No admin UI for the new commission approval

`PATCH /api/admin/ap-commissions/[id]` makes the chain work and is admin-guarded,
but `/admin/commissions` still renders the legacy `commissions` table. Until a
screen is pointed at `ap_commissions`, approvals have to be made through the API.
Wiring the page is a UI task — say the word and I will build it.

### B. Two parallel commission systems

`commissions` (legacy CRM) and `ap_commissions` (partner ecosystem) both exist,
with separate admin routes and separate meanings. Nothing reconciles them. Picking
one and migrating is a schema-level decision.

### C. `ap_payouts.status` has no transition guard

Any status can be written over any other, so a `paid` payout can be moved back to
`requested`. The wallet is only debited at request time, so this does not
double-spend today, but it invites accounting drift. A small state machine like
the one used for lead stages would close it.
