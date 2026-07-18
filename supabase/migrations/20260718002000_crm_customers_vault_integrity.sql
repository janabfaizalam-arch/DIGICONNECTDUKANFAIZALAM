-- Restore CRM customer integrity + vault RLS after destructive auth migrations
-- were neutralized. Safe / idempotent for fresh resets and local repair.

-- 1. Ensure canonical CRM columns exist on public.customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hashed_pin varchar(255),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS name varchar(255),
  ADD COLUMN IF NOT EXISTS wallet_balance numeric(10, 2) DEFAULT 0.00;

-- Backfill full_name from name when needed
UPDATE public.customers
SET full_name = name
WHERE (full_name IS NULL OR btrim(full_name) = '')
  AND name IS NOT NULL
  AND btrim(name) <> '';

UPDATE public.customers
SET name = full_name
WHERE (name IS NULL OR btrim(name) = '')
  AND full_name IS NOT NULL
  AND btrim(full_name) <> '';

CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers (user_id);
CREATE INDEX IF NOT EXISTS customers_mobile_idx ON public.customers (mobile);
CREATE INDEX IF NOT EXISTS customers_agent_idx ON public.customers (created_by, assigned_agent_id);

-- 2. Restore FKs dropped by the old CASCADE destroy (if missing)
DO $$
BEGIN
  IF to_regclass('public.applications') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'customer_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'applications_customer_id_fkey'
    )
  THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.customer_vault_documents') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'customer_vault_documents_customer_id_fkey'
    )
  THEN
    ALTER TABLE public.customer_vault_documents
      ADD CONSTRAINT customer_vault_documents_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- 3. Vault RLS: owner via customers.user_id + admin; no agent_id; no AP vault access
ALTER TABLE public.customer_vault_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vault access rule" ON public.customer_vault_documents;
CREATE POLICY "Vault access rule"
  ON public.customer_vault_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_vault_documents.customer_id
        AND c.user_id = auth.uid()
    )
    OR public.is_admin_role()
  );

DROP POLICY IF EXISTS "Vault insert own" ON public.customer_vault_documents;
CREATE POLICY "Vault insert own"
  ON public.customer_vault_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_vault_documents.customer_id
        AND c.user_id = auth.uid()
    )
    OR public.is_admin_role()
  );

DROP POLICY IF EXISTS "Vault admin manage" ON public.customer_vault_documents;
CREATE POLICY "Vault admin manage"
  ON public.customer_vault_documents
  FOR ALL
  USING (public.is_admin_role())
  WITH CHECK (public.is_admin_role());
