# DigiConnect Dukan — CRM Redesign Audit

Date: 2026-08-05  
Package manager: **pnpm** (`pnpm-lock.yaml` present; also a legacy `package-lock.json`)  
Branch: `main` (clean relative to CRM redesign start; unrelated OTP WIP may exist locally)  
Baseline: `npx tsc --noEmit` **PASS**; `npx next lint` **PASS** (warnings only in unused stub settings page); `pnpm lint` may fail on local App Control / ignored builds — use `npx next lint` / `npx tsc`

**Source of truth:** current code + `supabase/migrations`. Older reports are compared below; conflicts are noted.

---

## 1. Current technology stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router (`next@^15.5.5`) |
| UI | React 19, Tailwind 4, Radix Select, Lucide, CVA |
| Forms | react-hook-form + Zod 4 |
| Auth | Supabase Auth SSR (`@supabase/ssr`) + custom PIN/OTP/AP password |
| Data | Supabase Postgres + RLS; service-role on server only |
| Payments | Razorpay |
| WhatsApp | AiSensy Campaign API (server-side) |
| CRM mirror | Google Sheets via service account + `crm_sync_jobs` queue |
| Charts | recharts (admin dashboard) |
| Tests | Vitest + Playwright (visual); Windows App Control may block Rollup native |
| Deploy | Vercel |

---

## 2. Existing modules and routes (operating system)

Three live portals:

| Portal | Base | Role |
|--------|------|------|
| Admin CRM | `/admin` | `admin` (+ aliases `super_admin`, `staff`, …) |
| Digi Partner | `/ap` | `agency_partner` / active partner membership |
| Customer | `/customer` | `customer` (WhatsApp + 6-digit PIN) |

Legacy `/agent/*` redirects to `/ap/*`.

### Admin (CRM-relevant)

- Dashboard `/admin` — real KPIs via `src/lib/admin/dashboard-data.ts`
- Applications, customers (incl. `/admin/customers/new`), Digi Partners, services, payments, offline invoices, leads (+ `/leads/pipeline`), CRM Sync, wallet, commissions, reports, CMS

### Digi Partner

- Dashboard, applications/new (New Customer → application), customers, leads, wallet, commissions, team, offline invoices

### Customer

- Signup OTP → PIN, login PIN, forgot PIN, dashboard, applications, profile, wallet, credit reports

---

## 3. Current database entities (CRM core)

| Entity | Status |
|--------|--------|
| `profiles` / `users` | Auth identity + role |
| `customers` | Dual-era columns (`full_name` CRM + PIN fields) — **do not DROP** |
| `applications` | Core work object; status machine; mobile normalized |
| `application_documents` | Docs + finals visibility |
| `agency_partners` | Partner org + `partner_type` |
| `leads` | Website/agent enquiry leads |
| `crm_leads` | Prototype pipeline (partially demo) |
| `payments` / `invoices` / `offline_invoices` | Money |
| `assignments` | Current assignment only (thin history) |
| `application_status_logs` | Status trail |
| `audit_logs` / `auth_security_events` | Fragmented audit |
| `auth_otp_requests` | OTP hashes; RLS deny-all |
| `crm_sync_jobs` / `crm_sheet_row_map` | Sheets outbox |
| `services` / `service_catalog` / agent-services | Catalog (multiple UIs) |

**No** unified `communication_outbox`, `automation_runs`, or `audit_events` table yet.

---

## 4. Authentication and role model

**Canonical app roles** (`src/lib/auth.ts`, middleware): `admin` | `agency_partner` | `customer`.

| Actor | Login | Secret storage |
|-------|-------|----------------|
| Customer | Phone + PIN | PIN → HMAC → Supabase password; OTP HMAC in DB |
| Digi Partner | Username + password | Supabase Auth; forced change supported |
| Admin | Email + password | Supabase Auth |

