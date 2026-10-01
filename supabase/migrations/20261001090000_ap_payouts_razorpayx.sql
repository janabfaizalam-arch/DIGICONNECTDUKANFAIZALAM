-- ============================================================================
-- Partner payouts: fix the status constraint, and make room for RazorpayX
-- ============================================================================
--
-- Two things, and the first one is a live bug.
--
-- `ap_payouts.status` has allowed ('requested','processing','paid','failed',
-- 'cancelled') since the ecosystem migration, but the application has always
-- written 'rejected' — `PAYOUT_STATUSES` in src/lib/ap-payout-transitions.ts.
-- So rejecting a payout fails on the check constraint. It fails *after*
-- `processPayout` has already credited the money back to the partner's wallet,
-- and that refund does not dedupe, so every retry credits the partner again
-- while the payout stays stuck at 'requested'.
--
-- 'rejected' is added rather than swapped in: 'failed' and 'cancelled' stay
-- allowed so any row already carrying them remains valid, and so the automated
-- payouts below can mark a RazorpayX failure as 'failed' distinctly from an
-- admin's 'rejected'.
--
-- The rest is for paying partners through RazorpayX instead of by hand: the
-- payout's id at Razorpay, the status word Razorpay used, and why it failed.

-- ─── 1. The status constraint ───────────────────────────────────────────────

alter table public.ap_payouts
  drop constraint if exists ap_payouts_status_check;

alter table public.ap_payouts
  add constraint ap_payouts_status_check
  check (status in ('requested', 'processing', 'paid', 'failed', 'cancelled', 'rejected'));

-- ─── 2. RazorpayX columns ───────────────────────────────────────────────────

alter table public.ap_payouts
  add column if not exists razorpayx_payout_id text,
  add column if not exists razorpayx_status text,
  add column if not exists failure_reason text;

-- One of our payouts per Razorpay payout, so a webhook that arrives twice --
-- and RazorpayX does retry -- cannot be applied to two rows, and a double
-- submission cannot create two payouts for one request.
create unique index if not exists ap_payouts_razorpayx_payout_id_key
  on public.ap_payouts (razorpayx_payout_id)
  where razorpayx_payout_id is not null;

-- ─── 3. The partner's fund account at Razorpay ──────────────────────────────
--
-- Creating a contact and a fund account on every withdrawal would make a new
-- one each time; they are created once per partner and reused. Kept on the
-- partner rather than on the payout because they belong to the person, not to
-- the request, and they are re-created when the bank details change.

alter table public.agency_partners
  add column if not exists razorpayx_contact_id text,
  add column if not exists razorpayx_fund_account_id text,
  -- Which bank details the fund account was built from. When the partner edits
  -- their account number this no longer matches, and the fund account is built
  -- again -- otherwise the money would keep going to the old account.
  add column if not exists razorpayx_fund_account_fingerprint text;

comment on column public.ap_payouts.razorpayx_payout_id is
  'Razorpay payout id (pout_...). Null for a payout settled by hand.';
comment on column public.agency_partners.razorpayx_fund_account_fingerprint is
  'Hash of the bank details the fund account was created from; a mismatch forces a new fund account.';
