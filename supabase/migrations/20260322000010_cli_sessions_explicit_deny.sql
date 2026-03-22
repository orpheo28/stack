-- Explicit deny-all policies for cli_sessions
-- RLS is already enabled; this makes the security intent explicit rather than relying on implicit deny
CREATE POLICY "cli_sessions_deny_select" ON cli_sessions FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "cli_sessions_deny_insert" ON cli_sessions FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "cli_sessions_deny_update" ON cli_sessions FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "cli_sessions_deny_delete" ON cli_sessions FOR DELETE TO anon, authenticated USING (false);