**Report conflict:** `AUTH_REDESIGN_REPORT.md` claims PIN/OTP auth complete; admin **Create Customer** UI still requires email + staff-chosen password — **not** aligned with walk-in PIN onboarding. Treat code as truth; walk-in redesign must use PIN-compatible identity (`{mobile}@customer.rnos.internal`).

**RLS gap:** `current_app_role()` historically collapses unknown roles to `customer`; `agency_partner` may be misclassified in older policies. App APIs often use service role after `isAdminRole` / `isActiveAgent` gates.

---

## 5. Existing integrations

| Integration | Server module | Env names (no values) | Local `.env.local` sample |
|-------------|---------------|----------------------|---------------------------|
| Supabase | `src/lib/supabase/*` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | present |
| AiSensy | `src/lib/whatsapp/aisensy.ts` | `WHATSAPP_PROVIDER`, `AISENSY_API_KEY`, campaign names, `AISENSY_API_URL` | often Vercel-only |
| Google Sheets CRM | `google.ts`, `googleSheets.ts`, `crmSync.ts` | `GOOGLE_SHEETS_*`, `GOOGLE_SERVICE_ACCOUNT_*` | often Vercel-only |
| Razorpay | `razorpay.ts` | `RAZORPAY_*`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | often Vercel-only |
| PIN HMAC | `auth/pin.ts` | `AUTH_HMAC_SECRET` | required in prod |
| Pincode | `lib/pincode.ts` → India Post / fallbacks | none required | works |
| Unifers / Credit | credit libs + reports | per Unifers reports | separate |

Client-safe: only `NEXT_PUBLIC_*`. Service role, AiSensy keys, Google private key, Razorpay secret, HMAC — **server-only**.

---

## 6. Features already working

- Three-portal auth + middleware route protection  
- Customer WhatsApp OTP signup + PIN login (production path hardened recently)  
- Admin applications workflow, WhatsApp notify actions  
- Digi Partner application create with existing/new customer toggle  
- Admin dashboard real metrics/charts  
- Offline / walk-in invoices  
- Customer merge API (`/api/admin/customers/merge`)  
- Google Sheets CRM sync queue (enqueue awaited; Customer Work data from row 3)  
- Pincode lookup API `/api/pincode`  
- Lead list + pipeline UI (pipeline partially demo)  
- Payment reconciliation tooling  

---

## 7. Broken / incomplete / misaligned

| Item | Issue |
|------|-------|
| Admin Create Customer | Email/password model vs customer PIN OS |
| Unified walk-in wizard | Missing phone-first → lookup → service → application → notify |
| Dual lead systems | `leads` vs `crm_leads` not unified |
| Dual services UIs | `agent-services` vs `services` vs builder |
| Assignment engine | No explainable scoring / history table |
| WhatsApp outbox | Per-event sends; not a full durable outbox for all automations |
| AI features | Keyword/mock only — no LLM provider |
| `/admin/tickets` | localStorage stub |
| Role granularity | Owner/Manager/Counter/Accountant not first-class (aliases → admin) |
| Partner RLS | `agency_partner` vs `current_app_role()` drift |

---

## 8. Duplicate / obsolete code

- Unused `src/lib/admin/admin-dashboard.ts`, old `admin-dashboard.tsx`  
- Legacy `/agent` pages + APIs  
- Dual customer auth stacks (`auth/customer`, `customer/auth`, `auth-v2`)  
- Dual CRM sync entrypoints (admin / cron / public secret)  
- Mock “AI” homepage/service helpers  

---

## 9. Security risks (prioritized)

1. **IDOR / RLS inconsistency** — many admin APIs use service role; correctness depends entirely on route auth.  
2. **`leads` policies** (migrations) historically too open for authenticated/anon — verify live DB.  
3. **Admin create customer password** — staff-set passwords risk weak shared secrets.  
4. **Account enumeration** — lookup endpoints must rate-limit and avoid privileged-user leakage (partially done on AP lookup).  
5. **Fragmented audit** — sensitive merges/status changes not always in one trail.  
6. **Document storage** — signed URLs exist for finals; keep verifying path isolation.  
7. **Legacy `auth_otps` policies** — prefer `auth_otp_requests` deny-all as canonical.  

