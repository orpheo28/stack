-- Auto-update updated_at on handles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER handles_updated_at
  BEFORE UPDATE ON handles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Increment copy counters on handles when a copy_event is inserted
-- Called by service role from the API route
CREATE OR REPLACE FUNCTION increment_copy_counters(p_handle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE handles
  SET
    copies_this_week  = copies_this_week + 1,
    copies_this_month = copies_this_month + 1,
    copies_total      = copies_total + 1
  WHERE id = p_handle_id;
END;
$$;

-- Increment install counters on tools when an install_event is inserted
CREATE OR REPLACE FUNCTION increment_install_counters(p_tool_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tools
  SET
    installs_this_week = installs_this_week + 1,
    installs_total     = installs_total + 1
  WHERE id = p_tool_id;
END;
$$;

-- Recalculate percentiles for all handles (called by cron/Inngest weekly)
CREATE OR REPLACE FUNCTION recalculate_percentiles()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE handles h
  SET percentile = sub.pct
  FROM (
    SELECT
      id,
      ROUND(
        PERCENT_RANK() OVER (ORDER BY copies_total) * 100,
        1
      ) AS pct
    FROM handles
  ) sub
  WHERE h.id = sub.id;
END;
$$;

-- Reset weekly counters (called by cron every Monday)
CREATE OR REPLACE FUNCTION reset_weekly_counters()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE handles SET copies_this_week = 0;
  UPDATE tools SET installs_this_week = 0;
END;
$$;

-- Reset monthly counters (called by cron on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE handles SET copies_this_month = 0;
END;
$$;
