create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text not null,
  related_type text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (is_read, created_at desc);

alter table public.admin_notifications enable row level security;

drop policy if exists "Admins manage admin notifications" on public.admin_notifications;
create policy "Admins manage admin notifications" on public.admin_notifications
  for all
  using (public.is_admin_role())
  with check (public.is_admin_role());
