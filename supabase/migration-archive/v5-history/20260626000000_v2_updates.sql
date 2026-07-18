-- Migration: V2 Updates for Agent Services
-- Adds new columns for Government Fee, Processing Fee, Eligibility, FAQ, Terms, Important Notes, Popular, Thumbnail, Banner, Area Restrictions, Variants, and Required Documents list.
-- Purges old services and seeds V2 Services Catalog.

-- 1. Alter public.agent_services table to add custom fields
ALTER TABLE public.agent_services 
  ADD COLUMN IF NOT EXISTS government_fee_type text DEFAULT 'not_applicable' CHECK (government_fee_type IN ('included', 'extra', 'not_applicable')),
  ADD COLUMN IF NOT EXISTS government_fee_amount numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eligibility text DEFAULT '',
  ADD COLUMN IF NOT EXISTS faq jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS terms text DEFAULT '',
  ADD COLUMN IF NOT EXISTS important_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS thumbnail text DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supported_states text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS supported_districts text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS supported_pincodes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_documents_list jsonb DEFAULT '[]'::jsonb;

-- 2. Clear old data from services tables
TRUNCATE TABLE public.agent_service_assignments CASCADE;
TRUNCATE TABLE public.service_audit_logs CASCADE;
DELETE FROM public.agent_services;
DELETE FROM public.services;
DELETE FROM public.service_catalog;

-- 3. Seed services
-- Seed GST Registration
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'gst-registration', 'GST Registration', 'TAX', 999.00, 400.00, 'fixed', 0,
  '3 Days', 'not_applicable', 0, 0,
  'Any business entity, proprietor, partnership, or company having turnover exceeding Rs. 20/40 Lakhs, or making inter-state supplies.',
  '[{"question": "Is GST registration mandatory for online sellers?", "answer": "Yes, anyone selling goods or services via e-commerce portals must obtain GST registration regardless of turnover."}]'::jsonb,
  'Registration documents must be correct and true. Any mismatch may delay the application.',
  'Proprietor Aadhaar must be linked to a working mobile number for OTP verification.',
  true, 10,
  'Aadhaar Card, PAN Card, Electricity Bill, Passport Photo, Bank Statement',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"PAN Card","type":"Image","required":true},{"id":"doc-3","name":"Electricity Bill","type":"PDF","required":true},{"id":"doc-4","name":"Passport Photo","type":"Image","required":true},{"id":"doc-5","name":"Bank Statement","type":"PDF","required":false}]'::jsonb,
  '[]'::jsonb
);

-- Seed ITR Original
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'itr-original', 'ITR Original', 'TAX', 499.00, 200.00, 'fixed', 0,
  '24 Hours', 'not_applicable', 0, 0,
  'Individuals, Salaried Employees, Business Proprietors, and Professionals wishing to file their income tax return for the current assessment year.',
  '[{"question": "What is the penalty for late filing?", "answer": "Filing after due date attracts a late fee under Section 234F ranging from Rs 1,000 to Rs 5,000."}]'::jsonb,
  'All income and deductions details must be verified by the customer.',
  'Form 26AS and AIS should be checked for exact TDS verification.',
  true, 20,
  'Aadhaar Card, PAN Card, Form 16, Bank Statement',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"PAN Card","type":"Image","required":true},{"id":"doc-3","name":"Form 16","type":"PDF","required":false},{"id":"doc-4","name":"Bank Statement","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed ITR-U
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'itr-u', 'ITR-U', 'TAX', 1499.00, 500.00, 'fixed', 0,
  '48 Hours', 'not_applicable', 0, 0,
  'Taxpayers who need to update their income tax returns for the previous 2 assessment years to correct errors or report additional income.',
  '[{"question": "Can I claim a refund in ITR-U?", "answer": "No, ITR-U cannot be filed to claim a refund or increase a refund amount."}]'::jsonb,
  'Updated return is subject to additional tax of 25% or 50% on tax liability.',
  'Only available for reporting additional income or correcting positive tax returns.',
  false, 30,
  'Aadhaar Card, PAN Card, Bank Statement, Previous ITR Acknowledgement',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"PAN Card","type":"Image","required":true},{"id":"doc-3","name":"Bank Statement","type":"PDF","required":true},{"id":"doc-4","name":"Previous ITR Ack","type":"PDF","required":false}]'::jsonb,
  '[]'::jsonb
);

