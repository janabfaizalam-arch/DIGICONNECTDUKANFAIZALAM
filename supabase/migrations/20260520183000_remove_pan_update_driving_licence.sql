-- Keep historical PAN applications intact while removing PAN from new service availability.
-- This migration is intentionally defensive because production environments may
-- have different service catalog generations.

do $$
declare
  v_set text;
begin
  if to_regclass('public.service_categories') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_categories' and column_name = 'slug'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_categories' and column_name = 'description'
    )
  then
    v_set := 'description = ''Passport, driving licence, voter ID, labour card, and e-Shram support.''';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_categories' and column_name = 'updated_at'
    ) then
      v_set := v_set || ', updated_at = now()';
    end if;

    execute 'update public.service_categories set ' || v_set || ' where slug = ''gov-id-form-submission''';
  end if;

  if to_regclass('public.service_catalog') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug'
    )
  then
    v_set := '';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'active'
    ) then
      v_set := 'active = false';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'hidden'
    ) then
      v_set := case when v_set = '' then 'hidden = true' else v_set || ', hidden = true' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'archived'
    ) then
      v_set := case when v_set = '' then 'archived = true' else v_set || ', archived = true' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'updated_at'
    ) then
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    if v_set <> '' then
      execute 'update public.service_catalog set ' || v_set || ' where slug = ''pan-card''';
    end if;

    v_set := '';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'amount'
    ) then
      v_set := 'amount = 1499';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'original_price'
    ) then
      v_set := case when v_set = '' then 'original_price = 2499' else v_set || ', original_price = 2499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'compare_at_price'
    ) then
      v_set := case when v_set = '' then 'compare_at_price = 2499' else v_set || ', compare_at_price = 2499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'updated_at'
    ) then
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    if v_set <> '' then
      execute 'update public.service_catalog set ' || v_set || ' where slug = ''driving-licence''';
    end if;
  end if;

  if to_regclass('public.agent_services') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'slug'
    )
  then
    v_set := '';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'is_active'
    ) then
      v_set := 'is_active = false';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'active'
    ) then
      v_set := case when v_set = '' then 'active = false' else v_set || ', active = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'hidden'
    ) then
      v_set := case when v_set = '' then 'hidden = true' else v_set || ', hidden = true' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'archived'
    ) then
      v_set := case when v_set = '' then 'archived = true' else v_set || ', archived = true' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'updated_at'
    ) then
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    if v_set <> '' then
      execute 'update public.agent_services set ' || v_set || ' where slug = ''pan-card''';
    end if;

    v_set := '';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'customer_fee'
    ) then
      v_set := 'customer_fee = 1499';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'original_price'
    ) then
      v_set := case when v_set = '' then 'original_price = 2499' else v_set || ', original_price = 2499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'compare_at_price'
    ) then
      v_set := case when v_set = '' then 'compare_at_price = 2499' else v_set || ', compare_at_price = 2499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'updated_at'
    ) then
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    if v_set <> '' then
      execute 'update public.agent_services set ' || v_set || ' where slug = ''driving-licence''';
    end if;
  end if;

  if to_regclass('public.services') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'slug'
    )
  then
    v_set := '';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'status'
    ) then
      v_set := 'status = ''archived''';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'is_active'
    ) then
      v_set := case when v_set = '' then 'is_active = false' else v_set || ', is_active = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'active'
    ) then
      v_set := case when v_set = '' then 'active = false' else v_set || ', active = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'hidden'
    ) then
      v_set := case when v_set = '' then 'hidden = true' else v_set || ', hidden = true' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'archived'
    ) then
      v_set := case when v_set = '' then 'archived = true' else v_set || ', archived = true' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'show_on_homepage'
    ) then
      v_set := case when v_set = '' then 'show_on_homepage = false' else v_set || ', show_on_homepage = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'featured'
    ) then
      v_set := case when v_set = '' then 'featured = false' else v_set || ', featured = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'is_featured'
    ) then
      v_set := case when v_set = '' then 'is_featured = false' else v_set || ', is_featured = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'updated_at'
    ) then
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''pan-card''';
    end if;

    v_set := '';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'old_price'
    ) then
      v_set := 'old_price = 2499';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'base_price'
    ) then
      v_set := case when v_set = '' then 'base_price = 2499' else v_set || ', base_price = 2499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'original_price'
    ) then
      v_set := case when v_set = '' then 'original_price = 2499' else v_set || ', original_price = 2499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'compare_at_price'
    ) then
      v_set := case when v_set = '' then 'compare_at_price = 2499' else v_set || ', compare_at_price = 2499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price'
    ) then
      v_set := case when v_set = '' then 'offer_price = 1499' else v_set || ', offer_price = 1499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'sale_price'
    ) then
      v_set := case when v_set = '' then 'sale_price = 1499' else v_set || ', sale_price = 1499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'amount'
    ) then
      v_set := case when v_set = '' then 'amount = 1499' else v_set || ', amount = 1499' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'price_label'
    ) then
      v_set := case when v_set = '' then 'price_label = ''Rs 1499''' else v_set || ', price_label = ''Rs 1499''' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'badge'
    ) then
      v_set := case when v_set = '' then 'badge = ''Save Rs 1000''' else v_set || ', badge = ''Save Rs 1000''' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'updated_at'
    ) then
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''driving-licence''';
    end if;
  end if;
end $$;
