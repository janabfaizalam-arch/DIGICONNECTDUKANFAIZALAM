-- ============================================================================
-- DC Partners rename — tier display labels
--
-- The partner programme is now called "DC Partners" everywhere in the UI, but
-- the tier badge in the partner top bar reads its text straight out of
-- agency_partner_tiers.name, so the old "AP ..." wording survived the code
-- rename. Rewrite the labels by slug; the slugs, ids and every foreign key
-- pointing at them stay exactly as they are.
-- ============================================================================

update public.agency_partner_tiers
set name = 'DC Starter',
    updated_at = now()
where slug = 'ap-starter' and name <> 'DC Starter';

update public.agency_partner_tiers
set name = 'DC Silver',
    updated_at = now()
where slug = 'ap-silver' and name <> 'DC Silver';

update public.agency_partner_tiers
set name = 'DC Gold',
    updated_at = now()
where slug = 'ap-gold' and name <> 'DC Gold';

update public.agency_partner_tiers
set name = 'DC Platinum',
    updated_at = now()
where slug = 'ap-platinum' and name <> 'DC Platinum';

update public.agency_partner_tiers
set name = 'DC Franchise',
    updated_at = now()
where slug = 'ap-franchise' and name <> 'DC Franchise';

-- Tier descriptions mentioned the old programme name too.
update public.agency_partner_tiers
set description = 'Default starter tier for new DC Partners',
    updated_at = now()
where slug = 'ap-starter' and description = 'Default starter tier for new agency partners';
