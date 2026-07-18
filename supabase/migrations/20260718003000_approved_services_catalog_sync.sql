-- Upsert approved DigiConnect Dukan services missing after v2 purge.
-- Does not delete existing rows. CSC Olympiad and PAN Card intentionally omitted.

CREATE TEMP TABLE IF NOT EXISTS _approved_services (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  commission_amount numeric(10, 2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'General'
) ON COMMIT DROP;

TRUNCATE _approved_services;

INSERT INTO _approved_services (slug, name, description, amount, commission_amount, category) VALUES
  ('gst-registration', 'GST Registration', 'GST registration assistance for businesses and e-commerce sellers.', 999, 400, 'TAX'),
  ('itr-filing', 'ITR Filing', 'Income tax return filing assistance for salaried and business customers.', 499, 200, 'TAX'),
  ('msme-certificate', 'MSME Certificate', 'Udyam / MSME registration certificate assistance.', 499, 200, 'Business'),
  ('food-license', 'Food License', 'FSSAI registration and food licence assistance.', 999, 400, 'Business'),
  ('food-licence', 'Food Licence', 'FSSAI registration and food licence assistance.', 999, 400, 'Business'),
  ('driving-licence', 'Driving Licence', 'Learning and permanent driving licence assistance.', 999, 600, 'Government IDs'),
  ('learning-driving-licence', 'Learning Driving Licence', 'Learner driving licence application assistance.', 999, 600, 'Government IDs'),
  ('passport', 'Passport', 'Fresh passport, re-issue, and correction assistance.', 1999, 500, 'Government IDs'),
  ('voter-id', 'Voter ID', 'Voter ID registration and correction assistance.', 299, 100, 'Government IDs'),
  ('voter-card', 'Voter Card', 'Voter ID registration and correction assistance.', 299, 100, 'Government IDs'),
  ('labour-card', 'Labour Card', 'Labour card registration assistance.', 399, 150, 'Government IDs'),
  ('eshram-card', 'e-Shram Card Registration', 'e-Shram card registration assistance.', 199, 80, 'Government IDs'),
  ('pvc-card', 'PVC Card Printing', 'PVC printing for Aadhaar, voter, and other cards.', 99, 40, 'Printing'),
  ('credit-cards-all-banks', 'Credit Cards – All Banks', 'Assistance applying for credit cards across major banks.', 499, 200, 'Finance'),
  ('cibil-credit-health', 'CIBIL Report Analysis and Credit Health Consultation', 'Credit report analysis and credit health consultation.', 499, 200, 'Finance'),
  ('pm-vishwakarma', 'PM Vishwakarma Yojana', 'PM Vishwakarma Yojana application assistance.', 999, 400, 'Finance'),
  ('cm-yuva-loan', 'CM YUVA Entrepreneur Loan Assistance', 'CM YUVA entrepreneur loan file assistance.', 1999, 600, 'Finance'),
  ('vehicle-insurance', 'Vehicle Insurance', 'Two-wheeler and four-wheeler insurance assistance.', 499, 150, 'Insurance'),
  ('government-subsidy-loans', 'Government Subsidy Loans', 'Guidance for government subsidy-linked loan schemes.', 1499, 500, 'Finance'),
  ('caste-certificate', 'Caste Certificate', 'Caste certificate application assistance.', 399, 150, 'Certificates'),
  ('domicile-certificate', 'Domicile Certificate', 'Domicile certificate application assistance.', 399, 150, 'Certificates'),
  ('income-certificate', 'Income Certificate', 'Income certificate application assistance.', 399, 150, 'Certificates'),
  ('dsc', 'DSC', 'Digital Signature Certificate assistance.', 1499, 400, 'Business'),
  ('dpr-report', 'DPR Project Report', 'Detailed project report preparation for loans and schemes.', 4999, 1500, 'Business'),
  ('account-opening', 'Saving/Current Account Opening', 'Assistance opening savings or current bank accounts.', 299, 100, 'Finance'),
  ('startup-india', 'Startup India Assistance', 'Startup India registration and compliance assistance.', 1999, 600, 'Business');

-- public.services (canonical public CMS table)
INSERT INTO public.services (slug, name, description, amount, active, created_at)
SELECT s.slug, s.name, s.description, s.amount, true, now()
FROM _approved_services s
WHERE to_regclass('public.services') IS NOT NULL
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  active = true;

-- public.service_catalog (CRM pricing / commission catalog)
INSERT INTO public.service_catalog (
  slug, name, description, amount, commission_amount, required_documents, active, updated_at
)
SELECT
  s.slug,
  s.name,
  s.description,
  s.amount,
  s.commission_amount,
  '{}'::text[],
  true,
  now()
FROM _approved_services s
WHERE to_regclass('public.service_catalog') IS NOT NULL
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  commission_amount = EXCLUDED.commission_amount,
  active = true,
  updated_at = now();

-- agent_services when present (AP service catalog)
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage,
  processing_time, is_active, sort_order, required_documents
)
SELECT
  s.slug,
  s.name,
  s.category,
  s.amount,
  s.commission_amount,
  'fixed',
  0,
  '3 Days',
  true,
  500,
  ''
FROM _approved_services s
WHERE to_regclass('public.agent_services') IS NOT NULL
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  customer_fee = EXCLUDED.customer_fee,
  agent_payout = EXCLUDED.agent_payout,
  is_active = true;
