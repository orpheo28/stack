-- CLI login sessions — one-time tokens for browser OAuth flow
CREATE TABLE cli_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  state TEXT NOT NULL,
  port INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cli_sessions_token_idx ON cli_sessions (token);
CREATE INDEX cli_sessions_expires_at_idx ON cli_sessions (expires_at);

ALTER TABLE cli_sessions ENABLE ROW LEVEL SECURITY;

-- Only service_role can access cli_sessions (no public reads/writes)
-- No policies = no public access (RLS blocks everything by default)
