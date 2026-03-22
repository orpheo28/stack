-- Add Supabase session tokens to cli_sessions for OAuth refresh token support
ALTER TABLE cli_sessions
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
