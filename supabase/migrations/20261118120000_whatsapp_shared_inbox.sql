-- =============================================================================
-- Migration: 20261118120000_whatsapp_shared_inbox.sql
-- Description: WhatsApp Shared Inbox Schema (Additive & Backward-Compatible)
-- Tables:
--   1. public.whatsapp_conversations (Inbox conversation sessions)
--   2. public.whatsapp_messages (Additive extensions to existing table)
--   3. public.whatsapp_message_events (Deduplicated delivery & read events)
--   4. public.whatsapp_contact_consents (Explicit service & marketing consents)
-- Security: Strict RLS with public.is_admin_role(), foreign keys, zero PII leak
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. whatsapp_conversations
-- -----------------------------------------------------------------------------
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  wa_id text not null,
  customer_name text not null default '',
  phone_number text not null,
  last_message text not null default '',
  last_message_at timestamptz not null default timezone('utc', now()),
  unread_count integer not null default 0 check (unread_count >= 0),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'archived')),
  assigned_to uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint whatsapp_conversations_wa_id_key unique (wa_id)
);

create index if not exists whatsapp_conversations_status_last_msg_idx
  on public.whatsapp_conversations (status, last_message_at desc);

create index if not exists whatsapp_conversations_phone_idx
  on public.whatsapp_conversations (phone_number);

create index if not exists whatsapp_conversations_customer_idx
  on public.whatsapp_conversations (customer_id);

create index if not exists whatsapp_conversations_assigned_idx
  on public.whatsapp_conversations (assigned_to);

comment on table public.whatsapp_conversations is
  'Shared Inbox conversation threads between DigiConnect Dukan and customers.';

-- Atomic unread count increment function to avoid race conditions under concurrent webhook delivery
create or replace function public.increment_whatsapp_conversation_unread(
  p_conversation_id uuid,
  p_last_message text,
  p_last_message_at timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.whatsapp_conversations
  set unread_count = unread_count + 1,
      last_message = p_last_message,
      last_message_at = p_last_message_at,
      status = case when status = 'archived' then 'open' else status end,
      updated_at = timezone('utc', now())
  where id = p_conversation_id;
$$;

-- Restrict RPC execution: only service_role and db admin can execute (revoke public/anon/authenticated)
revoke all on function public.increment_whatsapp_conversation_unread(uuid, text, timestamptz) from public;
revoke all on function public.increment_whatsapp_conversation_unread(uuid, text, timestamptz) from anon;
revoke all on function public.increment_whatsapp_conversation_unread(uuid, text, timestamptz) from authenticated;
grant execute on function public.increment_whatsapp_conversation_unread(uuid, text, timestamptz) to service_role;
grant execute on function public.increment_whatsapp_conversation_unread(uuid, text, timestamptz) to postgres;

-- -----------------------------------------------------------------------------
-- 2. whatsapp_messages (Additive extensions to existing outbox/message table)
-- -----------------------------------------------------------------------------
-- Ensure existing table has additive columns for shared inbox
alter table public.whatsapp_messages
  add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists meta_message_id text,
  add column if not exists direction text not null default 'outbound'
    check (direction in ('inbound', 'outbound')),
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'image', 'document', 'audio', 'video', 'interactive', 'template', 'unknown')),
  add column if not exists message_body text,
  add column if not exists media_id text,
  add column if not exists media_mime_type text,
  add column if not exists media_storage_path text,
  add column if not exists message_status text not null default 'sent'
    check (message_status in ('pending', 'processing', 'received', 'sent', 'delivered', 'read', 'failed', 'unknown')),
  add column if not exists error_details text,
  add column if not exists sender_type text not null default 'system'
    check (sender_type in ('customer', 'staff', 'system', 'bot')),
  add column if not exists sender_id uuid references auth.users(id) on delete set null,
  add column if not exists timestamp timestamptz not null default timezone('utc', now()),
  add column if not exists raw_metadata jsonb not null default '{}'::jsonb;

-- Drop NOT NULL constraints from legacy columns if present so inbound messages can be recorded
do $$
declare
  col text;
begin
  foreach col in array array['recipient', 'idempotency_key', 'event_type', 'channel']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'whatsapp_messages'
        and column_name = col and is_nullable = 'NO'
    ) then
      execute format('alter table public.whatsapp_messages alter column %I drop not null', col);
    end if;
  end loop;
end $$;

-- Expand legacy status check constraint to include 'received' if constraint exists
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'whatsapp_messages_status_check'
  ) then
    alter table public.whatsapp_messages drop constraint whatsapp_messages_status_check;
    alter table public.whatsapp_messages
      add constraint whatsapp_messages_status_check
      check (status in (
        'queued',
        'processing',
        'submitted',
        'sent',
        'delivered',
        'read',
        'retryable',
        'failed',
        'cancelled',
        'configuration_required',
        'suppressed',
        'received',
        'unknown'
      ));
  end if;
