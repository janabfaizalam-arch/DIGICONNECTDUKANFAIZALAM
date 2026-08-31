-- Four section types the service page blueprint asks for.
--
-- Every service page now renders the same bands in the same order: what this
-- is, who it is for, what you get, why us, how it works, who can apply, what
-- to bring, what it costs, then the proof, the reading and the ask.
--
-- Four of those slots had no `section_type` to store them under, so an
-- administrator wanting an eligibility list had to write it into a rich-text
-- blob and hope it landed somewhere sensible. These give each one a home:
--
--   who_is_it_for    content.items — who should be on this page
--   eligibility      content.items — what has to be true to apply
--   success_stories  content.items — [{ title, text }], written by us
--   important_info   content.text  — the caveats worth reading before paying
--
-- A section with nothing in it is skipped by the page rather than rendered
-- empty, so adding these is safe on every service that never uses them.

alter table public.service_sections
  drop constraint if exists service_sections_section_type_check;

alter table public.service_sections
  add constraint service_sections_section_type_check check (section_type in (
    'hero', 'overview', 'benefits', 'documents', 'process', 'faq', 'gallery',
    'testimonials', 'pricing', 'stats', 'banner', 'rich_text', 'custom_html',
    'video', 'trust_badges', 'offer_strip', 'contact_cta',
    'who_is_it_for', 'eligibility', 'success_stories', 'important_info'
  ));
