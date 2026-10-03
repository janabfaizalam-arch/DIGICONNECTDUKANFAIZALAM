-- Passport assistance: ₹2,999 DigiConnect service charge.
--
-- Two tables carry a service's price and both must agree:
--   * public.services       — what the public service page displays
--   * public.agent_services — what /api/create-order actually charges
-- The admin panel keeps them in step on save (lib/service-admin.ts); this
-- migration sets both once so the page and the payment can never disagree.
--
-- base_price is set to the same figure and old_price is cleared: there is no
-- earlier price to strike through, and a struck-through "MRP" that never
-- existed is a fake discount.
--
-- The official passport fee is not part of this figure. agent_services keeps
-- government_fee_type = 'extra': it is paid separately, to Passport Seva.
--
-- Every column is checked before it is written, because the services table
-- has carried more than one schema over time (see the ITR CMS migration).

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'services') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'sale_price') then
      update public.services set sale_price = 2999 where slug = 'passport';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price') then
      update public.services set offer_price = 2999 where slug = 'passport';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'base_price') then
      update public.services set base_price = 2999 where slug = 'passport';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'old_price') then
      update public.services set old_price = null where slug = 'passport';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'price_label') then
      update public.services set price_label = null where slug = 'passport';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'is_paid') then
      update public.services set is_paid = true where slug = 'passport';
    end if;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'agent_services') then
    update public.agent_services set customer_fee = 2999 where slug = 'passport';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'customer_fee') then
    update public.service_catalog set customer_fee = 2999 where slug = 'passport';
  end if;
end $$;