end $$;

create unique index if not exists idx_whatsapp_messages_idempotency_key
  on public.whatsapp_messages (idempotency_key)
  where idempotency_key is not null;

create index if not exists whatsapp_messages_conv_created_idx
  on public.whatsapp_messages (conversation_id, created_at desc)
  where conversation_id is not null;

create unique index if not exists whatsapp_messages_meta_msg_id_idx
  on public.whatsapp_messages (meta_message_id)
  where meta_message_id is not null;

create index if not exists whatsapp_messages_direction_status_idx
  on public.whatsapp_messages (direction, message_status);

comment on column public.whatsapp_messages.meta_message_id is
  'WhatsApp message ID assigned by Meta (wamid). Unique idempotency key for inbound & outbound messages.';

comment on column public.whatsapp_messages.raw_metadata is
  'Safe metadata from Meta webhook or sender API. Never stores access tokens or secrets.';

-- -----------------------------------------------------------------------------
-- 3. whatsapp_message_events (Deduplicated delivery & read status events)
-- -----------------------------------------------------------------------------
create table if not exists public.whatsapp_message_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.whatsapp_messages(id) on delete cascade,
  meta_message_id text not null,
  event_type text not null check (event_type in ('sent', 'delivered', 'read', 'failed')),
  timestamp timestamptz not null default timezone('utc', now()),
  error_code text,
  error_message text,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint whatsapp_message_events_dedupe_key unique (meta_message_id, event_type)
);

create index if not exists whatsapp_message_events_msg_idx
  on public.whatsapp_message_events (message_id);

create index if not exists whatsapp_message_events_meta_idx
  on public.whatsapp_message_events (meta_message_id, timestamp desc);

comment on table public.whatsapp_message_events is
  'Idempotent log of Meta delivery/read/failed events for WhatsApp messages.';

-- -----------------------------------------------------------------------------
-- 4. whatsapp_contact_consents (Explicit compliance & opt-in/opt-out)
-- -----------------------------------------------------------------------------
create table if not exists public.whatsapp_contact_consents (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  consent_status text not null default 'pending' check (consent_status in ('opted_in', 'opted_out', 'pending')),
  consent_scope text not null default 'service' check (consent_scope in ('service', 'marketing', 'all')),
  consent_source text,
  consent_timestamp timestamptz not null default timezone('utc', now()),
  collected_by uuid references auth.users(id) on delete set null,
  evidence_reference text,
  opted_out_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint whatsapp_contact_consents_phone_scope_key unique (phone_number, consent_scope)
);

create index if not exists whatsapp_contact_consents_phone_idx
  on public.whatsapp_contact_consents (phone_number);

create index if not exists whatsapp_contact_consents_customer_idx
  on public.whatsapp_contact_consents (customer_id);

comment on table public.whatsapp_contact_consents is
  'GDPR/DPDP compliance store for service and promotional WhatsApp contact permissions.';

-- -----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_message_events enable row level security;
alter table public.whatsapp_contact_consents enable row level security;

-- Admins manage conversations
drop policy if exists "Admins manage whatsapp conversations" on public.whatsapp_conversations;
create policy "Admins manage whatsapp conversations" on public.whatsapp_conversations
  for all using (public.is_admin_role()) with check (public.is_admin_role());

-- Admins manage whatsapp messages
drop policy if exists "Admins manage whatsapp messages" on public.whatsapp_messages;
create policy "Admins manage whatsapp messages" on public.whatsapp_messages
  for all using (public.is_admin_role()) with check (public.is_admin_role());

-- Admins select/manage message events
drop policy if exists "Admins manage whatsapp message events" on public.whatsapp_message_events;
create policy "Admins manage whatsapp message events" on public.whatsapp_message_events
  for all using (public.is_admin_role()) with check (public.is_admin_role());

-- Admins manage contact consents
drop policy if exists "Admins manage whatsapp contact consents" on public.whatsapp_contact_consents;
create policy "Admins manage whatsapp contact consents" on public.whatsapp_contact_consents
  for all using (public.is_admin_role()) with check (public.is_admin_role());

-- -----------------------------------------------------------------------------
-- 6. Supabase Realtime Publication (Safe conditional registration)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'whatsapp_conversations'
    ) then
      alter publication supabase_realtime add table public.whatsapp_conversations;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'whatsapp_messages'
    ) then
      alter publication supabase_realtime add table public.whatsapp_messages;
    end if;
  end if;
end $$;
