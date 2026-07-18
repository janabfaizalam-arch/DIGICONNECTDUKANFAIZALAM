-- Migration: Phase 3 Wallet Trigger & Performance Optimization
-- 2026-06-16

-- 1. Create trigger function to sync reward_wallets balance on wallet_transactions insert
CREATE OR REPLACE FUNCTION public.sync_wallet_balance_on_transaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We only handle posted transactions for balance adjustments
  IF NEW.status <> 'posted' THEN
    RETURN NEW;
  END IF;

  IF NEW.direction = 'credit' THEN
    UPDATE public.reward_wallets
    SET balance = ROUND(balance + ROUND(NEW.amount, 2), 2),
        lifetime_earned = ROUND(lifetime_earned + ROUND(NEW.amount, 2), 2),
        updated_at = NOW()
    WHERE id = NEW.wallet_id;
  ELSIF NEW.direction = 'debit' THEN
    UPDATE public.reward_wallets
    SET balance = ROUND(balance - ROUND(NEW.amount, 2), 2),
        lifetime_redeemed = ROUND(lifetime_redeemed + ROUND(NEW.amount, 2), 2),
        updated_at = NOW()
    WHERE id = NEW.wallet_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Bind the AFTER INSERT trigger to public.wallet_transactions
DROP TRIGGER IF EXISTS trg_sync_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER trg_sync_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_wallet_balance_on_transaction_insert();

-- 3. Adjust post_reward_wallet_transaction function to remove manual balance updating statements
CREATE OR REPLACE FUNCTION public.post_reward_wallet_transaction(
  p_user_id uuid,
  p_type text,
  p_direction text,
  p_amount numeric,
  p_idempotency_key text,
  p_application_id uuid DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL,
  p_referred_user_id uuid DEFAULT NULL,
  p_referrer_user_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT NULL
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.reward_wallets;
  v_existing public.wallet_transactions;
  v_balance numeric(12, 2);
  v_transaction public.wallet_transactions;
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL OR LENGTH(TRIM(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'User and idempotency key are required.';
  END IF;

  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_idempotency_key));

  SELECT * INTO v_existing
  FROM public.wallet_transactions
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  PERFORM public.create_reward_wallet_if_missing(p_user_id);

  SELECT * INTO v_wallet
  FROM public.reward_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet.frozen THEN
    RAISE EXCEPTION 'Reward wallet is frozen.';
  END IF;

  IF p_direction = 'credit' THEN
    v_balance := ROUND(v_wallet.balance + ROUND(p_amount, 2), 2);
  ELSIF p_direction = 'debit' THEN
    IF v_wallet.balance < ROUND(p_amount, 2) THEN
      RAISE EXCEPTION 'Insufficient reward wallet balance.';
    END IF;

    v_balance := ROUND(v_wallet.balance - ROUND(p_amount, 2), 2);
  ELSE
    RAISE EXCEPTION 'Invalid wallet direction.';
  END IF;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, transaction_type, direction, amount, balance_after, application_id, payment_id,
    referred_user_id, referrer_user_id, idempotency_key, status, note, metadata, created_by
  )
  VALUES (
    v_wallet.id, p_user_id, p_type, p_type, p_direction, ROUND(p_amount, 2), v_balance, p_application_id, p_payment_id,
    p_referred_user_id, p_referrer_user_id, p_idempotency_key, 'posted', p_note, COALESCE(p_metadata, '{}'::jsonb), p_created_by
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;
