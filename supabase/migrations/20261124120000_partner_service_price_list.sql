-- Partner service price list (Nov 2026).
--
-- agent_services is the catalog DC Partners buy from: customer_fee is what the
-- partner pays. Every service below is set to the new price with no payout
-- (agent_payout = 0), so the partner pays exactly the listed figure.
--
-- Existing rows are updated by slug; services that did not exist are created.
-- "WD" = without documents.
--
-- Public pricing is not touched: the public DPR page charges
-- 'detailed-project-report' (₹399), so the partner DPR price goes on the
-- partner-only 'dpr-report' row instead.

insert into public.agent_services
  (slug, title, category, customer_fee, agent_payout, payout_type, payout_percentage, is_active, visibility_type, sort_order)
values
  ('aadhaar-address-update-with-docs',    'Aadhaar Address Change',               'Government IDs',     90,   0, 'fixed', 0, true, 'all', 10),
  ('aadhaar-address-update-without-docs', 'Aadhaar Address Change WD',            'Government IDs',     100,  0, 'fixed', 0, true, 'all', 11),
  ('aadhaar-hof-update',                  'Aadhaar HOF Update',                   'Government IDs',     90,   0, 'fixed', 0, true, 'all', 12),
  ('pan-card-new',                        'PAN Card New',                         'Government IDs',     120,  0, 'fixed', 0, true, 'all', 20),
  ('pan-card-new-wd',                     'PAN Card New WD',                      'Government IDs',     150,  0, 'fixed', 0, true, 'all', 21),
  ('pan-card-correction',                 'PAN Card Correction',                  'Government IDs',     120,  0, 'fixed', 0, true, 'all', 22),
  ('pan-card-correction-wd',              'PAN Card Correction WD',               'Government IDs',     150,  0, 'fixed', 0, true, 'all', 23),
  ('voter-card',                          'Voter Card',                           'Government IDs',     20,   0, 'fixed', 0, true, 'all', 30),
  ('voter-card-correction',               'Voter Card Correction',                'Government IDs',     30,   0, 'fixed', 0, true, 'all', 31),
  ('learning-driving-licence',            'Learning Driving Licence',             'Driving Licence',    500,  0, 'fixed', 0, true, 'all', 40),
  ('passport',                            'Passport',                             'Government IDs',     2550, 0, 'fixed', 0, true, 'all', 50),
  ('passport-reissue',                    'Passport Reissue',                     'Government IDs',     2550, 0, 'fixed', 0, true, 'all', 51),
  ('labour-card',                         'Labour Card',                          'Government Schemes', 100,  0, 'fixed', 0, true, 'all', 60),
  ('eshram-card',                         'E Shram Card',                         'Government Schemes', 30,   0, 'fixed', 0, true, 'all', 61),
  ('abha-card',                           'ABHA Card',                            'Government Schemes', 30,   0, 'fixed', 0, true, 'all', 62),
  ('ration-card',                         'Ration Card',                          'Government Schemes', 80,   0, 'fixed', 0, true, 'all', 63),
  ('ration-card-add-delete-unit',         'Ration Card Add/Delete Unit',          'Government Schemes', 60,   0, 'fixed', 0, true, 'all', 64),
  ('pvc-card',                            'PVC Card Print',                       'Printing',           40,   0, 'fixed', 0, true, 'all', 70),
  ('family-id',                           'Family ID',                            'Government Schemes', 30,   0, 'fixed', 0, true, 'all', 71),
  ('police-verification',                 'Police Verification',                  'Government IDs',     80,   0, 'fixed', 0, true, 'all', 72),
  ('apaar-id',                            'APAAR ID',                             'Government IDs',     30,   0, 'fixed', 0, true, 'all', 73),
  ('gst-registration',                    'GST Registration Regular',             'TAX',                300,  0, 'fixed', 0, true, 'all', 80),
  ('gst-registration-composition',        'GST Registration Composition',         'TAX',                400,  0, 'fixed', 0, true, 'all', 81),
  ('itr-original',                        'ITR 4 Original',                       'TAX',                75,   0, 'fixed', 0, true, 'all', 82),
  ('itr-3-original',                      'ITR 3 Original',                       'TAX',                100,  0, 'fixed', 0, true, 'all', 83),
  ('itr-1-original',                      'ITR 1 Original',                       'TAX',                100,  0, 'fixed', 0, true, 'all', 84),
  ('dpr-report',                          'DPR',                                  'Business',           300,  0, 'fixed', 0, true, 'all', 90),
  ('balance-sheet',                       'Balance Sheet',                        'Business',           300,  0, 'fixed', 0, true, 'all', 91),
  ('msme-certificate',                    'MSME Certificate',                     'Business',           40,   0, 'fixed', 0, true, 'all', 92),
  ('msme-certificate-changes',            'MSME Certificate Changes',             'Business',           30,   0, 'fixed', 0, true, 'all', 93),
  ('food-licence',                        'Food Licence',                         'Business',           140,  0, 'fixed', 0, true, 'all', 94),
  ('dsc',                                 'DSC (Digital Signature Certificate)',  'Business',           1800, 0, 'fixed', 0, true, 'all', 95),
  ('two-wheeler-tp-insurance',            '2W TP Insurance',                      'Insurance',          750,  0, 'fixed', 0, true, 'all', 100)
on conflict (slug) do update set
  title             = excluded.title,
  category          = excluded.category,
  customer_fee      = excluded.customer_fee,
  agent_payout      = excluded.agent_payout,
  payout_type       = excluded.payout_type,
  payout_percentage = excluded.payout_percentage,
  is_active         = excluded.is_active,
  visibility_type   = excluded.visibility_type,
  sort_order        = excluded.sort_order,
  updated_at        = now();
