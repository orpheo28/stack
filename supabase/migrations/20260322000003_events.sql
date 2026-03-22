-- Copy events (analytics — who copied whose setup)
CREATE TABLE copy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle_id UUID NOT NULL REFERENCES handles ON DELETE CASCADE,
  copier_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX copy_events_handle_id_idx ON copy_events (handle_id);
CREATE INDEX copy_events_created_at_idx ON copy_events (created_at DESC);

ALTER TABLE copy_events ENABLE ROW LEVEL SECURITY;

-- Service role only writes copy events (called from API route with service key)
-- Anyone can read aggregated counts (via handles table, not raw events)
CREATE POLICY "copy_events_select_service"
  ON copy_events FOR SELECT
  USING (false); -- raw events are private, use handles.copies_* for counts

-- Install events (analytics)
CREATE TABLE install_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES tools ON DELETE CASCADE,
  handle_id UUID REFERENCES handles ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX install_events_tool_id_idx ON install_events (tool_id);
CREATE INDEX install_events_created_at_idx ON install_events (created_at DESC);

ALTER TABLE install_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "install_events_select_service"
  ON install_events FOR SELECT
  USING (false); -- raw events are private, use tools.installs_* for counts
