-- ============================================================================
-- Digi Print: shop on/off switches and one-click connector updates
-- ============================================================================
--
--   offer_a3 / offer_color   The shop decides whether its counter sells A3
--                            and colour at all. Off means the customer never
--                            sees the option and the server refuses it.
--   agent_version            What the shop's connector last said it was.
--   update_requested_at      The partner pressed "Update install karo"; the
--                            connector updates itself on its next poll.
--
-- Safe / reversible: four added columns, all defaulted or nullable.
-- ============================================================================

alter table public.print_stations
  add column if not exists offer_a3 boolean not null default true,
  add column if not exists offer_color boolean not null default true,
  add column if not exists agent_version text,
  add column if not exists update_requested_at timestamptz;

comment on column public.print_stations.offer_a3 is 'When false the counter does not sell A3; the customer page hides it and the server refuses it.';
comment on column public.print_stations.offer_color is 'When false the counter prints black and white only.';
comment on column public.print_stations.agent_version is 'Version the station''s desktop connector last reported.';
comment on column public.print_stations.update_requested_at is 'Set when the partner asks the connector to update itself; cleared once it reports the new version.';
