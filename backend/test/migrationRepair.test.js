const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const migrationPath = join(__dirname, "../../database/migrations/011_repair_production_schema.sql");
const validationPath = join(__dirname, "../scripts/validate-production-schema.cjs");

test("production repair migration covers the reported schema gaps and dependent objects", () => {
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR\(200\)/i);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS recurring_tasks/i);
  for (const table of [
    "subtasks", "task_dependencies", "task_comments", "activity_logs", "milestones",
    "labels", "task_labels", "time_entries", "teams", "team_members",
    "password_reset_tokens", "task_attachments", "workspace_invitations",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"));
  }
  for (const column of [
    "recurrence_rule", "next_run_at", "recurrence_unit", "interval_count",
    "weekdays", "month_day", "ends_at", "paused_at", "assignee_id", "due_offset_days",
  ]) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, "i"));
  }
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_recurring_occurrence/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS notification_preferences/i);
  assert.match(migration, /project_members_workspace_project_fk/i);
  assert.match(migration, /workspace_members_organization_member_fk/i);
  assert.match(migration, /notifications_workspace_member_fk/i);
  assert.match(migration, /task_attachments_organization_workspace_fk/i);
  assert.doesNotMatch(migration, /\bLIMIT\b/i);
});

test("production repair migration is additive and wired into the aggregate schema", () => {
  const migration = readFileSync(migrationPath, "utf8");
  const aggregate = readFileSync(join(__dirname, "../../database/schema.sql"), "utf8");

  assert.match(migration, /\bBEGIN;/i);
  assert.match(migration, /COMMIT;\s*$/i);
  assert.match(aggregate, /\\ir migrations\/011_repair_production_schema\.sql/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE|COLUMN)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("schema validator checks required tables and columns without running migrations", () => {
  const validator = readFileSync(validationPath, "utf8");

  assert.match(validator, /DATABASE_URL/);
  assert.match(validator, /information_schema\.columns/i);
  assert.match(validator, /token_version/);
  assert.match(validator, /dedupe_key/);
  assert.match(validator, /recurring_tasks/);
  assert.doesNotMatch(validator, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
});
