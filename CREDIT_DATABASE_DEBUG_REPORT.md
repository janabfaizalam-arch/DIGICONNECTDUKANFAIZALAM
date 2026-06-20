# CREDIT SCORE MODULE DATABASE DEBUG REPORT

## 1. Exact Root Cause
The database initialization failure error `"Failed to initialize credit check request in database"` occurred because the required tables for the credit score module (`credit_reports`, `credit_payments`, `credit_audit_logs`, `credit_api_logs`) were missing from the remote Supabase database linked to the project (`oqcudhmnsmqwlfzlrvfw`). The migration scripts containing these table definitions (`20260620140000_credit_reports_module.sql` and `20260620141000_credit_api_logs.sql`) were present in the codebase but had not yet been pushed to the remote Supabase database instance.

## 2. Exact Failing Query
When creating a Razorpay order at `/api/credit/create-order`, the server-side route executed the following `INSERT` query against the Supabase database using the client:

```sql
INSERT INTO public.credit_reports (
  customer_id, 
  full_name, 
  mobile, 
  pan, 
  dob, 
  status, 
  package_type, 
  amount, 
  provider
) VALUES (
  $1, -- customer_id (UUID)
  $2, -- full_name (text)
  $3, -- mobile (text)
  $4, -- pan (text)
  $5, -- dob (date)
  $6, -- status ('payment_pending')
  $7, -- package_type (text)
  $8, -- amount (numeric)
  $9  -- provider ('unifers')
);
```

This insertion query failed with the PostgreSQL error:
```
relation "public.credit_reports" does not exist
```

## 3. Fix Applied

### A. Database Migrations Push
We successfully pushed the pending credit module migrations to the remote database:
```bash
npx supabase db push
```
This created all the following schema objects inside the public schema on Supabase:
- `credit_reports` table + indexes + RLS select/insert policies
- `credit_payments` table + indexes + RLS select policies
- `credit_audit_logs` table + indexes + RLS select policies
- `credit_api_logs` table + indexes + RLS select policy
- Storage bucket `credit-reports` + authenticated select access policy

### B. Test Pricing Constants and UI Badge (₹10 Test Pricing)
1. Created `TEST_MODE` constant in [constants.ts](file:///c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/src/lib/credit/constants.ts):
   ```typescript
   export const TEST_MODE = true;
   ```
2. Adjusted pricing dynamically inside `CREDIT_PACKAGES` so that if `TEST_MODE` is enabled, all services are priced at ₹10 instead of standard pricing:
   - Credit Score Check = ₹10 (normally ₹99)
   - Credit Report PDF = ₹10 (normally ₹149)
   - Premium Credit Package = ₹10 (normally ₹199)
3. Imported `TEST_MODE` inside [credit-score-form.tsx](file:///c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/src/components/credit/credit-score-form.tsx) and displayed the `"TEST MODE - ₹10"` badge in the packages selection step header.

### C. Detailed Database Logging & Robust Error Handling
Added exact database logging to print details upon database failure inside:
- `/api/credit/create-order`
- `/api/credit/request`
- `/api/credit/verify-payment`

Standardized logging payload structure:
```javascript
console.error({
  error,
  table,
  payload,
})
```
And replaced the generic error message `"Failed to initialize credit check request in database"` with a descriptive message returning the exact database failure details.

## 4. Verification Result
- Successfully pushed the migrations with zero errors.
- Ran production build step: `npm run build` completed successfully.
- Database tables exist and inserts can be processed successfully using the service role client.
