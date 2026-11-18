-- Initialize a new, empty ProjectFlow database. Do not run on an existing database.
BEGIN;

CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(60) NOT NULL,
  avatar_url TEXT,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email));

CREATE TABLE organizations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  owner_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_members (
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('owner', 'admin', 'manager', 'employee', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX idx_organization_members_user
  ON organization_members(user_id, organization_id);
ALTER TABLE organizations
  ADD CONSTRAINT organizations_owner_member_fk
  FOREIGN KEY (id, owner_id)
  REFERENCES organization_members(organization_id, user_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE organization_invitations (
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

CREATE TABLE workspaces (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, id)
);
CREATE INDEX idx_workspaces_organization
  ON workspaces(organization_id, id);

CREATE TABLE workspace_members (
  workspace_id BIGINT NOT NULL,
  organization_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'manager', 'member', 'employee', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES workspaces(organization_id, id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_members(organization_id, user_id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_organization_user
  ON workspace_members(organization_id, user_id);

CREATE FUNCTION sync_workspace_member_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  workspace_organization_id BIGINT;
BEGIN
  SELECT organization_id INTO workspace_organization_id
  FROM workspaces
  WHERE id = NEW.workspace_id;

  IF workspace_organization_id IS NULL THEN
    RAISE EXCEPTION 'Workspace does not exist'
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
$$;
CREATE TRIGGER workspace_members_sync_organization
  BEFORE INSERT OR UPDATE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION sync_workspace_member_organization();

CREATE TABLE workspace_invitations (
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

CREATE TABLE projects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'archived')),
  owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  manager_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, owner_id)
    REFERENCES workspace_members(workspace_id, user_id)
    ON DELETE SET NULL (owner_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (workspace_id, manager_id)
    REFERENCES workspace_members(workspace_id, user_id)
    ON DELETE SET NULL (manager_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_projects_owner_member ON projects(workspace_id, owner_id);
CREATE INDEX idx_projects_manager_member ON projects(workspace_id, manager_id);

CREATE TABLE project_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_project_members UNIQUE (project_id, user_id),
  FOREIGN KEY (workspace_id, project_id)
    REFERENCES projects(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE CASCADE
);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_workspace ON project_members(workspace_id);

CREATE TABLE recurring_tasks (
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
  recurrence_unit VARCHAR(10)
    CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('daily', 'weekly', 'monthly', 'custom')),
  interval_count INTEGER NOT NULL DEFAULT 1
    CHECK (interval_count BETWEEN 1 AND 365),
  weekdays SMALLINT[],
  month_day SMALLINT CHECK (month_day IS NULL OR month_day BETWEEN 1 AND 31),
  ends_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  assignee_id BIGINT,
  due_offset_days INTEGER
    CHECK (due_offset_days IS NULL OR due_offset_days BETWEEN 0 AND 3650),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, project_id)
    REFERENCES projects(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, assignee_id)
    REFERENCES workspace_members(workspace_id, user_id)
    ON DELETE SET NULL (assignee_id)
);
CREATE INDEX idx_recurring_tasks_due
  ON recurring_tasks(next_run_at) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_tasks_active_due
  ON recurring_tasks(next_run_at, id)
  WHERE is_active = TRUE AND paused_at IS NULL;
CREATE INDEX idx_recurring_tasks_project
  ON recurring_tasks(workspace_id, project_id);

CREATE TABLE tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'in_review', 'completed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assignee_id BIGINT,
  start_date DATE,
  due_date DATE,
  created_by BIGINT NOT NULL REFERENCES users(id),
  estimated_minutes INTEGER
    CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 0 AND 525600),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  recurrence_id BIGINT,
  recurrence_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, project_id)
    REFERENCES projects(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, assignee_id)
    REFERENCES workspace_members(workspace_id, user_id)
    ON DELETE SET NULL (assignee_id)
);
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_workspace_assignee ON tasks(workspace_id, assignee_id);

ALTER TABLE tasks
  ADD CONSTRAINT tasks_recurring_task_fk
  FOREIGN KEY (workspace_id, recurrence_id)
  REFERENCES recurring_tasks(workspace_id, id)
  ON DELETE SET NULL (recurrence_id);
CREATE UNIQUE INDEX idx_tasks_recurring_occurrence
  ON tasks(recurrence_id, recurrence_run_at)
  WHERE recurrence_id IS NOT NULL AND recurrence_run_at IS NOT NULL;

CREATE TABLE subtasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  assignee_id BIGINT,
  due_date DATE,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, task_id)
    REFERENCES tasks(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, assignee_id)
    REFERENCES workspace_members(workspace_id, user_id)
    ON DELETE SET NULL (assignee_id)
);
CREATE INDEX idx_subtasks_task ON subtasks(workspace_id, task_id);
CREATE INDEX idx_subtasks_workspace_assignee
  ON subtasks(workspace_id, assignee_id);

