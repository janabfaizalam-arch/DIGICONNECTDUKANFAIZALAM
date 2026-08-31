-- One DPR service, not two.
--
-- The catalogue carried the Detailed Project Report twice:
--
--   detailed-project-report  status 'published', the dedicated page, and the
--                            thirteen application questions seeded for it
--   dpr-report               status NULL, created a month earlier, no fields
--
-- `status` being NULL kept `dpr-report` out of every listing, which made it
-- look retired without being retired: the service page and the application
-- both resolve on `active` alone, so anyone holding the link still reached it
-- — and was asked the six shared questions and none of the thirteen.
--
-- Archived rather than deleted. `applications` records a service by its slug
-- and name as text rather than by a key, so past DPR files keep their own
-- record either way; but the row also carries whatever an administrator wrote
-- on it, and that is not worth destroying to close a duplicate. Setting
-- `active` false takes it off the site completely — `getPublicServiceRowBySlug`
-- filters on `active`, so the row stops resolving at all — and the redirects
-- in `next.config.ts` carry both its URLs to the live service.

update public.services
set
  active = false,
  status = 'archived'
where slug = 'dpr-report';
