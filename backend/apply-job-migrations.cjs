const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const database = {
  name: url ? decodeURIComponent(url.pathname.slice(1)) : process.env.DB_NAME || "project_management_saas",
  host: url?.hostname || process.env.DB_HOST || "localhost",
  port: url?.port || process.env.DB_PORT || "5432",
  user: (url ? decodeURIComponent(url.username) : process.env.DB_USER) || "",
  password: url ? decodeURIComponent(url.password) : process.env.DB_PASSWORD || "",
};
if (database.name !== "project_management_saas" || !database.user) {
  throw new Error("Refusing to migrate: configured database does not match project_management_saas.");
}

const pgBin = "C:\\Program Files\\PostgreSQL\\18\\bin";
const backupDir = path.join(process.env.TEMP || process.env.TMP, "project-management-saas-backups");
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `project_management_saas-before-job-migrations-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
const env = { ...process.env, PGPASSWORD: database.password };
const dump = spawnSync(path.join(pgBin, "pg_dump.exe"), [
  "--format=custom", "--no-owner", "--no-acl", "--host", database.host,
  "--port", database.port, "--username", database.user, "--dbname", database.name,
  "--file", backup,
], { env, encoding: "utf8", windowsHide: true });
if (dump.status !== 0) throw new Error(`PostgreSQL backup failed (${dump.status}): ${dump.stderr || dump.error}`);
console.log(`Backup created: ${backup}`);

for (const filename of ["007_time_reporting_recurring_rules.sql", "008_workload_analytics_notifications.sql"]) {
  const migration = path.join(__dirname, "..", "database", "migrations", filename);
  const result = spawnSync(path.join(pgBin, "psql.exe"), [
    "-X", "-w", "--set=ON_ERROR_STOP=1", "--host", database.host,
    "--port", database.port, "--username", database.user, "--dbname", database.name,
    "--file", migration,
  ], { env, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`${filename} failed (${result.status}): ${result.stderr || result.error}`);
  console.log(`${filename} applied.`);
}
