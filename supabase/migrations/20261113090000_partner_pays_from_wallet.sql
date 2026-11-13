-- ============================================================================
-- The partner buys the service: wallet first, then their own money
-- ============================================================================
--
-- The old model had the partner fill a form for the customer, the customer
-- pay, and a payout follow. The new one makes the partner the buyer: the
-- partner pays the platform's price, the payout lands in their wallet, and the
-- wallet pays for the next application before any card does. ITR at ₹100 with
-- a ₹25 payout means the second application costs the partner ₹75, and once
-- ₹100 has built up it costs them nothing at the counter.
--
-- Paying from the wallet happens in two steps, because the Razorpay amount has
-- to be known before checkout opens: the wallet part is debited first and the
-- ledger entry's own id is the reserve, then the application is created
-- against that reserve. Two columns on `applications` record which reserve it
-- consumed and how much came out of the wallet, which is also what makes a
-- reserve that no application ever claimed findable and refundable.

-- ─── 1. The wallet can pay for an application ───────────────────────────────
--
-- `manual_debit` would have worked and said nothing. The partner reads this
-- ledger, and "Service liya — ITR" is the line they need to see, not a manual
-- adjustment from nobody.

alter table public.ap_wallet_ledger
  drop constraint if exists ap_wallet_ledger_entry_type_check;

alter table public.ap_wallet_ledger
  add constraint ap_wallet_ledger_entry_type_check
  check (entry_type in (
    'commission_credit', 'manual_credit', 'manual_debit',
    'payout_deduction', 'adjustment', 'reversal', 'bonus', 'penalty',
    'application_spend'
  ));

-- ─── 2. What the application took from the wallet ───────────────────────────

alter table public.applications
  add column if not exists wallet_amount numeric(10, 2) not null default 0,
  add column if not exists wallet_reserve_id uuid;

-- One application per reserve. Without this a retry that slipped past the
-- application-level check could spend the same reserved money twice.
create unique index if not exists applications_wallet_reserve_id_key
  on public.applications (wallet_reserve_id)
  where wallet_reserve_id is not null;

-- Finding the reserves nobody claimed, to give the money back.
create index if not exists ap_wallet_ledger_application_spend_idx
  on public.ap_wallet_ledger (agency_partner_id, created_at desc)
  where entry_type = 'application_spend';

comment on column public.applications.wallet_amount is
  'Rupees taken from the partner wallet for this application; the rest came through Razorpay.';
comment on column public.applications.wallet_reserve_id is
  'The ap_wallet_ledger application_spend entry this application consumed.';
