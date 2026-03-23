-- Add is_verified flag to handles for official publisher badges
ALTER TABLE handles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Seed: mark known official publishers as verified at migration time
UPDATE handles SET is_verified = true WHERE handle IN ('stripe', 'anthropic', 'vercel', 'supabase');
