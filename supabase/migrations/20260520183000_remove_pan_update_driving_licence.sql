-- Keep historical PAN applications intact while removing PAN from new service availability.

update public.service_catalog
set active = false,
    updated_at = now()
where slug = 'pan-card';

update public.service_categories
set description = 'Passport, driving licence, voter ID, labour card, and e-Shram support.',
    updated_at = now()
where slug = 'gov-id-form-submission';

update public.service_catalog
set amount = 1499,
    updated_at = now()
where slug = 'driving-licence';

update public.agent_services
set is_active = false,
    updated_at = now()
where slug = 'pan-card';

update public.agent_services
set customer_fee = 1499,
    updated_at = now()
where slug = 'driving-licence';

do $$
begin
  if to_regclass('public.services') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'status'
    ) then
      update public.services
      set status = 'archived',
          updated_at = now()
      where slug = 'pan-card';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'is_active'
    ) then
      update public.services
      set is_active = false,
          updated_at = now()
      where slug = 'pan-card';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'show_on_homepage'
    ) then
      update public.services
      set show_on_homepage = false,
          updated_at = now()
      where slug = 'pan-card';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'featured'
    ) then
      update public.services
      set featured = false,
          updated_at = now()
      where slug = 'pan-card';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'is_featured'
    ) then
      update public.services
      set is_featured = false,
          updated_at = now()
      where slug = 'pan-card';
    end if;

    update public.services
    set old_price = 2499,
        offer_price = 1499,
        price_label = 'Rs 1499',
        badge = 'Save Rs 1000',
        updated_at = now()
    where slug = 'driving-licence';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'base_price'
    ) then
      update public.services
      set base_price = 2499,
          updated_at = now()
      where slug = 'driving-licence';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'sale_price'
    ) then
      update public.services
      set sale_price = 1499,
          updated_at = now()
      where slug = 'driving-licence';
    end if;
  end if;
end $$;
