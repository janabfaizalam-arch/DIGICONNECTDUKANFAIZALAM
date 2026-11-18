import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const migrationPath = join(root, "supabase/migrations/20261118120000_whatsapp_shared_inbox.sql");

describe("WhatsApp Shared Inbox Migration (20261118120000)", () => {
  it("migration file exists", () => {
    expect(existsSync(migrationPath)).toBe(true);
  });

  const sql = readFileSync(migrationPath, "utf8");

  it("is non-destructive and contains no drop table or truncate statements", () => {
    expect(sql).not.toMatch(/\bdrop\s+table\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
  });

  it("creates whatsapp_conversations with required fields and unique wa_id", () => {
    expect(sql).toContain("create table if not exists public.whatsapp_conversations");
    expect(sql).toContain("customer_id uuid references public.customers(id)");
    expect(sql).toContain("wa_id text not null");
    expect(sql).toContain("customer_name text");
    expect(sql).toContain("phone_number text not null");
    expect(sql).toContain("last_message text");
    expect(sql).toContain("last_message_at timestamptz");
    expect(sql).toContain("unread_count integer");
    expect(sql).toContain("check (status in ('open', 'pending', 'resolved', 'archived'))");
    expect(sql).toContain("assigned_to uuid references auth.users(id)");
    expect(sql).toContain("unique (wa_id)");
  });

  it("extends whatsapp_messages with additive shared inbox columns", () => {
    expect(sql).toContain("alter table public.whatsapp_messages");
    expect(sql).toContain("conversation_id uuid references public.whatsapp_conversations(id)");
    expect(sql).toContain("meta_message_id text");
    expect(sql).toContain("check (direction in ('inbound', 'outbound'))");
    expect(sql).toContain(
      "check (message_type in ('text', 'image', 'document', 'audio', 'video', 'interactive', 'template', 'unknown'))",
    );
    expect(sql).toContain("message_body text");
    expect(sql).toContain("media_id text");
    expect(sql).toContain("media_mime_type text");
    expect(sql).toContain("media_storage_path text");
    expect(sql).toContain("check (message_status in ('pending', 'processing', 'received', 'sent', 'delivered', 'read', 'failed', 'unknown'))");
    expect(sql).toContain("check (sender_type in ('customer', 'staff', 'system', 'bot'))");
    expect(sql).toContain("sender_id uuid references auth.users(id)");
    expect(sql).toContain("raw_metadata jsonb");
  });

  it("creates whatsapp_message_events for deduplicated status tracking", () => {
    expect(sql).toContain("create table if not exists public.whatsapp_message_events");
    expect(sql).toContain("message_id uuid references public.whatsapp_messages(id)");
    expect(sql).toContain("meta_message_id text not null");
    expect(sql).toContain("check (event_type in ('sent', 'delivered', 'read', 'failed'))");
    expect(sql).toContain("unique (meta_message_id, event_type)");
  });

  it("creates whatsapp_contact_consents with separate service and marketing scopes", () => {
    expect(sql).toContain("create table if not exists public.whatsapp_contact_consents");
    expect(sql).toContain("phone_number text not null");
    expect(sql).toContain("customer_id uuid references public.customers(id)");
    expect(sql).toContain("check (consent_status in ('opted_in', 'opted_out', 'pending'))");
    expect(sql).toContain("check (consent_scope in ('service', 'marketing', 'all'))");
    expect(sql).toContain("unique (phone_number, consent_scope)");
  });

  it("enforces Row Level Security (RLS) and is_admin_role() on all tables", () => {
    expect(sql).toContain("alter table public.whatsapp_conversations enable row level security;");
    expect(sql).toContain("alter table public.whatsapp_messages enable row level security;");
    expect(sql).toContain("alter table public.whatsapp_message_events enable row level security;");
    expect(sql).toContain("alter table public.whatsapp_contact_consents enable row level security;");

    expect(sql).toContain('"Admins manage whatsapp conversations"');
    expect(sql).toContain('"Admins manage whatsapp messages"');
    expect(sql).toContain('"Admins manage whatsapp message events"');
    expect(sql).toContain('"Admins manage whatsapp contact consents"');
    expect(sql).toContain("public.is_admin_role()");
  });

  it("includes performance indexes on conversation status, phones, and messages", () => {
    expect(sql).toContain("whatsapp_conversations_status_last_msg_idx");
    expect(sql).toContain("whatsapp_conversations_phone_idx");
    expect(sql).toContain("whatsapp_conversations_customer_idx");
    expect(sql).toContain("whatsapp_messages_conv_created_idx");
    expect(sql).toContain("whatsapp_messages_meta_msg_id_idx");
    expect(sql).toContain("idx_whatsapp_messages_idempotency_key");
    expect(sql).toContain("whatsapp_message_events_dedupe_key");
  });

  it("safely and conditionally adds tables to supabase_realtime publication", () => {
    expect(sql).toContain("alter publication supabase_realtime add table public.whatsapp_conversations");
    expect(sql).toContain("alter publication supabase_realtime add table public.whatsapp_messages");
  });

  it("defines atomic unread count increment function for concurrent webhook safety", () => {
    expect(sql).toContain("create or replace function public.increment_whatsapp_conversation_unread");
    expect(sql).toContain("unread_count = unread_count + 1");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("revoke all on function public.increment_whatsapp_conversation_unread");
    expect(sql).toContain("grant execute on function public.increment_whatsapp_conversation_unread(uuid, text, timestamptz) to service_role");
  });

  it("enforces unique constraint on meta_message_id for webhook idempotency", () => {
    expect(sql).toContain("create unique index if not exists whatsapp_messages_meta_msg_id_idx");
    expect(sql).toContain("where meta_message_id is not null");
  });
});
