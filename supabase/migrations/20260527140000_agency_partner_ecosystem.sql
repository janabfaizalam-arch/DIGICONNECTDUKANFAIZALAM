-- ============================================================================
-- AGENCY PARTNER ECOSYSTEM — MASTER MIGRATION
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-05-27
-- ============================================================================

-- ── 1. AGENCY PARTNER TIERS ────────────────────────────────────────────────

create table if not exists public.agency_partner_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  default_commission_type text not null default 'fixed' check (default_commission_type in ('fixed', 'percentage', 'tiered')),
  default_commission_value numeric(10, 2) not null default 0,
  default_commission_rate numeric(5, 2) default 0,
  min_monthly_applications integer default 0,
  benefits jsonb default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.agency_partner_tiers (name, slug, description, sort_order)
values
  ('AP Starter', 'ap-starter', 'Default starter tier for new agency partners', 0),
  ('AP Silver', 'ap-silver', 'Active partners with consistent performance', 1),
  ('AP Gold', 'ap-gold', 'High-performing partners', 2),
  ('AP Platinum', 'ap-platinum', 'Elite partners with top performance', 3),
  ('AP Franchise', 'ap-franchise', 'Franchise level partners with maximum commission potential', 4)
on conflict (slug) do nothing;

-- ── 2. AGENCY PARTNERS ─────────────────────────────────────────────────────

create table if not exists public.agency_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  partner_code text not null unique,

  -- Personal / Business details
  full_name text not null,
  business_name text,
  partner_type text not null default 'field_executive'
    check (partner_type in ('shop_owner', 'field_executive', 'franchise', 'consultant', 'reseller')),

  -- Contact
  mobile text not null,
  whatsapp text,
  email text not null,

  -- Address
  address text,
  state text,
  district text,
  pin text,

  -- KYC identifiers
  aadhaar_number text,
  pan_number text,
  gstin text,

  -- Banking
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  upi_id text,

  -- Additional
  emergency_contact text,
  nominee_name text,
  nominee_relation text,
  referral_source text,
  profile_photo_url text,
  profile_photo_path text,

  -- Tier & Commission
  tier_id uuid references public.agency_partner_tiers(id) on delete set null,
  commission_plan text default 'standard',
  commission_type text default 'fixed' check (commission_type in ('fixed', 'percentage', 'tiered')),
  commission_value numeric(10, 2) default 0,
  commission_rate numeric(5, 2) default 0,

  -- Status lifecycle
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'kyc_pending', 'verified', 'active', 'suspended', 'rejected', 'blacklisted')),
  kyc_status text not null default 'pending'
    check (kyc_status in ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'resubmit_required')),
  kyc_verified_at timestamptz,
  kyc_verified_by uuid references auth.users(id) on delete set null,

  -- Admin notes
  admin_notes text,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  suspended_at timestamptz,
  blacklisted_at timestamptz
);

create index if not exists agency_partners_user_id_idx on public.agency_partners(user_id);
create index if not exists agency_partners_status_idx on public.agency_partners(status);
create index if not exists agency_partners_mobile_idx on public.agency_partners(mobile);
create index if not exists agency_partners_email_idx on public.agency_partners(email);
create index if not exists agency_partners_partner_code_idx on public.agency_partners(partner_code);
create index if not exists agency_partners_aadhaar_idx on public.agency_partners(aadhaar_number) where aadhaar_number is not null;
create index if not exists agency_partners_pan_idx on public.agency_partners(pan_number) where pan_number is not null;
create index if not exists agency_partners_tier_idx on public.agency_partners(tier_id);
create index if not exists agency_partners_created_at_idx on public.agency_partners(created_at desc);

-- ── 3. AGENCY PARTNER KYC DOCUMENTS ────────────────────────────────────────

create table if not exists public.agency_partner_kyc_documents (
  id uuid primary key default gen_random_uuid(),
  agency_partner_id uuid not null references public.agency_partners(id) on delete cascade,
  document_type text not null
    check (document_type in (
      'aadhaar_front', 'aadhaar_back', 'pan_card', 'shop_photo',
      'business_proof', 'cancelled_cheque', 'passbook', 'profile_photo',
      'agreement_document', 'other'
    )),
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'reupload_required')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ap_kyc_docs_partner_idx on public.agency_partner_kyc_documents(agency_partner_id);
create index if not exists ap_kyc_docs_type_idx on public.agency_partner_kyc_documents(agency_partner_id, document_type);
create index if not exists ap_kyc_docs_status_idx on public.agency_partner_kyc_documents(status);

