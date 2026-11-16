const pool = require("../config/db");
const { recurringTaskCreateSchema } = require("../validators/domainValidator");
const { apiError, validationError } = require("../utils/api");

function nextOccurrence(rule, current) {
  const date = new Date(current);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid recurrence timestamp");
  if (!Number.isInteger(Number(rule.interval_count)) || rule.interval_count < 1 || rule.interval_count > 365) {
    throw new Error("Invalid recurrence interval");
  }
  if (rule.recurrence_unit === "monthly") {
    if (rule.month_day != null && (!Number.isInteger(Number(rule.month_day)) || rule.month_day < 1 || rule.month_day > 31)) {
      throw new Error("Invalid monthly recurrence day");
    }
    const targetMonth = date.getUTCMonth() + rule.interval_count;
    const firstOfTargetMonth = new Date(Date.UTC(
      date.getUTCFullYear(),
      targetMonth,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    ));
    const lastDay = new Date(Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    firstOfTargetMonth.setUTCDate(Math.min(rule.month_day || date.getUTCDate(), lastDay));
    return firstOfTargetMonth;
  }
  if (!['daily', 'weekly'].includes(rule.recurrence_unit)) {
    throw new Error("Unsupported recurrence unit; use daily, weekly, or monthly");
  }
  const days = rule.recurrence_unit === "weekly" ? 7 * rule.interval_count : rule.interval_count;
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function listRecurringTasks(req, res) {
  const result = await pool.query(
    `SELECT id,project_id,created_by,title,description,priority,recurrence_rule,
       recurrence_unit,interval_count,weekdays,month_day,next_run_at,ends_at,paused_at,
       is_active,assignee_id,due_offset_days,created_at,updated_at
     FROM recurring_tasks WHERE workspace_id=$1 ORDER BY next_run_at,id`,
    [req.workspaceId]
  );
  res.json({ success: true, recurringTasks: result.rows });
}

async function createRecurringTask(req, res) {
  const parsed = recurringTaskCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const input = parsed.data;
  const project = await pool.query(
    "SELECT id FROM projects WHERE id=$1 AND workspace_id=$2",
    [input.projectId, req.workspaceId]
  );
  if (!project.rows[0]) return apiError(res, 404, "Project not found");
  if (input.assigneeId != null) {
    const member = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.workspaceId, input.assigneeId]
    );
    if (!member.rows[0]) return apiError(res, 400, "Assignee must be a member of this workspace");
  }
  if (input.recurrenceUnit === "monthly" && input.monthDay === undefined) {
    return apiError(res, 400, "Choose a day of the month for monthly recurrence");
  }
  const rule = `${input.recurrenceUnit}:${input.intervalCount}`;
  const result = await pool.query(
    `INSERT INTO recurring_tasks
      (workspace_id,project_id,created_by,title,description,priority,recurrence_rule,
       recurrence_unit,interval_count,month_day,next_run_at,ends_at,assignee_id,due_offset_days)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::timestamptz,$13,$14)
     RETURNING *`,
    [
      req.workspaceId,
      input.projectId,
      req.user.id,
      input.title,
      input.description || null,
      input.priority,
      rule,
      input.recurrenceUnit,
      input.intervalCount,
      input.monthDay ?? null,
      input.startsAt,
      input.endsAt ?? null,
      input.assigneeId ?? null,
      input.dueOffsetDays ?? null,
    ]
  );
  res.status(201).json({ success: true, recurringTask: result.rows[0] });
}

async function setRecurringTaskPaused(req, res, paused) {
  const result = await pool.query(
    `UPDATE recurring_tasks
     SET is_active=$1,paused_at=$2::timestamptz,updated_at=NOW()
     WHERE id=$3 AND workspace_id=$4
       AND ($1=FALSE OR ends_at IS NULL OR ends_at>=NOW())
     RETURNING *`,
    [!paused, paused ? new Date().toISOString() : null, req.params.recurringTaskId, req.workspaceId]
  );
  if (result.rows[0]) return res.json({ success: true, recurringTask: result.rows[0] });
  const existing = await pool.query(
    "SELECT id,ends_at FROM recurring_tasks WHERE id=$1 AND workspace_id=$2",
    [req.params.recurringTaskId, req.workspaceId]
  );
  if (!existing.rows[0]) return apiError(res, 404, "Recurring task not found");
  if (!paused && existing.rows[0].ends_at && new Date(existing.rows[0].ends_at) < new Date()) {
    return apiError(res, 409, "This recurrence has passed its end date");
  }
  return apiError(res, 409, paused ? "Recurring task is already paused" : "Recurring task is already active");
}

async function pauseRecurringTask(req, res) {
  return setRecurringTaskPaused(req, res, true);
}

async function resumeRecurringTask(req, res) {
  return setRecurringTaskPaused(req, res, false);
}

