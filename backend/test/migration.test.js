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
