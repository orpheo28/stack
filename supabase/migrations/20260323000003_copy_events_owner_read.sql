-- Allow handle owners to read their own copy_events
-- EXISTS is used instead of IN (SELECT ...) to avoid a correlated subquery
-- being re-evaluated for every row — the planner can short-circuit on first match.
CREATE POLICY copy_events_owner_read ON copy_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM handles
      WHERE handles.id = copy_events.handle_id
        AND handles.user_id = auth.uid()
    )
  );
