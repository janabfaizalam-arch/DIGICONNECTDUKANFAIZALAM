do $$
declare
  v_category_id uuid;
  v_cols text;
  v_vals text;
  v_set text;
begin
  if to_regclass('public.service_categories') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_categories' and column_name = 'id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_categories' and column_name = 'slug'
    )
  then
    select id into v_category_id
    from public.service_categories
    where slug = 'finance-banking'
    limit 1;
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
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'status'
    ) then
      v_set := case when v_set = '' then 'status = ''archived''' else v_set || ', status = ''archived''' end;
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
      execute 'update public.service_catalog set ' || v_set || ' where slug = ''cibil-credit-score-guidance''';
    end if;

    v_cols := 'slug';
    v_vals := quote_literal('cibil-report-analysis-and-credit-health-consultation');
    v_set := '';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'name'
    ) then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ' || quote_literal('CIBIL Report Analysis & Credit Health Consultation');
      v_set := case when v_set = '' then 'name = ''CIBIL Report Analysis & Credit Health Consultation''' else v_set || ', name = ''CIBIL Report Analysis & Credit Health Consultation''' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'description'
    ) then
      v_cols := v_cols || ', description';
      v_vals := v_vals || ', ' || quote_literal('6-month TransUnion CIBIL membership assistance with expert one page credit health analysis.');
      v_set := case when v_set = '' then 'description = ''6-month TransUnion CIBIL membership assistance with expert one page credit health analysis.''' else v_set || ', description = ''6-month TransUnion CIBIL membership assistance with expert one page credit health analysis.''' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'amount'
    ) then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 2600';
      v_set := case when v_set = '' then 'amount = 2600' else v_set || ', amount = 2600' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'commission_amount'
    ) then
      v_cols := v_cols || ', commission_amount';
      v_vals := v_vals || ', 0';
      v_set := case when v_set = '' then 'commission_amount = 0' else v_set || ', commission_amount = 0' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'required_documents'
    ) then
      v_cols := v_cols || ', required_documents';
      v_vals := v_vals || ', array[''Aadhaar'', ''PAN'', ''Mobile'', ''Email'']';
      v_set := case when v_set = '' then 'required_documents = array[''Aadhaar'', ''PAN'', ''Mobile'', ''Email'']' else v_set || ', required_documents = array[''Aadhaar'', ''PAN'', ''Mobile'', ''Email'']' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'active'
    ) then
      v_cols := v_cols || ', active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'active = true' else v_set || ', active = true' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'updated_at'
    ) then
      v_cols := v_cols || ', updated_at';
      v_vals := v_vals || ', now()';
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    execute 'insert into public.service_catalog (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.service_catalog where slug = ''cibil-report-analysis-and-credit-health-consultation'')';

    if v_set <> '' then
      execute 'update public.service_catalog set ' || v_set || ' where slug = ''cibil-report-analysis-and-credit-health-consultation''';
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
      where table_schema = 'public' and table_name = 'services' and column_name = 'active'
    ) then
      v_set := case when v_set = '' then 'active = false' else v_set || ', active = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'is_active'
    ) then
      v_set := case when v_set = '' then 'is_active = false' else v_set || ', is_active = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'featured'
    ) then
      v_set := case when v_set = '' then 'featured = false' else v_set || ', featured = false' end;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'services' and column_name = 'updated_at'
    ) then
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''cibil-credit-score-guidance''';
    end if;

    v_cols := 'slug';
    v_vals := quote_literal('cibil-report-analysis-and-credit-health-consultation');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category_id') then
      v_cols := v_cols || ', category_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null');
      v_set := case when v_set = '' then 'category_id = coalesce(' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null') || ', category_id)' else v_set || ', category_id = coalesce(' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null') || ', category_id)' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ' || quote_literal('CIBIL Report Analysis & Credit Health Consultation');
      v_set := case when v_set = '' then 'title = ''CIBIL Report Analysis & Credit Health Consultation''' else v_set || ', title = ''CIBIL Report Analysis & Credit Health Consultation''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ' || quote_literal('CIBIL Report Analysis & Credit Health Consultation');
      v_set := case when v_set = '' then 'name = ''CIBIL Report Analysis & Credit Health Consultation''' else v_set || ', name = ''CIBIL Report Analysis & Credit Health Consultation''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'short_description') then
      v_cols := v_cols || ', short_description';
      v_vals := v_vals || ', ' || quote_literal('6-month TransUnion CIBIL membership with expert one page credit health analysis.');
      v_set := case when v_set = '' then 'short_description = ''6-month TransUnion CIBIL membership with expert one page credit health analysis.''' else v_set || ', short_description = ''6-month TransUnion CIBIL membership with expert one page credit health analysis.''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'overview') then
      v_cols := v_cols || ', overview';
      v_vals := v_vals || ', ' || quote_literal('A premium credit health consultation that helps customers understand their CIBIL report, score health, dues, enquiries, utilization, possible reporting errors, and loan readiness before applying.');
      v_set := case when v_set = '' then 'overview = ''A premium credit health consultation that helps customers understand their CIBIL report, score health, dues, enquiries, utilization, possible reporting errors, and loan readiness before applying.''' else v_set || ', overview = ''A premium credit health consultation that helps customers understand their CIBIL report, score health, dues, enquiries, utilization, possible reporting errors, and loan readiness before applying.''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'amount') then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 2600';
      v_set := case when v_set = '' then 'amount = 2600' else v_set || ', amount = 2600' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'old_price') then
      v_cols := v_cols || ', old_price';
      v_vals := v_vals || ', 3200';
      v_set := case when v_set = '' then 'old_price = 3200' else v_set || ', old_price = 3200' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price') then
      v_cols := v_cols || ', offer_price';
      v_vals := v_vals || ', 2600';
      v_set := case when v_set = '' then 'offer_price = 2600' else v_set || ', offer_price = 2600' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'base_price') then
      v_cols := v_cols || ', base_price';
      v_vals := v_vals || ', 3200';
      v_set := case when v_set = '' then 'base_price = 3200' else v_set || ', base_price = 3200' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'sale_price') then
      v_cols := v_cols || ', sale_price';
      v_vals := v_vals || ', 2600';
      v_set := case when v_set = '' then 'sale_price = 2600' else v_set || ', sale_price = 2600' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'price_label') then
      v_cols := v_cols || ', price_label';
      v_vals := v_vals || ', ' || quote_literal('Rs 2600');
      v_set := case when v_set = '' then 'price_label = ''Rs 2600''' else v_set || ', price_label = ''Rs 2600''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'cta_type') then
      v_cols := v_cols || ', cta_type';
      v_vals := v_vals || ', ' || quote_literal('apply');
      v_set := case when v_set = '' then 'cta_type = ''apply''' else v_set || ', cta_type = ''apply''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'badge') then
      v_cols := v_cols || ', badge';
      v_vals := v_vals || ', ' || quote_literal('Credit Health');
      v_set := case when v_set = '' then 'badge = ''Credit Health''' else v_set || ', badge = ''Credit Health''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'icon') then
      v_cols := v_cols || ', icon';
      v_vals := v_vals || ', ' || quote_literal('BadgeIndianRupee');
      v_set := case when v_set = '' then 'icon = ''BadgeIndianRupee''' else v_set || ', icon = ''BadgeIndianRupee''' end;
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
      v_vals := v_vals || ', 37';
      v_set := case when v_set = '' then 'sort_order = 37' else v_set || ', sort_order = 37' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'benefits') then
      v_cols := v_cols || ', benefits';
      v_vals := v_vals || ', ' || quote_literal('["6-month TransUnion CIBIL membership assistance","Expert one page credit report analysis","Loan readiness and score health review","Credit utilization and overdue detection","Wrong reporting and dispute guidance","Secure digital assistance with WhatsApp support"]') || '::jsonb';
      v_set := case when v_set = '' then 'benefits = ' || quote_literal('["6-month TransUnion CIBIL membership assistance","Expert one page credit report analysis","Loan readiness and score health review","Credit utilization and overdue detection","Wrong reporting and dispute guidance","Secure digital assistance with WhatsApp support"]') || '::jsonb' else v_set || ', benefits = ' || quote_literal('["6-month TransUnion CIBIL membership assistance","Expert one page credit report analysis","Loan readiness and score health review","Credit utilization and overdue detection","Wrong reporting and dispute guidance","Secure digital assistance with WhatsApp support"]') || '::jsonb' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'documents') then
      v_cols := v_cols || ', documents';
      v_vals := v_vals || ', ' || quote_literal('["Aadhaar","PAN","Mobile","Email"]') || '::jsonb';
      v_set := case when v_set = '' then 'documents = ' || quote_literal('["Aadhaar","PAN","Mobile","Email"]') || '::jsonb' else v_set || ', documents = ' || quote_literal('["Aadhaar","PAN","Mobile","Email"]') || '::jsonb' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'process') then
      v_cols := v_cols || ', process';
      v_vals := v_vals || ', ' || quote_literal('["Submit request","Verification","Credit report retrieval","Expert analysis","One page summary","Consultation"]') || '::jsonb';
      v_set := case when v_set = '' then 'process = ' || quote_literal('["Submit request","Verification","Credit report retrieval","Expert analysis","One page summary","Consultation"]') || '::jsonb' else v_set || ', process = ' || quote_literal('["Submit request","Verification","Credit report retrieval","Expert analysis","One page summary","Consultation"]') || '::jsonb' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_title') then
      v_cols := v_cols || ', seo_title';
      v_vals := v_vals || ', ' || quote_literal('CIBIL Report Analysis & Credit Health Consultation | DigiConnect Dukan');
      v_set := case when v_set = '' then 'seo_title = ''CIBIL Report Analysis & Credit Health Consultation | DigiConnect Dukan''' else v_set || ', seo_title = ''CIBIL Report Analysis & Credit Health Consultation | DigiConnect Dukan''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_description') then
      v_cols := v_cols || ', seo_description';
      v_vals := v_vals || ', ' || quote_literal('Get 6-month TransUnion CIBIL membership assistance with expert one page CIBIL report analysis, credit health review, dispute guidance, and loan readiness consultation.');
      v_set := case when v_set = '' then 'seo_description = ''Get 6-month TransUnion CIBIL membership assistance with expert one page CIBIL report analysis, credit health review, dispute guidance, and loan readiness consultation.''' else v_set || ', seo_description = ''Get 6-month TransUnion CIBIL membership assistance with expert one page CIBIL report analysis, credit health review, dispute guidance, and loan readiness consultation.''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'seo_keywords') then
      v_cols := v_cols || ', seo_keywords';
      v_vals := v_vals || ', ' || quote_literal('["CIBIL Report Analysis","Credit Health Consultation","CIBIL Membership","Credit Score Improvement","Loan Readiness","DigiConnect Dukan"]') || '::jsonb';
      v_set := case when v_set = '' then 'seo_keywords = ' || quote_literal('["CIBIL Report Analysis","Credit Health Consultation","CIBIL Membership","Credit Score Improvement","Loan Readiness","DigiConnect Dukan"]') || '::jsonb' else v_set || ', seo_keywords = ' || quote_literal('["CIBIL Report Analysis","Credit Health Consultation","CIBIL Membership","Credit Score Improvement","Loan Readiness","DigiConnect Dukan"]') || '::jsonb' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'blog_content') then
      v_cols := v_cols || ', blog_content';
      v_vals := v_vals || ', ' || quote_literal('Understand your CIBIL report before applying for loans or credit cards. DigiConnect Dukan provides secure assistance for report access, score health review, overdue and utilization checks, dispute signals, and practical credit improvement guidance.');
      v_set := case when v_set = '' then 'blog_content = ''Understand your CIBIL report before applying for loans or credit cards. DigiConnect Dukan provides secure assistance for report access, score health review, overdue and utilization checks, dispute signals, and practical credit improvement guidance.''' else v_set || ', blog_content = ''Understand your CIBIL report before applying for loans or credit cards. DigiConnect Dukan provides secure assistance for report access, score health review, overdue and utilization checks, dispute signals, and practical credit improvement guidance.''' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'faqs') then
      v_cols := v_cols || ', faqs';
      v_vals := v_vals || ', ' || quote_literal('[{"question":"What is included in this CIBIL service?","answer":"It includes assistance for a 6-month TransUnion CIBIL membership and an expert one page analysis of your credit report."},{"question":"Is loan approval guaranteed?","answer":"No. Loan approval depends on bank eligibility, income, documents, verification, credit policy, and lender rules."},{"question":"Can wrong entries be identified?","answer":"The analysis can highlight suspected wrong reporting, duplicate entries, unknown enquiries, or closed loans still showing active."}]') || '::jsonb';
      v_set := case when v_set = '' then 'faqs = ' || quote_literal('[{"question":"What is included in this CIBIL service?","answer":"It includes assistance for a 6-month TransUnion CIBIL membership and an expert one page analysis of your credit report."},{"question":"Is loan approval guaranteed?","answer":"No. Loan approval depends on bank eligibility, income, documents, verification, credit policy, and lender rules."},{"question":"Can wrong entries be identified?","answer":"The analysis can highlight suspected wrong reporting, duplicate entries, unknown enquiries, or closed loans still showing active."}]') || '::jsonb' else v_set || ', faqs = ' || quote_literal('[{"question":"What is included in this CIBIL service?","answer":"It includes assistance for a 6-month TransUnion CIBIL membership and an expert one page analysis of your credit report."},{"question":"Is loan approval guaranteed?","answer":"No. Loan approval depends on bank eligibility, income, documents, verification, credit policy, and lender rules."},{"question":"Can wrong entries be identified?","answer":"The analysis can highlight suspected wrong reporting, duplicate entries, unknown enquiries, or closed loans still showing active."}]') || '::jsonb' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'reviews') then
      v_cols := v_cols || ', reviews';
      v_vals := v_vals || ', ' || quote_literal('[{"name":"Verified Customer","location":"India","text":"Clear explanation of credit report issues and loan readiness."},{"name":"Service User","location":"India","text":"Professional guidance and useful one page summary."}]') || '::jsonb';
      v_set := case when v_set = '' then 'reviews = ' || quote_literal('[{"name":"Verified Customer","location":"India","text":"Clear explanation of credit report issues and loan readiness."},{"name":"Service User","location":"India","text":"Professional guidance and useful one page summary."}]') || '::jsonb' else v_set || ', reviews = ' || quote_literal('[{"name":"Verified Customer","location":"India","text":"Clear explanation of credit report issues and loan readiness."},{"name":"Service User","location":"India","text":"Professional guidance and useful one page summary."}]') || '::jsonb' end;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'updated_at') then
      v_cols := v_cols || ', updated_at';
      v_vals := v_vals || ', now()';
      v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
    end if;

    execute 'insert into public.services (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.services where slug = ''cibil-report-analysis-and-credit-health-consultation'')';

    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''cibil-report-analysis-and-credit-health-consultation''';
    end if;
  end if;
end $$;