-- Seed Driving Licence (with variants)
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'driving-licence', 'Driving Licence', 'Driving Licence', 999.00, 600.00, 'fixed', 0,
  '3 Days', 'extra', 350.00, 0,
  'Applicants aged 18 or above (16 for gearless under 50cc) who want to apply for a Learning or permanent Light Motor Vehicle (LMV) licence.',
  '[{"question": "Is physical visit required?", "answer": "Yes, for the final driving test or learning exam biometric verify, a physical visit to the RTO office is mandatory."}]'::jsonb,
  'Availability for Light DL is strictly restricted to Jalaun district residents.',
  'Please check customer address details and PIN code carefully before choosing Light Driving Licence variant.',
  true, 40,
  'Aadhaar Card, Passport Photo, Age Proof, Learner Licence copy',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"Passport Photo","type":"Image","required":true},{"id":"doc-3","name":"Age Proof","type":"PDF","required":true},{"id":"doc-4","name":"Learner Licence copy","type":"PDF","required":false}]'::jsonb,
  '[
    {
      "id": "variant-learning",
      "name": "Learning Driving Licence",
      "price": 999,
      "score": 600,
      "processing_time": "3 Days",
      "government_fee": "Extra (Approx Rs. 350)",
      "required_documents": [
        {"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},
        {"id":"doc-2","name":"Passport Photo","type":"Image","required":true},
        {"id":"doc-3","name":"Age Proof","type":"PDF","required":true}
      ],
      "restrictions": {
        "type": "india",
        "states": [],
        "districts": [],
        "cities": [],
        "pincodes": []
      }
    },
    {
      "id": "variant-light",
      "name": "Light Driving Licence",
      "price": 3999,
      "score": 500,
      "processing_time": "7 Days",
      "government_fee": "Included",
      "required_documents": [
        {"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},
        {"id":"doc-2","name":"Passport Photo","type":"Image","required":true},
        {"id":"doc-4","name":"Learner Licence copy","type":"PDF","required":true}
      ],
      "restrictions": {
        "type": "pincodes",
        "states": ["Uttar Pradesh"],
        "districts": ["Jalaun"],
        "cities": [],
        "pincodes": ["285001"]
      }
    }
  ]'::jsonb
);

-- Seed MSME Certificate
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'msme-certificate', 'MSME Certificate', 'Business', 499.00, 200.00, 'fixed', 0,
  'Same Day', 'included', 0, 0,
  'Micro, Small, and Medium business enterprises seeking Udyam registration certificates.',
  '[{"question": "What is Udyam registration?", "answer": "It is the official online portal for registering MSMEs under the Government of India."}]'::jsonb,
  'Business details must be accurate as per registration forms.',
  'Aadhaar OTP from the business owner is required to submit the application.',
  false, 50,
  'Aadhaar Card, PAN Card, Bank Details',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"PAN Card","type":"Image","required":true},{"id":"doc-3","name":"Bank Details","type":"Text","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed Food Licence
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'food-licence', 'Food Licence', 'Business', 999.00, 400.00, 'fixed', 0,
  '3 Days', 'included', 0, 0,
  'Food business operators (FBOs), small vendors, restaurants, wholesalers, and manufacturers.',
  '[{"question": "How long is the licence valid?", "answer": "FSSAI registration / license can be issued for 1 to 5 years depending on fee chosen."}]'::jsonb,
  'Owner details must match Aadhaar card information.',
  'Premises address proof must be clear and legible.',
  true, 60,
  'Passport Photo, Aadhaar Card, Electricity Bill',
  '[{"id":"doc-1","name":"Passport Photo","type":"Image","required":true},{"id":"doc-2","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-3","name":"Electricity Bill","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed DPR Report
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'dpr-report', 'DPR Report', 'Business', 4999.00, 1500.00, 'fixed', 0,
  '7 Days', 'not_applicable', 0, 0,
  'Entrepreneurs, small firms, and individuals applying for bank loans under government schemes needing a Detailed Project Report.',
  '[{"question": "What is a DPR?", "answer": "Detailed Project Report is a project feasibility plan containing financial tables and projections."}]'::jsonb,
  'Required details about business machinery, raw material and expenses must be furnished.',
  'Financial projections are drafted by expert consultants.',
  false, 70,
  'Project details, Aadhaar Card, PAN Card',
  '[{"id":"doc-1","name":"Project details","type":"Text","required":true},{"id":"doc-2","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-3","name":"PAN Card","type":"Image","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed Passport
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'passport', 'Passport', 'Government IDs', 1999.00, 500.00, 'fixed', 0,
  '3 Days', 'extra', 1500.00, 0,
  'Indian citizens seeking fresh passport, re-issue, or correction under normal or tatkaal services.',
  '[{"question": "What is the official passport office fee?", "answer": "The official fee is Rs. 1500 for normal 36 pages booklet, payable directly at time of appointment."}]'::jsonb,
  'Applicants must physically visit the PSK office on scheduled appointment date for biometric checking.',
  'Aadhaar name must match educational qualifications exactly.',
  true, 80,
  'Aadhaar Card, Address Proof, Class 10 Certificate',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"Address Proof","type":"PDF","required":true},{"id":"doc-3","name":"Class 10 Certificate","type":"PDF","required":false}]'::jsonb,
  '[]'::jsonb
);

