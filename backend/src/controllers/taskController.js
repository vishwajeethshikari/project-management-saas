const pool = require("../config/db");
const { taskCreateSchema, taskUpdateSchema, taskListQuerySchema, commentSchema } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");
const { removeStoredAttachmentFiles } = require("./attachmentController");
const { createNotification } = require("./notificationController");
const { hasMinimumRole } = require("../security/roles");

async function listTasks(req, res) {
  const parsed = taskListQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const { search, status, priority, assigneeId, sort } = parsed.data;
  const sortColumn = {
    created_at: "t.created_at",
    due_date: "t.due_date",
    priority: "CASE t.priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END",
    title: "t.title",
  }[sort] || "t.created_at";
  const project = await pool.query("SELECT id FROM projects WHERE id=$1 AND workspace_id=$2", [req.params.projectId, req.workspaceId]);
  if (!project.rows[0]) return apiError(res, 404, "Project not found");
  const result = await pool.query(
    `SELECT t.*, p.name AS project_name, u.name AS assignee_name
     FROM tasks t JOIN projects p ON p.id = t.project_id AND p.workspace_id=t.workspace_id
     LEFT JOIN workspace_members assignee_member ON assignee_member.workspace_id=t.workspace_id AND assignee_member.user_id=t.assignee_id
     LEFT JOIN users u ON u.id = assignee_member.user_id
     WHERE t.workspace_id = $1 AND t.project_id = $2
       AND ($3 = '' OR t.title ILIKE '%' || $3 || '%' OR COALESCE(t.description, '') ILIKE '%' || $3 || '%')
       AND ($4::text IS NULL OR t.status = $4)
       AND ($5::text IS NULL OR t.priority = $5)
       AND ($6::bigint IS NULL OR t.assignee_id = $6)
     ORDER BY ${sortColumn} DESC`,
    [req.workspaceId, req.params.projectId, String(search), status || null, priority || null, assigneeId || null]);
  res.json({ success: true, tasks: result.rows });
}

async function ensureProject(req) {
  const result = await pool.query(
    "SELECT id FROM projects WHERE id = $1 AND workspace_id = $2",
    [req.params.projectId || req.body.projectId, req.workspaceId]);
  return result.rows[0];
}

async function createTask(req, res) {
  const parsed = taskCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const project = await pool.query(
    "SELECT id FROM projects WHERE id = $1 AND workspace_id = $2",
    [parsed.data.projectId, req.workspaceId]);
  if (!project.rows[0]) return apiError(res, 404, "Project not found");
  if (parsed.data.assigneeId != null) {
    const assignee = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.workspaceId, parsed.data.assigneeId]);
    if (!assignee.rows[0]) return apiError(res, 400, "Assignee must be a member of this workspace");
  }
  const result = await pool.query(
    `INSERT INTO tasks
     (workspace_id, project_id, title, description, status, priority, assignee_id, start_date, due_date, estimated_minutes, created_by, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CASE WHEN $5::varchar(20)='completed' THEN NOW() ELSE NULL END) RETURNING *`,
    [req.workspaceId, parsed.data.projectId, parsed.data.title, parsed.data.description || null,
     parsed.data.status, parsed.data.priority, parsed.data.assigneeId || null,
     parsed.data.startDate || null, parsed.data.dueDate || null, parsed.data.estimatedMinutes ?? null, req.user.id]);
  if (result.rows[0].assignee_id != null) {
    await createNotification({
      workspaceId: req.workspaceId,
      userId: result.rows[0].assignee_id,
      type: "assignment",
      message: `You were assigned to task "${result.rows[0].title}"`,
      resourceType: "task",
      resourceId: result.rows[0].id,
      dedupeKey: `assignment:${result.rows[0].id}:${result.rows[0].assignee_id}:${result.rows[0].created_at.toISOString()}`,
    });
  }
  await pool.query(
    `INSERT INTO activity_logs(workspace_id,actor_id,resource_type,resource_id,action,details)
     VALUES($1,$2,'task',$3,'created',$4::jsonb)`,
    [req.workspaceId, req.user.id, result.rows[0].id, JSON.stringify({ title: result.rows[0].title })]);
  res.status(201).json({ success: true, task: result.rows[0] });
}

