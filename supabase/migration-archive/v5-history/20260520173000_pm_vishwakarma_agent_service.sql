insert into public.agent_services (
  service_id,
  slug,
  title,
  description,
  category,
  customer_fee,
  agent_payout,
  payout_type,
  payout_percentage,
  required_documents,
  processing_time,
  instructions,
  is_active,
  is_featured,
  visibility_type,
  sort_order,
  updated_at
)
values (
  (select id from public.service_catalog where slug = 'pm-vishwakarma-yojana' limit 1),
  'pm-vishwakarma-yojana',
  'PM Vishwakarma Yojana Registration',
  'Register eligible traditional artisans for PM Vishwakarma Yojana with complete document and application support.',
  'Government Scheme',
  250,
  175,
  'fixed',
  0,
  'Aadhaar Card
PAN Card
Mobile Number
Passport Size Photo
Bank Passbook
Address Proof
Profession Details
Caste Certificate if required
Income Proof if required',
  '7-30 Days',
  'Verify eligibility, collect accurate PM Vishwakarma details, upload documents, and submit only after customer confirmation.',
  true,
  true,
  'all',
  10,
  now()
)
on conflict (slug) do update set
  service_id = coalesce(public.agent_services.service_id, excluded.service_id),
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  customer_fee = excluded.customer_fee,
  agent_payout = excluded.agent_payout,
  payout_type = excluded.payout_type,
  payout_percentage = excluded.payout_percentage,
  required_documents = excluded.required_documents,
  processing_time = excluded.processing_time,
  instructions = excluded.instructions,
  is_active = true,
  is_featured = public.agent_services.is_featured,
  visibility_type = 'all',
  updated_at = now();