-- Seed Aadhaar HOF Update
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'aadhaar-hof-update', 'Aadhaar HOF Update', 'Government IDs', 299.00, 100.00, 'fixed', 0,
  '48 Hours', 'included', 0, 0,
  'Citizens who do not have document proofs in their own name and wish to update address using Head of Family details.',
  '[{"question": "Who can be Head of Family?", "answer": "Father, Mother, Spouse, or any adult family member who can provide relationship proof and consent."}]'::jsonb,
  'HOF mobile number must be linked with Aadhaar to approve the online request.',
  'HOF must verify consent request inside myAadhaar portal within 30 days of submission.',
  false, 90,
  'Aadhaar of HOF, Relationship Document, HOF Consent Form',
  '[{"id":"doc-1","name":"Aadhaar of HOF","type":"Image","required":true},{"id":"doc-2","name":"Relationship Document","type":"PDF","required":true},{"id":"doc-3","name":"HOF Consent Form","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed Aadhaar Address Update (With Documents)
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'aadhaar-address-update-with-docs', 'Aadhaar Address Update (With Documents)', 'Government IDs', 399.00, 150.00, 'fixed', 0,
  '24 Hours', 'included', 0, 0,
  'Aadhaar cardholders wanting to update address online having valid relationship/address proofs.',
  '[{"question": "What is valid address proof?", "answer": "Voter ID, Electricity bill, Bank passbook, Rent agreement, Water bill."}]'::jsonb,
  'Customer mobile number must be registered with Aadhaar.',
  'Documents must have the exact matching name as present in the Aadhaar card.',
  true, 100,
  'Aadhaar Card, Valid Address Proof',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"Valid Address Proof","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed Aadhaar Address Update (Without Documents)
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'aadhaar-address-update-without-docs', 'Aadhaar Address Update (Without Documents)', 'Government IDs', 499.00, 200.00, 'fixed', 0,
  '48 Hours', 'included', 0, 0,
  'Aadhaar holders without valid address proofs wishing to update address via validation letter.',
  '[{"question": "What is validation letter?", "answer": "A validation letter contains a secret code sent to address-verifier address which is then used online."}]'::jsonb,
  'Verifier consent and active verifier mobile number is required.',
  'Secret verification code is sent by post to the verifiers address.',
  false, 110,
  'Aadhaar Card, Address Validation Letter',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"Address Validation Letter","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed Voter Card
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'voter-card', 'Voter Card', 'Government IDs', 199.00, 80.00, 'fixed', 0,
  '7 Days', 'included', 0, 0,
  'Indian citizens aged 18 or above wanting to register as new voters or modify voter ID details.',
  '[{"question": "Is new voter registration free?", "answer": "Yes, registration is free; fee is charged for service facilitation and data submission."}]'::jsonb,
  'Applicants must verify their residence address as per local voter lists.',
  'Correct details ensure faster processing by the block officers (BLO).',
  false, 120,
  'Passport Photo, Aadhaar Card, Address Proof',
  '[{"id":"doc-1","name":"Passport Photo","type":"Image","required":true},{"id":"doc-2","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-3","name":"Address Proof","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed eShram Card
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'eshram-card', 'eShram Card', 'Government Schemes', 149.00, 50.00, 'fixed', 0,
  'Same Day', 'included', 0, 0,
  'Unorganized workers (e.g. laborers, agricultural workers, domestic help) aged 16-59.',
  '[{"question": "What is eShram?", "answer": "A national database created by the Ministry of Labour and Employment to provide security benefits to unorganized sectors."}]'::jsonb,
  'Must not be an income tax payer, nor a member of EPFO/ESIC.',
  'Artisans, drivers, and daily wage earners are highly encouraged to apply.',
  true, 130,
  'Aadhaar Card, Bank Passbook, Mobile linked with Aadhaar',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"Bank Passbook","type":"Image","required":true},{"id":"doc-3","name":"Mobile linked with Aadhaar","type":"Text","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed Labour Card
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'labour-card', 'Labour Card', 'Government Schemes', 299.00, 100.00, 'fixed', 0,
  '3 Days', 'included', 0, 0,
  'Construction workers and manual labourers seeking registration with the state building board for welfare schemes.',
  '[{"question": "What benefits does it offer?", "answer": "Financial aid for children education, marriage assistances, and medical insurances."}]'::jsonb,
  'Applicant must have worked for at least 90 days in construction work in the last 12 months.',
  'Employment certification form is mandatory for submission.',
  false, 140,
  'Aadhaar Card, Bank Passbook, Passport Photo, Employment Certificate',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"Bank Passbook","type":"Image","required":true},{"id":"doc-3","name":"Passport Photo","type":"Image","required":true},{"id":"doc-4","name":"Employment Certificate","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed CM YUVA Loan Complete File
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'cm-yuva-loan', 'CM YUVA Loan Complete File', 'Finance', 9999.00, 3000.00, 'fixed', 0,
  '7 Days', 'not_applicable', 0, 0,
  'Young entrepreneurs of Uttar Pradesh aged 18 to 40 with educational qualification at least class 10/12/ITI.',
  '[{"question": "What is the maximum loan limit?", "answer": "Up to Rs. 5 Lakhs for service/retail sector and Rs. 10 Lakhs for manufacturing units."}]'::jsonb,
  'Must be a permanent resident of UP and not have defaulted on other loans.',
  'Complete file includes project reports, application sheets, and affidavits.',
  true, 150,
  'Project Report, Educational Certificate, Aadhaar Card, PAN Card',
  '[{"id":"doc-1","name":"Project Report","type":"PDF","required":true},{"id":"doc-2","name":"Educational Certificate","type":"PDF","required":true},{"id":"doc-3","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-4","name":"PAN Card","type":"Image","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed MYSY Loan
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'mysy-loan', 'MYSY Loan', 'Finance', 4999.00, 1500.00, 'fixed', 0,
  '7 Days', 'not_applicable', 0, 0,
  'Young entrepreneurs looking for loans under the Mukhyamantri Yuva Swarozgar Yojana (MYSY) UP.',
  '[{"question": "What is the subsidy rate?", "answer": "MYSY offers a capital subsidy up to 25% for service and industry business setups."}]'::jsonb,
  'UP Resident, age 18 to 40 years, qualification minimum 8th class pass.',
  'Business plan and project cost summary are prepared professionally.',
  false, 160,
  'Aadhaar Card, Cast Certificate, Income Certificate, Project Report',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"Cast Certificate","type":"PDF","required":false},{"id":"doc-3","name":"Income Certificate","type":"PDF","required":true},{"id":"doc-4","name":"Project Report","type":"PDF","required":false}]'::jsonb,
  '[]'::jsonb
);

