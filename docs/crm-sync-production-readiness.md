# CRM Sync — Production Readiness Audit & Deployment Checklist

Date: 2026-08-04  
Scope: Google Sheets live office CRM mirror (website = source of truth)

---

## 1. Audit verdict

**Ready to deploy after:**
1. Applying both CRM migrations on production Supabase  
2. Setting Google service-account env vars  
3. Sharing the spreadsheet with the service account (Editor)

**No blocking regressions found in customer/AP/agent/admin request paths.**  
CRM sync is fire-and-forget (`scheduleCrmSync`); enqueue/process failures are logged and never thrown to the HTTP response.

---

## 2. Defects found and fixed in this audit

| Defect | Impact | Fix |
|--------|--------|-----|
| Concurrent workers could claim the same job | Double Sheet writes | Optimistic claim: update `pending → processing` must return a row |
| Jobs stuck in `processing` after timeout | Sync stalls | Auto-recover processing older than 10 minutes |
| Multiple pending event types per application | Race → duplicate Sheet rows | One pending job per application (unique index + payload merge) |
| Append without final Application ID re-check | Duplicate rows under concurrency | Re-scan Application ID column before append |
| Manual retry overwrote `event_type` | Lost audit context | Preserve event type; set `payload.manualRetry` |

---

## 3. Event flow coverage

| Source | Hook | Event |
|--------|------|-------|
| Customer `/api/applications` | after create | `application_created` / `payment_updated` + `whatsapp_sent` |
| `/api/create-order` | wallet-only + Razorpay draft | `payment_updated` / `application_created` |
| AP `/api/ap/applications` | after create | create/pay + WhatsApp |
| AP transition | after status step | `status_updated` |
| Agent `/api/agent/applications` | after create | `application_created` |
| Admin lead convert | after insert | `application_created` |
| Admin application PATCH | after update | `status_updated` / `admin_updated` |
| Admin final document | after complete | `status_updated` / `admin_updated` |
| Admin generate invoice | after create | `invoice_generated` |
| `createInvoiceForApplication` | after insert | `invoice_generated` |
| Verify payment + Razorpay webhook | after verify | `payment_updated` + WhatsApp |
| Payment reconciliation mark paid | after update | `payment_updated` |
| `triggerWhatsAppNotification` | after send | `whatsapp_sent` |

Unpaid applications **do** enqueue — payment is not required.

---

## 4. Idempotency

- Sheet rows keyed by **Application ID** (Customer Work) and **Customer ID** (Customer Master)  
- `crm_sheet_row_map` caches row numbers  
- Unique partial index: one `pending` job per `application_id`  
- Queue claim is compare-and-set on status  
- Successful sync coalesces any leftover pending siblings  
- Backfill skips already-mapped applications by default  

---

## 5. Security

| Check | Status |
|-------|--------|
| Service account key only in server env | Pass |
| Private key never returned by APIs | Pass (admin returns booleans only) |
| `/api/crm-sync` requires `CRON_SECRET` / `CRM_SYNC_SECRET` or admin | Pass |
| `/api/admin/crm-sync` admin-only | Pass |
| `/api/cron/crm-sync` Bearer `CRON_SECRET` | Pass |
| RLS enabled on queue/map tables; no public policies | Pass |
| `server-only` on Google/CRM libs | Pass |

---

## 6. Website functionality impact

| Concern | Assessment |
|---------|------------|
| Request latency | Sync scheduled via `after()`; user response not awaited |
| Failure isolation | Enqueue errors caught/logged inside `scheduleCrmSync` |
| Missing Google config | Soft-skip (`not_configured`); site continues |
| Missing migration | Soft-fail persist for `work_id`/`customer_code`; sync still uses deterministic IDs |

---

## 7. Backfill (historical applications)

### CLI
```bash
node --env-file=.env.local --experimental-strip-types scripts/crm-sync-backfill.mjs --limit=100 --process
# continue:
node --env-file=.env.local --experimental-strip-types scripts/crm-sync-backfill.mjs --cursor="<created_at>|<id>" --process
```

### Admin API
```http
POST /api/admin/crm-sync
{ "action": "backfill", "limit": 100, "processAfterEnqueue": true }
```
Use returned `nextCursor` for the next page.

Library: `src/lib/crmBackfill.ts`  
Script: `scripts/crm-sync-backfill.mjs`

---

## 8. Deployment checklist

### Pre-deploy
- [ ] Create Google Cloud service account; enable Sheets API  
- [ ] Create/share spreadsheet with service account **Editor**  
- [ ] Note spreadsheet ID  
- [ ] Apply migrations on production Supabase:
  - `20260804100000_google_sheets_crm_sync.sql`
  - `20260804113000_crm_sync_idempotency.sql`
- [ ] Set Vercel Production env:
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (literal `\n` newlines OK)
  - Confirm `CRON_SECRET` exists  
- [ ] Confirm `vercel.json` cron `/api/cron/crm-sync` every 5 minutes  

### Deploy
- [ ] Deploy app (Vercel production)  
- [ ] Confirm deployment READY  
- [ ] Open `/admin/crm-sync` as admin — `configured: true`  

### Smoke test
- [ ] Submit **unpaid** customer application → pending job → Customer Work row (Unpaid)  
- [ ] Pay / mark paid → same Application ID row updates (Paid, balance 0)  
- [ ] Admin status change → Work Status / follow-up update  
- [ ] Generate invoice → Invoice No / Link populated  
- [ ] WhatsApp send → WhatsApp Status updated  
- [ ] Re-submit sync for same app → **no duplicate** Application ID row  
- [ ] Confirm original signup/login/AP flows still work  

### Backfill
- [ ] Run backfill in batches of 100  
- [ ] Monitor `/admin/crm-sync` failed count  
- [ ] Retry failures after fixing Sheet permissions if needed  

---

## 9. Rollback steps

### Soft disable (preferred — no code rollback)
1. Remove or blank `GOOGLE_SHEETS_SPREADSHEET_ID` (or private key) in Vercel  
2. Redeploy or wait for env propagation  
3. `scheduleCrmSync` becomes no-op (`not_configured`)  
4. Website continues; queue inserts stop  

### Disable cron only
1. Remove `/api/cron/crm-sync` from `vercel.json` and redeploy  
2. Or revoke `CRON_SECRET` temporarily (cron returns 401)  

### Code rollback
1. Revert the CRM sync commit(s) on `main` and redeploy  
2. Leave migrations in place (additive; harmless)  
3. Optionally truncate `crm_sync_jobs` if noise is unwanted:
   ```sql
   TRUNCATE public.crm_sync_jobs;
   ```

### Do **not** drop `work_id` / `customer_code` without a dedicated migration review — they are additive and safe to keep.

---

## 10. Files touched by this audit pass

**Fixed**
- `src/lib/syncQueue.ts` — claim, coalesce, stale recovery  
- `src/lib/workSync.ts` — pre-append Application ID re-check  
- `supabase/migrations/20260804113000_crm_sync_idempotency.sql`  

**Added**
- `src/lib/crmBackfill.ts`  
- `scripts/crm-sync-backfill.mjs`  
- `docs/crm-sync-production-readiness.md` (this file)  

**Extended**
- `src/app/api/admin/crm-sync/route.ts` — `backfill` action  
