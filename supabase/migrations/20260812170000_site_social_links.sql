-- Admin-managed social links.
--
-- The platform list has always lived in code with `enabled: false` and a
-- comment saying to configure it "in admin/settings" — a screen that was never
-- built, so the footer could only ever show WhatsApp. This is that store.

create table if not exists public.site_social_links (
  platform text primary key,
  url text not null,
  handle text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists site_social_links_active_order_idx
  on public.site_social_links (is_active, sort_order);

alter table public.site_social_links enable row level security;

drop policy if exists "Public can read active social links" on public.site_social_links;
create policy "Public can read active social links"
on public.site_social_links for select
using (is_active = true);
