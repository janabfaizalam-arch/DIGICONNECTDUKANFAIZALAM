-- 20260706000000_customer_auth_system.sql

-- Drop existing tables if they somehow exist (useful for testing, though in prod we'd normally omit this)
DROP TABLE IF EXISTS public.otp_codes CASCADE;
DROP TABLE IF EXISTS public.customer_login_logs CASCADE;
DROP TABLE IF EXISTS public.customer_sessions CASCADE;
DROP TABLE IF EXISTS public.customer_devices CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- 1. Customers Table (Replacing Supabase auth.users for customers)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    pincode VARCHAR(10),
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    referral_code VARCHAR(50),
    hashed_pin VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to update updated_at on customers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();


-- 2. Customer Devices Table
CREATE TABLE public.customer_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    device_identifier TEXT UNIQUE NOT NULL, -- e.g., a hashed unique device ID string
    user_agent TEXT,
    ip_address INET,
    is_trusted BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_customer_devices_customer_id ON public.customer_devices(customer_id);

-- 3. Customer Sessions Table
CREATE TABLE public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.customer_devices(id) ON DELETE SET NULL,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_customer_sessions_customer_id ON public.customer_sessions(customer_id);
CREATE INDEX idx_customer_sessions_refresh_token ON public.customer_sessions(refresh_token_hash);

-- 4. Customer Login Logs (For security audits and rate limiting)
CREATE TABLE public.customer_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(15) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed_pin', 'failed_blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_customer_login_logs_mobile_time ON public.customer_login_logs(mobile, created_at DESC);
CREATE INDEX idx_customer_login_logs_ip_time ON public.customer_login_logs(ip_address, created_at DESC);

-- 5. OTP Codes Table (To securely store OTP state during signup/forgot-pin)
CREATE TABLE public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(15) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'signup', 'login', 'password_reset'
    hashed_code VARCHAR(255) NOT NULL,
    attempts INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(mobile, purpose)
);

-- RLS setup (Keep it secure, all operations handled by secure API routes)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- API routes will use service_role key to bypass RLS, or we can allow service_role explicitly
CREATE POLICY "Allow service role full access to customers" ON public.customers FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Allow service role full access to devices" ON public.customer_devices FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Allow service role full access to sessions" ON public.customer_sessions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Allow service role full access to login_logs" ON public.customer_login_logs FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Allow service role full access to otp_codes" ON public.otp_codes FOR ALL USING (auth.jwt()->>'role' = 'service_role');
