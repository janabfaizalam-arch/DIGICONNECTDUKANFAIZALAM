do $$
declare
  v_category_id uuid;
  v_catalog_id uuid;
  v_cols text;
  v_vals text;
  v_set text;
  v_blog_content text;
begin
  -- 1. Get "Loans & Government Schemes" category
  if to_regclass('public.service_categories') is not null then
    select id into v_category_id
    from public.service_categories
    where slug = 'loans'
    limit 1;
  end if;

  -- Default CMS Config JSON to seed into blog_content
  v_blog_content := '{
    "session": "2026-2027",
    "lastDate": "2026-10-31",
    "registrationFee": {
      "price": 150,
      "discount": 50,
      "offerPrice": 100,
      "offerText": "Introductory discount of ₹50 per subject"
    },
    "hero": {
      "title": "CSC Olympiad Registration 2026",
      "subtitle": "Empowering students from Class 3 to 12 through competitive learning and digital excellence.",
      "primaryCta": "Register Now",
      "secondaryCta": "View Eligibility",
      "image": "/images/services/csc-olympiad/hero.webp"
    },
    "notifications": [
      "Registration for Academic Session 2026-27 is now open until October 31, 2026.",
      "National level ranking and performance report cards will be issued to all participants.",
      "Free Mock tests will be available for registered students to practice from home."
    ],
    "gallery": [
      {"url": "/images/services/csc-olympiad/gallery1.webp", "title": "CSC National Olympiad Winners"},
      {"url": "/images/services/csc-olympiad/gallery2.webp", "title": "Indian Students Computer Lab Exam"},
      {"url": "/images/services/csc-olympiad/gallery3.webp", "title": "Olympiad Award Ceremony"}
    ],
    "faqs": [
      {"question": "What is the CSC Olympiad?", "answer": "The CSC Olympiad is a national-level competitive exam conducted online by Common Service Centres to evaluate and enhance the scientific, mathematical, and computer skills of students from Classes 3 to 12."},
      {"question": "Who can register for the CSC Olympiad?", "answer": "Any student studying in Class 3 to Class 12 in a recognized board (CBSE, ICSE, State Boards) is eligible to participate. There are no minimum mark requirements."},
      {"question": "What is the registration fee?", "answer": "The registration fee is ₹100 per subject (discounted from the standard ₹150 price). This fee is configurable from the Admin CMS."},
      {"question": "How many subjects can a student register for?", "answer": "A student can register for multiple subjects (e.g. Maths, Science, Cyber, English) in a single application. The fee will scale accordingly based on the number of subjects selected."},
      {"question": "What are the subjects available for exam?", "answer": "Subjects include Mathematics, Science, English, Hindi, Computer, General Knowledge, Logical Reasoning, Physics, Chemistry, Biology, History, Geography, Economics, and Accountancy. Available subjects are filtered based on the student''s Class."},
      {"question": "Is the exam conducted online or offline?", "answer": "The exam is conducted completely online. It is a remote-proctored exam that students can take from their home using a laptop or computer with a webcam."},
      {"question": "What is the duration and format of the exam?", "answer": "The exam is 60 minutes long and consists of Multiple Choice Questions (MCQs). Questions check basic concepts, application, and logical analysis."},
      {"question": "Are there mock tests available before the final exam?", "answer": "Yes. Every registered student receives access to mock tests on their dashboard to practice the online exam flow and sample questions."},
      {"question": "How do I download my Admit Card?", "answer": "Once the application is approved by the coordinator, the Admit Card will be available for download in the Customer Dashboard in a print-ready PDF format."},
      {"question": "When will the results be declared?", "answer": "Results are typically declared 4 to 6 weeks after all exam windows are completed. Rankings and performance reports will be published on your dashboard."},
      {"question": "What rewards do toppers get?", "answer": "Top national rankers receive gold, silver, and bronze medals along with merit certificates. All other participants receive a digital participation certificate."},
      {"question": "Is the certificate verified?", "answer": "Yes, each certificate has a unique ID and a verification QR code that can be scanned to verify authenticity online."},
      {"question": "Can I edit details after paying?", "answer": "Once submitted and paid, details cannot be changed directly. However, you can contact our WhatsApp support team to make manual edits before the registration window closes."},
      {"question": "Which classes can register for Cyber Security or Physics?", "answer": "Advanced subjects like Cyber Security, Physics, Chemistry, and Biology are available for Higher Secondary classes (Class 11 and 12)."},
      {"question": "Does the student get a detailed analysis report?", "answer": "Yes, every participant receives a detailed performance dashboard showing subject-wise accuracy, national percentile, and improvement recommendations."},
      {"question": "How do I log in on the exam day?", "answer": "A secure exam portal link and credentials will be sent to the registered parent email and mobile number, and will also be visible in the Customer Dashboard."},
      {"question": "Is a webcam mandatory for the online exam?", "answer": "Yes, a working webcam is required for remote proctoring to prevent malpractice and verify the student''s identity during the test."},
      {"question": "Are there negative marks in the exam?", "answer": "No, there is no negative marking for incorrect answers. Students are encouraged to attempt all questions."},
      {"question": "Can schools register in bulk?", "answer": "Yes, schools can do bulk registrations. For bulk admissions, you can reach out to our WhatsApp coordinator list in the sidebar."},
      {"question": "Who provides support for registrations on this site?", "answer": "DigiConnect Dukan (powered by RNoS India Pvt. Ltd.) is an official registration facilitation partner offering secure uploads, payment checkouts, and dashboard tracking."}
    ],
    "testimonials": [
      {"name": "Aditya Vardhan", "role": "Parent", "text": "My son participated in the Maths Olympiad last year. The mock tests were extremely helpful, and getting the gold medal certificate has boosted his interest in studies!"},
      {"name": "Sneha Kumari", "role": "Student, Class 8", "text": "The online science exam was very interesting. The interface was modern and simple. Checking results and downloading certificates from the dashboard was very easy!"},
      {"name": "Vikram Rathore", "role": "School Teacher", "text": "We registered 45 students from our school via DigiConnect Dukan. The documentation checks and support from the team were exceptional. Highly recommended!"}
    ]
  }';

  -- 2. Insert into service_catalog
  if to_regclass('public.service_catalog') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug')
  then
    execute 'insert into public.service_catalog (slug, name, description, amount, required_documents, active, status, updated_at) ' ||
      'values (''csc-olympiad'', ''CSC Olympiad'', ''Official CSC Olympiad online registration assistance for students of Class 3 to 12.'', 100, array[''Passport Photo'', ''School ID / Proof''], true, ''published'', now()) ' ||
      'on conflict (slug) do update set name = ''CSC Olympiad'', amount = 100, updated_at = now()';
  end if;

  -- 3. Insert/update services table
  if to_regclass('public.services') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('csc-olympiad');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category_id') then
      v_cols := v_cols || ', category_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null');
      v_set := 'category_id = coalesce(' || coalesce(quote_literal(v_category_id::text) || '::uuid', 'null') || ', category_id)';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ''CSC Olympiad''';
      v_set := case when v_set = '' then 'title = ''CSC Olympiad''' else v_set || ', title = ''CSC Olympiad''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ''CSC Olympiad''';
      v_set := case when v_set = '' then 'name = ''CSC Olympiad''' else v_set || ', name = ''CSC Olympiad''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'short_description') then
      v_cols := v_cols || ', short_description';
      v_vals := v_vals || ', ''Official CSC Olympiad online registration assistance for students of Class 3 to 12.''';
      v_set := case when v_set = '' then 'short_description = ''Official CSC Olympiad online registration assistance for students of Class 3 to 12.''' else v_set || ', short_description = ''Official CSC Olympiad online registration assistance for students of Class 3 to 12.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'amount') then
      v_cols := v_cols || ', amount';
      v_vals := v_vals || ', 100';
      v_set := case when v_set = '' then 'amount = 100' else v_set || ', amount = 100' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'old_price') then
      v_cols := v_cols || ', old_price';
      v_vals := v_vals || ', 150';
      v_set := case when v_set = '' then 'old_price = 150' else v_set || ', old_price = 150' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price') then
      v_cols := v_cols || ', offer_price';
      v_vals := v_vals || ', 100';
      v_set := case when v_set = '' then 'offer_price = 100' else v_set || ', offer_price = 100' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'price_label') then
      v_cols := v_cols || ', price_label';
      v_vals := v_vals || ', ''₹100''';
      v_set := case when v_set = '' then 'price_label = ''₹100''' else v_set || ', price_label = ''₹100''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'cta_type') then
      v_cols := v_cols || ', cta_type';
      v_vals := v_vals || ', ''apply''';
      v_set := case when v_set = '' then 'cta_type = ''apply''' else v_set || ', cta_type = ''apply''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'badge') then
      v_cols := v_cols || ', badge';
      v_vals := v_vals || ', ''Olympiad 2026''';
      v_set := case when v_set = '' then 'badge = ''Olympiad 2026''' else v_set || ', badge = ''Olympiad 2026''' end;
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
      ' where not exists (select 1 from public.services where slug = ''csc-olympiad'')';
    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''csc-olympiad''';
    end if;
  end if;
end $$;
