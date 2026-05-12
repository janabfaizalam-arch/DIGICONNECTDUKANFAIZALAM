create table if not exists public.homepage_notices (
  id uuid primary key default gen_random_uuid(),
  notice_text text not null,
  link_url text,
  emoji_icon text,
  color_theme text not null default 'blue-orange',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_notices_color_theme_check check (
    color_theme in ('blue-orange', 'blue', 'orange', 'green', 'slate')
  ),
  constraint homepage_notices_link_url_check check (
    link_url is null
    or link_url = ''
    or (link_url like '/%' and link_url not like '//%')
    or link_url ~* '^https?://'
  )
);

create index if not exists homepage_notices_public_idx
  on public.homepage_notices (is_active, sort_order asc, created_at desc);

create index if not exists homepage_notices_admin_idx
  on public.homepage_notices (sort_order asc, created_at desc);

create or replace function public.set_homepage_notices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists homepage_notices_updated_at on public.homepage_notices;
create trigger homepage_notices_updated_at
  before update on public.homepage_notices
  for each row
  execute function public.set_homepage_notices_updated_at();

alter table public.homepage_notices enable row level security;

drop policy if exists "Public can read active homepage notices" on public.homepage_notices;
create policy "Public can read active homepage notices" on public.homepage_notices
  for select
  using (is_active = true);

drop policy if exists "Admins manage homepage notices" on public.homepage_notices;
create policy "Admins manage homepage notices" on public.homepage_notices
  for all
  using (public.is_admin_role())
  with check (public.is_admin_role());

insert into public.homepage_notices (notice_text, link_url, emoji_icon, color_theme, sort_order, is_active)
select *
from (
  values
    ('ITR + MSME Combo Rs 699', '/combo/itr-msme', '🔥', 'orange', 10, true),
    ('Credit Cards - All Banks', '/services/credit-cards---all-banks', '💳', 'blue', 20, true),
    ('Refer & Earn Rs 50', '/signup', '🎁', 'green', 30, true),
    ('Get 20% Cashback in Wallet', '/services', '💰', 'blue-orange', 40, true)
) as seeded(notice_text, link_url, emoji_icon, color_theme, sort_order, is_active)
where not exists (select 1 from public.homepage_notices);
