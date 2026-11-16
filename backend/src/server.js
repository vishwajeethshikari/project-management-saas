
require("dotenv").config();

const { validateEnvironment } = require("./config/env");
const { runDueRecurringTasks } = require("./controllers/recurringTaskController");
const { runDueDateReminders } = require("./controllers/notificationController");
const pool = require("./config/db");
const { logError } = require("./utils/errorLogging");

validateEnvironment();

function scheduleBackgroundJobs() {
  const run = (name, job) => job().catch((error) => logError(name, error));
  const recurringTaskTimer = setInterval(() => {
    run("Recurring task generation", runDueRecurringTasks);
  }, 60_000);
  recurringTaskTimer.unref();
  const dueDateReminderTimer = setInterval(() => {
    run("Due-date reminder generation", runDueDateReminders);
  }, 15 * 60_000);
  dueDateReminderTimer.unref();
  run("Recurring task generation", runDueRecurringTasks);
  run("Due-date reminder generation", runDueDateReminders);
}

async function start() {
  const connection = await pool.query("SELECT current_database() AS database");
  const app = require("./app");
  const port = process.env.PORT || 5000;
  const server = app.listen(port);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  console.log(`PostgreSQL connected: ${connection.rows[0].database}`);
  console.log(`Server running at http://localhost:${port}`);
  scheduleBackgroundJobs();
  return server;
}

start().catch(async (error) => {
  logError("Backend startup", error);
  try { await pool.end(); } catch (closeError) {
    logError("PostgreSQL pool shutdown", closeError);
  }
  process.exitCode = 1;
});
