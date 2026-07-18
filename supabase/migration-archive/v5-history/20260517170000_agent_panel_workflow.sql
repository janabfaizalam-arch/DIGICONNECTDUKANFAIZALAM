-- Agent panel workflow fields, statuses, and RLS hardening.

alter table public.profiles
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_name text,
  add column if not exists upi_id text;

alter table public.leads
  add column if not exists address text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_amount numeric(10, 2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_proof_url text,
  add column if not exists payment_proof_path text,
  add column if not exists documents jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads
  add constraint leads_status_check check (
    status in ('new','contacted','converted','closed','in_progress','completed','lead_submitted','payment_pending','payment_verified','documents_under_review','documents_required','application_processing','submitted_to_department','under_government_review','rejected','cancelled')
  );

alter table public.leads drop constraint if exists leads_payment_status_check;
alter table public.leads
  add constraint leads_payment_status_check check (
    payment_status in ('pending','submitted','verified','rejected','refunded')
  );

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check check (
    status in ('new','documents_pending','payment_pending','payment_failed','cancelled','in_process','in_progress','submitted','completed','rejected','lead_submitted','payment_verified','documents_under_review','documents_required','application_processing','submitted_to_department','under_government_review')
  );

alter table public.applications drop constraint if exists applications_payment_status_check;
alter table public.applications
  add constraint applications_payment_status_check check (
    payment_status in ('pending','submitted','verified','rejected','refunded','failed','paid','unpaid')
  );

alter table public.application_documents
  add column if not exists review_status text not null default 'pending',
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.application_documents drop constraint if exists application_documents_review_status_check;
alter table public.application_documents
  add constraint application_documents_review_status_check check (
    review_status in ('pending','accepted','rejected','reupload_required')
  );

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check check (
    status in ('pending','submitted','verified','rejected','refunded','failed','paid')
  );

do $$
begin
  if exists (select 1 from pg_type where typname = 'commission_status') then
    alter type public.commission_status add value if not exists 'hold';
    alter type public.commission_status add value if not exists 'cancelled';
  end if;
end $$;

alter table public.commissions drop constraint if exists commissions_status_text_check;
alter table public.commissions
  add constraint commissions_status_text_check check (
    status::text in ('pending','approved','paid','hold','cancelled','rejected')
  );

alter table public.commissions
  add column if not exists payout_transaction_id text,
  add column if not exists payout_date date,
  add column if not exists payout_proof_url text,
  add column if not exists payout_proof_path text;

create index if not exists leads_agent_payment_status_idx on public.leads(agent_id, payment_status, created_at desc);
create index if not exists application_documents_review_idx on public.application_documents(review_status, created_at desc);
create index if not exists commissions_agent_payout_idx on public.commissions(agent_id, status, paid_at desc);

alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;

drop policy if exists "Agents manage own leads" on public.leads;
create policy "Agents manage own leads" on public.leads
  for all using (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);

drop policy if exists "Agents manage own customers" on public.customers;
create policy "Agents manage own customers" on public.customers
  for all using (auth.uid() = created_by or auth.uid() = assigned_agent_id)
  with check (auth.uid() = created_by or auth.uid() = assigned_agent_id);

drop policy if exists "Agents read own applications by agent_id" on public.applications;
create policy "Agents read own applications by agent_id" on public.applications
  for select using (
    auth.uid() = agent_id or auth.uid() = created_by or auth.uid() = assigned_agent_id
  );

drop policy if exists "Agents manage own documents" on public.application_documents;
create policy "Agents manage own documents" on public.application_documents
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (a.agent_id = auth.uid() or a.created_by = auth.uid() or a.assigned_agent_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (a.agent_id = auth.uid() or a.created_by = auth.uid() or a.assigned_agent_id = auth.uid())
    )
  );

drop policy if exists "Agents read own payments" on public.payments;
create policy "Agents read own payments" on public.payments
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (a.agent_id = auth.uid() or a.created_by = auth.uid() or a.assigned_agent_id = auth.uid())
    )
  );

drop policy if exists "Agents read own commissions" on public.commissions;
create policy "Agents read own commissions" on public.commissions
  for select using (auth.uid() = agent_id);