-- Seed PMEGP Loan
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'pmegp-loan', 'PMEGP Loan', 'Finance', 4999.00, 1500.00, 'fixed', 0,
  '7 Days', 'not_applicable', 0, 0,
  'Entrepreneurs setting up new micro-enterprises in manufacturing or service sectors under the Prime Ministers Employment Generation Programme.',
  '[{"question": "What is the subsidy in PMEGP?", "answer": "Subsidy ranges from 15% to 35% of project cost based on location (urban/rural) and category."}]'::jsonb,
  'Any individual above 18 years. At least 8th standard pass for projects costing above Rs. 10 Lakhs in manufacturing.',
  'The loan is sponsored by KVIC, KVIB and DIC.',
  true, 170,
  'Aadhaar Card, PAN Card, Project Report, Educational Certificate',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"PAN Card","type":"Image","required":true},{"id":"doc-3","name":"Project Report","type":"PDF","required":true},{"id":"doc-4","name":"Educational Certificate","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed Mudra Loan
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'mudra-loan', 'Mudra Loan', 'Finance', 1999.00, 600.00, 'fixed', 0,
  '3 Days', 'not_applicable', 0, 0,
  'Small retailers, manufacturers, traders, and shopkeepers seeking Mudra loans up to 10 Lakhs (Shishu, Kishore, Tarun categories).',
  '[{"question": "What are the Mudra categories?", "answer": "Shishu (up to Rs. 50,000), Kishore (Rs. 50,000 to Rs. 5 Lakhs), Tarun (Rs. 5 Lakhs to Rs. 10 Lakhs)."}]'::jsonb,
  'Proprietorship, partnerships, or small retail firms operating in trading or manufacturing.',
  'Collateral security is not required for Mudra loan schemes.',
  false, 180,
  'Aadhaar Card, PAN Card, Business Proof, Bank Statement',
  '[{"id":"doc-1","name":"Aadhaar Card","type":"Image","required":true},{"id":"doc-2","name":"PAN Card","type":"Image","required":true},{"id":"doc-3","name":"Business Proof","type":"Image","required":true},{"id":"doc-4","name":"Bank Statement","type":"PDF","required":true}]'::jsonb,
  '[]'::jsonb
);

