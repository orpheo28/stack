-- Publisher Pro: Stripe billing columns on handles
ALTER TABLE handles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free';

-- Allow owners to read their own stripe data
-- (The existing handles_select_public policy already allows SELECT by all,
-- but stripe_customer_id is sensitive — we restrict it via application logic,
-- not RLS, since the owner reads their own row via authenticated API routes.)

-- Index for Stripe webhook lookups (by stripe_customer_id)
CREATE INDEX IF NOT EXISTS handles_stripe_customer_id_idx ON handles (stripe_customer_id);
