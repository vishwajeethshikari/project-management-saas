const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

test("workspace domain migration preserves existing users and is additive", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/002_create_workspace_domain.sql"), "utf8");
  assert.match(migration, /REFERENCES users\(id\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS workspaces/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("task workflow migration adds workflow entities without destructive SQL", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/003_expand_task_workflows.sql"), "utf8");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS start_date/);
  assert.match(migration, /in_review/);
  assert.match(migration, /critical/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS subtasks/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS task_dependencies/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS activity_logs/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("team and recovery migration is additive and supports manager/employee roles", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/004_teams_and_account_recovery.sql"), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS teams/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS team_members/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS password_reset_tokens/);
  assert.match(migration, /'manager'.*'employee'/s);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("organization and session migration preserves workspace memberships without destructive SQL", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/005_organizations_sessions.sql"), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS organizations/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS organization_members/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS organization_id/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS token_version/);
  assert.match(migration, /INSERT INTO organization_members/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("task attachment migration is additive and scopes metadata to its tenant", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/006_task_attachments.sql"), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS task_attachments/);
  assert.match(migration, /organization_id BIGINT NOT NULL REFERENCES organizations/);
  assert.match(migration, /workspace_id BIGINT NOT NULL REFERENCES workspaces/);
  assert.match(migration, /task_id BIGINT NOT NULL REFERENCES tasks/);
  assert.match(migration, /CHECK \(byte_size > 0\)/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("time and recurrence migration adds indexes and occurrence keys without deleting data", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/007_time_reporting_recurring_rules.sql"), "utf8");
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_time_entries_user_started/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS recurrence_unit/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS ends_at/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_recurring_occurrence/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("workload and notification migration adds estimates and deduplicated preference storage without deleting data", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/008_workload_analytics_notifications.sql"), "utf8");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS estimated_minutes/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS completed_at/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS notification_preferences/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("organization membership backfill is idempotent and insert-only", () => {
  const migration = readFileSync(join(__dirname, "../../database/migrations/009_backfill_organization_memberships.sql"), "utf8");
  assert.match(migration, /INSERT INTO organization_members/i);
  assert.match(migration, /WHERE NOT EXISTS/i);
  assert.match(migration, /CASE WHEN wm\.role = 'member' THEN 'employee'/i);
  assert.doesNotMatch(migration, /\b(?:UPDATE|DELETE|DROP|TRUNCATE)\b/i);
});
