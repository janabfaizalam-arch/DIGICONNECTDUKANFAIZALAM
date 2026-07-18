-- Migration for Phase 3: Enterprise Customer Experience

-- Alter Customers Table to include detailed address and profile fields
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS father_or_husband_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS house_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS street VARCHAR(255),
ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India',
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update the existing unique constraint if email is to be unique (optional, but good practice if email is used for comms)
-- We will not make email UNIQUE yet because it's optional, and empty strings could cause constraint violations if not NULL.

-- Create a dummy wallet system if not exists (for dashboard display)
-- Assuming a wallet system doesn't fully exist for customers in V2 yet, we can add a balance field or a separate table.
-- Let's just add it to customers for V2 prototype, or if they have a 'wallets' table, we can use that.
-- We will add a basic wallet_balance to customers for simplicity in this phase.
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) DEFAULT 0.00;
