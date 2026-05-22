do $$
declare
  v_cols text;
  v_vals text;
  v_set text;
  v_service_id uuid;
begin
  if to_regclass('public.agent_services') is null
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'agent_services' and column_name = 'slug'
    )
  then
    return;
  end if;

  v_service_id := null;
  if to_regclass('public.service_catalog') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug')
  then
    select id into v_service_id
    from public.service_catalog
    where slug = 'cibil-report-analysis-and-credit-health-consultation'
    limit 1;
  end if;

  v_cols := 'slug';
  v_vals := quote_literal('cibil-report-analysis-and-credit-health-consultation');
  v_set := '';

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'service_id') then
    v_cols := v_cols || ', service_id';
    v_vals := v_vals || ', ' || coalesce(quote_literal(v_service_id::text) || '::uuid', 'null');
    v_set := 'service_id = coalesce(' || coalesce(quote_literal(v_service_id::text) || '::uuid', 'null') || ', service_id)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'title') then
    v_cols := v_cols || ', title';
    v_vals := v_vals || ', ' || quote_literal('CIBIL Report Analysis / Credit Health Consultation');
    v_set := case when v_set = '' then 'title = ''CIBIL Report Analysis / Credit Health Consultation''' else v_set || ', title = ''CIBIL Report Analysis / Credit Health Consultation''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'description') then
    v_cols := v_cols || ', description';
    v_vals := v_vals || ', ' || quote_literal('CIBIL report analysis and credit health consultation service for agent customers.');
    v_set := case when v_set = '' then 'description = ''CIBIL report analysis and credit health consultation service for agent customers.''' else v_set || ', description = ''CIBIL report analysis and credit health consultation service for agent customers.''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'category') then
    v_cols := v_cols || ', category';
    v_vals := v_vals || ', ' || quote_literal('Finance & Banking');
    v_set := case when v_set = '' then 'category = ''Finance & Banking''' else v_set || ', category = ''Finance & Banking''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'customer_fee') then
    v_cols := v_cols || ', customer_fee';
    v_vals := v_vals || ', 1600';
    v_set := case when v_set = '' then 'customer_fee = 1600' else v_set || ', customer_fee = 1600' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'agent_payout') then
    v_cols := v_cols || ', agent_payout';
    v_vals := v_vals || ', 600';
    v_set := case when v_set = '' then 'agent_payout = 600' else v_set || ', agent_payout = 600' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'payout_type') then
    v_cols := v_cols || ', payout_type';
    v_vals := v_vals || ', ' || quote_literal('fixed');
    v_set := case when v_set = '' then 'payout_type = ''fixed''' else v_set || ', payout_type = ''fixed''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'payout_percentage') then
    v_cols := v_cols || ', payout_percentage';
    v_vals := v_vals || ', 0';
    v_set := case when v_set = '' then 'payout_percentage = 0' else v_set || ', payout_percentage = 0' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'required_documents') then
    v_cols := v_cols || ', required_documents';
    v_vals := v_vals || ', ' || quote_literal('Aadhaar
PAN
Mobile
Email');
    v_set := case when v_set = '' then 'required_documents = ''Aadhaar
PAN
Mobile
Email''' else v_set || ', required_documents = ''Aadhaar
PAN
Mobile
Email''' end;
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
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'visibility_type') then
    v_cols := v_cols || ', visibility_type';
    v_vals := v_vals || ', ' || quote_literal('all');
    v_set := case when v_set = '' then 'visibility_type = ''all''' else v_set || ', visibility_type = ''all''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'updated_at') then
    v_cols := v_cols || ', updated_at';
    v_vals := v_vals || ', now()';
    v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
  end if;

  execute 'insert into public.agent_services (' || v_cols || ') select ' || v_vals ||
    ' where not exists (select 1 from public.agent_services where slug = ''cibil-report-analysis-and-credit-health-consultation'')';
  if v_set <> '' then
    execute 'update public.agent_services set ' || v_set || ' where slug = ''cibil-report-analysis-and-credit-health-consultation''';
  end if;

  v_service_id := null;
  if to_regclass('public.service_catalog') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'id')
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug')
  then
    select id into v_service_id
    from public.service_catalog
    where slug = 'eshram-card-registration'
    limit 1;
  end if;

  v_cols := 'slug';
  v_vals := quote_literal('eshram-card-registration');
  v_set := '';

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'service_id') then
    v_cols := v_cols || ', service_id';
    v_vals := v_vals || ', ' || coalesce(quote_literal(v_service_id::text) || '::uuid', 'null');
    v_set := 'service_id = coalesce(' || coalesce(quote_literal(v_service_id::text) || '::uuid', 'null') || ', service_id)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'title') then
    v_cols := v_cols || ', title';
    v_vals := v_vals || ', ' || quote_literal('E-Shram Card');
    v_set := case when v_set = '' then 'title = ''E-Shram Card''' else v_set || ', title = ''E-Shram Card''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'description') then
    v_cols := v_cols || ', description';
    v_vals := v_vals || ', ' || quote_literal('e-Shram card assistance for agent customers.');
    v_set := case when v_set = '' then 'description = ''e-Shram card assistance for agent customers.''' else v_set || ', description = ''e-Shram card assistance for agent customers.''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'category') then
    v_cols := v_cols || ', category';
    v_vals := v_vals || ', ' || quote_literal('Government Scheme');
    v_set := case when v_set = '' then 'category = ''Government Scheme''' else v_set || ', category = ''Government Scheme''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'customer_fee') then
    v_cols := v_cols || ', customer_fee';
    v_vals := v_vals || ', 150';
    v_set := case when v_set = '' then 'customer_fee = 150' else v_set || ', customer_fee = 150' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'agent_payout') then
    v_cols := v_cols || ', agent_payout';
    v_vals := v_vals || ', 100';
    v_set := case when v_set = '' then 'agent_payout = 100' else v_set || ', agent_payout = 100' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'payout_type') then
    v_cols := v_cols || ', payout_type';
    v_vals := v_vals || ', ' || quote_literal('fixed');
    v_set := case when v_set = '' then 'payout_type = ''fixed''' else v_set || ', payout_type = ''fixed''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'payout_percentage') then
    v_cols := v_cols || ', payout_percentage';
    v_vals := v_vals || ', 0';
    v_set := case when v_set = '' then 'payout_percentage = 0' else v_set || ', payout_percentage = 0' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'required_documents') then
    v_cols := v_cols || ', required_documents';
    v_vals := v_vals || ', ' || quote_literal('Aadhaar Card
Mobile Number');
    v_set := case when v_set = '' then 'required_documents = ''Aadhaar Card
Mobile Number''' else v_set || ', required_documents = ''Aadhaar Card
Mobile Number''' end;
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
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'visibility_type') then
    v_cols := v_cols || ', visibility_type';
    v_vals := v_vals || ', ' || quote_literal('all');
    v_set := case when v_set = '' then 'visibility_type = ''all''' else v_set || ', visibility_type = ''all''' end;
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
end $$;
