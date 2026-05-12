-- Base profile table required by later CRM and agent migrations.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role'
      and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('super_admin', 'admin', 'agent', 'staff', 'customer');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  mobile text default '',
  role public.app_role not null default 'customer',
  commission_rate numeric(5, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  email text not null,
  avatar_url text default '',
  role text not null default 'customer' check (role in ('super_admin', 'admin', 'agent', 'staff', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.service_categories(id) on delete set null,
  slug text unique not null,
  name text not null default '',
  title text not null default '',
  description text default '',
  short_description text default '',
  overview text default '',
  amount numeric(10, 2) not null default 0,
  active boolean not null default true,
  benefits jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  process jsonb not null default '[]'::jsonb,
  old_price numeric,
  offer_price numeric,
  price_label text default '',
  cta_type text not null default 'apply' check (cta_type in ('apply', 'enquiry')),
  badge text default '',
  icon text default 'FileText',
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  sort_order int not null default 0,
  seo_title text default '',
  seo_description text default '',
  seo_keywords jsonb not null default '[]'::jsonb,
  blog_content text default '',
  faqs jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references auth.users(id) on delete set null,
  service_slug text not null,
  service_name text not null,
  amount numeric(10, 2) not null default 0,
  form_data jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (
    status in ('new', 'documents_pending', 'payment_pending', 'in_process', 'submitted', 'completed', 'rejected')
  ),
  final_document_url text,
  final_document_name text,
  assigned_to text,
  assigned_staff_id uuid references auth.users(id) on delete set null,
  staff_note text,
  customer_message text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on public.applications (user_id, created_at desc);
create index if not exists applications_status_idx on public.applications (status);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null default 'customer_document',
  file_name text not null,
  file_url text not null,
  file_type text,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists application_documents_application_idx
  on public.application_documents (application_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  utr_number text,
  screenshot_url text,
  storage_path text,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  razorpay_status text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_application_idx on public.payments (application_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text unique not null,
  customer_name text not null,
  customer_email text not null,
  service_name text not null,
  amount numeric(10, 2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists invoices_application_idx on public.invoices (application_id);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  service text not null,
  message text default '',
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
  file_name text,
  file_url text,
  file_type text,
  storage_path text,
  customer_name text,
  city text,
  notes text,
  agent_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
