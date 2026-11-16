const pool = require("../config/db");
const {
  positiveId,
  timeEntryCreateSchema,
  timeEntryUpdateSchema,
  timeReportQuerySchema,
} = require("../validators/domainValidator");
const { apiError, validationError } = require("../utils/api");

const managerRoles = new Set(["owner", "admin", "manager"]);
const durationExpression = "COALESCE(duration_seconds, FLOOR(EXTRACT(EPOCH FROM (COALESCE(ended_at,NOW()) - started_at)))::integer)";

async function listActiveTimers(req, res) {
  const result = await pool.query(
    `SELECT e.id,e.task_id,e.started_at,e.note,t.title AS task_title,p.name AS project_name
     FROM time_entries e JOIN tasks t ON t.id=e.task_id AND t.workspace_id=e.workspace_id
     JOIN projects p ON p.id=t.project_id AND p.workspace_id=t.workspace_id
     WHERE e.workspace_id=$1 AND e.user_id=$2 AND e.ended_at IS NULL
     ORDER BY e.started_at DESC`,
    [req.workspaceId, req.user.id]
  );
  res.json({ success: true, activeTimers: result.rows });
}

async function startTimer(req, res) {
  const parsedTaskId = positiveId.safeParse(req.body.taskId);
  if (!parsedTaskId.success) return validationError(res, parsedTaskId.error);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
      [`time-entry-user:${req.workspaceId}:${req.user.id}`]
    );
    const active = await client.query(
      "SELECT id,workspace_id,task_id,started_at FROM time_entries WHERE workspace_id=$1 AND user_id=$2 AND ended_at IS NULL LIMIT 1 FOR UPDATE",
      [req.workspaceId, req.user.id]
    );
    if (active.rows[0]) {
      await client.query("ROLLBACK");
      return apiError(res, 409, "Stop your active timer before starting another", { activeEntry: active.rows[0] });
    }

    const task = await client.query(
      "SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2",
      [parsedTaskId.data, req.workspaceId]
    );
    if (!task.rows[0]) {
      await client.query("ROLLBACK");
      return apiError(res, 404, "Task not found");
    }
    const result = await client.query(
      `INSERT INTO time_entries(workspace_id,task_id,user_id,started_at)
       VALUES($1,$2,$3,NOW()) RETURNING *`,
      [req.workspaceId, parsedTaskId.data, req.user.id]
    );
    await client.query("COMMIT");
    return res.status(201).json({ success: true, entry: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function stopTimer(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const entry = await client.query(
      `SELECT id,user_id,started_at,ended_at FROM time_entries
       WHERE id=$1 AND workspace_id=$2 AND task_id=$3 FOR UPDATE`,
      [req.params.entryId, req.workspaceId, req.params.taskId]
    );
    if (!entry.rows[0]) {
      await client.query("ROLLBACK");
      return apiError(res, 404, "Time entry not found");
    }
    if (
      String(entry.rows[0].user_id) !== String(req.user.id) &&
      !managerRoles.has(req.workspaceRole)
    ) {
      await client.query("ROLLBACK");
      return apiError(res, 403, "You cannot stop this timer");
    }
    if (entry.rows[0].ended_at) {
      await client.query("ROLLBACK");
      return apiError(res, 409, "This timer has already been stopped");
    }
    const result = await client.query(
      `UPDATE time_entries SET ended_at=NOW(),
       duration_seconds=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (NOW()-started_at))))::integer
       WHERE id=$1 AND workspace_id=$2 AND task_id=$3 RETURNING *`,
      [req.params.entryId, req.workspaceId, req.params.taskId]
    );
    await client.query("COMMIT");
    return res.json({ success: true, entry: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createManualEntry(req, res) {
  const parsed = timeEntryCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const task = await pool.query(
    "SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2",
    [req.params.taskId, req.workspaceId]
  );
  if (!task.rows[0]) return apiError(res, 404, "Task not found");
  const result = await pool.query(
    `INSERT INTO time_entries(workspace_id,task_id,user_id,started_at,ended_at,duration_seconds,note)
     VALUES($1,$2,$3,$4::timestamptz,$5::timestamptz,
       FLOOR(EXTRACT(EPOCH FROM ($5::timestamptz-$4::timestamptz)))::integer,$6)
     RETURNING *`,
    [
      req.workspaceId,
      req.params.taskId,
      req.user.id,
      parsed.data.startedAt,
      parsed.data.endedAt,
      parsed.data.note ?? null,
    ]
  );
  res.status(201).json({ success: true, entry: result.rows[0] });
}

async function listTaskTime(req, res) {
  const task = await pool.query(
    "SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2",
    [req.params.taskId, req.workspaceId]
  );
  if (!task.rows[0]) return apiError(res, 404, "Task not found");
  const [entries, summary] = await Promise.all([
    pool.query(
      `SELECT e.*,u.name AS user_name FROM time_entries e JOIN users u ON u.id=e.user_id
       WHERE e.workspace_id=$1 AND e.task_id=$2 ORDER BY e.started_at DESC,e.id DESC`,
      [req.workspaceId, req.params.taskId]
    ),
    pool.query(
      `SELECT COUNT(*)::integer AS entry_count,
       COALESCE(SUM(${durationExpression}),0)::bigint AS total_seconds
       FROM time_entries WHERE workspace_id=$1 AND task_id=$2`,
      [req.workspaceId, req.params.taskId]
    ),
  ]);
  res.json({ success: true, entries: entries.rows, summary: summary.rows[0] });
}

async function updateEntry(req, res) {
  const parsed = timeEntryUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const entry = await pool.query(
    `SELECT id,user_id,started_at,ended_at,note FROM time_entries
     WHERE id=$1 AND workspace_id=$2 AND task_id=$3`,
    [req.params.entryId, req.workspaceId, req.params.taskId]
  );
  if (!entry.rows[0]) return apiError(res, 404, "Time entry not found");
  if (
    String(entry.rows[0].user_id) !== String(req.user.id) &&
    !managerRoles.has(req.workspaceRole)
  ) return apiError(res, 403, "You cannot edit this time entry");
  if (!entry.rows[0].ended_at) return apiError(res, 409, "Stop the timer before editing its entry");

  const startedAt = parsed.data.startedAt || new Date(entry.rows[0].started_at).toISOString();
  const endedAt = parsed.data.endedAt || new Date(entry.rows[0].ended_at).toISOString();
  const duration = Date.parse(endedAt) - Date.parse(startedAt);
  if (duration <= 0 || duration > 31 * 24 * 60 * 60 * 1000) {
    return apiError(res, 400, "Time entries must be positive and no longer than 31 days");
  }
  const result = await pool.query(
    `UPDATE time_entries SET started_at=$1::timestamptz,ended_at=$2::timestamptz,
       duration_seconds=FLOOR(EXTRACT(EPOCH FROM ($2::timestamptz-$1::timestamptz)))::integer,
       note=$3
     WHERE id=$4 AND workspace_id=$5 AND task_id=$6 RETURNING *`,
    [startedAt, endedAt, Object.hasOwn(parsed.data, "note") ? parsed.data.note : entry.rows[0].note, req.params.entryId, req.workspaceId, req.params.taskId]
  );
  res.json({ success: true, entry: result.rows[0] });
}

async function deleteEntry(req, res) {
  const entry = await pool.query(
    "SELECT id,user_id,ended_at FROM time_entries WHERE id=$1 AND workspace_id=$2 AND task_id=$3",
    [req.params.entryId, req.workspaceId, req.params.taskId]
  );
  if (!entry.rows[0]) return apiError(res, 404, "Time entry not found");
  if (
    String(entry.rows[0].user_id) !== String(req.user.id) &&
    !managerRoles.has(req.workspaceRole)
  ) return apiError(res, 403, "You cannot delete this time entry");
  if (!entry.rows[0].ended_at) return apiError(res, 409, "Stop the timer before deleting its entry");
  await pool.query("DELETE FROM time_entries WHERE id=$1 AND workspace_id=$2 AND task_id=$3", [req.params.entryId, req.workspaceId, req.params.taskId]);
  res.status(204).send();
}

async function getProjectSummary(req, res) {
  const result = await pool.query(
    `SELECT p.id,p.name,COUNT(DISTINCT t.id)::integer AS task_count,
       COUNT(e.id)::integer AS entry_count,
       COALESCE(SUM(${durationExpression}),0)::bigint AS total_seconds
     FROM projects p LEFT JOIN tasks t ON t.project_id=p.id AND t.workspace_id=p.workspace_id
     LEFT JOIN time_entries e ON e.task_id=t.id AND e.workspace_id=t.workspace_id
     WHERE p.id=$1 AND p.workspace_id=$2 GROUP BY p.id`,
    [req.params.projectId, req.workspaceId]
  );
  if (!result.rows[0]) return apiError(res, 404, "Project not found");
  res.json({ success: true, summary: result.rows[0] });
}

async function getTimeReports(req, res) {
  const parsed = timeReportQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const values = [req.workspaceId, parsed.data.fromDate || null, parsed.data.toDate || null];
  const range = (alias) => `${alias}.workspace_id=$1
    AND ${alias}.started_at >= COALESCE($2::date,CURRENT_DATE-INTERVAL '29 days')
    AND ${alias}.started_at < COALESCE($3::date+1,CURRENT_DATE+1)`;
  const [daily, weekly, projects] = await Promise.all([
    pool.query(
      `SELECT e.started_at::date AS report_date,
       SUM(${durationExpression})::bigint AS total_seconds,COUNT(*)::integer AS entry_count
       FROM time_entries e WHERE ${range("e")} GROUP BY e.started_at::date ORDER BY report_date`,
      values
    ),
    pool.query(
      `SELECT date_trunc('week',e.started_at)::date AS week_start,
       SUM(${durationExpression})::bigint AS total_seconds,COUNT(*)::integer AS entry_count
       FROM time_entries e WHERE ${range("e")} GROUP BY date_trunc('week',e.started_at)::date ORDER BY week_start`,
      values
    ),
    pool.query(
      `SELECT p.id AS project_id,p.name AS project_name,
       SUM(${durationExpression})::bigint AS total_seconds,COUNT(e.id)::integer AS entry_count
       FROM time_entries e JOIN tasks t ON t.id=e.task_id AND t.workspace_id=e.workspace_id
       JOIN projects p ON p.id=t.project_id AND p.workspace_id=t.workspace_id
       WHERE ${range("e")}
       GROUP BY p.id ORDER BY p.name`,
      values
    ),
  ]);
  res.json({ success: true, daily: daily.rows, weekly: weekly.rows, projects: projects.rows });
}

module.exports = {
  createManualEntry,
  deleteEntry,
  getProjectSummary,
  getTimeReports,
  listActiveTimers,
  listTaskTime,
  startTimer,
  stopTimer,
  updateEntry,
};
