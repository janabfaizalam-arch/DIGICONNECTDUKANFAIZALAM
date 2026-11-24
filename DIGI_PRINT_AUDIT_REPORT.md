# Digi Print — Deep Audit & Fix Report

Flow: partner installs the connector once → picks printer and sets rates in
the panel → prints the QR poster → customer scans, uploads, picks format and
quantity, pays → job prints straight away → money lands in the platform's
Razorpay account → partner's earning lands in their wallet (spendable on
platform services or withdrawable).

## What the audit found (and what was fixed)

| # | Problem in the old system | Impact | Fix |
|---|---|---|---|
| 1 | Customer payment never reached the partner's wallet. No ledger type for print takings. | Partner earned nothing on-platform. | New `print_earning` ledger credit, idempotent per job (lookup + DB unique index). Credited from both verify and webhook. |
| 2 | `require_approval` switch was saved but never read. | "Approval" did nothing. | Paid jobs go to `awaiting_approval` when on; panel has **Print karo** / **Refund**. |
| 3 | Retrying checkout created a new Razorpay order and overwrote the first. | A late UPI payment on the first order matched no job: money taken, nothing printed. | One order per job; race-safe linking. |
| 4 | Agent crash after claim left the job at `printing` forever. | Paid job never printed. | Expired claims are re-offered (claim window 10 min). |
| 5 | `update-status` accepted any state from any agent of the station. | A job could be marked printed while unpaid/awaiting approval. | Only `printing` jobs claimed by this agent. |
| 6 | Print verify trusted the signature alone. | Authorised-but-uncaptured payments printed. | Razorpay capture + amount check (webhook finishes if still pending). |
| 7 | Verify and webhook had two copies of completion logic. | Drift. | Verify now calls the shared `completePrintPayment`. |
| 8 | Printer chosen only on the counter PC; partners' printers were written into the platform's global printer table. | Panel couldn't choose; shops' printers mixed. | PC reports printers to its own station row; panel dropdown for main + colour printer. |
| 9 | Install needed two separate files (Start, then Background); no crash restart; startup pointed at the Downloads folder. | Printing stopped next morning / after a crash / after cleanup. | **One double-click**: installs to AppData, startup + hidden + keepalive auto-restart, auto-picks default printer. |
| 10 | Customer told "file N minute me delete" but only a 24h daily cron deleted files. | Broken privacy promise. | Station poll purges finished jobs' files after the window; cron stays as backstop. |
| 11 | Dashboard wallet balance (`ap-data.ts`) and finance helpers ignored `application_spend`. | Balance shown higher than real. | All balances use the ledger's own rule. |
| 12 | QR download was a bare QR image. | Unprofessional on a counter. | Premium A5 300-dpi poster (download or print). |

## New partner panel features
- Earnings tiles: today / this month / total / wallet balance.
- Live job list (auto-refresh 10s): approve, refund (Razorpay refund + wallet reversal), reprint.
- Printer picker (all jobs + optional colour printer).
- Premium poster.

## Customer screen
- New states: "Shop confirm kar rahi hai" (approval) and "Paise wapas bhej diye" (refunded).

## Deploy checklist
1. Apply migration `supabase/migrations/20261124090000_digi_print_wallet_approval_printers.sql`
   **before** deploying the code (the station query reads the new columns).
2. Optional: `PRINT_PLATFORM_FEE_PERCENT` env (0–50). Unset = partner keeps 100%.
   Per-shop override: `print_stations.platform_fee_percent`.
3. Razorpay webhook must stay subscribed to `payment.captured` (already used).
4. Partners re-download the connector (v2.0.0) once from the panel.
