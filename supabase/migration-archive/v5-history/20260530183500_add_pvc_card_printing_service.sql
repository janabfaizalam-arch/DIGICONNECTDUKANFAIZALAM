do $$
declare
  v_category_id uuid;
  v_catalog_id uuid;
  v_cols text;
  v_vals text;
  v_set text;
begin
  -- 1. Create or retrieve "Digital Services" category
  if to_regclass('public.service_categories') is not null then
    -- Check if it exists
    select id into v_category_id
    from public.service_categories
    where slug = 'digital-services'
    limit 1;

    -- If not exists, insert it
    if v_category_id is null then
      insert into public.service_categories (name, slug, description, sort_order, is_active, created_at, updated_at)
      values ('Digital Services', 'digital-services', 'Durable polymer PVC card printing and visual identity conversions.', 5, true, now(), now())
      returning id into v_category_id;
    end if;
  end if;

  -- 2. Insert into service_catalog
  if to_regclass('public.service_catalog') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('pvc-card-printing');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ' || quote_literal('PVC Card Printing');
      v_set := 'name = ''PVC Card Printing''';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'description') then
      v_cols := v_cols || ', description';
      v_vals := v_vals || ', ' || quote_literal('Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.');
      v_set := case when v_set = '' then 'description = ''Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.''' else v_set || ', description = ''Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'amount') then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'amount = 149' else v_set || ', amount = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'required_documents') then
      v_cols := v_cols || ', required_documents';
      v_vals := v_vals || ', array[''Front Side Image'', ''Back Side Image'']';
      v_set := case when v_set = '' then 'required_documents = array[''Front Side Image'', ''Back Side Image'']' else v_set || ', required_documents = array[''Front Side Image'', ''Back Side Image'']' end;
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
      ' where not exists (select 1 from public.service_catalog where slug = ''pvc-card-printing'')';
    if v_set <> '' then
      execute 'update public.service_catalog set ' || v_set || ' where slug = ''pvc-card-printing''';
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'id') then
      select id into v_catalog_id from public.service_catalog where slug = 'pvc-card-printing' limit 1;
    end if;
  end if;

  -- 3. Insert into services table
  if to_regclass('public.services') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('pvc-card-printing');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category_id') then
      v_cols := v_cols || ', category_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null');
      v_set := 'category_id = coalesce(' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null') || ', category_id)';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ' || quote_literal('PVC Card Printing');
      v_set := case when v_set = '' then 'title = ''PVC Card Printing''' else v_set || ', title = ''PVC Card Printing''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ' || quote_literal('PVC Card Printing');
      v_set := case when v_set = '' then 'name = ''PVC Card Printing''' else v_set || ', name = ''PVC Card Printing''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'short_description') then
      v_cols := v_cols || ', short_description';
      v_vals := v_vals || ', ' || quote_literal('Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.');
      v_set := case when v_set = '' then 'short_description = ''Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.''' else v_set || ', short_description = ''Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'overview') then
      v_cols := v_cols || ', overview';
      v_vals := v_vals || ', ' || quote_literal('Transform your important documents into durable, waterproof, premium-quality smart PVC cards with professional printing and long-lasting finish.');
      v_set := case when v_set = '' then 'overview = ''Transform your important documents into durable, waterproof, premium-quality smart PVC cards with professional printing and long-lasting finish.''' else v_set || ', overview = ''Transform your important documents into durable, waterproof, premium-quality smart PVC cards with professional printing and long-lasting finish.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'amount') then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'amount = 149' else v_set || ', amount = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'old_price') then
      v_cols := v_cols || ', old_price';
      v_vals := v_vals || ', 299';
      v_set := case when v_set = '' then 'old_price = 299' else v_set || ', old_price = 299' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price') then
      v_cols := v_cols || ', offer_price';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'offer_price = 149' else v_set || ', offer_price = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'base_price') then
      v_cols := v_cols || ', base_price';
      v_vals := v_vals || ', 299';
      v_set := case when v_set = '' then 'base_price = 299' else v_set || ', base_price = 299' end;
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
      v_vals := v_vals || ', ' || quote_literal('Premium PVC Print');
      v_set := case when v_set = '' then 'badge = ''Premium PVC Print''' else v_set || ', badge = ''Premium PVC Print''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'icon') then
      v_cols := v_cols || ', icon';
      v_vals := v_vals || ', ' || quote_literal('CreditCard');
      v_set := case when v_set = '' then 'icon = ''CreditCard''' else v_set || ', icon = ''CreditCard''' end;
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
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'featured = true' else v_set || ', featured = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'sort_order') then
      v_cols := v_cols || ', sort_order';
      v_vals := v_vals || ', 5';
      v_set := case when v_set = '' then 'sort_order = 5' else v_set || ', sort_order = 5' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'benefits') then
      v_cols := v_cols || ', benefits';
      v_vals := v_vals || ', ' || quote_literal('["Waterproof & Durable", "Premium Smart Card Finish", "Easy to Carry", "Long Lasting Print Quality", "Professional Appearance", "High Resolution Printing"]') || '::jsonb';
      v_set := case when v_set = '' then 'benefits = ' || quote_literal('["Waterproof & Durable", "Premium Smart Card Finish", "Easy to Carry", "Long Lasting Print Quality", "Professional Appearance", "High Resolution Printing"]') || '::jsonb' else v_set || ', benefits = ' || quote_literal('["Waterproof & Durable", "Premium Smart Card Finish", "Easy to Carry", "Long Lasting Print Quality", "Professional Appearance", "High Resolution Printing"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'documents') then
      v_cols := v_cols || ', documents';
      v_vals := v_vals || ', ' || quote_literal('["Front Side Image", "Back Side Image", "Delivery Address with Pincode"]') || '::jsonb';
      v_set := case when v_set = '' then 'documents = ' || quote_literal('["Front Side Image", "Back Side Image", "Delivery Address with Pincode"]') || '::jsonb' else v_set || ', documents = ' || quote_literal('["Front Side Image", "Back Side Image", "Delivery Address with Pincode"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'process') then
      v_cols := v_cols || ', process';
      v_vals := v_vals || ', ' || quote_literal('["Upload Your Document", "Verify Details", "PVC Card Printing", "Quality Check", "Delivery / Collection"]') || '::jsonb';
      v_set := case when v_set = '' then 'process = ' || quote_literal('["Upload Your Document", "Verify Details", "PVC Card Printing", "Quality Check", "Delivery / Collection"]') || '::jsonb' else v_set || ', process = ' || quote_literal('["Upload Your Document", "Verify Details", "PVC Card Printing", "Quality Check", "Delivery / Collection"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_title') then
      v_cols := v_cols || ', seo_title';
      v_vals := v_vals || ', ' || quote_literal('Premium PVC Card Printing Services – DigiConnect Dukan');
      v_set := case when v_set = '' then 'seo_title = ''Premium PVC Card Printing Services – DigiConnect Dukan''' else v_set || ', seo_title = ''Premium PVC Card Printing Services – DigiConnect Dukan''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_description') then
      v_cols := v_cols || ', seo_description';
      v_vals := v_vals || ', ' || quote_literal('Convert Aadhaar, PAN, Voter, Ayushman or ABHA card into premium waterproof PVC smart card.');
      v_set := case when v_set = '' then 'seo_description = ''Convert Aadhaar, PAN, Voter, Ayushman or ABHA card into premium waterproof PVC smart card.''' else v_set || ', seo_description = ''Convert Aadhaar, PAN, Voter, Ayushman or ABHA card into premium waterproof PVC smart card.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_keywords') then
      v_cols := v_cols || ', seo_keywords';
      v_vals := v_vals || ', ' || quote_literal('["PVC Card Printing", "Aadhaar PVC Card", "PAN PVC Card", "Voter ID PVC", "Ayushman PVC Card", "ABHA PVC Card", "Driving Licence PVC", "DigiConnect Dukan", "RNoS India"]') || '::jsonb';
      v_set := case when v_set = '' then 'seo_keywords = ' || quote_literal('["PVC Card Printing", "Aadhaar PVC Card", "PAN PVC Card", "Voter ID PVC", "Ayushman PVC Card", "ABHA PVC Card", "Driving Licence PVC", "DigiConnect Dukan", "RNoS India"]') || '::jsonb' else v_set || ', seo_keywords = ' || quote_literal('["PVC Card Printing", "Aadhaar PVC Card", "PAN PVC Card", "Voter ID PVC", "Ayushman PVC Card", "ABHA PVC Card", "Driving Licence PVC", "DigiConnect Dukan", "RNoS India"]') || '::jsonb' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'faqs') then
      v_cols := v_cols || ', faqs';
      v_vals := v_vals || ', ' || quote_literal('[{"question":"Can all cards be printed on PVC?","answer":"Yes, most government-issued cards can be converted into PVC format."},{"question":"Is PVC card waterproof?","answer":"Yes, PVC cards are highly durable and water resistant."},{"question":"How long does it last?","answer":"Several years under normal usage."}]') || '::jsonb';
      v_set := case when v_set = '' then 'faqs = ' || quote_literal('[{"question":"Can all cards be printed on PVC?","answer":"Yes, most government-issued cards can be converted into PVC format."},{"question":"Is PVC card waterproof?","answer":"Yes, PVC cards are highly durable and water resistant."},{"question":"How long does it last?","answer":"Several years under normal usage."}]') || '::jsonb' else v_set || ', faqs = ' || quote_literal('[{"question":"Can all cards be printed on PVC?","answer":"Yes, most government-issued cards can be converted into PVC format."},{"question":"Is PVC card waterproof?","answer":"Yes, PVC cards are highly durable and water resistant."},{"question":"How long does it last?","answer":"Several years under normal usage."}]') || '::jsonb' end;
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
      ' where not exists (select 1 from public.services where slug = ''pvc-card-printing'')';
    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''pvc-card-printing''';
    end if;
  end if;

  -- 4. Insert into agent_services
  if to_regclass('public.agent_services') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('pvc-card-printing');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'service_id') then
      v_cols := v_cols || ', service_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_catalog_id::text) || '::uuid', 'null');
      v_set := 'service_id = coalesce(' || coalesce(quote_literal(v_catalog_id::text) || '::uuid', 'null') || ', service_id)';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ' || quote_literal('PVC Card Printing');
      v_set := case when v_set = '' then 'title = ''PVC Card Printing''' else v_set || ', title = ''PVC Card Printing''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'description') then
      v_cols := v_cols || ', description';
      v_vals := v_vals || ', ' || quote_literal('Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.');
      v_set := case when v_set = '' then 'description = ''Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.''' else v_set || ', description = ''Premium PVC card printing for Aadhaar, PAN, Voter ID, Ayushman Card, ABHA Card, Driving Licence and other smart ID cards.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'category') then
      v_cols := v_cols || ', category';
      v_vals := v_vals || ', ' || quote_literal('Digital Services');
      v_set := case when v_set = '' then 'category = ''Digital Services''' else v_set || ', category = ''Digital Services''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'customer_fee') then
      v_cols := v_cols || ', customer_fee';
      v_vals := v_vals || ', 149';
      v_set := case when v_set = '' then 'customer_fee = 149' else v_set || ', customer_fee = 149' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'required_documents') then
      v_cols := v_cols || ', required_documents';
      v_vals := v_vals || ', ' || quote_literal('Front Side Image
Back Side Image');
      v_set := case when v_set = '' then 'required_documents = ''Front Side Image
Back Side Image''' else v_set || ', required_documents = ''Front Side Image
Back Side Image''' end;
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
      v_vals := v_vals || ', 5';
      v_set := case when v_set = '' then 'sort_order = 5' else v_set || ', sort_order = 5' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'updated_at') then
      v_cols := v_cols || ', updated_at';
      v_vals := v_vals || ', now()';
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    execute 'insert into public.agent_services (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.agent_services where slug = ''pvc-card-printing'')';
    if v_set <> '' then
      execute 'update public.agent_services set ' || v_set || ' where slug = ''pvc-card-printing''';
    end if;
  end if;
end $$;
