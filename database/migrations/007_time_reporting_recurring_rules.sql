BEGIN;

CREATE INDEX IF NOT EXISTS idx_time_entries_user_started
  ON time_entries(workspace_id,user_id,started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_completed
  ON time_entries(workspace_id,ended_at,started_at)
  WHERE ended_at IS NOT NULL;

ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS recurrence_unit VARCHAR(10),
  ADD COLUMN IF NOT EXISTS interval_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekdays SMALLINT[],
  ADD COLUMN IF NOT EXISTS month_day SMALLINT,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assignee_id BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS due_offset_days INTEGER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recurring_tasks_interval_check') THEN
    ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_interval_check
      CHECK (interval_count BETWEEN 1 AND 365);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recurring_tasks_unit_check') THEN
    ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_unit_check
      CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('daily','weekly','monthly','custom'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recurring_tasks_month_day_check') THEN
    ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_month_day_check
      CHECK (month_day IS NULL OR month_day BETWEEN 1 AND 31);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recurring_tasks_due_offset_check') THEN
    ALTER TABLE recurring_tasks ADD CONSTRAINT recurring_tasks_due_offset_check
      CHECK (due_offset_days IS NULL OR due_offset_days BETWEEN 0 AND 3650);
  END IF;
END $$;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_id BIGINT REFERENCES recurring_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_run_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_recurring_occurrence
  ON tasks(recurrence_id,recurrence_run_at)
  WHERE recurrence_id IS NOT NULL AND recurrence_run_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_active_due
  ON recurring_tasks(next_run_at,id)
  WHERE is_active = TRUE AND paused_at IS NULL;

COMMIT;
