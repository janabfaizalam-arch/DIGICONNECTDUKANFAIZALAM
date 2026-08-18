-- ============================================================================
-- Commission rules backfill — the reason partners were never paid
--
-- `calculateCommission` prices a completed sale by matching one row in
-- public.commission_rules (partner > campaign > service > tier > global). When
-- nothing matches it returns 0, and createCommissionForApplication then returns
-- `{ ok: true, amount: 0 }` and writes NO ap_commissions row at all.
--
-- The table was created by 20260527140000_agency_partner_ecosystem.sql and has
-- never held a single row: nothing in the app wrote to it and no migration
-- seeded it. So every sale a partner made priced at zero, no commission was
-- recorded, no wallet was credited, and no payout could ever be requested.
--
-- The commission config the admin had already entered lived in two other
-- places that the engine never reads:
--   * agency_partners.commission_type / commission_value / commission_rate
--   * agency_partner_tiers.default_commission_type / _value / _rate
--
-- This migration mirrors both into commission_rules, then adds a global
-- fallback so no future sale can fall through to zero.
--
-- Safe / reversible: inserts only, all guarded so a re-run is a no-op. No
-- existing row is modified and no commission is recalculated — historical sales
-- that priced at zero stay as they are and must be settled by hand if owed.
-- ============================================================================

-- ── 1. Partner-scoped rules from each partner's own commission config ───────
-- Highest precedence in the engine, so a partner on a negotiated rate keeps it
-- rather than silently dropping to the tier or global rule.
do $$
declare
  v_inserted int;
begin
  insert into public.commission_rules (
    name, description, scope_type, agency_partner_id,
    commission_type, fixed_amount, percentage_rate, priority, is_active
  )
  select
    'Partner rate — ' || coalesce(nullif(ap.business_name, ''), ap.full_name),
    'Backfilled from agency_partners.commission_* so the engine can see the rate that was already configured for this partner.',
    'partner',
    ap.id,
    ap.commission_type,
    case when ap.commission_type = 'fixed' then coalesce(ap.commission_value, 0) else 0 end,
    case
      when ap.commission_type = 'percentage'
        then coalesce(nullif(ap.commission_rate, 0), ap.commission_value, 0)
      else 0
    end,
    100,
    true
  from public.agency_partners ap
  where ap.commission_type in ('fixed', 'percentage')
    -- Only partners who actually have a rate configured; a zero rate is not a
    -- policy, it is an unfilled field, and copying it would just re-create the
    -- silent-zero bug under a rule that looks configured.
    and (
      (ap.commission_type = 'fixed' and coalesce(ap.commission_value, 0) > 0)
      or (ap.commission_type = 'percentage' and coalesce(nullif(ap.commission_rate, 0), ap.commission_value, 0) > 0)
    )
    and not exists (
      select 1 from public.commission_rules r
      where r.scope_type = 'partner' and r.agency_partner_id = ap.id
    );

  get diagnostics v_inserted = row_count;
  raise notice 'commission_rules: % partner-scoped rule(s) backfilled.', v_inserted;
end;
$$;

-- ── 2. Tier-scoped rules from each tier's default commission config ─────────
do $$
declare
  v_inserted int;
begin
  insert into public.commission_rules (
    name, description, scope_type, tier_id,
    commission_type, fixed_amount, percentage_rate, priority, is_active
  )
  select
    'Tier rate — ' || t.name,
    'Backfilled from agency_partner_tiers.default_commission_* so partners on this tier price against their tier default.',
    'tier',
    t.id,
    t.default_commission_type,
    case when t.default_commission_type = 'fixed' then coalesce(t.default_commission_value, 0) else 0 end,
    case
      when t.default_commission_type = 'percentage'
        then coalesce(nullif(t.default_commission_rate, 0), t.default_commission_value, 0)
      else 0
    end,
    50,
    true
  from public.agency_partner_tiers t
  where t.is_active
    and t.default_commission_type in ('fixed', 'percentage')
    and (
      (t.default_commission_type = 'fixed' and coalesce(t.default_commission_value, 0) > 0)
      or (t.default_commission_type = 'percentage'
          and coalesce(nullif(t.default_commission_rate, 0), t.default_commission_value, 0) > 0)
    )
    and not exists (
      select 1 from public.commission_rules r
      where r.scope_type = 'tier' and r.tier_id = t.id
    );

  get diagnostics v_inserted = row_count;
  raise notice 'commission_rules: % tier-scoped rule(s) backfilled.', v_inserted;
end;
$$;

-- ── 3. Global fallback so no sale can price at zero ─────────────────────────
-- Without an active global rule, any sale that misses every scoped rule earns
-- nothing and records nothing — the original failure. Installed only when the
-- business has no global rule of its own, and the rate is a placeholder the
-- admin is expected to review.
do $$
declare
  v_rate numeric := 10;
begin
  if exists (
    select 1 from public.commission_rules where scope_type = 'global' and is_active
  ) then
    raise notice 'commission_rules: active global fallback already present, left untouched.';
  else
    insert into public.commission_rules (
      name, description, scope_type,
      commission_type, percentage_rate, priority, is_active
    )
    values (
      'Default global commission',
      'Placeholder fallback installed so no sale prices at zero. REVIEW THIS RATE at /admin/commission-rules — it is a default, not a business decision.',
      'global',
      'percentage',
      v_rate,
      0,
      true
    );

    raise warning
      'commission_rules: installed a global fallback at %%%. This rate is a placeholder — review it at /admin/commission-rules before partners earn against it.',
      v_rate;
  end if;
end;
$$;

comment on table public.commission_rules is
  'Rates that price a partner commission on a completed sale. Matched most-specific-first: partner > campaign > service > tier > global. A sale matching no active rule earns nothing and writes no ap_commissions row, so an active global fallback should always exist. Managed at /admin/commission-rules.';
