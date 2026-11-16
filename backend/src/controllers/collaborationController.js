const pool = require("../config/db");
const { apiError } = require("../utils/api");
const notifications = require("./notificationController");

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

async function listActivity(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const result = await pool.query(
    `SELECT a.id,a.resource_type,a.resource_id,a.action,a.details,a.created_at,
            u.id AS actor_id,u.name AS actor_name
     FROM activity_logs a LEFT JOIN users u ON u.id=a.actor_id
     WHERE a.workspace_id=$1
     ORDER BY a.created_at DESC,a.id DESC LIMIT $2`,
    [req.workspaceId, limit]);
  res.json({ success: true, activity: result.rows });
}

module.exports = {
  dashboard,
  getNotificationPreferences: notifications.getPreferences,
  listNotifications,
  markNotification,
  listActivity,
  updateNotificationPreferences: notifications.updatePreferences,
};
