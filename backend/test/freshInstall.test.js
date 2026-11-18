const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const schema = readFileSync(
  join(__dirname, "../../database/fresh-install.sql"),
  "utf8"
);

test("fresh-install SQL is transactional, empty-database-only, and has no seeded data", () => {
  assert.match(schema, /^\s*--[^\n]*new, empty ProjectFlow database/i);
  assert.match(schema, /(?:^|\r?\n)\s*BEGIN\s*;/i);
  assert.match(schema, /COMMIT;\s*$/i);
  assert.doesNotMatch(schema, /\b(?:DROP|TRUNCATE)\b/i);
  assert.doesNotMatch(schema, /\bINSERT\s+INTO\b/i);
});

test("fresh schema contains every application relation with BIGINT identifiers", () => {
  const tables = [
    "users",
    "organizations",
    "organization_members",
    "organization_invitations",
    "workspaces",
    "workspace_members",
    "workspace_invitations",
    "projects",
    "project_members",
    "tasks",
    "subtasks",
    "task_dependencies",
    "task_comments",
    "notifications",
    "activity_logs",
    "milestones",
    "labels",
    "task_labels",
    "time_entries",
    "recurring_tasks",
    "notification_preferences",
    "teams",
    "team_members",
    "password_reset_tokens",
    "task_attachments",
  ];

  for (const table of tables) {
    assert.match(schema, new RegExp(`CREATE TABLE ${table} \\(`, "i"), table);
  }
  assert.doesNotMatch(schema, /\b(?:id|[a-z_]+_id)\s+INTEGER\b/i);
});

test("tenant-scoped relations have composite organization and workspace constraints", () => {
  assert.match(
    schema,
    /FOREIGN KEY \(organization_id, workspace_id\)\s+REFERENCES workspaces\(organization_id, id\)/i
  );
  assert.match(
    schema,
    /FOREIGN KEY \(organization_id, user_id\)\s+REFERENCES organization_members\(organization_id, user_id\)/i
  );
  assert.match(
    schema,
    /FOREIGN KEY \(workspace_id, project_id\)\s+REFERENCES projects\(workspace_id, id\)/i
  );
  assert.match(
    schema,
    /FOREIGN KEY \(workspace_id, task_id\)\s+REFERENCES tasks\(workspace_id, id\)/i
  );
  assert.match(
    schema,
    /FOREIGN KEY \(workspace_id, label_id\)\s+REFERENCES labels\(workspace_id, id\)/i
  );
});

test("fresh schema creates parent relations before their dependents", () => {
  const createPosition = (table) =>
    schema.indexOf(`CREATE TABLE ${table} (`);
  const orderedTables = [
    "users",
    "organizations",
    "organization_members",
    "workspaces",
    "workspace_members",
    "projects",
    "recurring_tasks",
    "tasks",
    "subtasks",
    "task_dependencies",
    "task_comments",
    "task_labels",
    "time_entries",
    "notifications",
  ];

  for (let index = 1; index < orderedTables.length; index += 1) {
    assert.ok(
      createPosition(orderedTables[index - 1]) <
        createPosition(orderedTables[index]),
      `${orderedTables[index - 1]} must be created before ${orderedTables[index]}`
    );
  }
});
