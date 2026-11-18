-- Reconcile databases that have only partially applied migrations 001-010.
-- This migration is additive. NOT VALID foreign keys preserve legacy rows
-- while enforcing the relationships for new or updated rows.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users ALTER COLUMN token_version SET DEFAULT 0;
UPDATE users SET token_version = 0 WHERE token_version IS NULL;
ALTER TABLE users ALTER COLUMN token_version SET NOT NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS manager_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurrence_id BIGINT,
  ADD COLUMN IF NOT EXISTS recurrence_run_at TIMESTAMPTZ;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_estimated_minutes_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_estimated_minutes_check
      CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 0 AND 525600) NOT VALID;
  END IF;
END
$migration$;

CREATE TABLE IF NOT EXISTS organizations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  owner_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('owner', 'admin', 'manager', 'employee', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON organization_members(user_id, organization_id);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('admin', 'manager', 'employee', 'viewer')),
  invited_by BIGINT NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email, status)
);

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS organization_id BIGINT;

SELECT setval(
  pg_get_serial_sequence('organizations', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM organizations), 1), 1),
  EXISTS (SELECT 1 FROM organizations)
);

-- Give only unlinked workspaces new organizations.
DO $migration$
DECLARE
  legacy_workspace RECORD;
  new_organization_id BIGINT;
BEGIN
  FOR legacy_workspace IN
    SELECT id, name, owner_id
    FROM workspaces
    WHERE organization_id IS NULL
  LOOP
    INSERT INTO organizations(name, owner_id)
    VALUES (legacy_workspace.name, legacy_workspace.owner_id)
    RETURNING id INTO new_organization_id;

    UPDATE workspaces
    SET organization_id = new_organization_id
    WHERE id = legacy_workspace.id;
  END LOOP;
END
$migration$;

ALTER TABLE workspaces
  ALTER COLUMN organization_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_organization_id_id_unique
  ON workspaces(organization_id, id);

CREATE INDEX IF NOT EXISTS idx_workspaces_organization
  ON workspaces(organization_id, id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON workspace_members(user_id);

INSERT INTO organization_members(organization_id, user_id, role)
SELECT
  w.organization_id,
  wm.user_id,
  CASE WHEN wm.role = 'member' THEN 'employee' ELSE wm.role END
FROM workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO organization_members(organization_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM organizations
ON CONFLICT (organization_id, user_id) DO NOTHING;

ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS organization_id BIGINT;

UPDATE workspace_members wm
SET organization_id = w.organization_id
FROM workspaces w
WHERE wm.workspace_id = w.id
  AND wm.organization_id IS NULL;

ALTER TABLE workspace_members
  ALTER COLUMN organization_id SET NOT NULL;

-- This index must be created after organization_id exists.
CREATE INDEX IF NOT EXISTS idx_workspace_members_organization_user
  ON workspace_members(organization_id, user_id);

CREATE OR REPLACE FUNCTION sync_workspace_member_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  workspace_organization_id BIGINT;
BEGIN
  SELECT organization_id INTO workspace_organization_id
  FROM workspaces
  WHERE id = NEW.workspace_id;

  IF workspace_organization_id IS NULL THEN
    RAISE EXCEPTION 'Workspace does not exist or has no organization'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.organization_id IS NOT NULL
     AND NEW.organization_id <> workspace_organization_id THEN
    RAISE EXCEPTION 'Workspace membership organization does not match workspace'
      USING ERRCODE = '23514';
  END IF;

  NEW.organization_id := workspace_organization_id;
  RETURN NEW;
END;
$function$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.workspace_members'::regclass
      AND tgname = 'workspace_members_sync_organization'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER workspace_members_sync_organization
      BEFORE INSERT OR UPDATE ON workspace_members
      FOR EACH ROW EXECUTE FUNCTION sync_workspace_member_organization();
  END IF;
END
$migration$;

ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'member', 'employee', 'viewer')) NOT VALID;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'in_review', 'completed')) NOT VALID;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'critical')) NOT VALID;

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'manager', 'member', 'employee', 'viewer')),
  invited_by BIGINT NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email, status)
);

ALTER TABLE workspace_invitations
  DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;

ALTER TABLE workspace_invitations
  ADD CONSTRAINT workspace_invitations_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'employee', 'viewer')) NOT VALID;

