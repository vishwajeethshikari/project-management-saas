const { z } = require("zod");
const pool = require("../config/db");
const { validationError } = require("../utils/api");

const preferencesSchema = z.object({
  assignmentEnabled: z.boolean().optional(),
  mentionEnabled: z.boolean().optional(),
  dueDateEnabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one notification preference");

const preferenceFields = {
  assignment: "assignment_enabled",
  project_member: "assignment_enabled",
  mention: "mention_enabled",
  due_date: "due_date_enabled",
};

async function createNotification({ workspaceId, userId, type, message, resourceType, resourceId, dedupeKey }) {
  const preferenceColumn = preferenceFields[type];
  if (!preferenceColumn) throw new Error(`Unsupported notification type: ${type}`);
  await pool.query(
    `INSERT INTO notifications(workspace_id,user_id,type,message,resource_type,resource_id,dedupe_key)
     SELECT $1,$2,$3,$4,$5,$6,$7
     WHERE COALESCE((SELECT ${preferenceColumn} FROM notification_preferences
       WHERE workspace_id=$1 AND user_id=$2),TRUE)
     ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
    [workspaceId, userId, type, message, resourceType, resourceId, dedupeKey]
  );
}

async function getPreferences(req, res) {
  const result = await pool.query(
    `SELECT assignment_enabled,mention_enabled,due_date_enabled
     FROM notification_preferences WHERE workspace_id=$1 AND user_id=$2`,
    [req.workspaceId, req.user.id]
  );
  const preferences = result.rows[0] || {
    assignment_enabled: true,
    mention_enabled: true,
    due_date_enabled: true,
  };
  res.json({ success: true, preferences });
}

async function updatePreferences(req, res) {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const columns = {
    assignmentEnabled: "assignment_enabled",
    mentionEnabled: "mention_enabled",
    dueDateEnabled: "due_date_enabled",
  };
  const values = [req.workspaceId, req.user.id];
  const fields = [];
  const assignments = [];
  for (const [field, column] of Object.entries(columns)) {
    if (Object.hasOwn(parsed.data, field)) {
      values.push(parsed.data[field]);
      fields.push(column);
      assignments.push(`${column}=$${values.length}`);
    }
  }
  const result = await pool.query(
    `INSERT INTO notification_preferences(workspace_id,user_id,${fields.join(",")})
     VALUES($1,$2,${values.slice(2).map((_, index) => `$${index + 3}`).join(",")})
     ON CONFLICT(workspace_id,user_id) DO UPDATE SET ${assignments.join(",")},updated_at=NOW()
     RETURNING assignment_enabled,mention_enabled,due_date_enabled`,
    values
  );
  res.json({ success: true, preferences: result.rows[0] });
}

async function runDueDateReminders() {
  const result = await pool.query(
    `WITH utc_clock AS (
       SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date AS today
     )
     INSERT INTO notifications(workspace_id,user_id,type,message,resource_type,resource_id,dedupe_key)
     SELECT t.workspace_id,t.assignee_id,'due_date',
       'Task "' || t.title || '" ' ||
         CASE WHEN t.due_date<utc_clock.today THEN 'is overdue'
              WHEN t.due_date=utc_clock.today THEN 'is due today'
              ELSE 'is due tomorrow' END,
       'task',t.id,
       'due-date:' || t.id || ':' || t.assignee_id || ':' || utc_clock.today::text
     FROM tasks t
     CROSS JOIN utc_clock
     JOIN workspace_members wm ON wm.workspace_id=t.workspace_id AND wm.user_id=t.assignee_id
     LEFT JOIN notification_preferences np ON np.workspace_id=t.workspace_id AND np.user_id=t.assignee_id
     WHERE t.status<>'completed' AND t.assignee_id IS NOT NULL
       AND t.due_date<=utc_clock.today+1
       AND COALESCE(np.due_date_enabled,TRUE)
     ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`
  );
  return result.rowCount;
}

module.exports = {
  createNotification,
  getPreferences,
  runDueDateReminders,
  updatePreferences,
};