---

## 10. Performance bottlenecks

- Large admin dashboard queries — mitigated by pagination/RPC patterns in `dashboard-data.ts`  
- Application list N+1 risk if documents/customers joined naively  
- Client-heavy CMS/service builder pages  
- Sheets sync after() processing — enqueue is awaited (good)  

---

## 11. UX problems

- New Customer not phone-first on admin  
- No single counter-staff “walk-in OS” screen  
- Lead pipeline vs list confusion  
- Stub tickets / mock AI damages trust  
- Mobile admin usable but walk-in form not optimized for counter speed  

---

## 12. Test coverage gaps

- Phone-first walk-in E2E missing  
- Permission matrix untested  
- Assignment rules untested  
- Lead conversion atomicity untested  
- WhatsApp idempotency partially covered in unit tests  
- Vitest may fail on this Windows App Control machine (Rollup native blocked)  

---

## 13. Report vs code discrepancies

| Report | Claim | Code truth |
|--------|-------|------------|
| AUTH_REDESIGN_REPORT | Customer auth redesigned | True for `/customer/*`; admin create still email/password |
| CUSTOMER_UX_AUDIT / FINAL_CUSTOMER_ROUTES | Customer routes audited | Largely still accurate; keep PIN flow as canonical |
| BUILD_FIX_REPORT | Build green | `tsc` green; SWC may be blocked locally by App Control; Vercel builds OK |
| UNIFERS_* | Credit API issues | Separate from CRM OS; do not block walk-in phase |
| task.md | Services V5 done | Services catalog still multi-UI |

---

## 14. Proposed architecture (incremental)

```
Portals (admin / ap / customer)
        ↓
Permission helper (crm/permissions) + existing auth gates
        ↓
Domain services (customers, applications, leads, messaging)
        ↓
Supabase (RLS + service-role server) + outbox jobs
        ↓
Adapters: AiSensy | Razorpay | Google Sheets | Pincode | (future AI)
```

Preserve tables; add **additive** columns/tables only after Phase 2–3 needs are proven.

---

## 15. Safe migration strategy

1. No DROP/TRUNCATE of production tables.  
2. Additive migrations only; every migration has rollback note.  
3. Feature-flag new walk-in UI beside old Create Customer.  
4. Deploy app before requiring new columns when possible.  
5. Sheets CRM / OTP paths already production — do not regress.  

---

## 16. Prioritized implementation phases

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Discovery, audit, baseline verify | **This document** |
| 2 | Permissions foundation + phone-first walk-in | **Starting now** |
| 3 | Service select → application create → assignment → notify | Next |
| 4 | Leads unification + staff queues | Later |
| 5 | WhatsApp outbox hardening | Later |
| 6 | Dashboards polish + AI adapters (disabled without keys) | Later |
| 7 | QA, RLS review, deployment guide | Later |

---

## 17. Blocking questions (need decision only if we expand roles)

1. Should counter staff become a **distinct DB role**, or remain `admin` with UI-scoped permissions?  
   **Default for Phase 2:** keep `admin` / `agency_partner` / `customer`; encode finer permissions in code matrix without DB role migration.  
2. Should walk-in create force WhatsApp PIN delivery immediately, or allow “create silent + activate later”?  
   **Default:** generate secure PIN, queue WhatsApp if AiSensy configured; never block save if messaging fails.  

No other blockers for Phase 2.

---

## 18. Environment checklist (names only)

**Required for core CRM:** Supabase trio, `AUTH_HMAC_SECRET`  
**Customer OTP:** AiSensy key + signup/reset/login campaigns  
**Sheets:** Google Sheets ID + service account email/key  
**Payments:** Razorpay keys + webhook secret  
**Site:** `NEXT_PUBLIC_SITE_URL`
