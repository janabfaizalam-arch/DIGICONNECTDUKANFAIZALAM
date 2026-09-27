-- Service renewal reminders (insurance, licences, registrations …).
--
-- An admin records when a customer's service is due for renewal; the daily
-- /api/cron/renewal-reminders job sends a WhatsApp reminder at each of
-- `reminder_days` days before `renewal_date` (0 = on the day).
--
-- Only the server (service role) reads or writes this table; RLS is on with
-- no policies, so the anon and authenticated roles see nothing.

create table if not exists public.service_renewals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  customer_id uuid,
  customer_name text not null,
  customer_mobile text not null,
  service_name text not null,
  -- Policy / certificate / registration number the customer will recognise.
  reference_number text,
  renewal_date date not null,
  reminder_days integer[] not null default array[30, 7, 1, 0],
  -- Reminder stages already handled for the current renewal_date.
  reminders_sent integer[] not null default array[]::integer[],
  last_reminder_at timestamptz,
  status text not null default 'active' check (status in ('active', 'renewed', 'cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_renewals_reminder_days_valid
    check (cardinality(reminder_days) between 1 and 10 and 0 <= all(reminder_days) and 365 >= all(reminder_days))
);

create index if not exists service_renewals_due_idx
  on public.service_renewals (renewal_date)
  where status = 'active';

create index if not exists service_renewals_application_idx
  on public.service_renewals (application_id);

alter table public.service_renewals enable row level security;
