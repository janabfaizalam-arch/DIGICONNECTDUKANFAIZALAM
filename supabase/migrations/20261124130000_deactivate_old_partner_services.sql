-- Hide services that are not on the Nov 2026 partner price list.
-- Rows are kept (past applications reference them); only is_active is turned off.

update public.agent_services
set is_active = false,
    updated_at = now()
where slug in ('cibil-report', 'driving-licence', 'test');
