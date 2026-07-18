-- ⚠️ LEGACY — Documentation-only migration. Agent panel superseded by 20260517170000_agent_panel_workflow.sql
-- Migration kept for chain integrity only.
--
-- Deprecate the old lead/customer-only agent panel without dropping production data.
-- New canonical agent work is stored in applications, application_documents, payments,
-- invoices, assignments, commissions, wallet_transactions, and payout_requests.

comment on table public.leads is
  'DEPRECATED: legacy agent lead-only workflow. Keep for historical records only; new agent work must use public.applications.';

comment on column public.leads.payment_reference is
  'DEPRECATED: legacy manual payment reference. Razorpay verification must use public.payments.';

comment on column public.leads.payment_proof_url is
  'DEPRECATED: legacy public payment proof URL. Do not use for new private documents.';

comment on column public.leads.documents is
  'DEPRECATED: legacy JSON document list. New documents must use public.application_documents with private storage signed URLs.';

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do update set public = false;

create or replace view public.agent_legacy_leads_deprecated as
select
  id,
  agent_id,
  customer_name,
  mobile,
  service,
  status,
  created_at
from public.leads;

comment on view public.agent_legacy_leads_deprecated is
  'Read-only historical view for old agent leads. New code should not write to public.leads.';
