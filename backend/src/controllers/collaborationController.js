const pool = require("../config/db");
const { apiError } = require("../utils/api");

async function dashboard(req, res) {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM projects WHERE workspace_id=$1)::int AS project_count,
       (SELECT COUNT(*) FROM projects WHERE workspace_id=$1 AND status='completed')::int AS completed_projects,
       (SELECT COUNT(*) FROM tasks WHERE workspace_id=$1)::int AS task_count,
       (SELECT COUNT(*) FROM tasks WHERE workspace_id=$1 AND status='completed')::int AS completed_tasks,
       (SELECT COUNT(*) FROM tasks WHERE workspace_id=$1 AND status='todo')::int AS todo_tasks,
       (SELECT COUNT(*) FROM tasks WHERE workspace_id=$1 AND status='in_progress')::int AS in_progress_tasks`,
    [req.workspaceId]);
  res.json({ success: true, dashboard: result.rows[0] });
}

async function listNotifications(req, res) {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE workspace_id=$1 AND user_id=$2
     ORDER BY created_at DESC LIMIT 100`,
    [req.workspaceId, req.user.id]);
  res.json({ success: true, notifications: result.rows });
}

async function markNotification(req, res) {
  const result = await pool.query(
    `UPDATE notifications SET is_read=TRUE
     WHERE id=$1 AND workspace_id=$2 AND user_id=$3 RETURNING *`,
    [req.params.notificationId, req.workspaceId, req.user.id]);
  if (!result.rows[0]) return apiError(res, 404, "Notification not found");
  res.json({ success: true, notification: result.rows[0] });
}

module.exports = { dashboard, listNotifications, markNotification };
