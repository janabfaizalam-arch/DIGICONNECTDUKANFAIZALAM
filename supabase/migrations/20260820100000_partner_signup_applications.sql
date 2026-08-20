-- ============================================================================
-- Digi Partner signup applications
--
-- "Become a Digi Partner" had nowhere to go. The AP login page linked it to
-- /services and the landing page opened WhatsApp, so the only way to become a
-- partner was for an admin to key the whole record in by hand at
-- /admin/agency-partners/new. Nobody could apply on their own.
--
-- This table holds an application BEFORE it is a partner. Approving one
-- provisions the auth user, agency_partners, profiles and users rows; until
-- then nothing about the applicant exists in the partner tables, so a pending
-- or rejected application can never log in or earn.
--
-- Safe / reversible: creates one new table with its own policies. No existing
-- table is read or modified.
-- ============================================================================

create table if not exists public.agency_partner_applications (
  id uuid primary key default gen_random_uuid(),

  -- Applicant-supplied identity
  full_name text not null,
  business_name text,
  partner_type text not null default 'business_partner'
    check (partner_type in ('business_partner', 'company_partner', 'field_executive', 'office_staff')),
  mobile text not null,
  whatsapp text,
  email text not null,

  address text,
  state text,
  district text,
  pin text,

  aadhaar_number text,
  pan_number text,
  gstin text,

  referral_source text,
  about text,

  -- Review lifecycle
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,

  -- Set once the application becomes a real partner.
  created_partner_id uuid references public.agency_partners(id) on delete set null,
  partner_code text,

  -- Handed to the applicant so they can check progress without an account.
  tracking_code text not null unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ap_applications_status_idx
  on public.agency_partner_applications (status, created_at desc);
create index if not exists ap_applications_mobile_idx
  on public.agency_partner_applications (mobile);

-- One open application per mobile number. Without this, a re-submitting
-- applicant fills the review queue with duplicates of themselves and an admin
-- can approve two of them into two separate partner accounts.
create unique index if not exists ap_applications_one_open_per_mobile_idx
  on public.agency_partner_applications (mobile)
  where status in ('pending', 'under_review');

comment on table public.agency_partner_applications is
  'Digi Partner signup requests awaiting review. Approving one provisions the auth user and the agency_partners row; a pending or rejected row grants no access. Reviewed at /admin/partner-applications.';

-- ── Row level security ──────────────────────────────────────────────────────
-- The public form and the status check both run through the service role in
-- route handlers, which bypasses RLS. No anon policy is granted: an applicant
-- must never be able to read the queue, and the columns here hold Aadhaar, PAN
-- and bank-adjacent identity that a leaked anon SELECT would expose wholesale.
alter table public.agency_partner_applications enable row level security;

drop policy if exists "Admins manage partner applications" on public.agency_partner_applications;
create policy "Admins manage partner applications" on public.agency_partner_applications
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- ── updated_at ──────────────────────────────────────────────────────────────
create or replace function public.touch_agency_partner_applications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agency_partner_applications_touch on public.agency_partner_applications;
create trigger agency_partner_applications_touch
  before update on public.agency_partner_applications
  for each row execute function public.touch_agency_partner_applications();
