require("dotenv").config({ path: require("node:path").join(__dirname, ".env") });
const pool = require("./src/config/db");
async function main() {
  const info = await pool.query(`SELECT current_database() AS database,
    to_regclass('public.recurring_tasks') IS NOT NULL AS recurring_table,
    to_regclass('public.notification_preferences') IS NOT NULL AS notification_preferences_table,
    to_regclass('public.idx_tasks_recurring_occurrence') IS NOT NULL AS occurrence_unique_index,
    to_regclass('public.idx_notifications_dedupe') IS NOT NULL AS notification_dedupe_index,
    (SELECT COUNT(*)::int FROM recurring_tasks WHERE is_active) AS active_rules,
    (SELECT COUNT(*)::int FROM tasks WHERE status<>'completed' AND assignee_id IS NOT NULL AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+1) AS reminder_candidates`);
  const columns = await pool.query(`SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='public' AND ((table_name='recurring_tasks' AND column_name IN ('recurrence_unit','interval_count','month_day','assignee_id','due_offset_days','next_run_at'))
      OR (table_name='tasks' AND column_name IN ('recurrence_id','recurrence_run_at'))
      OR (table_name='notifications' AND column_name='dedupe_key')) ORDER BY table_name,column_name`);
  const history = await pool.query(`SELECT to_regclass('public.schema_migrations') AS schema_migrations,
    to_regclass('public.migrations') AS migrations_table`);
  console.log(JSON.stringify({ ...info.rows[0], relevant_columns: columns.rows, migration_history_tables: history.rows[0] }));
}
main().catch((error) => { console.error(JSON.stringify({ code: error.code, message: error.message, stack: error.stack })); process.exitCode = 1; }).finally(() => pool.end());
