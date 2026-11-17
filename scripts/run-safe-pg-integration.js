// Safely provisions/uses only the local project_management_test database.
// It never drops a database and it refuses application/production targets.
const { spawnSync } = require("node:child_process");
const { resolve, join } = require("node:path");
const { readFile } = require("node:fs/promises");
const dotenv = require("../backend/node_modules/dotenv");
const { Client } = require("../backend/node_modules/pg");
const { getTestDatabaseUrl } = require("../backend/src/config/testDb");

dotenv.config({ path: resolve(__dirname, "../backend/.env") });

function getApplicationUrl() {
  if (process.env.DATABASE_URL) return new URL(process.env.DATABASE_URL);
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const name = process.env.DB_NAME || "project_management_saas";
  const credentials = user ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : "";
  return new URL(`postgresql://${credentials}${host}:${port}/${encodeURIComponent(name)}`);
}

async function main() {
  const applicationUrl = getApplicationUrl();
  const testUrl = process.env.TEST_DATABASE_URL ? new URL(process.env.TEST_DATABASE_URL) : new URL(applicationUrl);
  if (!process.env.TEST_DATABASE_URL) testUrl.pathname = "/project_management_test";
  const testName = decodeURIComponent(testUrl.pathname.slice(1));
  const applicationName = decodeURIComponent(applicationUrl.pathname.slice(1));
  if (testName !== "project_management_test" || testUrl.hostname.toLowerCase() !== "localhost" || (testUrl.port || "5432") !== "5432") {
    throw new Error("Refusing: test target must be localhost:5432/project_management_test.");
  }
  if (testName === applicationName && testUrl.hostname.toLowerCase() === applicationUrl.hostname.toLowerCase() && (testUrl.port || "5432") === (applicationUrl.port || "5432")) {
    throw new Error("Refusing: test target matches the application database.");
  }
  process.env.TEST_DATABASE_URL = testUrl.toString();
  getTestDatabaseUrl();

  const sourceClient = new Client({ connectionString: applicationUrl.toString() });
  await sourceClient.connect();
  const source = await sourceClient.query("SELECT current_database() AS database");
  await sourceClient.end();
  if (source.rows[0].database === testName) throw new Error("Refusing: configured application database is the test database.");

  const testClient = new Client({ connectionString: testUrl.toString() });
  try {
    await testClient.connect();
  } catch (error) {
    await testClient.end().catch(() => {});
    if (error.code !== "3D000") throw new Error(`Test database connection failed (${error.code || "unknown"}); no database changes were made.`);
    const adminUrl = new URL(testUrl);
    adminUrl.pathname = "/postgres";
    const adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    const existing = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [testName]);
    if (existing.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${testName}"`);
      console.log("Created the isolated project_management_test database; no database was dropped or reset.");
    }
    await adminClient.end();
    await testClient.connect();
  }
  const identity = await testClient.query("SELECT current_database() AS database");
  if (identity.rows[0].database !== "project_management_test") throw new Error("Connected database identity check failed.");
  for (const migration of [
    "001_create_users.sql", "002_create_workspace_domain.sql", "003_expand_task_workflows.sql",
    "004_teams_and_account_recovery.sql", "005_organizations_sessions.sql", "006_task_attachments.sql",
    "007_time_reporting_recurring_rules.sql", "008_workload_analytics_notifications.sql",
    "009_backfill_organization_memberships.sql", "010_project_members_and_enhancements.sql",
  ]) {
    const sql = await readFile(join(__dirname, "../database/migrations", migration), "utf8");
    await testClient.query(sql);
  }
  await testClient.end();

  const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "test/integration.test.js", "test/authorizationIsolation.test.js"], {
    cwd: resolve(__dirname, "../backend"),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