async function getTask(req, res) {
  const result = await pool.query(
    "SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2",
    [req.params.taskId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Task not found");
  res.json({ success: true, task: result.rows[0] });
}

async function updateTask(req, res) {
  const parsed = taskUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const currentTask = await pool.query(
    "SELECT id,assignee_id FROM tasks WHERE id=$1 AND workspace_id=$2",
    [req.params.taskId, req.workspaceId]
  );
  if (!currentTask.rows[0]) return apiError(res, 404, "Task not found");
  if (!hasMinimumRole(req.workspaceRole, "manager")) {
    if (String(currentTask.rows[0].assignee_id) !== String(req.user.id) || Object.keys(parsed.data).some((key) => key !== "status")) {
      return apiError(res, 403, "Employees can change status on tasks assigned to them");
    }
  }
  if (parsed.data.assigneeId != null) {
    const assignee = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.workspaceId, parsed.data.assigneeId]);
    if (!assignee.rows[0]) return apiError(res, 400, "Assignee must be a member of this workspace");
  }
  const columns = {
    title: "title", description: "description", status: "status", priority: "priority",
    estimatedMinutes: "estimated_minutes", assigneeId: "assignee_id", startDate: "start_date", dueDate: "due_date",
  };
  const values = [];
  const assignments = [];
  for (const [field, column] of Object.entries(columns)) {
    if (Object.hasOwn(parsed.data, field)) {
      values.push(parsed.data[field]);
      assignments.push(`${column}=$${values.length}`);
    }
  }
  if (Object.hasOwn(parsed.data, "status")) {
    values.push(parsed.data.status);
    assignments.push(`completed_at=CASE WHEN $${values.length}='completed' THEN COALESCE(completed_at,NOW()) ELSE NULL END`);
  }
  if (assignments.length === 0) return apiError(res, 400, "Provide at least one task field to update");
  values.push(req.params.taskId, req.workspaceId);
  const result = await pool.query(
    `UPDATE tasks SET ${assignments.join(", ")}, updated_at=NOW()
     WHERE id=$${values.length - 1} AND workspace_id=$${values.length} RETURNING *`, values);
  if (!result.rows[0]) return apiError(res, 404, "Task not found");
  if (result.rows[0].assignee_id != null && String(result.rows[0].assignee_id) !== String(currentTask.rows[0].assignee_id)) {
    await createNotification({
      workspaceId: req.workspaceId,
      userId: result.rows[0].assignee_id,
      type: "assignment",
      message: `You were assigned to task "${result.rows[0].title}"`,
      resourceType: "task",
      resourceId: result.rows[0].id,
      dedupeKey: `assignment:${result.rows[0].id}:${result.rows[0].assignee_id}:${result.rows[0].updated_at.toISOString()}`,
    });
  }
  await pool.query(
    `INSERT INTO activity_logs(workspace_id,actor_id,resource_type,resource_id,action,details)
     VALUES($1,$2,'task',$3,'updated',$4::jsonb)`,
    [req.workspaceId, req.user.id, result.rows[0].id, JSON.stringify({ fields: Object.keys(parsed.data) })]);
  res.json({ success: true, task: result.rows[0] });
}

async function deleteTask(req, res) {
  const attachments = await pool.query(
    `SELECT storage_key FROM task_attachments
     WHERE task_id=$1 AND workspace_id=$2 AND organization_id=$3`,
    [req.params.taskId, req.workspaceId, req.organizationId]);
  const result = await pool.query(
    "DELETE FROM tasks WHERE id=$1 AND workspace_id=$2 RETURNING id",
    [req.params.taskId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Task not found");
  await removeStoredAttachmentFiles(attachments.rows.map((attachment) => attachment.storage_key));
  res.status(204).send();
}

async function listComments(req, res) {
  const task = await pool.query("SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2", [req.params.taskId, req.workspaceId]);
  if (!task.rows[0]) return apiError(res, 404, "Task not found");
  const result = await pool.query(
    `SELECT c.*, u.name AS author_name FROM task_comments c LEFT JOIN workspace_members author_member ON author_member.workspace_id=c.workspace_id AND author_member.user_id=c.user_id LEFT JOIN users u ON u.id=author_member.user_id
     WHERE c.task_id=$1 AND c.workspace_id=$2 ORDER BY c.created_at`,
    [req.params.taskId, req.workspaceId]);
  res.json({ success: true, comments: result.rows });
}

async function createComment(req, res) {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const task = await pool.query("SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2",
    [req.params.taskId, req.workspaceId]);
  if (!task.rows[0]) return apiError(res, 404, "Task not found");
  const result = await pool.query(
    `INSERT INTO task_comments (workspace_id, task_id, user_id, body)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.workspaceId, req.params.taskId, req.user.id, parsed.data.body]);
  const author = await pool.query("SELECT name FROM users WHERE id=$1", [req.user.id]);
  await pool.query(
    `INSERT INTO activity_logs(workspace_id,actor_id,resource_type,resource_id,action,details)
     VALUES($1,$2,'task',$3,'commented',$4::jsonb)`,
    [req.workspaceId, req.user.id, req.params.taskId, JSON.stringify({ commentId: result.rows[0].id })]);
  const emails = [...parsed.data.body.matchAll(/(?:^|\s)@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)]
    .map((match) => match[1].toLowerCase());
  if (emails.length) {
    const mentioned = await pool.query(
      `SELECT wm.user_id FROM workspace_members wm JOIN users u ON u.id=wm.user_id
       WHERE wm.workspace_id=$1 AND LOWER(u.email)=ANY($2::text[]) AND wm.user_id<>$3`,
      [req.workspaceId, [...new Set(emails)], req.user.id]);
    for (const member of mentioned.rows) await createNotification({
      workspaceId: req.workspaceId,
      userId: member.user_id,
      type: "mention",
      message: `${author.rows[0]?.name || "A teammate"} mentioned you in a task comment`,
      resourceType: "comment",
      resourceId: result.rows[0].id,
      dedupeKey: `mention:${result.rows[0].id}:${member.user_id}`,
    });
  }
  res.status(201).json({ success: true, comment: result.rows[0] });
}

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask, listComments, createComment };
