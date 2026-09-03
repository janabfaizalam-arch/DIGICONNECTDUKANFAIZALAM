-- ============================================================================
-- An email address is not how a Digi Partner logs in
--
-- The public signup form demanded an email and told the applicant it would
-- become their login. Neither half was true. /api/auth/ap/login resolves a
-- USERNAME to <username>@agency.rnos.internal and signs in with that, so the
-- address a shop owner typed was never a credential — and plenty of shop
-- owners in a district town have a WhatsApp number and no working email, so
-- the field was turning real partners away at the first screen.
--
-- Email becomes optional here. What identifies an applicant is their mobile,
-- which is already unique for open applications and is what the team calls
-- them on.
--
-- Safe / reversible: drops a NOT NULL. Nothing is deleted, no existing row
-- changes, and re-adding the constraint later is one statement.
-- ============================================================================

alter table public.agency_partner_applications
  alter column email drop not null;

comment on column public.agency_partner_applications.email is
  'Optional. Contact address only — the partner login is a username derived from the mobile at approval.';
