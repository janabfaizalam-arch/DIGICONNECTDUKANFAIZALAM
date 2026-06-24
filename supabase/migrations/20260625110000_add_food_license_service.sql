do $$
declare
  v_category_id uuid;
  v_cols text;
  v_vals text;
  v_set text;
  v_blog_content text;
begin
  -- 1. Get "Company Registration & Compliance" category
  if to_regclass('public.service_categories') is not null then
    select id into v_category_id
    from public.service_categories
    where slug = 'company'
    limit 1;
  end if;

  -- Default blog content
  v_blog_content := 'If you are looking for secure, reliable online application support for FSSAI Food License, DigiConnect Dukan offers structured PAN India assistance. Backed by professional processes from RNOS India Pvt Ltd, we guide you through every step of FSSAI Registration, State License, or Central License. 

Navigating online portals can be challenging due to strict guidelines, complex document uploads, and validation steps. This service is designed specifically for food vendors, cloud kitchens, restaurants, and manufacturers who need to get their filings done without delays. 

When you apply via DigiConnect Dukan, our specialists verify your forms, double-check spellings, verify database credentials, and contact you via WhatsApp for immediate support. This cuts down on friction and reduces the risk of rejection from official safety departments.';

  -- 2. Insert into service_catalog if table exists
  if to_regclass('public.service_catalog') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug')
  then
    execute 'insert into public.service_catalog (slug, name, description, amount, required_documents, active, status, updated_at) ' ||
      'values (''food-license'', ''Food License (FSSAI)'', ''Apply for FSSAI Registration, State License or Central License with expert assistance.'', 1499, array[''Aadhaar Card'', ''PAN Card'', ''Passport Photograph'', ''Address Proof (NOC/Electric Bill)''], true, ''published'', now()) ' ||
      'on conflict (slug) do update set name = ''Food License (FSSAI)'', amount = 1499, updated_at = now()';
  end if;

  -- 3. Insert/update services table
  if to_regclass('public.services') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('food-license');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category_id') then
      v_cols := v_cols || ', category_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null');
      v_set := 'category_id = coalesce(' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null') || ', category_id)';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ''Food License (FSSAI)''';
      v_set := case when v_set = '' then 'title = ''Food License (FSSAI)''' else v_set || ', title = ''Food License (FSSAI)''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ''Food License (FSSAI)''';
      v_set := case when v_set = '' then 'name = ''Food License (FSSAI)''' else v_set || ', name = ''Food License (FSSAI)''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'short_description') then
      v_cols := v_cols || ', short_description';
      v_vals := v_vals || ', ''Apply for FSSAI Registration, State License or Central License with expert assistance.''';
      v_set := case when v_set = '' then 'short_description = ''Apply for FSSAI Registration, State License or Central License with expert assistance.''' else v_set || ', short_description = ''Apply for FSSAI Registration, State License or Central License with expert assistance.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'amount') then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 1499';
      v_set := case when v_set = '' then 'amount = 1499' else v_set || ', amount = 1499' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'old_price') then
      v_cols := v_cols || ', old_price';
      v_vals := v_vals || ', 2999';
      v_set := case when v_set = '' then 'old_price = 2999' else v_set || ', old_price = 2999' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price') then
      v_cols := v_cols || ', offer_price';
      v_vals := v_vals || ', 1499';
      v_set := case when v_set = '' then 'offer_price = 1499' else v_set || ', offer_price = 1499' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'price_label') then
      v_cols := v_cols || ', price_label';
      v_vals := v_vals || ', ''₹1499''';
      v_set := case when v_set = '' then 'price_label = ''₹1499''' else v_set || ', price_label = ''₹1499''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'cta_type') then
      v_cols := v_cols || ', cta_type';
      v_vals := v_vals || ', ''apply''';
      v_set := case when v_set = '' then 'cta_type = ''apply''' else v_set || ', cta_type = ''apply''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'badge') then
      v_cols := v_cols || ', badge';
      v_vals := v_vals || ', ''Most Popular''';
      v_set := case when v_set = '' then 'badge = ''Most Popular''' else v_set || ', badge = ''Most Popular''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'icon') then
      v_cols := v_cols || ', icon';
      v_vals := v_vals || ', ''compliance''';
      v_set := case when v_set = '' then 'icon = ''compliance''' else v_set || ', icon = ''compliance''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'status') then
      v_cols := v_cols || ', status';
      v_vals := v_vals || ', ''published''';
      v_set := case when v_set = '' then 'status = ''published''' else v_set || ', status = ''published''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'is_active') then
      v_cols := v_cols || ', is_active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'is_active = true' else v_set || ', is_active = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'blog_content') then
      v_cols := v_cols || ', blog_content';
      v_vals := v_vals || ', ' || quote_literal(v_blog_content);
      v_set := case when v_set = '' then 'blog_content = ' || quote_literal(v_blog_content) else v_set || ', blog_content = ' || quote_literal(v_blog_content) end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'updated_at') then
      v_cols := v_cols || ', updated_at';
      v_vals := v_vals || ', now()';
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    execute 'insert into public.services (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.services where slug = ''food-license'')';
    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''food-license''';
    end if;
  end if;
end $$;
