alter table public.leads
  add column if not exists customer_name text,
  add column if not exists city text,
  add column if not exists notes text,
  add column if not exists agent_id uuid references auth.users (id) on delete set null;

update public.leads
set customer_name = coalesce(customer_name, name),
    notes = coalesce(notes, message)
where customer_name is null or notes is null;

create index if not exists leads_agent_idx on public.leads (agent_id, created_at desc);

alter table public.leads enable row level security;

alter table public.applications
  add column if not exists agent_id uuid references auth.users (id) on delete set null;

update public.applications
set agent_id = coalesce(agent_id, assigned_agent_id, created_by)
where agent_id is null
  and submitted_by_role = 'agent';

create index if not exists applications_agent_id_idx
  on public.applications (agent_id, created_at desc);

alter table public.commissions
  alter column agent_id set not null,
  alter column amount type numeric(10, 2) using amount::numeric,
  alter column amount set default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commissions_status_text_check') then
    alter table public.commissions
      add constraint commissions_status_text_check check (status::text in ('pending', 'approved', 'paid', 'rejected'));
  end if;
end
$$;

drop policy if exists "Agents manage own leads" on public.leads;
create policy "Agents manage own leads" on public.leads
  for all using (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);

drop policy if exists "Agents manage own applications by agent_id" on public.applications;
create policy "Agents manage own applications by agent_id" on public.applications
  for select using (auth.uid() = agent_id);
