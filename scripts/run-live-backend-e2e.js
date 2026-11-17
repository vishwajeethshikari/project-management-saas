// Starts Express against only project_management_test, runs live Playwright,
// then closes all server/database handles. The test DB is never dropped/reset.
const { spawn } = require("node:child_process");
const { resolve, join } = require("node:path");
const { readFile } = require("node:fs/promises");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { randomBytes } = require("node:crypto");
const http = require("node:http");
const dotenv = require("../backend/node_modules/dotenv");
const { Client } = require("../backend/node_modules/pg");
const { getTestDatabaseUrl } = require("../backend/src/config/testDb");

dotenv.config({ path: resolve(__dirname, "../backend/.env") });

function applicationUrl() {
  if (process.env.DATABASE_URL) return new URL(process.env.DATABASE_URL);
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";
  const credentials = user ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : "";
  return new URL(`postgresql://${credentials}${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${encodeURIComponent(process.env.DB_NAME || "project_management_saas")}`);
}

async function main() {
  const appUrl = applicationUrl();
  const testUrl = process.env.TEST_DATABASE_URL ? new URL(process.env.TEST_DATABASE_URL) : new URL(appUrl);
  if (!process.env.TEST_DATABASE_URL) testUrl.pathname = "/project_management_test";
  const appName = decodeURIComponent(appUrl.pathname.slice(1));
  const testName = decodeURIComponent(testUrl.pathname.slice(1));
  if (testName !== "project_management_test" || testUrl.hostname.toLowerCase() !== "localhost" || (testUrl.port || "5432") !== "5432" || testName === appName) {
    throw new Error("Refusing live browser run: TEST_DATABASE_URL must identify a separate localhost:5432/project_management_test database.");
  }
  process.env.TEST_DATABASE_URL = testUrl.toString();
  getTestDatabaseUrl();

  const verifier = new Client({ connectionString: testUrl.toString() });
  await verifier.connect();
  const identity = await verifier.query("SELECT current_database() AS database");
  if (identity.rows[0].database !== "project_management_test") throw new Error("Connected database identity check failed.");
  for (const migration of [
    "001_create_users.sql", "002_create_workspace_domain.sql", "003_expand_task_workflows.sql",
    "004_teams_and_account_recovery.sql", "005_organizations_sessions.sql", "006_task_attachments.sql",
    "007_time_reporting_recurring_rules.sql", "008_workload_analytics_notifications.sql",
    "009_backfill_organization_memberships.sql", "010_project_members_and_enhancements.sql",
  ]) {
    await verifier.query(await readFile(join(__dirname, "../database/migrations", migration), "utf8"));
  }
  await verifier.end();

  process.env.DATABASE_URL = testUrl.toString();
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.NODE_ENV = "test";
  process.env.PORT = "5000";
  process.env.CORS_ORIGINS = "http://localhost:4173";
  process.env.FRONTEND_URL = "http://localhost:4173";
  process.env.EMAIL_API_KEY = "";
  process.env.EMAIL_FROM = "";
  const attachmentDirectory = await mkdtemp(join(tmpdir(), "projectflow-live-e2e-"));
  process.env.ATTACHMENT_STORAGE_DIR = attachmentDirectory;

  const app = require("../backend/src/app");
  const pool = require("../backend/src/config/db");
  const server = http.createServer(app);
  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(5000, resolveListen);
    });
    const ready = await fetch("http://localhost:5000/api/ready");
    if (!ready.ok) throw new Error("Live Express server did not pass its PostgreSQL readiness check.");

    const cli = resolve(__dirname, "../frontend/node_modules/@playwright/test/cli.js");
    const result = await new Promise((resolveChild, rejectChild) => {
      const child = spawn(process.execPath, [cli, "test", "--config=playwright.live.config.js"], {
        cwd: resolve(__dirname, "../frontend"),
        env: process.env,
        stdio: "inherit",
      });
      child.once("error", rejectChild);
      child.once("exit", (code, signal) => resolveChild({ code, signal }));
    });
    process.exitCode = result.code ?? 1;
  } finally {
    await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
    await pool.end();
    await rm(attachmentDirectory, { recursive: true, force: true });
    delete process.env.ATTACHMENT_STORAGE_DIR;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
