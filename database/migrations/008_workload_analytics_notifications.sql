BEGIN;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tasks_estimated_minutes_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_estimated_minutes_check
      CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 0 AND 525600);
  END IF;
END $$;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(200);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON notifications(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mention_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  due_date_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(workspace_id,user_id)
);

COMMIT;