async function deleteRecurringTask(req, res) {
  const result = await pool.query(
    "DELETE FROM recurring_tasks WHERE id=$1 AND workspace_id=$2 RETURNING id",
    [req.params.recurringTaskId, req.workspaceId]
  );
  if (!result.rows[0]) return apiError(res, 404, "Recurring task not found");
  res.status(204).send();
}

async function runDueRecurringTasks() {
  const client = await pool.connect();
  let generated = 0;
  const now = new Date();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE recurring_tasks SET is_active=FALSE,updated_at=NOW()
       WHERE is_active=TRUE AND paused_at IS NULL AND ends_at IS NOT NULL AND ends_at<next_run_at`
    );
    const dueRules = await client.query(
      `SELECT * FROM recurring_tasks
       WHERE is_active=TRUE AND paused_at IS NULL AND next_run_at<=NOW()
         AND (ends_at IS NULL OR next_run_at<=ends_at)
       ORDER BY next_run_at,id LIMIT 50 FOR UPDATE SKIP LOCKED`
    );
    for (const rule of dueRules.rows) {
      const interval = Number(rule.interval_count);
      const monthDay = rule.month_day == null ? null : Number(rule.month_day);
      const recurrenceValid = ["daily", "weekly", "monthly"].includes(rule.recurrence_unit)
        && Number.isInteger(interval) && interval >= 1 && interval <= 365
        && (rule.recurrence_unit !== "monthly" || (Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31));
      if (!recurrenceValid) {
        console.error("Skipping invalid recurring task rule:", JSON.stringify({
          ruleId: rule.id,
          recurrenceUnit: rule.recurrence_unit,
          intervalCount: rule.interval_count,
          monthDay: rule.month_day,
        }));
        await client.query("UPDATE recurring_tasks SET is_active=FALSE,updated_at=NOW() WHERE id=$1", [rule.id]);
        continue;
      }
      const project = await client.query(
        "SELECT 1 FROM projects WHERE id=$1 AND workspace_id=$2",
        [rule.project_id, rule.workspace_id]
      );
      if (!project.rows[0]) {
        console.error("Skipping recurring task rule with mismatched project workspace:", JSON.stringify({ ruleId: rule.id }));
        await client.query("UPDATE recurring_tasks SET is_active=FALSE,updated_at=NOW() WHERE id=$1", [rule.id]);
        continue;
      }
      let scheduledAt = new Date(rule.next_run_at);
      const endAt = rule.ends_at ? new Date(rule.ends_at) : null;
      let processed = 0;
      if (!Number.isFinite(scheduledAt.getTime()) || (endAt && !Number.isFinite(endAt.getTime()))) {
        console.error("Skipping recurring task rule with invalid schedule timestamps:", JSON.stringify({ ruleId: rule.id }));
        await client.query("UPDATE recurring_tasks SET is_active=FALSE,updated_at=NOW() WHERE id=$1", [rule.id]);
        continue;
      }
      while (scheduledAt <= now && (!endAt || scheduledAt <= endAt) && processed < 100) {
        const scheduledDate = scheduledAt.toISOString().slice(0, 10);
        const dueDate = rule.due_offset_days == null
          ? null
          : new Date(Date.UTC(
            scheduledAt.getUTCFullYear(),
            scheduledAt.getUTCMonth(),
            scheduledAt.getUTCDate() + rule.due_offset_days
          )).toISOString().slice(0, 10);
        const result = await client.query(
          `INSERT INTO tasks
            (workspace_id,project_id,title,description,status,priority,assignee_id,
             start_date,due_date,created_by,recurrence_id,recurrence_run_at)
           VALUES($1,$2,$3,$4,'todo',$5,
             CASE WHEN EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$6) THEN $6 ELSE NULL END,
             $7::date,$8::date,$9,$10,$11::timestamptz)
           ON CONFLICT(recurrence_id,recurrence_run_at)
             WHERE recurrence_id IS NOT NULL AND recurrence_run_at IS NOT NULL
           DO NOTHING RETURNING id`,
          [
            rule.workspace_id,
            rule.project_id,
            rule.title,
            rule.description,
            rule.priority,
            rule.assignee_id,
            scheduledDate,
            dueDate,
            rule.created_by,
            rule.id,
            scheduledAt.toISOString(),
          ]
        );
        generated += result.rows.length;
        scheduledAt = nextOccurrence(rule, scheduledAt);
        processed += 1;
      }
      const active = !endAt || scheduledAt <= endAt;
      await client.query(
        `UPDATE recurring_tasks SET next_run_at=$1::timestamptz,is_active=$2,updated_at=NOW()
         WHERE id=$3`,
        [scheduledAt.toISOString(), active, rule.id]
      );
    }
    await client.query("COMMIT");
    return generated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createRecurringTask,
  deleteRecurringTask,
  listRecurringTasks,
  nextOccurrence,
  pauseRecurringTask,
  resumeRecurringTask,
  runDueRecurringTasks,
};
