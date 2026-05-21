do $$
declare
  v_category_id uuid;
begin
  if to_regclass('public.service_categories') is not null then
    select id into v_category_id
    from public.service_categories
    where slug = 'finance-banking'
    limit 1;
  end if;

  if to_regclass('public.service_catalog') is not null then
    update public.service_catalog
    set active = false,
        updated_at = now()
    where slug = 'cibil-credit-score-guidance';

    insert into public.service_catalog (slug, name, description, amount, commission_amount, required_documents, active)
    values (
      'cibil-report-analysis-and-credit-health-consultation',
      'CIBIL Report Analysis & Credit Health Consultation',
      '6-month TransUnion CIBIL membership assistance with expert one page credit health analysis.',
      2600,
      0,
      array['Aadhaar', 'PAN', 'Mobile', 'Email'],
      true
    )
    on conflict (slug) do update set
      name = excluded.name,
      description = excluded.description,
      amount = excluded.amount,
      required_documents = excluded.required_documents,
      active = true,
      updated_at = now();
  end if;

  if to_regclass('public.services') is not null then
    update public.services
    set status = 'archived',
        updated_at = now()
    where slug = 'cibil-credit-score-guidance';

    insert into public.services (
      category_id,
      title,
      slug,
      short_description,
      overview,
      benefits,
      documents,
      process,
      old_price,
      offer_price,
      price_label,
      cta_type,
      badge,
      icon,
      status,
      featured,
      sort_order,
      seo_title,
      seo_description,
      seo_keywords,
      blog_content,
      faqs,
      reviews
    )
    values (
      v_category_id,
      'CIBIL Report Analysis & Credit Health Consultation',
      'cibil-report-analysis-and-credit-health-consultation',
      '6-month TransUnion CIBIL membership with expert one page credit health analysis.',
      'A premium credit health consultation that helps customers understand their CIBIL report, score health, dues, enquiries, utilization, possible reporting errors, and loan readiness before applying.',
      '["6-month TransUnion CIBIL membership assistance","Expert one page credit report analysis","Loan readiness and score health review","Credit utilization and overdue detection","Wrong reporting and dispute guidance","Secure digital assistance with WhatsApp support"]'::jsonb,
      '["Aadhaar","PAN","Mobile","Email"]'::jsonb,
      '["Submit request","Verification","Credit report retrieval","Expert analysis","One page summary","Consultation"]'::jsonb,
      3200,
      2600,
      'Rs 2600',
      'apply',
      'Credit Health',
      'BadgeIndianRupee',
      'published',
      false,
      37,
      'CIBIL Report Analysis & Credit Health Consultation | DigiConnect Dukan',
      'Get 6-month TransUnion CIBIL membership assistance with expert one page CIBIL report analysis, credit health review, dispute guidance, and loan readiness consultation.',
      '["CIBIL Report Analysis","Credit Health Consultation","CIBIL Membership","Credit Score Improvement","Loan Readiness","DigiConnect Dukan"]'::jsonb,
      'Understand your CIBIL report before applying for loans or credit cards. DigiConnect Dukan provides secure assistance for report access, score health review, overdue and utilization checks, dispute signals, and practical credit improvement guidance.',
      '[
        {"question":"What is included in this CIBIL service?","answer":"It includes assistance for a 6-month TransUnion CIBIL membership and an expert one page analysis of your credit report."},
        {"question":"Is loan approval guaranteed?","answer":"No. Loan approval depends on bank eligibility, income, documents, verification, credit policy, and lender rules."},
        {"question":"Can wrong entries be identified?","answer":"The analysis can highlight suspected wrong reporting, duplicate entries, unknown enquiries, or closed loans still showing active."}
      ]'::jsonb,
      '[
        {"name":"Verified Customer","location":"India","text":"Clear explanation of credit report issues and loan readiness."},
        {"name":"Service User","location":"India","text":"Professional guidance and useful one page summary."}
      ]'::jsonb
    )
    on conflict (slug) do update set
      category_id = coalesce(excluded.category_id, public.services.category_id),
      title = excluded.title,
      short_description = excluded.short_description,
      overview = excluded.overview,
      benefits = excluded.benefits,
      documents = excluded.documents,
      process = excluded.process,
      old_price = excluded.old_price,
      offer_price = excluded.offer_price,
      price_label = excluded.price_label,
      cta_type = excluded.cta_type,
      badge = excluded.badge,
      icon = excluded.icon,
      status = 'published',
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      seo_keywords = excluded.seo_keywords,
      blog_content = excluded.blog_content,
      faqs = excluded.faqs,
      reviews = excluded.reviews,
      updated_at = now();
  end if;
end $$;
