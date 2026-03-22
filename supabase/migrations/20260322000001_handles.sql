-- Handles (public profiles)
CREATE TABLE handles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  github_username TEXT,
  display_name TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  claude_md TEXT,
  cursor_rules TEXT,
  use_json JSONB DEFAULT '{}'::JSONB,
  copies_this_week INTEGER NOT NULL DEFAULT 0,
  copies_this_month INTEGER NOT NULL DEFAULT 0,
  copies_total INTEGER NOT NULL DEFAULT 0,
  percentile FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX handles_user_id_idx ON handles (user_id);
CREATE INDEX handles_copies_total_idx ON handles (copies_total DESC);
CREATE INDEX handles_copies_this_week_idx ON handles (copies_this_week DESC);

-- RLS
ALTER TABLE handles ENABLE ROW LEVEL SECURITY;

-- Anyone can read public profiles
CREATE POLICY "handles_select_public"
  ON handles FOR SELECT
  USING (true);

-- Only the owner can insert their own handle
CREATE POLICY "handles_insert_own"
  ON handles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their own handle
CREATE POLICY "handles_update_own"
  ON handles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete their own handle
CREATE POLICY "handles_delete_own"
  ON handles FOR DELETE
  USING (auth.uid() = user_id);
