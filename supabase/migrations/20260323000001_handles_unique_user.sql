-- One handle per user: enforce the identity model (one public profile per dev)
-- Without this, a single user_id can create multiple handles, breaking the
-- "one identity, one profile" guarantee that Stack's product is built on.

-- Drop the redundant non-unique index — superseded by the UNIQUE constraint below,
-- which creates its own backing index automatically.
DROP INDEX IF EXISTS handles_user_id_idx;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handles_user_id_unique' AND conrelid = 'handles'::regclass
  ) THEN
    ALTER TABLE handles ADD CONSTRAINT handles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
