-- ============================================================================
-- Admin application ops: final-doc visibility + WhatsApp delivery logging
-- DigiConnect Dukan / RNOS India Pvt. Ltd.
-- Additive, idempotent. Does not alter existing application rows destructively.
--
-- Visibility defaults:
--   customer_visible / partner_visible default TRUE so existing non-final
--   customer documents remain visible after migration.
--   Final documents are set FALSE explicitly in application upload code
--   (and backfilled below for is_final / final_document rows).
-- ============================================================================

-- Final document visibility / delivery metadata on application_documents
alter table if exists public.application_documents
  add column if not exists customer_visible boolean not null default true,
  add column if not exists partner_visible boolean not null default true,
  add column if not exists delivery_channel text,
  add column if not exists delivery_status text,
  add column if not exists delivered_at timestamptz;

comment on column public.application_documents.customer_visible is
  'When false, document is hidden from customer dashboard lists. Default true preserves legacy uploads.';
comment on column public.application_documents.partner_visible is
  'When false, document is hidden from Digi Partner dashboards. Default true preserves legacy uploads.';

-- Backfill: final documents must never appear on customer/partner dashboards
update public.application_documents
set
  customer_visible = false,
  partner_visible = false,
  delivery_channel = coalesce(delivery_channel, 'whatsapp')
where coalesce(is_final, false) = true
   or document_type = 'final_document';

-- WhatsApp application message log (idempotent sends)
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  customer_id uuid,
  channel text not null default 'whatsapp',
  event_type text not null,
  template_name text,
  recipient text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id text,
  idempotency_key text not null,
  payload jsonb default '{}'::jsonb,
  error_message text,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

-- Additive columns if table already existed from an earlier draft of this migration
alter table if exists public.whatsapp_messages
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists whatsapp_messages_application_idx
  on public.whatsapp_messages (application_id, created_at desc);
create index if not exists whatsapp_messages_status_idx
  on public.whatsapp_messages (status, created_at desc);

alter table public.whatsapp_messages enable row level security;

-- No customer/partner policies — only admins (and service role) can read message logs.
drop policy if exists "Admins manage whatsapp messages" on public.whatsapp_messages;
create policy "Admins manage whatsapp messages" on public.whatsapp_messages
  for all using (public.is_admin_role()) with check (public.is_admin_role());

-- Application priority / due date (optional ops fields)
alter table if exists public.applications
  add column if not exists priority text default 'normal',
  add column if not exists due_at timestamptz,
  add column if not exists whatsapp_final_delivery_status text,
  add column if not exists whatsapp_final_delivered_at timestamptz;

-- Tighten document SELECT for customers: hide finals / non-visible docs
drop policy if exists "Customers read own documents" on public.application_documents;
create policy "Customers read own documents" on public.application_documents
  for select
  using (
    coalesce(customer_visible, true) = true
    and coalesce(is_final, false) = false
    and coalesce(document_type, '') <> 'final_document'
    and exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id
        and a.user_id = auth.uid()
    )
  );

-- Tighten agent/partner document access: hide finals / partner-hidden
drop policy if exists "Agents manage assigned documents" on public.application_documents;
create policy "Agents manage assigned documents" on public.application_documents
  for all
  using (
    public.is_admin_role()
    or (
      coalesce(partner_visible, true) = true
      and coalesce(is_final, false) = false
      and coalesce(document_type, '') <> 'final_document'
      and exists (
        select 1 from public.applications a
        where a.id = application_documents.application_id
          and (
            a.agent_id = auth.uid()
            or a.assigned_agent_id = auth.uid()
            or a.created_by = auth.uid()
            or a.created_by_agent_id = auth.uid()
          )
      )
    )
  )
  with check (
    public.is_admin_role()
    or exists (
      select 1 from public.applications a
      where a.id = application_documents.application_id
        and (
          a.agent_id = auth.uid()
          or a.assigned_agent_id = auth.uid()
          or a.created_by = auth.uid()
          or a.created_by_agent_id = auth.uid()
        )
    )
  );
