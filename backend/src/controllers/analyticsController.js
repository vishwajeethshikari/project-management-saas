const pool = require("../config/db");
const { apiError } = require("../utils/api");

const durationExpression = "COALESCE(e.duration_seconds,FLOOR(EXTRACT(EPOCH FROM (COALESCE(e.ended_at,NOW())-e.started_at)))::integer)";

function scopeCondition(scope, alias) {
  if (scope.type === "organization") return `${alias}.workspace_id IN (SELECT id FROM workspaces WHERE organization_id=$1)`;
  if (scope.type === "project") return `${alias}.project_id=$1 AND ${alias}.workspace_id=$2`;
  return `${alias}.workspace_id=$1`;
}

function scopeValues(scope) {
  return scope.type === "project" ? [scope.id, scope.workspaceId] : [scope.id];
}

async function queryAnalytics(scope) {
  const taskScope = scopeCondition(scope, "t");
  const values = scopeValues(scope);
  const [metrics, trends, workload, projects] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::integer AS task_count,
       COUNT(*) FILTER (WHERE t.status='completed')::integer AS completed_tasks,
       COUNT(*) FILTER (WHERE t.status='completed' AND t.completed_at IS NOT NULL
         AND t.due_date IS NOT NULL AND t.completed_at<t.due_date+INTERVAL '1 day')::integer AS on_time_completed,
       COUNT(*) FILTER (WHERE t.status='completed' AND t.completed_at IS NOT NULL AND t.due_date IS NOT NULL)::integer AS due_completed_tasks,
       COALESCE(ROUND(100.0*COUNT(*) FILTER (WHERE t.status='completed' AND t.completed_at IS NOT NULL
         AND t.due_date IS NOT NULL AND t.completed_at<t.due_date+INTERVAL '1 day')
         /NULLIF(COUNT(*) FILTER (WHERE t.status='completed' AND t.completed_at IS NOT NULL AND t.due_date IS NOT NULL),0),1),0) AS on_time_completion_rate,
       COUNT(*) FILTER (WHERE t.status<>'completed' AND t.due_date<CURRENT_DATE)::integer AS overdue_tasks,
       COUNT(*) FILTER (WHERE t.status<>'completed' AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+7)::integer AS upcoming_tasks,
       COALESCE(ROUND(100.0*COUNT(*) FILTER (WHERE t.status='completed')/NULLIF(COUNT(*),0),1),0) AS completion_rate
       FROM tasks t WHERE ${taskScope}`,
      values
    ),
    pool.query(
      `WITH months AS (
         SELECT generate_series(date_trunc('month',CURRENT_DATE)-INTERVAL '5 months',
           date_trunc('month',CURRENT_DATE),INTERVAL '1 month')::date AS month
       )
       SELECT months.month,COUNT(t.id)::integer AS completed_tasks
       FROM months LEFT JOIN tasks t ON ${taskScope}
         AND date_trunc('month',t.completed_at)=months.month
       GROUP BY months.month ORDER BY months.month`,
      values
    ),
    getWorkloadRows(scope),
    pool.query(
      `SELECT p.id AS project_id,p.name,
       COUNT(t.id)::integer AS task_count,
       COUNT(t.id) FILTER (WHERE t.status='completed')::integer AS completed_tasks,
       COUNT(t.id) FILTER (WHERE t.status<>'completed' AND t.due_date<CURRENT_DATE)::integer AS overdue_tasks,
       COALESCE(SUM(t.estimated_minutes),0)::bigint AS estimated_minutes,
       COALESCE(SUM(te.tracked_seconds),0)::bigint AS tracked_seconds
       FROM projects p LEFT JOIN tasks t ON t.project_id=p.id AND t.workspace_id=p.workspace_id
       LEFT JOIN (
         SELECT e.task_id,e.workspace_id,SUM(${durationExpression}) AS tracked_seconds
         FROM time_entries e GROUP BY e.task_id,e.workspace_id
       ) te ON te.task_id=t.id AND te.workspace_id=t.workspace_id
       WHERE ${scope.type === "organization"
         ? "p.workspace_id IN (SELECT id FROM workspaces WHERE organization_id=$1)"
         : scope.type === "project"
           ? "p.id=$1 AND p.workspace_id=$2"
           : "p.workspace_id=$1"}
       GROUP BY p.id ORDER BY p.name`,
      values
    ),
  ]);
  return {
    metrics: metrics.rows[0],
    trends: trends.rows,
    workload: workload,
    projects: projects.rows,
  };
}

async function getWorkloadRows(scope) {
  const workspaceId = scope.workspaceId || scope.id;
  const taskFilter = scope.type === "project"
    ? "AND t.workspace_id=$1 AND t.project_id=$2"
    : scope.type === "organization"
      ? "AND t.workspace_id IN (SELECT id FROM workspaces WHERE organization_id=$1)"
      : "";
  const taskValues = scope.type === "project" ? [workspaceId, scope.id] : [workspaceId];
  const result = await pool.query(
    `WITH task_stats AS (
       SELECT t.workspace_id,t.assignee_id,COUNT(*)::integer AS task_count,
         COUNT(*) FILTER (WHERE t.status<>'completed' AND t.due_date<CURRENT_DATE)::integer AS overdue_tasks,
         COUNT(*) FILTER (WHERE t.status<>'completed' AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+7)::integer AS upcoming_tasks,
         COALESCE(SUM(t.estimated_minutes),0)::bigint AS estimated_minutes
       FROM tasks t WHERE TRUE ${taskFilter} GROUP BY t.workspace_id,t.assignee_id
     ), time_stats AS (
       SELECT e.workspace_id,e.user_id,SUM(${durationExpression})::bigint AS tracked_seconds
       FROM time_entries e ${scope.type === "project" ? "JOIN tasks et ON et.id=e.task_id AND et.workspace_id=e.workspace_id" : ""}
       ${scope.type === "project" ? "WHERE et.workspace_id=$1 AND et.project_id=$2" : scope.type === "organization" ? "WHERE e.workspace_id IN (SELECT id FROM workspaces WHERE organization_id=$1)" : ""}
       GROUP BY e.workspace_id,e.user_id
     )
     SELECT wm.user_id AS assignee_id,u.name AS assignee_name,
       COALESCE(SUM(ts.task_count),0)::integer AS task_count,
       COALESCE(SUM(ts.overdue_tasks),0)::integer AS overdue_tasks,
       COALESCE(SUM(ts.upcoming_tasks),0)::integer AS upcoming_tasks,
       COALESCE(SUM(ts.estimated_minutes),0)::bigint AS estimated_minutes,
       COALESCE(SUM(times.tracked_seconds),0)::bigint AS tracked_seconds
     FROM workspace_members wm JOIN users u ON u.id=wm.user_id
     LEFT JOIN task_stats ts ON ts.workspace_id=wm.workspace_id AND ts.assignee_id=wm.user_id
     LEFT JOIN time_stats times ON times.workspace_id=wm.workspace_id AND times.user_id=wm.user_id
     WHERE ${scope.type === "organization" ? "wm.workspace_id IN (SELECT id FROM workspaces WHERE organization_id=$1)" : "wm.workspace_id=$1"}
     GROUP BY wm.user_id,u.name ORDER BY u.name`,
    taskValues
  );
  const unassignedFilter = scope.type === "project"
    ? "t.workspace_id=$1 AND t.project_id=$2"
    : scope.type === "organization"
      ? "t.workspace_id IN (SELECT id FROM workspaces WHERE organization_id=$1)"
      : "t.workspace_id=$1";
  const unassigned = await pool.query(
    `SELECT NULL::bigint AS assignee_id,'Unassigned'::text AS assignee_name,
       COUNT(*)::integer AS task_count,
       COUNT(*) FILTER (WHERE t.status<>'completed' AND t.due_date<CURRENT_DATE)::integer AS overdue_tasks,
       COUNT(*) FILTER (WHERE t.status<>'completed' AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+7)::integer AS upcoming_tasks,
       COALESCE(SUM(t.estimated_minutes),0)::bigint AS estimated_minutes,
       0::bigint AS tracked_seconds
     FROM tasks t WHERE t.assignee_id IS NULL AND ${unassignedFilter}
     HAVING COUNT(*)>0`,
    taskValues
  );
  return [...result.rows, ...unassigned.rows];
}

async function getWorkspaceAnalytics(req, res) {
  const result = await queryAnalytics({ type: "workspace", id: req.workspaceId });
  res.json({ success: true, ...result });
}

async function getOrganizationAnalytics(req, res) {
  const result = await queryAnalytics({ type: "organization", id: req.organizationId });
  res.json({ success: true, ...result });
}

async function getProjectAnalytics(req, res) {
  const project = await pool.query(
    "SELECT id FROM projects WHERE id=$1 AND workspace_id=$2",
    [req.params.projectId, req.workspaceId]
  );
  if (!project.rows[0]) return apiError(res, 404, "Project not found");
  const result = await queryAnalytics({ type: "project", id: req.params.projectId, workspaceId: req.workspaceId });
  res.json({ success: true, ...result });
}

async function getTeamProductivity(req, res) {
  const team = await pool.query(
    "SELECT id FROM teams WHERE id=$1 AND workspace_id=$2",
    [req.params.teamId, req.workspaceId]
  );
  if (!team.rows[0]) return apiError(res, 404, "Team not found");
  const result = await pool.query(
    `SELECT u.id AS user_id,u.name,
       COUNT(t.id)::integer AS task_count,
       COUNT(t.id) FILTER (WHERE t.status='completed')::integer AS completed_tasks,
       COUNT(t.id) FILTER (WHERE t.status<>'completed' AND t.due_date<CURRENT_DATE)::integer AS overdue_tasks,
       COALESCE(SUM(t.estimated_minutes),0)::bigint AS estimated_minutes,
       COALESCE(times.tracked_seconds,0)::bigint AS tracked_seconds
     FROM team_members tm JOIN users u ON u.id=tm.user_id
     LEFT JOIN tasks t ON t.workspace_id=tm.workspace_id AND t.assignee_id=tm.user_id
     LEFT JOIN (
       SELECT e.workspace_id,e.user_id,SUM(${durationExpression}) AS tracked_seconds
       FROM time_entries e GROUP BY e.workspace_id,e.user_id
     ) times ON times.workspace_id=tm.workspace_id AND times.user_id=tm.user_id
     WHERE tm.workspace_id=$1 AND tm.team_id=$2
     GROUP BY u.id,u.name,times.tracked_seconds ORDER BY u.name`,
    [req.workspaceId, req.params.teamId]
  );
  res.json({ success: true, productivity: result.rows });
}

async function getWorkspaceWorkload(req, res) {
  res.json({ success: true, workload: await getWorkloadRows({ type: "workspace", id: req.workspaceId }) });
}

function csvCell(value) {
  let text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportWorkspaceAnalytics(req, res) {
  const result = await pool.query(
    `SELECT t.id,t.title,p.name AS project_name,u.name AS assignee_name,t.status,t.priority,
       t.start_date,t.due_date,t.estimated_minutes,t.completed_at,
       COALESCE(te.tracked_seconds,0)::bigint AS tracked_seconds
     FROM tasks t JOIN projects p ON p.id=t.project_id AND p.workspace_id=t.workspace_id
     LEFT JOIN users u ON u.id=t.assignee_id
     LEFT JOIN (
       SELECT e.workspace_id,e.task_id,SUM(${durationExpression}) AS tracked_seconds
       FROM time_entries e GROUP BY e.workspace_id,e.task_id
     ) te ON te.workspace_id=t.workspace_id AND te.task_id=t.id
     WHERE t.workspace_id=$1 ORDER BY p.name,t.created_at,t.id`,
    [req.workspaceId]
  );
  const columns = ["id", "title", "project_name", "assignee_name", "status", "priority", "start_date", "due_date", "estimated_minutes", "completed_at", "tracked_seconds"];
  const csv = [
    columns.map(csvCell).join(","),
    ...result.rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\r\n");
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="workspace-${req.workspaceId}-analytics.csv"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.send(csv);
}

module.exports = {
  exportWorkspaceAnalytics,
  getOrganizationAnalytics,
  getProjectAnalytics,
  getTeamProductivity,
  getWorkspaceAnalytics,
  getWorkspaceWorkload,
};
