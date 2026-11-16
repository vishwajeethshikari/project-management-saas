const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const config = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const host = config?.hostname || process.env.DB_HOST || "localhost";
const port = config?.port || process.env.DB_PORT || "5432";
const user = config ? decodeURIComponent(config.username) : process.env.DB_USER;
const password = config ? decodeURIComponent(config.password) : process.env.DB_PASSWORD || "";
const testUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/project_management_test`;
const backupDir = path.join(process.env.TEMP || process.env.TMP, "project-management-saas-backups");
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `project_management_test-before-background-jobs-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
const baseArgs = ["--no-owner", "--no-acl", "--host", host, "--port", port, "--username", user, "--dbname", "project_management_test"];
const env = { ...process.env, PGPASSWORD: password };
const dump = spawnSync("C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe", ["--format=custom", ...baseArgs, "--file", backup], { env, encoding: "utf8", windowsHide: true });
if (dump.status !== 0) throw new Error(`Test database backup failed (${dump.status}): ${dump.stderr || dump.error}`);
console.log(`Test database backup created: ${backup}`);
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1"], {
  cwd: __dirname,
  env: { ...process.env, TEST_DATABASE_URL: testUrl },
  stdio: "inherit",
  windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