CREATE TABLE task_dependencies (
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  depends_on_task_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id),
  FOREIGN KEY (workspace_id, task_id)
    REFERENCES tasks(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, depends_on_task_id)
    REFERENCES tasks(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_task_dependencies_blocker
  ON task_dependencies(workspace_id, depends_on_task_id);

CREATE TABLE task_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, task_id)
    REFERENCES tasks(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_task ON task_comments(task_id);

CREATE TABLE activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES users(id),
  resource_type VARCHAR(30) NOT NULL,
  resource_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, actor_id)
    REFERENCES workspace_members(workspace_id, user_id)
    ON DELETE SET NULL (actor_id)
);
CREATE INDEX idx_activity_resource
  ON activity_logs(workspace_id, resource_type, resource_id, created_at DESC);

CREATE TABLE milestones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  name VARCHAR(150) NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, project_id)
    REFERENCES projects(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_milestones_project ON milestones(workspace_id, project_id);

CREATE TABLE labels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#7566d9',
  UNIQUE (workspace_id, name),
  UNIQUE (workspace_id, id)
);

CREATE TABLE task_labels (
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL,
  label_id BIGINT NOT NULL,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (workspace_id, task_id)
    REFERENCES tasks(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, label_id)
    REFERENCES labels(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_task_labels_workspace_label
  ON task_labels(workspace_id, label_id);

CREATE TABLE time_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, task_id)
    REFERENCES tasks(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_time_entries_task
  ON time_entries(workspace_id, task_id, started_at DESC);
CREATE INDEX idx_time_entries_user_started
  ON time_entries(workspace_id, user_id, started_at DESC);
CREATE INDEX idx_time_entries_completed
  ON time_entries(workspace_id, ended_at, started_at)
  WHERE ended_at IS NOT NULL;

CREATE TABLE notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  resource_type VARCHAR(30),
  resource_id BIGINT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  dedupe_key VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_workspace_user
  ON notifications(workspace_id, user_id, is_read);
CREATE UNIQUE INDEX idx_notifications_dedupe
  ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE notification_preferences (
  workspace_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mention_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  due_date_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE CASCADE
);

CREATE TABLE teams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  manager_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, manager_id)
    REFERENCES workspace_members(workspace_id, user_id)
    ON DELETE SET NULL (manager_id)
);

CREATE TABLE team_members (
  workspace_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('manager', 'employee')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (workspace_id, team_id)
    REFERENCES teams(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id)
    REFERENCES workspace_members(workspace_id, user_id) ON DELETE CASCADE
);
CREATE INDEX idx_team_members_user ON team_members(workspace_id, user_id);

CREATE TABLE password_reset_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_reset_user
  ON password_reset_tokens(user_id, expires_at DESC);

CREATE TABLE task_attachments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  workspace_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  uploaded_by BIGINT NOT NULL REFERENCES users(id),
  original_name VARCHAR(255) NOT NULL,
  storage_key UUID NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES workspaces(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, task_id)
    REFERENCES tasks(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_task_attachments_task
  ON task_attachments(organization_id, workspace_id, task_id, created_at);

COMMIT;
