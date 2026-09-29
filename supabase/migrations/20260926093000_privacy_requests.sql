-- Privacy / data-rights requests (access, correction, erasure, consent
-- withdrawal, nomination, grievance), so each one has a reference, an owner,
-- a status and a record of when it was resolved.
--
-- Deliberately minimal: a name and the registered mobile (needed to find the
-- person's records and verify it is really them), the request type, optional
-- free-text details, and — when the requester was signed in — their user id.
-- No document, no ID number.
--
-- Submitting a request changes nothing else. Acting on it (correcting or
-- deleting data) is a separate, verified, human decision.
--
-- Access: RLS on and no policies, so the anon and authenticated roles can
-- neither read nor write the table. The public form and the admin screens go
-- through server routes with the service role, which authorise the caller.

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  request_type text not null
    check (request_type in ('access', 'correction', 'erasure', 'withdraw', 'nominate', 'grievance')),
  requester_name text not null check (char_length(requester_name) between 1 and 120),
  requester_mobile text not null check (requester_mobile ~ '^[6-9][0-9]{9}$'),
  details text check (details is null or char_length(details) <= 800),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'verification_required', 'in_review', 'completed', 'rejected')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'failed')),
  assigned_admin_id uuid references auth.users (id) on delete set null,
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists privacy_requests_status_created_idx
  on public.privacy_requests (status, created_at desc);
create index if not exists privacy_requests_mobile_idx
  on public.privacy_requests (requester_mobile, created_at desc);

alter table public.privacy_requests enable row level security;
revoke all on public.privacy_requests from anon, authenticated;

comment on table public.privacy_requests is
  'Data-rights requests. Service role only; see src/lib/privacy/requests.ts.';
