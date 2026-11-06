const pool = require("../config/db");
const { projectCreateSchema, projectUpdateSchema } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");

async function listProjects(req, res) {
  const { search = "", status } = req.query;
  const result = await pool.query(
    `SELECT p.*, COUNT(t.id)::int AS task_count
     FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.workspace_id = $1
       AND ($2 = '' OR p.name ILIKE '%' || $2 || '%' OR COALESCE(p.description, '') ILIKE '%' || $2 || '%')
       AND ($3::text IS NULL OR p.status = $3)
     GROUP BY p.id ORDER BY p.created_at DESC`,
    [req.workspaceId, String(search), status || null]);
  res.json({ success: true, projects: result.rows });
}

async function createProject(req, res) {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const result = await pool.query(
    `INSERT INTO projects (workspace_id, name, description, status, owner_id, due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.workspaceId, parsed.data.name, parsed.data.description || null, parsed.data.status,
     parsed.data.ownerId ?? req.user.id, parsed.data.dueDate || null]);
  res.status(201).json({ success: true, project: result.rows[0] });
}

async function getProject(req, res) {
  const result = await pool.query(
    `SELECT * FROM projects WHERE id = $1 AND workspace_id = $2`,
    [req.params.projectId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Project not found");
  res.json({ success: true, project: result.rows[0] });
}

async function updateProject(req, res) {
  const parsed = projectUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const result = await pool.query(
    `UPDATE projects SET name = COALESCE($1,name), description = COALESCE($2,description),
     status = COALESCE($3,status), owner_id = COALESCE($4,owner_id),
     due_date = COALESCE($5,due_date), updated_at = NOW()
     WHERE id = $6 AND workspace_id = $7 RETURNING *`,
    [parsed.data.name ?? null, parsed.data.description ?? null, parsed.data.status ?? null,
     parsed.data.ownerId ?? null, parsed.data.dueDate ?? null, req.params.projectId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Project not found");
  res.json({ success: true, project: result.rows[0] });
}

async function deleteProject(req, res) {
  const result = await pool.query(
    `DELETE FROM projects WHERE id = $1 AND workspace_id = $2 RETURNING id`,
    [req.params.projectId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Project not found");
  res.status(204).send();
}

module.exports = { listProjects, createProject, getProject, updateProject, deleteProject };
