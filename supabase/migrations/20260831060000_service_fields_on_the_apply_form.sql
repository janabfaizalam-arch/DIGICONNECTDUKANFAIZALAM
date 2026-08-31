-- Extra questions on the application form, per service.
--
-- Every service is filed through one flow now. That flow asks the six things
-- common to all of them — name, mobile, pincode, the city/district/state the
-- pincode resolves to, and the address — plus three optional documents.
--
-- Anything a particular service needs beyond that already had a home:
-- `service_fields`, edited from the Fields tab of the admin service editor.
-- It was never wired to the customer-facing form, so the questions were
-- configurable and invisible. This connects them, and adds the three things
-- the table was missing before a configured field could stand in for a coded
-- one.

alter table public.service_fields
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists placeholder text,
  add column if not exists help_text text;

comment on column public.service_fields.options is
  'Choices for a dropdown or radio field. Ignored by every other field type.';
comment on column public.service_fields.placeholder is
  'Ghost text inside the input.';
comment on column public.service_fields.help_text is
  'One line under the input, for what the label cannot carry.';

-- ---------------------------------------------------------------------------
-- Seed the two services that had a form of their own.
--
-- The Detailed Project Report and ITR filing each carried a bespoke multi-step
-- wizard. Those are retired; their questions move here so the shared flow asks
-- them and nothing a customer used to be asked is lost.
--
-- Fields the base form already collects — name, mobile, pincode, address —
-- are deliberately not repeated. `on conflict do nothing` so re-running the
-- migration never overwrites what an administrator has since edited.
-- ---------------------------------------------------------------------------

insert into public.service_fields
  (service_id, field_key, label, field_type, sort_order, validation_chains, options, placeholder, help_text)
select
  s.id, f.field_key, f.label, f.field_type, f.sort_order,
  f.validation_chains::jsonb, f.options::jsonb, f.placeholder, f.help_text
from public.services s
cross join (values
  ('business_name',    'Business or unit name',        'text',     10, '[{"rule":"required"}]', '[]', 'As it will appear on the report', null),
  ('business_type',    'Constitution',                 'dropdown', 20, '[{"rule":"required"}]',
     '["Proprietorship","Partnership","LLP","Private Limited","Society or Trust","Not registered yet"]', null, null),
  ('business_address', 'Business address',             'address',  30, '[]', '[]', null, 'Leave blank if it is the same as the address above.'),
  ('scheme',           'Scheme you are applying under','dropdown', 40, '[{"rule":"required"}]',
     '["PMEGP","Mudra","CM YUVA","PM Vishwakarma","State MSME scheme","Bank or NBFC proposal","Not decided yet"]', null, null),
  ('project_cost',     'Total project cost (INR)',     'number',   50, '[{"rule":"required"}]', '[]', null, 'Land, building, machinery and working capital together.'),
  ('own_contribution', 'Your own contribution (INR)',  'number',   60, '[]', '[]', null, null),
  ('loan_amount',      'Loan amount you need (INR)',   'number',   70, '[{"rule":"required"}]', '[]', null, null),
  ('annual_sales',     'Expected annual sales (INR)',  'number',   80, '[]', '[]', null, null),
  ('annual_profit',    'Expected annual profit (INR)', 'number',   90, '[]', '[]', null, null),
  ('tenure_years',     'Repayment tenure (years)',     'number',  100, '[]', '[]', null, null),
  ('machinery',        'Machinery and equipment',      'address', 110, '[]', '[]', null, 'One item per line, with quantity and approximate cost.'),
  ('gstin',            'GSTIN',                        'gstin',   120, '[]', '[]', 'If registered', null),
  ('udyam',            'Udyam or MSME number',         'text',    130, '[]', '[]', 'If registered', null)
) as f(field_key, label, field_type, sort_order, validation_chains, options, placeholder, help_text)
where s.slug = 'detailed-project-report'
on conflict (service_id, field_key) do nothing;

insert into public.service_fields
  (service_id, field_key, label, field_type, sort_order, validation_chains, options, placeholder, help_text)
select
  s.id, f.field_key, f.label, f.field_type, f.sort_order,
  f.validation_chains::jsonb, f.options::jsonb, f.placeholder, f.help_text
from public.services s
cross join (values
  ('assessment_year',  'Assessment year',            'dropdown', 10, '[{"rule":"required"}]', '["2026-27","2025-26","2024-25"]', null, null),
  ('pan',              'PAN',                        'pan',      20, '[{"rule":"required"}]', '[]', 'ABCDE1234F', null),
  ('aadhaar',          'Aadhaar number',             'aadhaar',  30, '[]', '[]', '12 digits', null),
  ('date_of_birth',    'Date of birth',              'date',     40, '[]', '[]', null, null),
  ('applicant_type',   'Who is filing',              'dropdown', 50, '[{"rule":"required"}]',
     '["Salaried individual","Business or profession","Freelancer or consultant","Pensioner","Student or no income","HUF"]', null, null),
  ('income_sources',   'Sources of income',          'address',  60, '[{"rule":"required"}]', '[]', null,
     'Salary, business, house property, capital gains, interest - list whatever applies.'),
  ('tax_regime',       'Tax regime',                 'dropdown', 70, '[]', '["New regime","Old regime","Whichever saves more"]', null, null),
  ('previous_return',  'Filed a return last year?',  'dropdown', 80, '[]', '["Yes","No","Not sure"]', null, null),
  ('bank_account',     'Bank account number',        'text',     90, '[]', '[]', null, 'For the refund, if any is due.'),
  ('ifsc',             'IFSC code',                  'text',    100, '[]', '[]', 'SBIN0001234', null),
  ('bank_name',        'Bank name',                  'text',    110, '[]', '[]', null, null)
) as f(field_key, label, field_type, sort_order, validation_chains, options, placeholder, help_text)
where s.slug in ('itr-filing', 'income-tax-return-filing')
on conflict (service_id, field_key) do nothing;
