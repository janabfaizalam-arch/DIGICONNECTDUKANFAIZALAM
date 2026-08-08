-- ============================================================================
-- AP payout concurrency guard
--
-- The withdrawal path read the wallet balance, checked it in application code,
-- then inserted a payout. Two concurrent requests both passed the check and both
-- withdrew, so a partner could take out more than their balance. The duplicate
-- "already have a pending request" check had the same race.
--
-- A partial unique index makes "at most one active payout per partner" a
-- database guarantee, which closes the race regardless of how many app
-- instances run concurrently.
--
-- Safe / reversible: adds one index and one NOT VALID check constraint.
-- No rows are modified.
-- ============================================================================

-- ── 1. One active payout per partner ────────────────────────────────────────
-- Created only when the table is already clean. If duplicates exist the index
-- would fail and take the whole deploy down, so we warn loudly instead and
-- leave the application-level check as the interim guard.
do $$
declare
  v_duplicate_partners text;
  v_duplicate_count int;
begin
  select count(*), string_agg(distinct agency_partner_id::text, ', ')
    into v_duplicate_count, v_duplicate_partners
  from (
    select agency_partner_id
    from public.ap_payouts
    where status in ('requested', 'processing')
    group by agency_partner_id
    having count(*) > 1
  ) dupes;

  if coalesce(v_duplicate_count, 0) > 0 then
    raise warning
      'ap_payouts: % partner(s) already hold multiple active payouts (%). Resolve these (cancel or pay the extras), then re-run this migration to install ap_payouts_one_active_per_partner_idx.',
      v_duplicate_count, v_duplicate_partners;
  else
    create unique index if not exists ap_payouts_one_active_per_partner_idx
      on public.ap_payouts (agency_partner_id)
      where status in ('requested', 'processing');
    raise notice 'ap_payouts: active-payout uniqueness index installed.';
  end if;
end;
$$;

comment on table public.ap_payouts is
  'Partner payout requests. At most one row per partner may sit in requested/processing — enforced by ap_payouts_one_active_per_partner_idx.';

-- ── 2. Payout amounts must be positive ──────────────────────────────────────
-- NOT VALID so existing rows (the column defaults to 0) are left untouched
-- while every new insert and update is checked.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ap_payouts_amount_positive_chk'
  ) then
    alter table public.ap_payouts
      add constraint ap_payouts_amount_positive_chk check (amount > 0) not valid;
  end if;
end;
$$;

-- ── 3. Ledger lookup supporting the paged balance scan ──────────────────────
-- calculateWalletBalance pages the ledger ordered by created_at; without this
-- the scan sorts the partition on every page.
create index if not exists ap_wallet_ledger_partner_created_idx
  on public.ap_wallet_ledger (agency_partner_id, created_at);
