do $$
declare
  v_category_id uuid;
  v_catalog_id uuid;
  v_cols text;
  v_vals text;
  v_set text;
begin
  if to_regclass('public.service_categories') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_categories' and column_name = 'id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_categories' and column_name = 'slug')
  then
    select id into v_category_id
    from public.service_categories
    where slug = 'gov-id-form-submission'
    limit 1;
  end if;

  if to_regclass('public.service_catalog') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('eshram-card-registration');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ' || quote_literal('e-Shram Card Registration Assistance');
      v_set := 'name = ''e-Shram Card Registration Assistance''';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'description') then
      v_cols := v_cols || ', description';
      v_vals := v_vals || ', ' || quote_literal('Assisted e-Shram registration, UAN card guidance, download support, and correction help.');
      v_set := case when v_set = '' then 'description = ''Assisted e-Shram registration, UAN card guidance, download support, and correction help.''' else v_set || ', description = ''Assisted e-Shram registration, UAN card guidance, download support, and correction help.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'amount') then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'amount = 149' else v_set || ', amount = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'required_documents') then
      v_cols := v_cols || ', required_documents';
      v_vals := v_vals || ', array[''Aadhaar Card'', ''Mobile Number'', ''Occupation Details optional'', ''Nominee Details optional'']';
      v_set := case when v_set = '' then 'required_documents = array[''Aadhaar Card'', ''Mobile Number'', ''Occupation Details optional'', ''Nominee Details optional'']' else v_set || ', required_documents = array[''Aadhaar Card'', ''Mobile Number'', ''Occupation Details optional'', ''Nominee Details optional'']' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'active') then
      v_cols := v_cols || ', active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'active = true' else v_set || ', active = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'status') then
      v_cols := v_cols || ', status';
      v_vals := v_vals || ', ' || quote_literal('published');
      v_set := case when v_set = '' then 'status = ''published''' else v_set || ', status = ''published''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'updated_at') then
      v_cols := v_cols || ', updated_at';
      v_vals := v_vals || ', now()';
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    execute 'insert into public.service_catalog (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.service_catalog where slug = ''eshram-card-registration'')';
    if v_set <> '' then
      execute 'update public.service_catalog set ' || v_set || ' where slug = ''eshram-card-registration''';
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'id') then
      select id into v_catalog_id from public.service_catalog where slug = 'eshram-card-registration' limit 1;
    end if;
  end if;

  if to_regclass('public.services') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('eshram-card-registration');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category_id') then
      v_cols := v_cols || ', category_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null');
      v_set := 'category_id = coalesce(' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null') || ', category_id)';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ' || quote_literal('e-Shram Card Registration Assistance');
      v_set := case when v_set = '' then 'title = ''e-Shram Card Registration Assistance''' else v_set || ', title = ''e-Shram Card Registration Assistance''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ' || quote_literal('e-Shram Card Registration Assistance');
      v_set := case when v_set = '' then 'name = ''e-Shram Card Registration Assistance''' else v_set || ', name = ''e-Shram Card Registration Assistance''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'short_description') then
      v_cols := v_cols || ', short_description';
      v_vals := v_vals || ', ' || quote_literal('Quick assisted e-Shram support for eligible unorganised workers.');
      v_set := case when v_set = '' then 'short_description = ''Quick assisted e-Shram support for eligible unorganised workers.''' else v_set || ', short_description = ''Quick assisted e-Shram support for eligible unorganised workers.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'overview') then
      v_cols := v_cols || ', overview';
      v_vals := v_vals || ', ' || quote_literal('Assistance for e-Shram eligibility check, documentation guidance, registration, UAN card generation, download, and correction support.');
      v_set := case when v_set = '' then 'overview = ''Assistance for e-Shram eligibility check, documentation guidance, registration, UAN card generation, download, and correction support.''' else v_set || ', overview = ''Assistance for e-Shram eligibility check, documentation guidance, registration, UAN card generation, download, and correction support.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'amount') then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'amount = 149' else v_set || ', amount = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'old_price') then
      v_cols := v_cols || ', old_price';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'old_price = 149' else v_set || ', old_price = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price') then
      v_cols := v_cols || ', offer_price';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'offer_price = 149' else v_set || ', offer_price = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'base_price') then
      v_cols := v_cols || ', base_price';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'base_price = 149' else v_set || ', base_price = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'sale_price') then
      v_cols := v_cols || ', sale_price';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'sale_price = 149' else v_set || ', sale_price = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'price_label') then
      v_cols := v_cols || ', price_label';
      v_vals := v_vals || ', ' || quote_literal('₹149');
      v_set := case when v_set = '' then 'price_label = ''₹149''' else v_set || ', price_label = ''₹149''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'cta_type') then
      v_cols := v_cols || ', cta_type';
      v_vals := v_vals || ', ' || quote_literal('apply');
      v_set := case when v_set = '' then 'cta_type = ''apply''' else v_set || ', cta_type = ''apply''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'badge') then
      v_cols := v_cols || ', badge';
      v_vals := v_vals || ', ' || quote_literal('Worker Support');
      v_set := case when v_set = '' then 'badge = ''Worker Support''' else v_set || ', badge = ''Worker Support''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'icon') then
      v_cols := v_cols || ', icon';
      v_vals := v_vals || ', ' || quote_literal('IdCard');
      v_set := case when v_set = '' then 'icon = ''IdCard''' else v_set || ', icon = ''IdCard''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'status') then
      v_cols := v_cols || ', status';
      v_vals := v_vals || ', ' || quote_literal('published');
      v_set := case when v_set = '' then 'status = ''published''' else v_set || ', status = ''published''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'active') then
      v_cols := v_cols || ', active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'active = true' else v_set || ', active = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'is_active') then
      v_cols := v_cols || ', is_active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'is_active = true' else v_set || ', is_active = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'featured') then
      v_cols := v_cols || ', featured';
      v_vals := v_vals || ', false';
      v_set := case when v_set = '' then 'featured = false' else v_set || ', featured = false' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'sort_order') then
      v_cols := v_cols || ', sort_order';
      v_vals := v_vals || ', 42';
      v_set := case when v_set = '' then 'sort_order = 42' else v_set || ', sort_order = 42' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'benefits') then
      v_cols := v_cols || ', benefits';
      v_vals := v_vals || ', ' || quote_literal('["Eligibility Check","Document Verification","Registration Assistance","UAN/e-Shram Card Generation","Card Download Support","Update/Correction Guidance"]') || '::jsonb';
      v_set := case when v_set = '' then 'benefits = ' || quote_literal('["Eligibility Check","Document Verification","Registration Assistance","UAN/e-Shram Card Generation","Card Download Support","Update/Correction Guidance"]') || '::jsonb' else v_set || ', benefits = ' || quote_literal('["Eligibility Check","Document Verification","Registration Assistance","UAN/e-Shram Card Generation","Card Download Support","Update/Correction Guidance"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'documents') then
      v_cols := v_cols || ', documents';
      v_vals := v_vals || ', ' || quote_literal('["Aadhaar Card","Mobile Number","Bank Details optional","Occupation Details optional","Nominee Details optional"]') || '::jsonb';
      v_set := case when v_set = '' then 'documents = ' || quote_literal('["Aadhaar Card","Mobile Number","Bank Details optional","Occupation Details optional","Nominee Details optional"]') || '::jsonb' else v_set || ', documents = ' || quote_literal('["Aadhaar Card","Mobile Number","Bank Details optional","Occupation Details optional","Nominee Details optional"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'process') then
      v_cols := v_cols || ', process';
      v_vals := v_vals || ', ' || quote_literal('["Submit Basic Details","Eligibility Check","Registration Assistance","OTP/Biometric Guidance","UAN/e-Shram Card Download","Final Support"]') || '::jsonb';
      v_set := case when v_set = '' then 'process = ' || quote_literal('["Submit Basic Details","Eligibility Check","Registration Assistance","OTP/Biometric Guidance","UAN/e-Shram Card Download","Final Support"]') || '::jsonb' else v_set || ', process = ' || quote_literal('["Submit Basic Details","Eligibility Check","Registration Assistance","OTP/Biometric Guidance","UAN/e-Shram Card Download","Final Support"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_title') then
      v_cols := v_cols || ', seo_title';
      v_vals := v_vals || ', ' || quote_literal('e-Shram Card Registration Assistance | DigiConnect Dukan');
      v_set := case when v_set = '' then 'seo_title = ''e-Shram Card Registration Assistance | DigiConnect Dukan''' else v_set || ', seo_title = ''e-Shram Card Registration Assistance | DigiConnect Dukan''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_description') then
      v_cols := v_cols || ', ' || 'seo_description';
      v_vals := v_vals || ', ' || quote_literal('Get quick e-Shram registration assistance, UAN card support, download help, and update guidance for eligible unorganised workers.');
      v_set := case when v_set = '' then 'seo_description = ''Get quick e-Shram registration assistance, UAN card support, download help, and update guidance for eligible unorganised workers.''' else v_set || ', seo_description = ''Get quick e-Shram registration assistance, UAN card support, download help, and update guidance for eligible unorganised workers.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_keywords') then
      v_cols := v_cols || ', seo_keywords';
      v_vals := v_vals || ', ' || quote_literal('["e-Shram Card Registration","e-Shram UAN","Unorganised Worker Card","e-Shram Download","DigiConnect Dukan"]') || '::jsonb';
      v_set := case when v_set = '' then 'seo_keywords = ' || quote_literal('["e-Shram Card Registration","e-Shram UAN","Unorganised Worker Card","e-Shram Download","DigiConnect Dukan"]') || '::jsonb' else v_set || ', seo_keywords = ' || quote_literal('["e-Shram Card Registration","e-Shram UAN","Unorganised Worker Card","e-Shram Download","DigiConnect Dukan"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'blog_content') then
      v_cols := v_cols || ', blog_content';
      v_vals := v_vals || ', ' || quote_literal('DigiConnect Dukan provides assisted e-Shram support for eligible unorganised workers including registration guidance, documentation help, UAN card download, and correction support.');
      v_set := case when v_set = '' then 'blog_content = ''DigiConnect Dukan provides assisted e-Shram support for eligible unorganised workers including registration guidance, documentation help, UAN card download, and correction support.''' else v_set || ', blog_content = ''DigiConnect Dukan provides assisted e-Shram support for eligible unorganised workers including registration guidance, documentation help, UAN card download, and correction support.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'faqs') then
      v_cols := v_cols || ', faqs';
      v_vals := v_vals || ', ' || quote_literal('[{"question":"What is e-Shram Card?","answer":"It is a worker identity and UAN card for eligible unorganised workers."},{"question":"Who can apply?","answer":"Eligible unorganised workers can apply as per official rules."},{"question":"Is benefit guaranteed?","answer":"No. Benefits depend on official government rules."}]') || '::jsonb';
      v_set := case when v_set = '' then 'faqs = ' || quote_literal('[{"question":"What is e-Shram Card?","answer":"It is a worker identity and UAN card for eligible unorganised workers."},{"question":"Who can apply?","answer":"Eligible unorganised workers can apply as per official rules."},{"question":"Is benefit guaranteed?","answer":"No. Benefits depend on official government rules."}]') || '::jsonb' else v_set || ', faqs = ' || quote_literal('[{"question":"What is e-Shram Card?","answer":"It is a worker identity and UAN card for eligible unorganised workers."},{"question":"Who can apply?","answer":"Eligible unorganised workers can apply as per official rules."},{"question":"Is benefit guaranteed?","answer":"No. Benefits depend on official government rules."}]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'reviews') then
      v_cols := v_cols || ', reviews';
      v_vals := v_vals || ', ' || quote_literal('[]') || '::jsonb';
      v_set := case when v_set = '' then 'reviews = ''[]''::jsonb' else v_set || ', reviews = ''[]''::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'updated_at') then
      v_cols := v_cols || ', updated_at';
      v_vals := v_vals || ', now()';
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    execute 'insert into public.services (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.services where slug = ''eshram-card-registration'')';
    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''eshram-card-registration''';
    end if;
  end if;

  if to_regclass('public.agent_services') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('eshram-card-registration');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'service_id') then
      v_cols := v_cols || ', service_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_catalog_id::text) || '::uuid', 'null');
      v_set := 'service_id = coalesce(' || coalesce(quote_literal(v_catalog_id::text) || '::uuid', 'null') || ', service_id)';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ' || quote_literal('e-Shram Card Registration Assistance');
      v_set := case when v_set = '' then 'title = ''e-Shram Card Registration Assistance''' else v_set || ', title = ''e-Shram Card Registration Assistance''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'description') then
      v_cols := v_cols || ', description';
      v_vals := v_vals || ', ' || quote_literal('e-Shram assistance for registration, card download, updates, and status checks.');
      v_set := case when v_set = '' then 'description = ''e-Shram assistance for registration, card download, updates, and status checks.''' else v_set || ', description = ''e-Shram assistance for registration, card download, updates, and status checks.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'category') then
      v_cols := v_cols || ', category';
      v_vals := v_vals || ', ' || quote_literal('Government Scheme');
      v_set := case when v_set = '' then 'category = ''Government Scheme''' else v_set || ', category = ''Government Scheme''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'customer_fee') then
      v_cols := v_cols || ', customer_fee';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'customer_fee = 149' else v_set || ', customer_fee = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'required_documents') then
      v_cols := v_cols || ', required_documents';
      v_vals := v_vals || ', ' || quote_literal('Aadhaar Card
Mobile Number
Occupation Details optional
Nominee Details optional');
      v_set := case when v_set = '' then 'required_documents = ''Aadhaar Card
Mobile Number
Occupation Details optional
Nominee Details optional''' else v_set || ', required_documents = ''Aadhaar Card
Mobile Number
Occupation Details optional
Nominee Details optional''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'is_active') then
      v_cols := v_cols || ', is_active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'is_active = true' else v_set || ', is_active = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'active') then
      v_cols := v_cols || ', active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'active = true' else v_set || ', active = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'sort_order') then
      v_cols := v_cols || ', sort_order';
      v_vals := v_vals || ', 42';
      v_set := case when v_set = '' then 'sort_order = 42' else v_set || ', sort_order = 42' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'updated_at') then
      v_cols := v_cols || ', updated_at';
      v_vals := v_vals || ', now()';
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    execute 'insert into public.agent_services (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.agent_services where slug = ''eshram-card-registration'')';
    if v_set <> '' then
      execute 'update public.agent_services set ' || v_set || ' where slug = ''eshram-card-registration''';
    end if;
  end if;
end $$;
