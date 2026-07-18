-- 20260706000000_customer_auth_system.sql
-- Mobile/PIN customer auth support WITHOUT destroying the CRM customers table.
--
-- Previous version used DROP TABLE public.customers CASCADE, which destroyed
-- CRM identity (user_id, full_name, assigned_agent_id), orphaned FKs, and
-- removed vault RLS policies. That is incompatible with the live app.

-- 1. Preserve CRM customers; add optional PIN/auth columns only
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS hashed_pin VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- Keep name in sync with canonical full_name when present
UPDATE public.customers
SET name = full_name
WHERE (name IS NULL OR btrim(name) = '')
  AND full_name IS NOT NULL
  AND btrim(full_name) <> '';

-- 2. Satellite auth tables (safe recreate; do not touch customers)
DROP TABLE IF EXISTS public.otp_codes CASCADE;
DROP TABLE IF EXISTS public.customer_login_logs CASCADE;
DROP TABLE IF EXISTS public.customer_sessions CASCADE;
DROP TABLE IF EXISTS public.customer_devices CASCADE;

CREATE TABLE public.customer_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_identifier TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address INET,
  is_trusted BOOLEAN DEFAULT false,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_devices_customer_id
  ON public.customer_devices(customer_id);

CREATE TABLE public.customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.customer_devices(id) ON DELETE SET NULL,
  refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id
  ON public.customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_refresh_token
  ON public.customer_sessions(refresh_token_hash);

CREATE TABLE public.customer_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(15) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_login_logs_mobile_time
  ON public.customer_login_logs(mobile, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_login_logs_ip_time
  ON public.customer_login_logs(ip_address, created_at DESC);

-- Align with WhatsApp OTP routes (otp_hash) and v2 migration shape
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(15) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  otp_hash TEXT NOT NULL,
  hashed_code VARCHAR(255),
  attempts INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS otp_codes_mobile_purpose_idx
  ON public.otp_codes (mobile, purpose);

-- 3. updated_at helper (idempotent)
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- 4. RLS for satellite tables (service-role API access)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access to customers" ON public.customers;
CREATE POLICY "Allow service role full access to customers"
  ON public.customers
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Allow service role full access to devices" ON public.customer_devices;
CREATE POLICY "Allow service role full access to devices"
  ON public.customer_devices
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Allow service role full access to sessions" ON public.customer_sessions;
CREATE POLICY "Allow service role full access to sessions"
  ON public.customer_sessions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Allow service role full access to login_logs" ON public.customer_login_logs;
CREATE POLICY "Allow service role full access to login_logs"
  ON public.customer_login_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Allow service role full access to otp_codes" ON public.otp_codes;
CREATE POLICY "Allow service role full access to otp_codes"
  ON public.otp_codes
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
