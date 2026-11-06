const pool = require("../config/db");
const { taskCreateSchema, taskUpdateSchema, commentSchema } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");

async function listTasks(req, res) {
  const { search = "", status, priority, assigneeId, sort = "created_at" } = req.query;
  const sortColumn = {
    created_at: "t.created_at",
    due_date: "t.due_date",
    priority: "CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END",
    title: "t.title",
  }[sort] || "t.created_at";
  const result = await pool.query(
    `SELECT t.*, p.name AS project_name, u.name AS assignee_name
     FROM tasks t JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.assignee_id
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
  const result = await pool.query(
    `INSERT INTO tasks
     (workspace_id, project_id, title, description, status, priority, assignee_id, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.workspaceId, parsed.data.projectId, parsed.data.title, parsed.data.description || null,
     parsed.data.status, parsed.data.priority, parsed.data.assigneeId || null,
     parsed.data.dueDate || null, req.user.id]);
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
  const result = await pool.query(
    `UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description),
     status=COALESCE($3,status), priority=COALESCE($4,priority),
     assignee_id=COALESCE($5,assignee_id), due_date=COALESCE($6,due_date), updated_at=NOW()
     WHERE id=$7 AND workspace_id=$8 RETURNING *`,
    [parsed.data.title ?? null, parsed.data.description ?? null, parsed.data.status ?? null,
     parsed.data.priority ?? null, parsed.data.assigneeId ?? null, parsed.data.dueDate ?? null,
     req.params.taskId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Task not found");
  res.json({ success: true, task: result.rows[0] });
}

async function deleteTask(req, res) {
  const result = await pool.query(
    "DELETE FROM tasks WHERE id=$1 AND workspace_id=$2 RETURNING id",
    [req.params.taskId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Task not found");
  res.status(204).send();
}

async function listComments(req, res) {
  const result = await pool.query(
    `SELECT c.*, u.name AS author_name FROM task_comments c JOIN users u ON u.id=c.user_id
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
  res.status(201).json({ success: true, comment: result.rows[0] });
}

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask, listComments, createComment };
