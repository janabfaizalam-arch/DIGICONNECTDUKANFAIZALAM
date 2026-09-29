-- Production had drifted from the migrations: whatsapp_messages.error_message
-- (and possibly other optional columns) carried NOT NULL. Every outbox write
-- sets error_message = null, so every insert failed with 23502 — messages
-- were still sent, but none was recorded: /admin/communications stayed empty
-- and send idempotency was lost.
--
-- Restore the nullability the migrations define (20260727120000,
-- 20260805160000). Only drops NOT NULL on optional columns; idempotent;
-- touches no data.

do $$
declare
  col text;
begin
  foreach col in array array[
    'application_id', 'customer_id', 'template_name', 'provider_message_id', 'payload',
    'error_message', 'last_attempt_at', 'sent_at', 'delivered_at', 'failed_at', 'read_at',
    'purpose', 'lead_id', 'payment_id', 'follow_up_id', 'consent_basis', 'next_attempt_at',
    'provider_status', 'failure_code', 'failure_summary', 'correlation_id', 'created_by',
    'cancelled_at', 'cancelled_by', 'cancel_reason', 'processing_lease_until', 'processing_owner'
  ]
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
