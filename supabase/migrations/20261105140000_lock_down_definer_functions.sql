-- Lock down SECURITY DEFINER functions that anyone could call over the REST API.
--
-- PostgreSQL grants EXECUTE on every new function to PUBLIC. Earlier
-- migrations granted these to service_role but never took that default away,
-- so anon and authenticated could call them at /rest/v1/rpc/<name> with only
-- the public anon key. Several move money and check nothing about the caller
-- (admin_adjust_wallet, post_reward_wallet_transaction, credit_* ...), which
-- let anyone credit or redeem any user's wallet.
--
-- Every function below is called by the app only through the service-role
-- client (getSupabaseAdmin) or is a trigger function, which fires whatever
-- the caller's grants are. So: revoke from public, anon and authenticated,
-- and grant to service_role so the server keeps working.
--
-- Deliberately left callable:
--   is_admin_role, is_active_approved_agent, current_app_role - used in RLS
--     policies, which run as the calling role; read-only role checks.
--   is_agent_role, is_agent_or_admin - read-only role checks.
--   get_public_insurance_quotation - public quote lookup by token.
--   claim_customer_applications - called with the signed-in customer's own
--     session and scoped to auth.uid(); only anon loses it.

do $$
declare
  fn regprocedure;
  locked text[] := array[
    'admin_adjust_reward_wallet',
    'admin_adjust_wallet',
    'admin_dashboard_application_series',
    'admin_dashboard_partner_commission_pending',
    'admin_dashboard_payment_totals',
    'admin_dashboard_revenue_series',
    'admin_dashboard_wallet_liability',
    'attach_referral_on_signup',
    'backfill_pending_referral_rewards',
    'calculate_referral_risk',
    'complete_referral_reward',
    'create_reward_wallet_if_missing',
    'credit_referral_reward_by_code',
    'credit_referral_reward_on_signup',
    'credit_reward_points',
    'credit_service_cashback',
    'credit_signup_bonus_if_missing',
    'credit_wallet_cashback',
    'enqueue_whatsapp_notification_from_event',
    'ensure_customer_reward_profile',
    'ensure_referral_code_for_user',
    'expire_due_rewards',
    'generate_referral_code',
    'generate_secure_referral_code',
    'issue_signup_bonus',
    'migrate_legacy_wallet_if_needed',
    'post_reward_wallet_transaction',
    'process_rewards_on_application_completed',
    'process_rewards_on_payment_verified',
    'reconcile_reward_wallet_balance',
    'redeem_reward_points',
    'redeem_reward_wallet_for_application',
    'redeem_wallet_balance',
    'refresh_reward_wallet_summary',
    'refresh_wallet_summary',
    'reverse_reward_wallet_transaction',
    'sync_reward_wallet_balance_from_transactions',
    'sync_wallet_balance_on_transaction_insert',
    'touch_agency_partner_applications'
  ];
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (locked)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;

  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'claim_customer_applications'
  loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end
$$;
