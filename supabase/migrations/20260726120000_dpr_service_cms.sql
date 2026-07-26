-- ============================================================================
-- Detailed Project Report (DPR) service CMS + catalog seed
-- DigiConnect Dukan / RNOS India Pvt. Ltd.
-- Idempotent. Slug: detailed-project-report
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Page settings (singleton-style; id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.dpr_page_settings (
  id int primary key default 1 check (id = 1),
  sticky_cta_enabled boolean not null default true,
  sticky_cta_label text not null default 'Apply for DPR — ₹399',
  sticky_cta_url text not null default '/apply/detailed-project-report',
  video_url text,
  whatsapp_number text default '917007595931',
  support_phone text default '+917007595931',
  default_plan_id text default 'basic',
  meta_title text,
  meta_description text,
  updated_at timestamptz not null default now()
);

insert into public.dpr_page_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Sections
-- ---------------------------------------------------------------------------
create table if not exists public.dpr_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  enabled boolean not null default true,
  sort_order int not null default 0,
  heading text,
  description text,
  cta_label text,
  cta_url text,
  animation_type text default 'fade-up',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dpr_sections_sort_idx
  on public.dpr_sections (enabled, sort_order asc);

-- ---------------------------------------------------------------------------
-- Section banners (7:3)
-- ---------------------------------------------------------------------------
create table if not exists public.dpr_section_banners (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  title text,
  description text,
  alt_text text,
  image_url text not null,
  image_path text,
  mobile_image_url text,
  mobile_image_path text,
  button_text text,
  button_url text,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dpr_section_banners_active_idx
  on public.dpr_section_banners (section_key, is_active, sort_order asc);

-- ---------------------------------------------------------------------------
-- Pricing plans
-- ---------------------------------------------------------------------------
create table if not exists public.dpr_pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  name text not null,
  price numeric(10, 2) not null default 399,
  old_price numeric(10, 2),
  description text,
  features jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  cta_label text default 'Get Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FAQs / Reviews / Comparison / Related
-- ---------------------------------------------------------------------------
create table if not exists public.dpr_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dpr_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  rating numeric(2, 1) not null default 5,
  text text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dpr_comparison_rows (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  digiconnect text not null default 'Yes',
  others text not null default 'No',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dpr_related_services (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  title text,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_dpr_cms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'dpr_page_settings',
    'dpr_sections',
    'dpr_section_banners',
    'dpr_pricing_plans',
    'dpr_faqs',
    'dpr_reviews',
    'dpr_comparison_rows',
    'dpr_related_services'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_dpr_cms_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('dpr-service-media', 'dpr-service-media', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.dpr_page_settings enable row level security;
alter table public.dpr_sections enable row level security;
alter table public.dpr_section_banners enable row level security;
alter table public.dpr_pricing_plans enable row level security;
alter table public.dpr_faqs enable row level security;
alter table public.dpr_reviews enable row level security;
alter table public.dpr_comparison_rows enable row level security;
alter table public.dpr_related_services enable row level security;

drop policy if exists "Public read dpr page settings" on public.dpr_page_settings;
create policy "Public read dpr page settings" on public.dpr_page_settings
  for select using (true);

drop policy if exists "Admins manage dpr page settings" on public.dpr_page_settings;
create policy "Admins manage dpr page settings" on public.dpr_page_settings
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read enabled dpr sections" on public.dpr_sections;
create policy "Public read enabled dpr sections" on public.dpr_sections
  for select using (enabled = true);

drop policy if exists "Admins manage dpr sections" on public.dpr_sections;
create policy "Admins manage dpr sections" on public.dpr_sections
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active dpr banners" on public.dpr_section_banners;
create policy "Public read active dpr banners" on public.dpr_section_banners
  for select using (
    is_active = true
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );

drop policy if exists "Admins manage dpr banners" on public.dpr_section_banners;
create policy "Admins manage dpr banners" on public.dpr_section_banners
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active dpr pricing" on public.dpr_pricing_plans;
create policy "Public read active dpr pricing" on public.dpr_pricing_plans
  for select using (is_active = true);

drop policy if exists "Admins manage dpr pricing" on public.dpr_pricing_plans;
create policy "Admins manage dpr pricing" on public.dpr_pricing_plans
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active dpr faqs" on public.dpr_faqs;
create policy "Public read active dpr faqs" on public.dpr_faqs
  for select using (is_active = true);

drop policy if exists "Admins manage dpr faqs" on public.dpr_faqs;
create policy "Admins manage dpr faqs" on public.dpr_faqs
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active dpr reviews" on public.dpr_reviews;
create policy "Public read active dpr reviews" on public.dpr_reviews
  for select using (is_active = true);

drop policy if exists "Admins manage dpr reviews" on public.dpr_reviews;
create policy "Admins manage dpr reviews" on public.dpr_reviews
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active dpr comparison" on public.dpr_comparison_rows;
create policy "Public read active dpr comparison" on public.dpr_comparison_rows
  for select using (is_active = true);

drop policy if exists "Admins manage dpr comparison" on public.dpr_comparison_rows;
create policy "Admins manage dpr comparison" on public.dpr_comparison_rows
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active dpr related" on public.dpr_related_services;
create policy "Public read active dpr related" on public.dpr_related_services
  for select using (is_active = true);

drop policy if exists "Admins manage dpr related" on public.dpr_related_services;
create policy "Admins manage dpr related" on public.dpr_related_services
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public can read dpr media" on storage.objects;
create policy "Public can read dpr media" on storage.objects
  for select to public
  using (bucket_id = 'dpr-service-media');

drop policy if exists "Admins can upload dpr media" on storage.objects;
create policy "Admins can upload dpr media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dpr-service-media' and public.is_admin_role());

drop policy if exists "Admins can update dpr media" on storage.objects;
create policy "Admins can update dpr media" on storage.objects
  for update to authenticated
  using (bucket_id = 'dpr-service-media' and public.is_admin_role())
  with check (bucket_id = 'dpr-service-media' and public.is_admin_role());

drop policy if exists "Admins can delete dpr media" on storage.objects;
create policy "Admins can delete dpr media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dpr-service-media' and public.is_admin_role());

-- ---------------------------------------------------------------------------
-- Seed sections
-- ---------------------------------------------------------------------------
insert into public.dpr_sections (section_key, enabled, sort_order, heading, description, cta_label, cta_url)
values
  ('hero', true, 10, 'Detailed Project Report', 'Bank-ready DPR for PMEGP, Mudra, CM Yuva & MSME loan schemes — launch offer ₹399.', 'Apply Now', '/apply/detailed-project-report'),
  ('trust', true, 20, 'Trusted by entrepreneurs across India', 'Verified process, expert drafting, and partner-backed delivery.', null, null),
  ('what_is', true, 30, 'What is a Detailed Project Report?', 'A DPR is the formal project document banks and departments need before approving subsidy-linked loans.', null, null),
  ('video', true, 40, 'See how DigiConnect prepares your DPR', 'Watch a short overview of our guided process.', null, null),
  ('why_us', true, 50, 'Why DigiConnect for your DPR', 'Scheme-aware drafting with document checks and fast turnaround.', null, null),
  ('schemes', true, 60, 'Schemes we support', 'PMEGP, Mudra, CM Yuva, PM Vishwakarma, and more.', null, null),
  ('includes', true, 70, 'What your DPR includes', 'Costing, machinery, projections, and scheme-aligned annexures.', null, null),
  ('pricing', true, 80, 'Transparent pricing', 'Start at ₹399 for a bank-ready Basic DPR.', 'Choose a plan', '#pricing'),
  ('comparison', true, 90, 'DigiConnect vs others', 'Clear deliverables, support, and revision policy.', null, null),
  ('process', true, 100, 'Simple 6-step process', 'From details to payment to delivery tracking.', null, null),
  ('samples', true, 110, 'Sample DPR previews', 'See the structure banks expect.', null, null),
  ('reviews', true, 120, 'Customer reviews', 'Real entrepreneurs who got loan-ready reports.', null, null),
  ('success', true, 130, 'Success stories', 'From application to sanctioned funding support.', null, null),
  ('faq', true, 140, 'Frequently asked questions', 'Answers about documents, timelines, and schemes.', null, null),
  ('trust_badges', true, 150, 'Secure & verified', 'Payments, data, and document handling you can trust.', null, null),
  ('documents', true, 160, 'Documents checklist', 'Keep these ready before you apply.', null, null),
  ('benefits', true, 170, 'Benefits of a professional DPR', 'Higher clarity for banks and faster file movement.', null, null),
  ('stats', true, 180, 'Numbers that matter', 'Applications supported, schemes covered, turnaround.', null, null),
  ('cta', true, 190, 'Ready to get your DPR?', 'Apply online in minutes. Launch offer ₹399.', 'Apply Now', '/apply/detailed-project-report'),
  ('related', true, 200, 'Related services', 'Pair your DPR with MSME, GST, and loan guidance.', null, null),
  ('contact', true, 210, 'Talk to an expert', 'WhatsApp or call for scheme-specific guidance.', 'WhatsApp', null),
  ('sticky_cta', true, 220, 'Sticky mobile CTA', 'Always-visible apply bar on mobile.', 'Apply for DPR — ₹399', '/apply/detailed-project-report')
on conflict (section_key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed pricing
-- ---------------------------------------------------------------------------
insert into public.dpr_pricing_plans (plan_key, name, price, old_price, description, features, is_featured, sort_order, cta_label)
values
  ('basic', 'Basic', 399, 999, 'Bank-ready DPR for a single scheme with standard projections.', '["Scheme-aligned DPR PDF","Cost & means of finance","3-year projections","1 revision","WhatsApp support"]'::jsonb, true, 10, 'Start Basic'),
  ('professional', 'Professional', 799, 1499, 'Enhanced DPR with machinery schedule and deeper financials.', '["Everything in Basic","Machinery schedule","Working capital note","2 revisions","Priority drafting"]'::jsonb, false, 20, 'Choose Professional'),
  ('premium', 'Premium', 1499, 2499, 'Full package with comparison notes and banker checklist.', '["Everything in Professional","Subsidy calculation note","Banker checklist","3 revisions","Call support"]'::jsonb, false, 30, 'Choose Premium'),
  ('enterprise', 'Enterprise', 2999, 4999, 'Multi-unit / complex project with custom annexures.', '["Everything in Premium","Multi-unit support","Custom annexures","Dedicated specialist","Express option"]'::jsonb, false, 40, 'Talk to sales')
on conflict (plan_key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed FAQs
-- ---------------------------------------------------------------------------
insert into public.dpr_faqs (question, answer, sort_order)
select * from (values
  ('What is included in the ₹399 Basic DPR?', 'A scheme-aligned Detailed Project Report PDF with cost of project, means of finance, and standard 3-year projections, plus one revision.', 10),
  ('Which schemes do you support?', 'PMEGP, Mudra, CM Yuva, PM Vishwakarma, and common state MSME subsidy schemes. Mention your scheme while applying.', 20),
  ('How long does delivery take?', 'Most Basic DPRs are drafted within 24–72 working hours after documents and project details are complete.', 30),
  ('Can I use this DPR for bank submission?', 'Yes. Reports are prepared in a bank-friendly format. Final acceptance always depends on the lending bank/department.', 40),
  ('What documents do I need?', 'PAN, Aadhaar, quotation/estimate, GST (if any), Udyam, photo, recent bank statement, and other scheme-specific proofs.', 50),
  ('Do you help with loan filing too?', 'DPR is the project report. You can also apply for related DigiConnect loan/MSME services from the same portal.', 60)
) as v(question, answer, sort_order)
where not exists (select 1 from public.dpr_faqs limit 1);

-- ---------------------------------------------------------------------------
-- Seed reviews
-- ---------------------------------------------------------------------------
insert into public.dpr_reviews (name, location, rating, text, sort_order)
select * from (values
  ('Ravi Kumar', 'Patna, Bihar', 5.0, 'Got my PMEGP DPR quickly. Bank accepted the format without asking for major changes.', 10),
  ('Sneha Patil', 'Nashik, Maharashtra', 5.0, 'Clear pricing and WhatsApp updates. Machinery table was exactly what I needed.', 20),
  ('Mohd. Imran', 'Lucknow, UP', 4.8, 'Professional team. Helped me correct cost projections before submission.', 30)
) as v(name, location, rating, text, sort_order)
where not exists (select 1 from public.dpr_reviews limit 1);

-- ---------------------------------------------------------------------------
-- Seed comparison
-- ---------------------------------------------------------------------------
insert into public.dpr_comparison_rows (feature, digiconnect, others, sort_order)
select * from (values
  ('Scheme-aware DPR drafting', 'Yes', 'Generic templates', 10),
  ('Transparent launch pricing', 'From ₹399', 'Often unclear', 20),
  ('Online tracking & documents', 'Customer portal', 'Email / WhatsApp only', 30),
  ('Partner-assisted filing option', 'Available', 'Rare', 40),
  ('Revision support', 'Included by plan', 'Extra charges', 50)
) as v(feature, digiconnect, others, sort_order)
where not exists (select 1 from public.dpr_comparison_rows limit 1);

-- ---------------------------------------------------------------------------
-- Seed related services
-- ---------------------------------------------------------------------------
insert into public.dpr_related_services (service_slug, title, description, sort_order)
select * from (values
  ('msme-registration', 'MSME / Udyam Registration', 'Register your enterprise before loan filing.', 10),
  ('gst-registration', 'GST Registration', 'Get GSTIN for business compliance and tenders.', 20),
  ('pmegp-loan', 'PMEGP Loan Guidance', 'Guided PMEGP application support.', 30),
  ('mudra-loan', 'Mudra Loan Guidance', 'Mudra documentation and process assistance.', 40)
) as v(service_slug, title, description, sort_order)
where not exists (select 1 from public.dpr_related_services limit 1);

-- ---------------------------------------------------------------------------
-- Seed services + agent_services (column-safe)
-- ---------------------------------------------------------------------------
do $$
declare
  v_cols text;
  v_vals text;
  v_set text;
  v_service_id uuid;
begin
  -- services table (if present)
  if to_regclass('public.services') is not null
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'slug')
  then
    v_cols := 'slug';
    v_vals := quote_literal('detailed-project-report');
    v_set := '';

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'title') then
      v_cols := v_cols || ', title';
      v_vals := v_vals || ', ' || quote_literal('Detailed Project Report (DPR)');
      v_set := 'title = ''Detailed Project Report (DPR)''';
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'name') then
      v_cols := v_cols || ', name';
      v_vals := v_vals || ', ' || quote_literal('Detailed Project Report (DPR)');
      v_set := case when v_set = '' then 'name = ''Detailed Project Report (DPR)''' else v_set || ', name = ''Detailed Project Report (DPR)''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category') then
      v_cols := v_cols || ', category';
      v_vals := v_vals || ', ' || quote_literal('loans');
      v_set := case when v_set = '' then 'category = ''loans''' else v_set || ', category = ''loans''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'short_description') then
      v_cols := v_cols || ', short_description';
      v_vals := v_vals || ', ' || quote_literal('Bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva and MSME schemes. Launch offer ₹399.');
      v_set := case when v_set = '' then 'short_description = ''Bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva and MSME schemes. Launch offer ₹399.''' else v_set || ', short_description = ''Bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva and MSME schemes. Launch offer ₹399.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'overview') then
      v_cols := v_cols || ', overview';
      v_vals := v_vals || ', ' || quote_literal('Get a professional, scheme-aligned Detailed Project Report (DPR) prepared by DigiConnect specialists for bank and department submission.');
      v_set := case when v_set = '' then 'overview = ''Get a professional, scheme-aligned Detailed Project Report (DPR) prepared by DigiConnect specialists for bank and department submission.''' else v_set || ', overview = ''Get a professional, scheme-aligned Detailed Project Report (DPR) prepared by DigiConnect specialists for bank and department submission.''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'offer_price') then
      v_cols := v_cols || ', offer_price';
      v_vals := v_vals || ', 399';
      v_set := case when v_set = '' then 'offer_price = 399' else v_set || ', offer_price = 399' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'old_price') then
      v_cols := v_cols || ', old_price';
      v_vals := v_vals || ', 999';
      v_set := case when v_set = '' then 'old_price = 999' else v_set || ', old_price = 999' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'sale_price') then
      v_cols := v_cols || ', sale_price';
      v_vals := v_vals || ', 399';
      v_set := case when v_set = '' then 'sale_price = 399' else v_set || ', sale_price = 399' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'base_price') then
      v_cols := v_cols || ', base_price';
      v_vals := v_vals || ', 999';
      v_set := case when v_set = '' then 'base_price = 999' else v_set || ', base_price = 999' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'cta_type') then
      v_cols := v_cols || ', cta_type';
      v_vals := v_vals || ', ' || quote_literal('apply');
      v_set := case when v_set = '' then 'cta_type = ''apply''' else v_set || ', cta_type = ''apply''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'is_active') then
      v_cols := v_cols || ', is_active';
      v_vals := v_vals || ', true';
      v_set := case when v_set = '' then 'is_active = true' else v_set || ', is_active = true' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'status') then
      v_cols := v_cols || ', status';
      v_vals := v_vals || ', ' || quote_literal('published');
      v_set := case when v_set = '' then 'status = ''published''' else v_set || ', status = ''published''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'cta_primary_url') then
      v_cols := v_cols || ', cta_primary_url';
      v_vals := v_vals || ', ' || quote_literal('/apply/detailed-project-report');
      v_set := case when v_set = '' then 'cta_primary_url = ''/apply/detailed-project-report''' else v_set || ', cta_primary_url = ''/apply/detailed-project-report''' end;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'cta_primary_label') then
      v_cols := v_cols || ', cta_primary_label';
      v_vals := v_vals || ', ' || quote_literal('Apply Now');
      v_set := case when v_set = '' then 'cta_primary_label = ''Apply Now''' else v_set || ', cta_primary_label = ''Apply Now''' end;
    end if;

    execute 'insert into public.services (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.services where slug = ''detailed-project-report'')';
    if v_set <> '' then
      execute 'update public.services set ' || v_set || ' where slug = ''detailed-project-report''';
    end if;
  end if;

  -- agent_services
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
    and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_catalog' and column_name = 'slug')
  then
    select id into v_service_id from public.service_catalog where slug = 'detailed-project-report' limit 1;
  end if;
  if v_service_id is null and to_regclass('public.services') is not null then
    select id into v_service_id from public.services where slug = 'detailed-project-report' limit 1;
  end if;

  v_cols := 'slug';
  v_vals := quote_literal('detailed-project-report');
  v_set := '';

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'service_id') then
    v_cols := v_cols || ', service_id';
    v_vals := v_vals || ', ' || coalesce(quote_literal(v_service_id::text) || '::uuid', 'null');
    v_set := 'service_id = coalesce(' || coalesce(quote_literal(v_service_id::text) || '::uuid', 'null') || ', service_id)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'title') then
    v_cols := v_cols || ', title';
    v_vals := v_vals || ', ' || quote_literal('Detailed Project Report (DPR)');
    v_set := case when v_set = '' then 'title = ''Detailed Project Report (DPR)''' else v_set || ', title = ''Detailed Project Report (DPR)''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'description') then
    v_cols := v_cols || ', description';
    v_vals := v_vals || ', ' || quote_literal('Bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva and MSME schemes. Launch offer ₹399.');
    v_set := case when v_set = '' then 'description = ''Bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva and MSME schemes. Launch offer ₹399.''' else v_set || ', description = ''Bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva and MSME schemes. Launch offer ₹399.''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'category') then
    v_cols := v_cols || ', category';
    v_vals := v_vals || ', ' || quote_literal('Loans & Government Schemes');
    v_set := case when v_set = '' then 'category = ''Loans & Government Schemes''' else v_set || ', category = ''Loans & Government Schemes''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'customer_fee') then
    v_cols := v_cols || ', customer_fee';
    v_vals := v_vals || ', 399';
    v_set := case when v_set = '' then 'customer_fee = 399' else v_set || ', customer_fee = 399' end;
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
    v_vals := v_vals || ', ' || quote_literal('PAN Card
Aadhaar Card
Machinery / Quotation
GST Certificate (if any)
Udyam Certificate
Passport Photo
Bank Statement
Other supporting docs');
    v_set := case when v_set = '' then 'required_documents = ''PAN Card
Aadhaar Card
Machinery / Quotation
GST Certificate (if any)
Udyam Certificate
Passport Photo
Bank Statement
Other supporting docs''' else v_set || ', required_documents = ''PAN Card
Aadhaar Card
Machinery / Quotation
GST Certificate (if any)
Udyam Certificate
Passport Photo
Bank Statement
Other supporting docs''' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'processing_time') then
    v_cols := v_cols || ', processing_time';
    v_vals := v_vals || ', ' || quote_literal('24-72 Working Hours');
    v_set := case when v_set = '' then 'processing_time = ''24-72 Working Hours''' else v_set || ', processing_time = ''24-72 Working Hours''' end;
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
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'is_featured') then
    v_cols := v_cols || ', is_featured';
    v_vals := v_vals || ', true';
    v_set := case when v_set = '' then 'is_featured = true' else v_set || ', is_featured = true' end;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agent_services' and column_name = 'updated_at') then
    v_cols := v_cols || ', updated_at';
    v_vals := v_vals || ', now()';
    v_set := case when v_set = '' then 'updated_at = now()' else v_set || ', updated_at = now()' end;
  end if;

  execute 'insert into public.agent_services (' || v_cols || ') select ' || v_vals ||
    ' where not exists (select 1 from public.agent_services where slug = ''detailed-project-report'')';
  if v_set <> '' then
    execute 'update public.agent_services set ' || v_set || ' where slug = ''detailed-project-report''';
  end if;
end;
$$;
