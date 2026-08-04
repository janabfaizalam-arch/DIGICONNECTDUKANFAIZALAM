# Google Sheets Live Office CRM Sync

Website (Supabase) is the source of truth. Google Sheets is a live office mirror.

## Environment

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
CRON_SECRET=
# optional
CRM_SYNC_SECRET=
```

1. Create a Google Cloud service account.
2. Enable Google Sheets API.
3. Download the JSON key; put `client_email` and `private_key` into env.
4. Create (or reuse) a spreadsheet; share it with the service account email as **Editor**.
5. Apply migration `20260804100000_google_sheets_crm_sync.sql`.

## Sheets

Created automatically if missing:

- **Customer Work** — one row per application (keyed by Application ID)
- **Customer Master** — one row per customer (keyed by Customer ID / `customer_code`)

## Flow

1. Application/payment/status/invoice/WhatsApp event fires.
2. `scheduleCrmSync` enqueues `crm_sync_jobs` (non-blocking).
3. `after()` + cron `/api/cron/crm-sync` (every 5 minutes) process the queue.
4. Processor upserts Sheets rows (never duplicates Application ID).

## Admin

`/admin/crm-sync` — pending / success / failed / retry / process now.

## Backfill

```bash
node --env-file=.env.local --experimental-strip-types scripts/crm-sync-backfill.mjs --limit=100 --process
```

Or admin: `POST /api/admin/crm-sync` with `{ "action": "backfill", "limit": 100, "processAfterEnqueue": true }`.

See `docs/crm-sync-production-readiness.md` for the full deployment and rollback checklist.