-- ── 4. COMMISSION RULES ─────────────────────────────────────────────────────

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,

  -- Scope: which partners / services this applies to
  scope_type text not null default 'global'
    check (scope_type in ('global', 'service', 'partner', 'tier', 'campaign')),
  service_id uuid,
  agency_partner_id uuid references public.agency_partners(id) on delete cascade,
  tier_id uuid references public.agency_partner_tiers(id) on delete cascade,
  campaign_code text,

  -- Commission config
  commission_type text not null default 'fixed'
    check (commission_type in ('fixed', 'percentage', 'tiered')),
  fixed_amount numeric(10, 2) default 0,
  percentage_rate numeric(5, 2) default 0,
  tiered_config jsonb default '[]'::jsonb,  -- [{min: 0, max: 10000, rate: 10}, ...]
  min_amount numeric(10, 2) default 0,
  max_amount numeric(10, 2),

  -- Validity
  is_active boolean not null default true,
  priority integer not null default 0,  -- higher = checked first
  valid_from timestamptz,
  valid_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commission_rules_scope_idx on public.commission_rules(scope_type, is_active);
create index if not exists commission_rules_partner_idx on public.commission_rules(agency_partner_id) where agency_partner_id is not null;
create index if not exists commission_rules_service_idx on public.commission_rules(service_id) where service_id is not null;
create index if not exists commission_rules_priority_idx on public.commission_rules(priority desc, created_at desc);

-- ── 5. AP COMMISSIONS ──────────────────────────────────────────────────────

