-- Tools (registry)
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcp', 'cli', 'sdk', 'api', 'config')),
  source TEXT NOT NULL,
  version TEXT,
  description TEXT,
  installs_total INTEGER NOT NULL DEFAULT 0,
  installs_this_week INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX tools_name_idx ON tools (name);
CREATE INDEX tools_type_idx ON tools (type);
CREATE INDEX tools_installs_total_idx ON tools (installs_total DESC);
CREATE INDEX tools_installs_this_week_idx ON tools (installs_this_week DESC);

-- Full-text search
CREATE INDEX tools_search_idx ON tools USING GIN (
  to_tsvector('english', name || ' ' || display_name || ' ' || COALESCE(description, ''))
);

-- RLS
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- Anyone can read tools
CREATE POLICY "tools_select_public"
  ON tools FOR SELECT
  USING (true);

-- Only service role can insert/update/delete tools (registry is managed server-side)
-- No INSERT/UPDATE/DELETE policies = only service_role key can write
