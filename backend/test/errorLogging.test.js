const assert = require("node:assert/strict");
const { test } = require("node:test");
const { redactLogText } = require("../src/utils/errorLogging");

test("redacts complete PostgreSQL connection strings from log text", () => {
  const url =
    "postgresql://user:password@database.example.test:5432/projectflow?sslmode=require";

  const redacted = redactLogText(`Connection failed: ${url}`);

  assert.equal(redacted, "Connection failed: [REDACTED_DATABASE_URL]");
  assert.equal(redacted.includes("database.example.test"), false);
  assert.equal(redacted.includes("password"), false);
});
