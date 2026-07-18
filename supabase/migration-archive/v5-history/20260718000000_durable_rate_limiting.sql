-- ============================================================================
-- Durable rate limiting
-- Date: 2026-07-18
--
-- Why: All application rate limiting is in-memory (src/lib/rate-limit.ts,
-- src/lib/auth-v2/rate-limit.ts). On serverless deployments each instance has
-- its own memory, so limits reset on cold start and do not aggregate across
-- instances. OTP, login, and payment endpoints need durable counters.
--
-- Design: one bucket row per key with fixed-window counting, incremented
-- atomically via an upsert inside a SECURITY DEFINER function. Only the
-- service-role key may call it (function EXECUTE revoked from anon/authenticated,
-- table has RLS enabled with no policies).
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer);
--   DROP TABLE IF EXISTS public.rate_limit_buckets;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset_at
  ON public.rate_limit_buckets (reset_at);

-- Lock the table down: no client (anon/authenticated) access at all.
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_buckets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_reset timestamptz;
  v_count integer;
BEGIN
  INSERT INTO public.rate_limit_buckets AS b (key, count, reset_at)
  VALUES (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN b.reset_at <= v_now THEN 1 ELSE b.count + 1 END,
        reset_at = CASE WHEN b.reset_at <= v_now
                        THEN v_now + make_interval(secs => p_window_ms / 1000.0)
                        ELSE b.reset_at END
  RETURNING b.count, b.reset_at INTO v_count, v_reset;

  -- Opportunistic cleanup (~1% of calls) so expired buckets do not accumulate.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_buckets
    WHERE reset_at < v_now - interval '1 day';
  END IF;

  IF v_count > p_limit THEN
    RETURN QUERY SELECT false, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset - v_now)))::integer);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
