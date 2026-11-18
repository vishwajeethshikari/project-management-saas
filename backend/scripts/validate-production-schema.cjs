const { Pool } = require("pg");
const { getDatabaseConfig } = require("../src/config/databaseConfig");

const requiredColumns = {
  users: ["id", "name", "email", "password_hash", "token_version"],
  organizations: ["id", "name", "owner_id"],
  organization_members: ["organization_id", "user_id", "role"],
  organization_invitations: ["id", "organization_id", "token_hash", "status"],
  workspaces: ["id", "organization_id", "owner_id"],
  workspace_members: ["workspace_id", "organization_id", "user_id", "role"],
  workspace_invitations: ["id", "workspace_id", "token_hash", "status"],
  projects: ["id", "workspace_id", "owner_id", "manager_id", "start_date"],
  project_members: ["id", "workspace_id", "project_id", "user_id", "joined_at"],
  tasks: [
    "id", "workspace_id", "project_id", "assignee_id", "start_date",
    "estimated_minutes", "completed_at", "archived_at", "recurrence_id",
    "recurrence_run_at",
  ],
  recurring_tasks: [
    "id", "workspace_id", "project_id", "created_by", "title", "priority",
    "recurrence_rule", "next_run_at", "is_active", "recurrence_unit",
    "interval_count", "weekdays", "month_day", "ends_at", "paused_at",
    "assignee_id", "due_offset_days",
  ],
  subtasks: ["id", "workspace_id", "task_id", "title", "is_completed", "assignee_id"],
  task_dependencies: ["workspace_id", "task_id", "depends_on_task_id", "created_by"],
  task_comments: ["id", "workspace_id", "task_id", "user_id", "body"],
  activity_logs: ["id", "workspace_id", "actor_id", "resource_type", "resource_id"],
  milestones: ["id", "workspace_id", "project_id", "name"],
  labels: ["id", "workspace_id", "name", "color"],
  task_labels: ["workspace_id", "task_id", "label_id"],
  time_entries: ["id", "workspace_id", "task_id", "user_id", "started_at", "ended_at"],
  notifications: [
    "id", "workspace_id", "user_id", "type", "message", "is_read", "dedupe_key",
  ],
  notification_preferences: [
    "workspace_id", "user_id", "assignment_enabled", "mention_enabled",
    "due_date_enabled",
  ],
  teams: ["id", "workspace_id", "name", "manager_id", "created_by"],
  team_members: ["workspace_id", "team_id", "user_id", "role"],
  password_reset_tokens: ["id", "user_id", "token_hash", "expires_at", "used_at"],
  task_attachments: [
    "id", "organization_id", "workspace_id", "task_id", "storage_key",
    "mime_type", "byte_size",
  ],
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL explicitly before running schema validation.");
  }

  const pool = new Pool(getDatabaseConfig());
  try {
    const result = await pool.query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [Object.keys(requiredColumns)]
    );
    const actualColumns = new Map();
    for (const { table_name: tableName, column_name: columnName } of result.rows) {
      if (!actualColumns.has(tableName)) actualColumns.set(tableName, new Set());
      actualColumns.get(tableName).add(columnName);
    }

    const missingTables = [];
    const missingColumns = [];
    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      const actual = actualColumns.get(tableName);
      if (!actual) {
        missingTables.push(tableName);
        continue;
      }
      for (const columnName of columns) {
        if (!actual.has(columnName)) missingColumns.push(`${tableName}.${columnName}`);
      }
    }

    if (missingTables.length || missingColumns.length) {
      console.error(JSON.stringify({ valid: false, missingTables, missingColumns }, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log(`Schema validation passed for ${Object.keys(requiredColumns).length} tables.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Schema validation failed:", error.message);
  process.exitCode = 1;
});