-- Seed PVC Card
INSERT INTO public.agent_services (
  slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, 
  processing_time, government_fee_type, government_fee_amount, processing_fee, 
  eligibility, faq, terms, important_notes, popular, sort_order, required_documents, 
  required_documents_list, variants
) VALUES (
  'pvc-card', 'PVC Card', 'Printing', 99.00, 40.00, 'fixed', 0,
  'Same Day', 'included', 0, 0,
  'Any citizen wanting high quality plastic PVC print for Aadhaar Card, Voter Card, Health Card, PAN Card or eShram Card.',
  '[{"question": "How durable is the card?", "answer": "It is made of standard smart card grade plastic, fully waterproof and smudge-proof."}]'::jsonb,
  'Digital PDF/Image of the card must be uploaded for printing.',
  'Doorstep home delivery is done across the PIN codes.',
  true, 190,
  'Document file for print, Mobile Number',
  '[{"id":"doc-1","name":"Document file for print","type":"PDF","required":true},{"id":"doc-2","name":"Mobile Number","type":"Text","required":true}]'::jsonb,
  '[]'::jsonb
);

-- 4. Sync seeded services with public.service_catalog and public.services for system compatibility
INSERT INTO public.service_catalog (
  slug, name, description, amount, commission_amount, commission_rate, required_documents, active, created_at, updated_at
)
SELECT 
  slug, title, description, customer_fee, agent_payout, 
  CASE WHEN payout_type = 'percentage' THEN payout_percentage ELSE NULL END,
  string_to_array(required_documents, ', '), is_active, created_at, updated_at
FROM public.agent_services
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  commission_amount = EXCLUDED.commission_amount,
  commission_rate = EXCLUDED.commission_rate,
  required_documents = EXCLUDED.required_documents,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.services (
  slug, name, description, amount, active, created_at
)
SELECT 
  slug, title, description, customer_fee, is_active, created_at
FROM public.agent_services
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  active = EXCLUDED.active;