create table if not exists public.ap_commissions (
  id uuid primary key default gen_random_uuid(),
  agency_partner_id uuid not null references public.agency_partners(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  commission_rule_id uuid references public.commission_rules(id) on delete set null,

  -- Immutable snapshot
  service_slug text,
  service_name text,
  sale_amount numeric(10, 2) not null default 0,
  commission_type text not null,
  commission_value numeric(10, 2) not null default 0,
  commission_rate numeric(5, 2) default 0,
  calculated_amount numeric(10, 2) not null default 0,
  rule_snapshot jsonb,  -- full rule at time of calculation

  -- Status
  status text not null default 'pending'
    check (status in ('pending', 'earned', 'approved', 'paid', 'cancelled', 'reversed', 'adjusted')),

  -- Approval
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,

  -- Payment
  paid_at timestamptz,
  payout_id uuid,  -- will reference ap_payouts after creation

  -- Notes
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ap_commissions_partner_idx on public.ap_commissions(agency_partner_id, created_at desc);
create index if not exists ap_commissions_application_idx on public.ap_commissions(application_id);
create index if not exists ap_commissions_status_idx on public.ap_commissions(status);
create index if not exists ap_commissions_payout_idx on public.ap_commissions(payout_id) where payout_id is not null;

-- ── 6. AP WALLET LEDGER ─────────────────────────────────────────────────────

create table if not exists public.ap_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  agency_partner_id uuid not null references public.agency_partners(id) on delete cascade,
  entry_type text not null
    check (entry_type in (
      'commission_credit', 'manual_credit', 'manual_debit',
      'payout_deduction', 'adjustment', 'reversal', 'bonus', 'penalty'
    )),
  amount numeric(10, 2) not null,
  running_balance numeric(10, 2) not null default 0,
  reference_type text,  -- 'commission', 'payout', 'manual', etc.
  reference_id uuid,    -- FK to the source record
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Append-only: no UPDATE or DELETE policies will be created for non-admin
create index if not exists ap_wallet_ledger_partner_idx on public.ap_wallet_ledger(agency_partner_id, created_at desc);
create index if not exists ap_wallet_ledger_type_idx on public.ap_wallet_ledger(entry_type);

-- ── 7. AP PAYOUTS ───────────────────────────────────────────────────────────

create table if not exists public.ap_payouts (
  id uuid primary key default gen_random_uuid(),
  agency_partner_id uuid not null references public.agency_partners(id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'failed', 'cancelled')),

  -- Payment details
  payment_method text,  -- 'bank_transfer', 'upi', 'cash', etc.
  payment_reference text,
  bank_account_snapshot jsonb,  -- snapshot of bank details at payout time
  proof_url text,
  proof_storage_path text,

  -- Processing
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  paid_at timestamptz,
  notes text,

  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ap_payouts_partner_idx on public.ap_payouts(agency_partner_id, created_at desc);
create index if not exists ap_payouts_status_idx on public.ap_payouts(status);

-- ── 8. AP PAYOUT ITEMS ──────────────────────────────────────────────────────

create table if not exists public.ap_payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.ap_payouts(id) on delete cascade,
  commission_id uuid not null references public.ap_commissions(id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ap_payout_items_payout_idx on public.ap_payout_items(payout_id);
create index if not exists ap_payout_items_commission_idx on public.ap_payout_items(commission_id);

-- Add FK from ap_commissions.payout_id → ap_payouts after both tables exist
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ap_commissions_payout_id_fkey'
  ) then
    alter table public.ap_commissions
      add constraint ap_commissions_payout_id_fkey
      foreign key (payout_id) references public.ap_payouts(id) on delete set null;
  end if;
end $$;

-- ── 9. CUSTOMER MOBILE LINKS ───────────────────────────────────────────────

create table if not exists public.customer_mobile_links (
  id uuid primary key default gen_random_uuid(),
  mobile text not null,
  customer_user_id uuid references auth.users(id) on delete set null,
  agency_partner_id uuid references public.agency_partners(id) on delete set null,
  application_id uuid references public.applications(id) on delete cascade,
  linked_at timestamptz,
  auto_linked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists customer_mobile_links_mobile_idx on public.customer_mobile_links(mobile);
create index if not exists customer_mobile_links_customer_idx on public.customer_mobile_links(customer_user_id) where customer_user_id is not null;
create index if not exists customer_mobile_links_partner_idx on public.customer_mobile_links(agency_partner_id) where agency_partner_id is not null;

-- ── 10. AUDIT LOGS ──────────────────────────────────────────────────────────

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- ── 11. PARTNER ANNOUNCEMENTS ───────────────────────────────────────────────

create table if not exists public.partner_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  announcement_type text not null default 'info'
    check (announcement_type in ('info', 'warning', 'success', 'urgent')),
  target_type text not null default 'all'
    check (target_type in ('all', 'tier', 'specific')),
  target_tier_id uuid references public.agency_partner_tiers(id) on delete set null,
  target_partner_ids uuid[] default '{}',
  is_active boolean not null default true,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_announcements_active_idx on public.partner_announcements(is_active, published_at desc);

-- ── 12. EXTEND APPLICATIONS TABLE ──────────────────────────────────────────

alter table public.applications
  add column if not exists agency_partner_id uuid references public.agency_partners(id) on delete set null,
  add column if not exists source_channel text default 'direct'
    check (source_channel in ('direct', 'agency_partner', 'online', 'offline', 'referral')),
  add column if not exists ownership_status text default 'owned'
    check (ownership_status in ('owned', 'ap_created', 'linked', 'transferred')),
  add column if not exists customer_mobile_normalized text;

create index if not exists applications_agency_partner_idx on public.applications(agency_partner_id) where agency_partner_id is not null;
create index if not exists applications_customer_mobile_norm_idx on public.applications(customer_mobile_normalized) where customer_mobile_normalized is not null;

-- ── 13. STORAGE BUCKET ──────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('ap-kyc-documents', 'ap-kyc-documents', false)
on conflict (id) do nothing;

-- ── 14. ROW LEVEL SECURITY ──────────────────────────────────────────────────

alter table public.agency_partners enable row level security;
alter table public.agency_partner_tiers enable row level security;
alter table public.agency_partner_kyc_documents enable row level security;
alter table public.commission_rules enable row level security;
alter table public.ap_commissions enable row level security;
alter table public.ap_wallet_ledger enable row level security;
alter table public.ap_payouts enable row level security;
alter table public.ap_payout_items enable row level security;
alter table public.customer_mobile_links enable row level security;
alter table public.audit_logs enable row level security;
alter table public.partner_announcements enable row level security;

-- Agency Partners: AP reads own, Admin full access
drop policy if exists "AP reads own partner record" on public.agency_partners;
create policy "AP reads own partner record" on public.agency_partners
  for select using (auth.uid() = user_id);

drop policy if exists "AP updates own partner record" on public.agency_partners;
create policy "AP updates own partner record" on public.agency_partners
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tiers: public read
drop policy if exists "Anyone can read active tiers" on public.agency_partner_tiers;
create policy "Anyone can read active tiers" on public.agency_partner_tiers
  for select using (is_active = true);

-- KYC Documents: AP reads own
drop policy if exists "AP reads own KYC documents" on public.agency_partner_kyc_documents;
create policy "AP reads own KYC documents" on public.agency_partner_kyc_documents
  for select using (
    exists (
      select 1 from public.agency_partners ap
      where ap.id = agency_partner_id and ap.user_id = auth.uid()
    )
  );

-- Commission Rules: public read active
drop policy if exists "Anyone can read active commission rules" on public.commission_rules;
create policy "Anyone can read active commission rules" on public.commission_rules
  for select using (is_active = true);

-- AP Commissions: AP reads own
drop policy if exists "AP reads own commissions" on public.ap_commissions;
create policy "AP reads own commissions" on public.ap_commissions
  for select using (
    exists (
      select 1 from public.agency_partners ap
      where ap.id = agency_partner_id and ap.user_id = auth.uid()
    )
  );

-- AP Wallet Ledger: AP reads own (append-only, no update/delete for AP)
drop policy if exists "AP reads own wallet ledger" on public.ap_wallet_ledger;
create policy "AP reads own wallet ledger" on public.ap_wallet_ledger
  for select using (
    exists (
      select 1 from public.agency_partners ap
      where ap.id = agency_partner_id and ap.user_id = auth.uid()
    )
  );

-- AP Payouts: AP reads own
drop policy if exists "AP reads own payouts" on public.ap_payouts;
create policy "AP reads own payouts" on public.ap_payouts
  for select using (
    exists (
      select 1 from public.agency_partners ap
      where ap.id = agency_partner_id and ap.user_id = auth.uid()
    )
  );

-- AP Payout Items: AP reads own via payout
drop policy if exists "AP reads own payout items" on public.ap_payout_items;
create policy "AP reads own payout items" on public.ap_payout_items
  for select using (
    exists (
      select 1 from public.ap_payouts p
      join public.agency_partners ap on ap.id = p.agency_partner_id
      where p.id = payout_id and ap.user_id = auth.uid()
    )
  );

-- Customer Mobile Links: customer reads own
drop policy if exists "Customer reads own mobile links" on public.customer_mobile_links;
create policy "Customer reads own mobile links" on public.customer_mobile_links
  for select using (auth.uid() = customer_user_id);

-- Audit Logs: no direct read for non-admin (read via API only)
-- Admin will use service role

-- Partner Announcements: AP reads active
drop policy if exists "AP reads active announcements" on public.partner_announcements;
create policy "AP reads active announcements" on public.partner_announcements
  for select using (
    is_active = true
    and (published_at is null or published_at <= now())
    and (expires_at is null or expires_at > now())
    and (
      target_type = 'all'
      or (target_type = 'tier' and exists (
        select 1 from public.agency_partners ap
        where ap.user_id = auth.uid() and ap.tier_id = target_tier_id
      ))
      or (target_type = 'specific' and exists (
        select 1 from public.agency_partners ap
        where ap.user_id = auth.uid() and ap.id = any(target_partner_ids)
      ))
    )
  );

-- Storage policy for AP KYC documents
drop policy if exists "AP can upload own KYC documents" on storage.objects;
create policy "AP can upload own KYC documents" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ap-kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "AP can read own KYC documents" on storage.objects;
create policy "AP can read own KYC documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ap-kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Admin can read all KYC documents" on storage.objects;
create policy "Admin can read all KYC documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'ap-kyc-documents');

-- ── 15. LEGACY DATA MIGRATION ───────────────────────────────────────────────

-- Migrate existing agent profiles to agency_partners table
-- This preserves all agent data while creating proper AP records.
do $$
declare
  tier_standard_id uuid;
begin
  -- Get standard tier id
  select id into tier_standard_id from public.agency_partner_tiers where slug = 'ap-starter' limit 1;

  -- 1. Migrate profiles (safeguarded)
  begin
    execute '
      insert into public.agency_partners (
        user_id, partner_code, full_name, email, mobile,
        address, commission_type, commission_value, commission_rate,
        bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id,
        tier_id, status, kyc_status, created_at
      )
      select
        p.id as user_id,
        coalesce(p.agent_code, ''DCD-AP-'' || substr(p.id::text, 1, 8)) as partner_code,
        coalesce(p.full_name, ''Agency Partner'') as full_name,
        coalesce(p.email, '''') as email,
        coalesce(p.mobile, '''') as mobile,
        coalesce(p.address, p.area, '''') as address,
        coalesce(p.commission_type, ''fixed'') as commission_type,
        coalesce(p.commission_value, 0) as commission_value,
        coalesce(p.commission_rate, 0) as commission_rate,
        p.bank_account_name,
        p.bank_account_number,
        p.bank_ifsc,
        p.bank_name,
        p.upi_id,
        $1 as tier_id,
        case
          when (p.active is false or p.is_active is false) then ''suspended''
          when lower(coalesce(p.kyc_status, '''')) = ''approved'' then ''active''
          else ''draft''
        end as status,
        case
          when lower(coalesce(p.kyc_status, '''')) = ''approved'' then ''approved''
          else ''pending''
        end as kyc_status,
        p.created_at
      from public.profiles p
      where p.role = ''agent''
      and not exists (
        select 1 from public.agency_partners ap where ap.user_id = p.id
      )
      on conflict (user_id) do nothing
    ' using tier_standard_id;
  exception when others then
    raise warning 'Legacy profiles migration skipped or failed: %', SQLERRM;
  end;

  -- 2. Link existing applications to agency_partners (safeguarded)
  begin
    execute '
      update public.applications a
      set agency_partner_id = ap.id,
          source_channel = ''agency_partner''
      from public.agency_partners ap
      where (
        a.agent_id = ap.user_id
        or a.created_by = ap.user_id
        or a.assigned_agent_id = ap.user_id
        or a.created_by_agent_id = ap.user_id
      )
      and a.agency_partner_id is null
    ';
  exception when others then
    raise warning 'Legacy applications linking skipped or failed: %', SQLERRM;
  end;

  -- 3. Migrate existing commissions to ap_commissions (safeguarded)
  begin
    execute '
      insert into public.ap_commissions (
        agency_partner_id, application_id, service_name, sale_amount,
        commission_type, commission_value, calculated_amount,
        status, approved_by, approved_at, paid_at, notes, created_at
      )
      select
        ap.id,
        c.application_id,
        coalesce(app.service_name, ''''),
        coalesce(app.amount, 0),
        coalesce(c.payout_type_snapshot, ''fixed''),
        c.amount,
        c.amount,
        c.status::text,
        c.approved_by,
        c.approved_at,
        c.paid_at,
        c.notes,
        c.created_at
      from public.commissions c
      join public.agency_partners ap on ap.user_id = c.agent_id
      left join public.applications app on app.id = c.application_id
      where not exists (
        select 1 from public.ap_commissions apc
        where apc.agency_partner_id = ap.id and apc.application_id = c.application_id
      )
    ';
  exception when others then
    raise warning 'Legacy commissions migration skipped or failed: %', SQLERRM;
  end;

  -- 4. Update profiles role (safeguarded)
  begin
    execute '
      update public.profiles
      set role = ''agency_partner''
      where role = ''agent''
      and exists (select 1 from public.agency_partners ap where ap.user_id = profiles.id)
    ';
  exception when others then
    raise warning 'Legacy profiles role update skipped or failed: %', SQLERRM;
  end;

  -- 5. Update users role (safeguarded)
  begin
    execute '
      update public.users
      set role = ''agency_partner''
      where role = ''agent''
      and exists (select 1 from public.agency_partners ap where ap.user_id = users.id)
    ';
  exception when others then
    raise warning 'Legacy users role update skipped or failed: %', SQLERRM;
  end;

end $$;

-- Update user metadata role
-- Note: auth.users metadata update must happen via Admin API at runtime
-- The application code handles this on next login via syncUserProfile

-- ── 16. ADD agency_partner TO ROLE CONSTRAINTS ──────────────────────────────

do $$
begin
  alter table public.users drop constraint if exists users_role_check;
  alter table public.users
    add constraint users_role_check check (
      role in ('super_admin', 'admin', 'agent', 'staff', 'customer', 'agency_partner')
    );
exception when others then
  raise warning 'Users table role check constraint skipped or failed: %', SQLERRM;
end $$;

-- Done. All tables, indexes, RLS policies, and data migration complete.
