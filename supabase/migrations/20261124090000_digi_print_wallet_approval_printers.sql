-- ============================================================================
-- Digi Print: the shop gets paid, the shop picks the printer, approval works
-- ============================================================================
--
-- Audit findings this migration closes:
--
--   1. A customer paid at a partner's counter, the money landed in the
--      platform's Razorpay account, and the partner's wallet never heard of
--      it. There was no ledger entry type for print takings at all.
--
--   2. `require_approval` could be switched on in the partner panel and was
--      never read by anything: a paid job went straight to the printer either
--      way. It needs a status to wait in.
--
--   3. The printer could only be chosen on the counter PC itself. The panel
--      had nowhere to show which printers the PC has, and no way to send a
--      colour job to the colour printer and a black-and-white job to the
--      laser.
--
-- Safe / reversible: constraints widened (never narrowed), columns added
-- nullable or defaulted. No existing row changes.
-- ============================================================================

-- ─── 1. Print takings in the partner wallet ─────────────────────────────────

alter table public.ap_wallet_ledger
  drop constraint if exists ap_wallet_ledger_entry_type_check;

alter table public.ap_wallet_ledger
  add constraint ap_wallet_ledger_entry_type_check
  check (entry_type in (
    'commission_credit', 'manual_credit', 'manual_debit',
    'payout_deduction', 'adjustment', 'reversal', 'bonus', 'penalty',
    'application_spend', 'print_earning'
  ));

alter table public.print_jobs
  add column if not exists partner_earning numeric(10, 2),
  add column if not exists platform_fee numeric(10, 2),
  add column if not exists wallet_entry_id uuid,
  add column if not exists paid_at timestamptz,
  add column if not exists razorpay_refund_id text,
  add column if not exists cancelled_reason text;

comment on column public.print_jobs.partner_earning is
  'Rupees credited to the station partner''s wallet for this job (price minus platform_fee).';
comment on column public.print_jobs.wallet_entry_id is
  'The ap_wallet_ledger print_earning row that paid the partner for this job.';

-- ─── 2. Statuses: waiting for the shop, and cancelled/refunded ─────────────

alter table public.print_jobs drop constraint if exists print_jobs_print_status_check;
alter table public.print_jobs
  add constraint print_jobs_print_status_check
  check (print_status in (
    'pending', 'queued', 'awaiting_approval', 'claiming', 'printing', 'printed', 'failed', 'cancelled'
  ));

alter table public.print_jobs drop constraint if exists print_jobs_payment_status_check;
alter table public.print_jobs
  add constraint print_jobs_payment_status_check
  check (payment_status in ('pending', 'verified', 'failed', 'refunded'));

-- The partner's job list and earnings card read by station and paid date.
create index if not exists print_jobs_station_paid_idx
  on public.print_jobs (station_id, paid_at desc)
  where payment_status in ('verified', 'refunded');

-- ─── 3. Printers, chosen from the panel ─────────────────────────────────────

alter table public.print_stations
  -- What the counter PC reported on its last poll. Display only.
  add column if not exists available_printers jsonb not null default '[]'::jsonb,
  -- Colour jobs go here when set; everything else to printer_name.
  add column if not exists color_printer_name text,
  -- Platform's cut of each job, percent. Null = platform default (env).
  add column if not exists platform_fee_percent numeric(5, 2)
    check (platform_fee_percent is null or (platform_fee_percent >= 0 and platform_fee_percent <= 50));

comment on column public.print_stations.available_printers is
  'Printer names the station''s desktop connector last reported. Overwritten on every poll.';
comment on column public.print_stations.color_printer_name is
  'Printer for colour jobs. Null means colour jobs use printer_name too.';
comment on column public.print_stations.platform_fee_percent is
  'Platform commission on each paid print job, in percent. Null falls back to PRINT_PLATFORM_FEE_PERCENT.';
