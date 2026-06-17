-- Migration: Phase 3 Consolidated Enhancements
-- 2026-06-17

-- 1. Create or replace the wallet balance sync function to handle updates/status changes/deletions and reversals
CREATE OR REPLACE FUNCTION public.sync_reward_wallet_balance_from_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_balance numeric(12, 2);
  v_earned numeric(12, 2);
  v_redeemed numeric(12, 2);
BEGIN
  -- Determine which wallet needs to be synchronized
  IF TG_OP = 'DELETE' THEN
    v_wallet_id := OLD.wallet_id;
  ELSE
    v_wallet_id := NEW.wallet_id;
  END IF;

  IF v_wallet_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Lock the reward wallet row to avoid concurrent update race conditions
  PERFORM 1 FROM public.reward_wallets WHERE id = v_wallet_id FOR UPDATE;

  -- Calculate the balance, lifetime_earned, and lifetime_redeemed from posted ledger events
  SELECT
    ROUND(COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0), 2),
    ROUND(COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0), 2),
    ROUND(COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0), 2)
  INTO v_balance, v_earned, v_redeemed
  FROM public.wallet_transactions
  WHERE wallet_id = v_wallet_id AND status = 'posted';

  -- Update cached view
  UPDATE public.reward_wallets
  SET balance = GREATEST(v_balance, 0),
      lifetime_earned = GREATEST(v_earned, 0),
      lifetime_redeemed = GREATEST(v_redeemed, 0),
      updated_at = NOW()
  WHERE id = v_wallet_id;

  -- If the trigger was an UPDATE and the wallet_id changed (rare/impossible), sync the old wallet too
  IF TG_OP = 'UPDATE' AND OLD.wallet_id IS DISTINCT FROM NEW.wallet_id AND OLD.wallet_id IS NOT NULL THEN
    PERFORM 1 FROM public.reward_wallets WHERE id = OLD.wallet_id FOR UPDATE;
    
    SELECT
      ROUND(COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0), 2),
      ROUND(COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0), 2),
      ROUND(COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0), 2)
    INTO v_balance, v_earned, v_redeemed
    FROM public.wallet_transactions
    WHERE wallet_id = OLD.wallet_id AND status = 'posted';

    UPDATE public.reward_wallets
    SET balance = GREATEST(v_balance, 0),
        lifetime_earned = GREATEST(v_earned, 0),
        lifetime_redeemed = GREATEST(v_redeemed, 0),
        updated_at = NOW()
    WHERE id = OLD.wallet_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Re-bind trigger to handle all writes: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_sync_wallet_balance ON public.wallet_transactions;
CREATE TRIGGER trg_sync_wallet_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reward_wallet_balance_from_transactions();

-- 3. Create the notification queue table for asynchronous notifications
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.system_events(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('whatsapp', 'email', 'sms')),
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS) on notification_queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies for notification_queue
DROP POLICY IF EXISTS "Admins manage notification queue" ON public.notification_queue;
CREATE POLICY "Admins manage notification queue" ON public.notification_queue
  FOR ALL USING (public.is_admin_role()) WITH CHECK (public.is_admin_role());

-- 6. Trigger function to automatically enqueue WhatsApp notifications from system_events
CREATE OR REPLACE FUNCTION public.enqueue_whatsapp_notification_from_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to text;
  v_payload jsonb;
BEGIN
  -- We only handle whatsapp notification events
  IF NEW.event_name NOT LIKE 'whatsapp.notification.%' THEN
    RETURN NEW;
  END IF;

  v_to := NEW.payload ->> 'to';
  v_payload := NEW.payload;

  IF v_to IS NOT NULL THEN
    INSERT INTO public.notification_queue (
      event_id,
      notification_type,
      recipient,
      payload,
      status,
      retry_count,
      max_retries
    )
    VALUES (
      NEW.id,
      'whatsapp',
      v_to,
      v_payload,
      'pending',
      0,
      3
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_whatsapp_notification ON public.system_events;
CREATE TRIGGER trg_enqueue_whatsapp_notification
  AFTER INSERT ON public.system_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_whatsapp_notification_from_event();