CREATE TABLE IF NOT EXISTS subtasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  assignee_id BIGINT,
  due_date DATE,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  depends_on_task_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES users(id),
  resource_type VARCHAR(30) NOT NULL,
  resource_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  name VARCHAR(150) NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#7566d9',
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS task_labels (
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL,
  label_id BIGINT NOT NULL,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS time_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  manager_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name),
  UNIQUE (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS team_members (
  workspace_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('manager', 'employee')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  uploaded_by BIGINT NOT NULL REFERENCES users(id),
  original_name VARCHAR(255) NOT NULL,
  storage_key UUID NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_project_members UNIQUE (project_id, user_id)
);

ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members
  ON project_members(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project
  ON project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user
  ON project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_workspace
  ON project_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_subtasks_task
  ON subtasks(workspace_id, task_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_blocker
  ON task_dependencies(workspace_id, depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_activity_resource
  ON activity_logs(workspace_id, resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_milestones_project
  ON milestones(workspace_id, project_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_task
  ON time_entries(workspace_id, task_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_started
  ON time_entries(workspace_id, user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_completed
  ON time_entries(workspace_id, ended_at, started_at)
  WHERE ended_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_user
  ON team_members(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_user
  ON password_reset_tokens(user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task
  ON task_attachments(organization_id, workspace_id, task_id, created_at);

CREATE INDEX IF NOT EXISTS idx_projects_workspace
  ON projects(workspace_id);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace
  ON tasks(workspace_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project
  ON tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee
  ON tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_comments_task
  ON task_comments(task_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, is_read);

CREATE UNIQUE INDEX IF NOT EXISTS projects_workspace_id_id_unique
  ON projects(workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_workspace_id_id_unique
  ON tasks(workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS labels_workspace_id_id_unique
  ON labels(workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS teams_workspace_id_id_unique
  ON teams(workspace_id, id);

CREATE INDEX IF NOT EXISTS idx_projects_owner_member
  ON projects(workspace_id, owner_id);

CREATE INDEX IF NOT EXISTS idx_projects_manager_member
  ON projects(workspace_id, manager_id);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assignee
  ON tasks(workspace_id, assignee_id);

CREATE INDEX IF NOT EXISTS idx_subtasks_workspace_assignee
  ON subtasks(workspace_id, assignee_id);

CREATE INDEX IF NOT EXISTS idx_task_labels_workspace_label
  ON task_labels(workspace_id, label_id);

CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user
  ON notifications(workspace_id, user_id, is_read);

CREATE TABLE IF NOT EXISTS recurring_tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  recurrence_rule VARCHAR(100) NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recurrence_unit VARCHAR(10) CONSTRAINT recurring_tasks_unit_check
    CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('daily', 'weekly', 'monthly', 'custom')),
  interval_count INTEGER NOT NULL DEFAULT 1 CONSTRAINT recurring_tasks_interval_check
    CHECK (interval_count BETWEEN 1 AND 365),
  weekdays SMALLINT[],
  month_day SMALLINT CONSTRAINT recurring_tasks_month_day_check
    CHECK (month_day IS NULL OR month_day BETWEEN 1 AND 31),
  ends_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  assignee_id BIGINT,
  due_offset_days INTEGER CONSTRAINT recurring_tasks_due_offset_check
    CHECK (due_offset_days IS NULL OR due_offset_days BETWEEN 0 AND 3650)
);

ALTER TABLE recurring_tasks
  ADD COLUMN IF NOT EXISTS recurrence_unit VARCHAR(10),
  ADD COLUMN IF NOT EXISTS interval_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekdays SMALLINT[],
  ADD COLUMN IF NOT EXISTS month_day SMALLINT,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assignee_id BIGINT,
  ADD COLUMN IF NOT EXISTS due_offset_days INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS recurring_tasks_workspace_id_id_unique
  ON recurring_tasks(workspace_id, id);

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_due
  ON recurring_tasks(next_run_at)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_active_due
  ON recurring_tasks(next_run_at, id)
  WHERE is_active = TRUE AND paused_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_project
  ON recurring_tasks(workspace_id, project_id);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.recurring_tasks'::regclass
      AND conname = 'recurring_tasks_interval_check'
  ) THEN
    ALTER TABLE recurring_tasks
      ADD CONSTRAINT recurring_tasks_interval_check
      CHECK (interval_count BETWEEN 1 AND 365) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.recurring_tasks'::regclass
      AND conname = 'recurring_tasks_unit_check'
  ) THEN
    ALTER TABLE recurring_tasks
      ADD CONSTRAINT recurring_tasks_unit_check
      CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('daily', 'weekly', 'monthly', 'custom')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.recurring_tasks'::regclass
      AND conname = 'recurring_tasks_month_day_check'
  ) THEN
    ALTER TABLE recurring_tasks
      ADD CONSTRAINT recurring_tasks_month_day_check
      CHECK (month_day IS NULL OR month_day BETWEEN 1 AND 31) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.recurring_tasks'::regclass
      AND conname = 'recurring_tasks_due_offset_check'
  ) THEN
    ALTER TABLE recurring_tasks
      ADD CONSTRAINT recurring_tasks_due_offset_check
      CHECK (due_offset_days IS NULL OR due_offset_days BETWEEN 0 AND 3650) NOT VALID;
  END IF;
END
$migration$;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_id BIGINT,
  ADD COLUMN IF NOT EXISTS recurrence_run_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_recurring_occurrence
  ON tasks(recurrence_id, recurrence_run_at)
  WHERE recurrence_id IS NOT NULL
    AND recurrence_run_at IS NOT NULL;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON notifications(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  workspace_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mention_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  due_date_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Create tenant-scoped foreign keys without rejecting unrelated legacy rows.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.organizations'::regclass
      AND conname = 'organizations_owner_member_fk'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_owner_member_fk
      FOREIGN KEY (id, owner_id)
      REFERENCES organization_members(organization_id, user_id)
      DEFERRABLE INITIALLY DEFERRED NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspaces'::regclass
      AND conname = 'workspaces_organization_fk'
  ) THEN
    ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_organization_fk
      FOREIGN KEY (organization_id)
      REFERENCES organizations(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspace_members'::regclass
      AND conname = 'workspace_members_workspace_organization_fk'
  ) THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_workspace_organization_fk
      FOREIGN KEY (organization_id, workspace_id)
      REFERENCES workspaces(organization_id, id)
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspace_members'::regclass
      AND conname = 'workspace_members_organization_member_fk'
  ) THEN
    ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_organization_member_fk
      FOREIGN KEY (organization_id, user_id)
      REFERENCES organization_members(organization_id, user_id)
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.projects'::regclass
      AND conname = 'projects_workspace_owner_member_fk'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_workspace_owner_member_fk
      FOREIGN KEY (workspace_id, owner_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE SET NULL (owner_id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.projects'::regclass
      AND conname = 'projects_workspace_manager_member_fk'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_workspace_manager_member_fk
      FOREIGN KEY (workspace_id, manager_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE SET NULL (manager_id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_members'::regclass
      AND conname = 'project_members_workspace_project_fk'
  ) THEN
    ALTER TABLE project_members
      ADD CONSTRAINT project_members_workspace_project_fk
      FOREIGN KEY (workspace_id, project_id)
      REFERENCES projects(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_members'::regclass
      AND conname = 'project_members_workspace_member_fk'
  ) THEN
    ALTER TABLE project_members
      ADD CONSTRAINT project_members_workspace_member_fk
      FOREIGN KEY (workspace_id, user_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.recurring_tasks'::regclass
      AND conname = 'recurring_tasks_workspace_project_fk'
  ) THEN
    ALTER TABLE recurring_tasks
      ADD CONSTRAINT recurring_tasks_workspace_project_fk
      FOREIGN KEY (workspace_id, project_id)
      REFERENCES projects(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.recurring_tasks'::regclass
      AND conname = 'recurring_tasks_workspace_assignee_fk'
  ) THEN
    ALTER TABLE recurring_tasks
      ADD CONSTRAINT recurring_tasks_workspace_assignee_fk
      FOREIGN KEY (workspace_id, assignee_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE SET NULL (assignee_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_workspace_project_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_workspace_project_fk
      FOREIGN KEY (workspace_id, project_id)
      REFERENCES projects(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_workspace_assignee_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_workspace_assignee_fk
      FOREIGN KEY (workspace_id, assignee_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE SET NULL (assignee_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_recurring_task_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_recurring_task_fk
      FOREIGN KEY (workspace_id, recurrence_id)
      REFERENCES recurring_tasks(workspace_id, id)
      ON DELETE SET NULL (recurrence_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subtasks'::regclass
      AND conname = 'subtasks_workspace_task_fk'
  ) THEN
    ALTER TABLE subtasks
      ADD CONSTRAINT subtasks_workspace_task_fk
      FOREIGN KEY (workspace_id, task_id)
      REFERENCES tasks(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subtasks'::regclass
      AND conname = 'subtasks_workspace_assignee_fk'
  ) THEN
    ALTER TABLE subtasks
      ADD CONSTRAINT subtasks_workspace_assignee_fk
      FOREIGN KEY (workspace_id, assignee_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE SET NULL (assignee_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_dependencies'::regclass
      AND conname = 'task_dependencies_workspace_task_fk'
  ) THEN
    ALTER TABLE task_dependencies
      ADD CONSTRAINT task_dependencies_workspace_task_fk
      FOREIGN KEY (workspace_id, task_id)
      REFERENCES tasks(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_dependencies'::regclass
      AND conname = 'task_dependencies_workspace_blocker_fk'
  ) THEN
    ALTER TABLE task_dependencies
      ADD CONSTRAINT task_dependencies_workspace_blocker_fk
      FOREIGN KEY (workspace_id, depends_on_task_id)
      REFERENCES tasks(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_comments'::regclass
      AND conname = 'task_comments_workspace_task_fk'
  ) THEN
    ALTER TABLE task_comments
      ADD CONSTRAINT task_comments_workspace_task_fk
      FOREIGN KEY (workspace_id, task_id)
      REFERENCES tasks(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.activity_logs'::regclass
      AND conname = 'activity_logs_workspace_actor_fk'
  ) THEN
    ALTER TABLE activity_logs
      ADD CONSTRAINT activity_logs_workspace_actor_fk
      FOREIGN KEY (workspace_id, actor_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE SET NULL (actor_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.milestones'::regclass
      AND conname = 'milestones_workspace_project_fk'
  ) THEN
    ALTER TABLE milestones
      ADD CONSTRAINT milestones_workspace_project_fk
      FOREIGN KEY (workspace_id, project_id)
      REFERENCES projects(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_labels'::regclass
      AND conname = 'task_labels_workspace_task_fk'
  ) THEN
    ALTER TABLE task_labels
      ADD CONSTRAINT task_labels_workspace_task_fk
      FOREIGN KEY (workspace_id, task_id)
      REFERENCES tasks(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_labels'::regclass
      AND conname = 'task_labels_workspace_label_fk'
  ) THEN
    ALTER TABLE task_labels
      ADD CONSTRAINT task_labels_workspace_label_fk
      FOREIGN KEY (workspace_id, label_id)
      REFERENCES labels(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.time_entries'::regclass
      AND conname = 'time_entries_workspace_task_fk'
  ) THEN
    ALTER TABLE time_entries
      ADD CONSTRAINT time_entries_workspace_task_fk
      FOREIGN KEY (workspace_id, task_id)
      REFERENCES tasks(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND conname = 'notifications_workspace_member_fk'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_workspace_member_fk
      FOREIGN KEY (workspace_id, user_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.notification_preferences'::regclass
      AND conname = 'notification_preferences_workspace_member_fk'
  ) THEN
    ALTER TABLE notification_preferences
      ADD CONSTRAINT notification_preferences_workspace_member_fk
      FOREIGN KEY (workspace_id, user_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.teams'::regclass
      AND conname = 'teams_workspace_manager_member_fk'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_workspace_manager_member_fk
      FOREIGN KEY (workspace_id, manager_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE SET NULL (manager_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.team_members'::regclass
      AND conname = 'team_members_workspace_team_fk'
  ) THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_workspace_team_fk
      FOREIGN KEY (workspace_id, team_id)
      REFERENCES teams(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.team_members'::regclass
      AND conname = 'team_members_workspace_member_fk'
  ) THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_workspace_member_fk
      FOREIGN KEY (workspace_id, user_id)
      REFERENCES workspace_members(workspace_id, user_id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_attachments'::regclass
      AND conname = 'task_attachments_organization_workspace_fk'
  ) THEN
    ALTER TABLE task_attachments
      ADD CONSTRAINT task_attachments_organization_workspace_fk
      FOREIGN KEY (organization_id, workspace_id)
      REFERENCES workspaces(organization_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_attachments'::regclass
      AND conname = 'task_attachments_workspace_task_fk'
  ) THEN
    ALTER TABLE task_attachments
      ADD CONSTRAINT task_attachments_workspace_task_fk
      FOREIGN KEY (workspace_id, task_id)
      REFERENCES tasks(workspace_id, id)
      ON DELETE CASCADE NOT VALID;
  END IF;
END
$migration$;

COMMIT;