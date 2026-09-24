-- ============================================================================
-- PAYMENT LINKS: ONE LINK FOR A WHOLE CART — MIGRATION
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-09-24
-- ============================================================================
--
-- A partner who applies for two services in one wizard run creates two
-- applications, but payment_links.application_id is UNIQUE and singular, so
-- the generated link could only ever cover the first of them. The partner was
-- shown the full cart total while the customer was charged for one service.
--
-- This makes the relationship many-to-one: a link carries the whole cart.
--
--   payment_link_applications   the cart: every application the link pays for
--   payment_links.application_id  kept, now the *primary* application (the
--                                 first in the cart) — it is what existing
--                                 single-application code reads, and it stays
--                                 NOT NULL so none of that breaks.
--
-- Nothing is dropped except the UNIQUE constraint that made a second link for
-- an application impossible in the first place.
-- ============================================================================

-- ── 1. THE CART TABLE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_link_applications (
  payment_link_id uuid NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (payment_link_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_link_applications_application
  ON public.payment_link_applications(application_id);

COMMENT ON TABLE public.payment_link_applications IS
  'Every application a payment link pays for. A link covers a whole cart; payment_links.application_id names the first of them.';

-- ── 2. BACKFILL: EVERY EXISTING LINK IS A ONE-ITEM CART ─────────────────────

INSERT INTO public.payment_link_applications (payment_link_id, application_id, created_at)
SELECT pl.id, pl.application_id, pl.created_at
FROM public.payment_links pl
ON CONFLICT (payment_link_id, application_id) DO NOTHING;

-- ── 3. RELEASE THE ONE-LINK-PER-APPLICATION CONSTRAINT ──────────────────────
--
-- Inline UNIQUE gets a generated name, so it is looked up rather than guessed.
-- Only the UNIQUE constraint goes; the foreign key and NOT NULL stay.

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'payment_links'
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = rel.oid AND attname = 'application_id'
      )]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.payment_links DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

-- A link is still found by its application, so keep the lookup indexed — but
-- non-unique now, since an application may be re-linked after one expires.
CREATE INDEX IF NOT EXISTS idx_payment_links_application_id
  ON public.payment_links(application_id);

-- ── 4. ROW LEVEL SECURITY ───────────────────────────────────────────────────
--
-- The cart rows are exactly as visible as the link that owns them: a customer
-- holding a live link may read them, and a partner may manage their own.

ALTER TABLE public.payment_link_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select applications of live payment links"
  ON public.payment_link_applications;
CREATE POLICY "Public select applications of live payment links"
  ON public.payment_link_applications
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM public.payment_links pl
      WHERE pl.id = payment_link_id
        AND pl.status = 'pending'
        AND pl.expires_at > now()
    )
  );

DROP POLICY IF EXISTS "AP manage own payment link applications"
  ON public.payment_link_applications;
CREATE POLICY "AP manage own payment link applications"
  ON public.payment_link_applications
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.payment_links pl
      JOIN public.agency_partners ap ON ap.id = pl.partner_id
      WHERE pl.id = payment_link_id
        AND (ap.user_id = auth.uid() OR ap.created_by_user_id = auth.uid())
    )
  );
