-- ============================================================================
-- Income Tax Return (ITR) premium CMS — upgrades existing itr-filing service
-- DigiConnect Dukan / RNOS India Pvt. Ltd.
-- Additive + idempotent. Does NOT create a duplicate service row.
-- Canonical slug remains: itr-filing
-- SEO alias (app-level): income-tax-return-filing
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Page settings (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.itr_page_settings (
  id int primary key default 1 check (id = 1),
  service_name text not null default 'Income Tax Return Filing',
  short_name text not null default 'ITR Filing',
  assessment_year text not null default 'AY 2026-27 (FY 2025-26)',
  filing_open_notice text default 'ITR Filing Now Open',
  starting_price numeric(10, 2) not null default 499,
  hero_heading text,
  hero_description text,
  primary_cta_label text default 'Apply Now',
  primary_cta_url text default '/apply/itr-filing',
  secondary_cta_label text default 'Talk to Expert',
  secondary_cta_url text,
  support_cta_label text default 'Check Required Documents',
  support_cta_url text default '#documents',
  estimated_turnaround text default '2-3 Working Days',
  sticky_cta_enabled boolean not null default true,
  sticky_cta_label text not null default 'Apply for ITR — from ₹499',
  sticky_cta_url text not null default '/apply/itr-filing',
  video_url text,
  whatsapp_number text default '917007595931',
  support_phone text default '+917007595931',
  default_plan_id text default 'basic',
  is_published boolean not null default true,
  meta_title text,
  meta_description text,
  meta_keywords text,
  og_title text,
  og_description text,
  og_image_url text,
  twitter_image_url text,
  robots_index boolean not null default true,
  pricing_disclaimer text default 'Starting prices shown. Final fees may depend on return complexity after document review.',
  final_quote_disclaimer text default 'Final ITR form and payable amount are confirmed after expert document review.',
  tax_liability_disclaimer text default 'Tax payable and refund depend on official records and applicable law. DigiConnect does not guarantee refunds.',
  refund_disclaimer text default 'Refund processing time and amount are controlled by the Income Tax Department.',
  customer_declaration text default 'I confirm that the information and documents provided are true and complete to the best of my knowledge.',
  updated_at timestamptz not null default now()
);

insert into public.itr_page_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.itr_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  enabled boolean not null default true,
  sort_order int not null default 0,
  heading text,
  subheading text,
  description text,
  content jsonb default '{}'::jsonb,
  layout_style text default 'default',
  cta_label text,
  cta_url text,
  animation_type text default 'fade-up',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists itr_sections_sort_idx on public.itr_sections (enabled, sort_order asc);

create table if not exists public.itr_section_banners (
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
  badge_text text,
  text_alignment text default 'left',
  overlay_strength numeric(3, 2) default 0.35,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists itr_section_banners_active_idx
  on public.itr_section_banners (section_key, is_active, sort_order asc);

create table if not exists public.itr_pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  name text not null,
  price numeric(10, 2) not null default 499,
  old_price numeric(10, 2),
  description text,
  features jsonb not null default '[]'::jsonb,
  eligible_profiles jsonb not null default '[]'::jsonb,
  complexity_notes text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  cta_label text default 'Get Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itr_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itr_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  profile_image_url text,
  rating numeric(2, 1) not null default 5,
  text text not null,
  filing_category text,
  is_verified boolean not null default false,
  is_demo boolean not null default false,
  is_active boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itr_comparison_rows (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  form_code text,
  typical_taxpayer text,
  common_sources text,
  common_exclusions text,
  complexity text,
  suggested_package text,
  digiconnect text,
  self_filing text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itr_related_services (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  title text,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itr_document_checklist (
  id uuid primary key default gen_random_uuid(),
  category_key text not null,
  category_label text not null,
  document_key text not null,
  document_label text not null,
  taxpayer_profiles text[] default '{}',
  income_sources text[] default '{}',
  required_default boolean not null default false,
  help_text text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_key, document_key)
);

-- updated_at trigger
create or replace function public.set_itr_cms_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'itr_page_settings','itr_sections','itr_section_banners','itr_pricing_plans',
    'itr_faqs','itr_reviews','itr_comparison_rows','itr_related_services','itr_document_checklist'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_itr_cms_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- Public marketing media (NOT for tax documents)
insert into storage.buckets (id, name, public)
values ('itr-media', 'itr-media', true)
on conflict (id) do update set public = true;

-- RLS
alter table public.itr_page_settings enable row level security;
alter table public.itr_sections enable row level security;
alter table public.itr_section_banners enable row level security;
alter table public.itr_pricing_plans enable row level security;
alter table public.itr_faqs enable row level security;
alter table public.itr_reviews enable row level security;
alter table public.itr_comparison_rows enable row level security;
alter table public.itr_related_services enable row level security;
alter table public.itr_document_checklist enable row level security;

drop policy if exists "Public read itr page settings" on public.itr_page_settings;
create policy "Public read itr page settings" on public.itr_page_settings for select using (true);
drop policy if exists "Admins manage itr page settings" on public.itr_page_settings;
create policy "Admins manage itr page settings" on public.itr_page_settings
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read enabled itr sections" on public.itr_sections;
create policy "Public read enabled itr sections" on public.itr_sections for select using (enabled = true);
drop policy if exists "Admins manage itr sections" on public.itr_sections;
create policy "Admins manage itr sections" on public.itr_sections
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active itr banners" on public.itr_section_banners;
create policy "Public read active itr banners" on public.itr_section_banners
  for select using (
    is_active = true
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );
drop policy if exists "Admins manage itr banners" on public.itr_section_banners;
create policy "Admins manage itr banners" on public.itr_section_banners
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active itr pricing" on public.itr_pricing_plans;
create policy "Public read active itr pricing" on public.itr_pricing_plans for select using (is_active = true);
drop policy if exists "Admins manage itr pricing" on public.itr_pricing_plans;
create policy "Admins manage itr pricing" on public.itr_pricing_plans
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active itr faqs" on public.itr_faqs;
create policy "Public read active itr faqs" on public.itr_faqs for select using (is_active = true);
drop policy if exists "Admins manage itr faqs" on public.itr_faqs;
create policy "Admins manage itr faqs" on public.itr_faqs
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active verified itr reviews" on public.itr_reviews;
create policy "Public read active verified itr reviews" on public.itr_reviews
  for select using (is_active = true and is_demo = false);
drop policy if exists "Admins manage itr reviews" on public.itr_reviews;
create policy "Admins manage itr reviews" on public.itr_reviews
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active itr comparison" on public.itr_comparison_rows;
create policy "Public read active itr comparison" on public.itr_comparison_rows for select using (is_active = true);
drop policy if exists "Admins manage itr comparison" on public.itr_comparison_rows;
create policy "Admins manage itr comparison" on public.itr_comparison_rows
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active itr related" on public.itr_related_services;
create policy "Public read active itr related" on public.itr_related_services for select using (is_active = true);
drop policy if exists "Admins manage itr related" on public.itr_related_services;
create policy "Admins manage itr related" on public.itr_related_services
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public read active itr docs" on public.itr_document_checklist;
create policy "Public read active itr docs" on public.itr_document_checklist for select using (is_active = true);
drop policy if exists "Admins manage itr docs" on public.itr_document_checklist;
create policy "Admins manage itr docs" on public.itr_document_checklist
  for all using (public.is_admin_role()) with check (public.is_admin_role());

drop policy if exists "Public can read itr media" on storage.objects;
create policy "Public can read itr media" on storage.objects
  for select to public using (bucket_id = 'itr-media');
drop policy if exists "Admins can upload itr media" on storage.objects;
create policy "Admins can upload itr media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'itr-media' and public.is_admin_role());
drop policy if exists "Admins can update itr media" on storage.objects;
create policy "Admins can update itr media" on storage.objects
  for update to authenticated
  using (bucket_id = 'itr-media' and public.is_admin_role())
  with check (bucket_id = 'itr-media' and public.is_admin_role());
drop policy if exists "Admins can delete itr media" on storage.objects;
create policy "Admins can delete itr media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'itr-media' and public.is_admin_role());

-- Seed sections
insert into public.itr_sections (section_key, enabled, sort_order, heading, description, cta_label, cta_url)
values
  ('hero', true, 10, 'File Your Income Tax Return with Expert Support', 'Professional ITR filing for salaried individuals, businesses, professionals, freelancers, investors and property owners.', 'Apply Now', '/apply/itr-filing'),
  ('trust', true, 20, 'Built for trust and clarity', 'Secure documents, transparent pricing, expert-assisted filing, and online tracking.', null, null),
  ('what_is', true, 30, 'What is an Income Tax Return?', 'ITR is your official statement of income, deductions, and tax for a financial year.', null, null),
  ('who_should_file', true, 40, 'Who may need to file ITR?', 'Educational guide — final applicability depends on income, thresholds and current law.', null, null),
  ('income_sources', true, 50, 'Income sources we support', 'Salary, business, capital gains, property, interest, and more — mapped after document review.', null, null),
  ('form_comparison', true, 60, 'ITR form comparison', 'Typical forms explained. Final form is selected after document review.', null, null),
  ('benefits', true, 70, 'Benefits of filing ITR', 'Income record, refund claims, and documentation support — without guaranteed outcomes.', null, null),
  ('documents', true, 80, 'Documents checklist', 'Category-wise list. Requirements adapt to your filing profile.', null, null),
  ('process', true, 90, 'How filing works', 'From profile selection to acknowledgement delivery.', null, null),
  ('pricing', true, 100, 'Transparent packages', 'Starting prices. Final amount may change after complexity review.', 'Choose a plan', '#pricing'),
  ('self_vs_expert', true, 110, 'Self filing vs expert-assisted', 'Fair comparison of effort, checks, and support.', null, null),
  ('why_us', true, 120, 'Why DigiConnect Dukan', 'Guided apply, secure uploads, tracking, invoice, and CRM workflow.', null, null),
  ('mistakes', true, 130, 'Common filing mistakes', 'Educational tips to reduce avoidable errors.', null, null),
  ('reviews', true, 140, 'Customer reviews', 'CMS-managed reviews only when verified and active.', null, null),
  ('trust_us', true, 150, 'Why trust us', 'Brand, secure payments, privacy-focused handling — no government endorsement claimed.', null, null),
  ('faq', true, 160, 'Frequently asked questions', 'Admin-managed answers about ITR filing.', null, null),
  ('related', true, 170, 'Related services', 'GST, MSME, DPR and other DigiConnect services.', null, null),
  ('cta', true, 180, 'Ready to file your ITR?', 'Apply online with expert-assisted support.', 'Apply for ITR Filing', '/apply/itr-filing'),
  ('sticky_cta', true, 190, 'Sticky mobile CTA', 'Compact apply bar on mobile.', 'Apply for ITR — from ₹499', '/apply/itr-filing')
on conflict (section_key) do nothing;

-- Seed pricing
insert into public.itr_pricing_plans (plan_key, name, price, old_price, description, features, eligible_profiles, is_featured, sort_order, cta_label)
values
  ('basic', 'Basic ITR', 499, 799, 'Starting from ₹499 for simple salary / interest returns.', '["Single Form 16 support","Basic bank interest","Expert-assisted filing","Digital invoice","Portal tracking"]'::jsonb, '["salaried","pensioner"]'::jsonb, true, 10, 'Start Basic'),
  ('professional', 'Professional ITR', 999, 1499, 'Starting from ₹999 for multi-source individual returns.', '["Multiple Form 16","House property","Interest & dividend","Deduction review","Priority support"]'::jsonb, '["salaried","investor","property_owner","mixed"]'::jsonb, false, 20, 'Choose Professional'),
  ('business', 'Business ITR', 1499, 2499, 'Starting from ₹1,499 for proprietor / freelancer / presumptive cases.', '["Business / profession","Presumptive taxation support","Basic statements guidance","GST cross-check notes","Expert review"]'::jsonb, '["business","professional","freelancer"]'::jsonb, false, 30, 'Choose Business'),
  ('capital_gains', 'Capital Gains ITR', 1999, 2999, 'Starting from ₹1,999 for shares, mutual funds or property gains.', '["Capital gain schedules","Broker statement review","Property transaction notes","Complexity screening","Expert support"]'::jsonb, '["investor","property_owner","mixed"]'::jsonb, false, 40, 'Choose Capital Gains'),
  ('complex', 'Complex ITR', 0, null, 'Custom quote for F&O, crypto/VDA, foreign income/assets or specialist cases.', '["Manual complexity review","Specialist assignment","Custom deliverables","Quote after screening"]'::jsonb, '["mixed","investor","business"]'::jsonb, false, 50, 'Request quote')
on conflict (plan_key) do nothing;

-- Seed FAQs
insert into public.itr_faqs (question, answer, sort_order)
select * from (values
  ('What is ITR?', 'An Income Tax Return (ITR) is the statement you file with the Income Tax Department summarising income, deductions, and tax for a financial year.', 10),
  ('Who should file ITR?', 'Filing requirements depend on income, thresholds, residency, and other factors under current law. Our experts guide you after reviewing documents.', 20),
  ('Which ITR form is applicable?', 'Form selection depends on income sources and taxpayer category. Final form is confirmed after document review — not solely from the online questionnaire.', 30),
  ('Can I file after the due date?', 'Belated and revised returns may be possible within statutory windows. Applicability changes by year — ask support for the current assessment year.', 40),
  ('Is a refund guaranteed?', 'No. Refund eligibility and timing are determined by the Income Tax Department based on your records and applicable law.', 50),
  ('How will I receive filed documents?', 'After filing, permitted deliverables (computation, acknowledgement, ITR-V where applicable) appear in your DigiConnect customer portal.', 60),
  ('Is my information secure?', 'Documents use private storage with role-based access. Marketing banners are stored separately from tax documents.', 70)
) as v(question, answer, sort_order)
where not exists (select 1 from public.itr_faqs limit 1);

-- Seed form comparison (editable; not legal advice)
insert into public.itr_comparison_rows (feature, form_code, typical_taxpayer, common_sources, common_exclusions, complexity, suggested_package, digiconnect, self_filing, sort_order)
select * from (values
  ('ITR-1 Sahaj', 'ITR-1', 'Salaried / pensioner (typical)', 'Salary, pension, interest', 'Business, capital gains (typical exclusions)', 'Low', 'Basic', 'Guided + review', 'Self-map forms', 10),
  ('ITR-2', 'ITR-2', 'Individuals with capital gains / multiple HP', 'Salary + CG / HP', 'Business income (typical)', 'Medium', 'Professional / Capital Gains', 'Schedule support', 'Manual schedules', 20),
  ('ITR-3', 'ITR-3', 'Business / profession', 'Business, profession', 'Varies', 'Higher', 'Business / Complex', 'Expert-assisted', 'Books & audit awareness', 30),
  ('ITR-4 Sugam', 'ITR-4', 'Presumptive taxation (typical)', 'Presumptive business/profession', 'Varies', 'Medium', 'Business', 'Presumptive guidance', 'Self computation', 40)
) as v(feature, form_code, typical_taxpayer, common_sources, common_exclusions, complexity, suggested_package, digiconnect, self_filing, sort_order)
where not exists (select 1 from public.itr_comparison_rows limit 1);

-- Related services
insert into public.itr_related_services (service_slug, title, description, sort_order)
select * from (values
  ('gst-registration', 'GST Registration', 'Register for GSTIN with guided support.', 10),
  ('gst-return-filing', 'GST Return Filing', 'Assisted GSTR filing support.', 20),
  ('msme-registration', 'MSME / Udyam', 'Udyam registration for enterprises.', 30),
  ('detailed-project-report', 'Detailed Project Report', 'Bank-ready DPR for loan schemes.', 40),
  ('dsc', 'Digital Signature Certificate', 'Class-3 DSC for e-filings.', 50)
) as v(service_slug, title, description, sort_order)
where not exists (select 1 from public.itr_related_services limit 1);

-- Document checklist seeds
insert into public.itr_document_checklist (category_key, category_label, document_key, document_label, taxpayer_profiles, income_sources, required_default, sort_order)
select * from (values
  ('common', 'Common Documents', 'pan', 'PAN Card', '{}'::text[], '{}'::text[], true, 10),
  ('common', 'Common Documents', 'aadhaar', 'Aadhaar Card', '{}'::text[], '{}'::text[], true, 20),
  ('common', 'Common Documents', 'bank_proof', 'Cancelled cheque / passbook', '{}'::text[], '{}'::text[], true, 30),
  ('salary', 'Salary', 'form16', 'Form 16', array['salaried'], array['salary'], true, 40),
  ('tax_records', 'Tax Records', 'ais', 'AIS', '{}'::text[], '{}'::text[], false, 50),
  ('tax_records', 'Tax Records', 'form26as', 'Form 26AS', '{}'::text[], '{}'::text[], false, 60),
  ('tax_records', 'Tax Records', 'tis', 'TIS', '{}'::text[], '{}'::text[], false, 70),
  ('bank', 'Bank and Interest', 'bank_statement', 'Bank statement', '{}'::text[], array['savings_interest','fd_interest'], false, 80),
  ('capital', 'Capital Gains', 'broker_statement', 'Broker statement', array['investor'], array['shares','mutual_funds'], false, 90),
  ('business', 'Business / Profession', 'pl_summary', 'Profit & loss / sales summary', array['business','professional','freelancer'], array['business','profession','freelancing'], false, 100),
  ('deductions', 'Deductions', '80c_proofs', '80C investment proofs', '{}'::text[], '{}'::text[], false, 110)
) as v(category_key, category_label, document_key, document_label, taxpayer_profiles, income_sources, required_default, sort_order)
where not exists (select 1 from public.itr_document_checklist limit 1);

-- Update existing itr-filing service / agent_services (NO duplicate insert if missing title columns differ)
do $$
declare
  v_cols text;
  v_vals text;
  v_set text;
  v_service_id uuid;
begin
  -- Enrich existing services row if present; insert only if absent
  if to_regclass('public.services') is not null
    and exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='slug')
  then
    if exists (select 1 from public.services where slug = 'itr-filing') then
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='sale_price') then
        update public.services set sale_price = coalesce(sale_price, 499) where slug = 'itr-filing';
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='offer_price') then
        update public.services set offer_price = coalesce(offer_price, 499) where slug = 'itr-filing';
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='cta_type') then
        update public.services set cta_type = coalesce(cta_type, 'apply') where slug = 'itr-filing';
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='cta_primary_url') then
        update public.services set cta_primary_url = coalesce(cta_primary_url, '/apply/itr-filing') where slug = 'itr-filing';
      end if;
    else
      -- Only insert if truly missing (new environments)
      v_cols := 'slug';
      v_vals := quote_literal('itr-filing');
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='title') then
        v_cols := v_cols || ', title'; v_vals := v_vals || ', ' || quote_literal('ITR Filing');
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='name') then
        v_cols := v_cols || ', name'; v_vals := v_vals || ', ' || quote_literal('ITR Filing');
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='category') then
        v_cols := v_cols || ', category'; v_vals := v_vals || ', ' || quote_literal('tax');
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='cta_type') then
        v_cols := v_cols || ', cta_type'; v_vals := v_vals || ', ' || quote_literal('apply');
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='offer_price') then
        v_cols := v_cols || ', offer_price'; v_vals := v_vals || ', 499';
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='sale_price') then
        v_cols := v_cols || ', sale_price'; v_vals := v_vals || ', 499';
      end if;
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='is_active') then
        v_cols := v_cols || ', is_active'; v_vals := v_vals || ', true';
      end if;
      execute 'insert into public.services (' || v_cols || ') select ' || v_vals ||
        ' where not exists (select 1 from public.services where slug = ''itr-filing'')';
    end if;
  end if;

  -- agent_services: update fee if present; insert only if missing
  if to_regclass('public.agent_services') is null then return; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='slug') then return; end if;

  select id into v_service_id from public.services where slug = 'itr-filing' limit 1;

  if exists (select 1 from public.agent_services where slug = 'itr-filing') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='customer_fee') then
      execute $u$
        update public.agent_services
        set customer_fee = case when coalesce(customer_fee, 0) = 0 then 499 else customer_fee end
        where slug = 'itr-filing'
      $u$;
    end if;
  else
    v_cols := 'slug';
    v_vals := quote_literal('itr-filing');
    v_set := '';
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='service_id') then
      v_cols := v_cols || ', service_id';
      v_vals := v_vals || ', ' || coalesce(quote_literal(v_service_id::text) || '::uuid', 'null');
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='title') then
      v_cols := v_cols || ', title'; v_vals := v_vals || ', ' || quote_literal('ITR Filing');
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='description') then
      v_cols := v_cols || ', description';
      v_vals := v_vals || ', ' || quote_literal('Expert-assisted Income Tax Return filing. Starting from ₹499.');
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='category') then
      v_cols := v_cols || ', category'; v_vals := v_vals || ', ' || quote_literal('Tax & GST');
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='customer_fee') then
      v_cols := v_cols || ', customer_fee'; v_vals := v_vals || ', 499';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='agent_payout') then
      v_cols := v_cols || ', agent_payout'; v_vals := v_vals || ', 100';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='payout_type') then
      v_cols := v_cols || ', payout_type'; v_vals := v_vals || ', ' || quote_literal('fixed');
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='is_active') then
      v_cols := v_cols || ', is_active'; v_vals := v_vals || ', true';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_services' and column_name='visibility_type') then
      v_cols := v_cols || ', visibility_type'; v_vals := v_vals || ', ' || quote_literal('all');
    end if;
    execute 'insert into public.agent_services (' || v_cols || ') select ' || v_vals ||
      ' where not exists (select 1 from public.agent_services where slug = ''itr-filing'')';
  end if;
end;
$$;
