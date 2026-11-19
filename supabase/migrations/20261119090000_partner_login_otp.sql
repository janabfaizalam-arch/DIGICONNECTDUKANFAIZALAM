-- ============================================================================
-- DC Partners can sign in with a WhatsApp OTP
-- ============================================================================
--
-- The OTP machinery already exists and is in daily use: `auth_otp_requests`
-- holds a hashed code with an expiry, an attempt count, per-phone and per-IP
-- hourly limits, and a one-time verification token. None of that needs
-- rebuilding for partners — but `purpose` is a closed list, and a partner
-- signing in is not any of the four things on it.
--
-- It gets its own value rather than borrowing `security_verification`, because
-- the rate limits, the resend cooldown and the "invalidate the previous code"
-- rule are all scoped per purpose. Sharing one would mean a partner asking for
-- a login code could cancel a customer's half-finished signup on the same
-- number, and the two would eat each other's hourly quota.

alter table public.auth_otp_requests
  drop constraint if exists auth_otp_requests_purpose_check;

alter table public.auth_otp_requests
  add constraint auth_otp_requests_purpose_check
  check (purpose in (
    'customer_signup',
    'forgot_pin',
    'change_phone',
    'security_verification',
    'partner_login'
  ));

-- Finding a partner by the number they typed. `agency_partners.mobile` is read
-- on every OTP request and on every verify, and it was not indexed: the login
-- the whole feature rests on was a sequential scan of the directory.
create index if not exists agency_partners_mobile_idx
  on public.agency_partners (mobile)
  where mobile is not null;

comment on constraint auth_otp_requests_purpose_check on public.auth_otp_requests is
  'Closed list of OTP purposes; partner_login is the DC Partner WhatsApp sign-in.';
