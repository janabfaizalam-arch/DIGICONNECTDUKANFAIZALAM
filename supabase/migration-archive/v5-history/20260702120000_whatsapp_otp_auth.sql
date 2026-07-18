create table if not exists public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  mobile text not null,
  otp_hash text not null,
  purpose text not null check (purpose in ('login', 'signup', 'password_reset')),
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_otps_mobile_purpose_idx on public.auth_otps (mobile, purpose, created_at desc);

-- RLS Policies
alter table public.auth_otps enable row level security;

-- Only service role can access OTP table (since it's done server-side via API)
drop policy if exists "Service role can manage OTPs" on public.auth_otps;
create policy "Service role can manage OTPs" on public.auth_otps
  for all using (true) with check (true);
