const pool = require("../config/db");
const { milestoneCreateSchema, milestoneUpdateSchema } = require("../validators/domainValidator");
const { apiError, validationError } = require("../utils/api");

async function getTimeline(req, res) {
  const project = await pool.query(
    "SELECT id,name FROM projects WHERE id=$1 AND workspace_id=$2",
    [req.params.projectId, req.workspaceId]
  );
  if (!project.rows[0]) return apiError(res, 404, "Project not found");
  const [tasks, milestones] = await Promise.all([
    pool.query(
      `SELECT t.*,u.name AS assignee_name,
       COALESCE(json_agg(json_build_object('id',b.id,'title',b.title))
         FILTER (WHERE b.id IS NOT NULL),'[]'::json) AS blockers
       FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id
       LEFT JOIN task_dependencies d ON d.workspace_id=t.workspace_id AND d.task_id=t.id
       LEFT JOIN tasks b ON b.id=d.depends_on_task_id AND b.workspace_id=d.workspace_id
       WHERE t.workspace_id=$1 AND t.project_id=$2
       GROUP BY t.id,u.name ORDER BY t.start_date NULLS LAST,t.due_date NULLS LAST,t.created_at`,
      [req.workspaceId, req.params.projectId]
    ),
    pool.query(
      `SELECT id,project_id,name,due_date,completed_at,created_at,updated_at
       FROM milestones WHERE workspace_id=$1 AND project_id=$2
       ORDER BY due_date NULLS LAST,name,id`,
      [req.workspaceId, req.params.projectId]
    ),
  ]);
  res.json({ success: true, project: project.rows[0], tasks: tasks.rows, milestones: milestones.rows });
}

async function createMilestone(req, res) {
  const parsed = milestoneCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const project = await pool.query(
    "SELECT id FROM projects WHERE id=$1 AND workspace_id=$2",
    [req.params.projectId, req.workspaceId]
  );
  if (!project.rows[0]) return apiError(res, 404, "Project not found");
  const result = await pool.query(
    `INSERT INTO milestones(workspace_id,project_id,name,due_date)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [req.workspaceId, req.params.projectId, parsed.data.name, parsed.data.dueDate ?? null]
  );
  res.status(201).json({ success: true, milestone: result.rows[0] });
}

async function updateMilestone(req, res) {
  const parsed = milestoneUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const values = [];
  const setters = [];
  if (Object.hasOwn(parsed.data, "name")) {
    values.push(parsed.data.name);
    setters.push(`name=$${values.length}`);
  }
  if (Object.hasOwn(parsed.data, "dueDate")) {
    values.push(parsed.data.dueDate);
    setters.push(`due_date=$${values.length}`);
  }
  if (Object.hasOwn(parsed.data, "isCompleted")) {
    setters.push(`completed_at=${parsed.data.isCompleted ? "NOW()" : "NULL"}`);
  }
  setters.push("updated_at=NOW()");
  values.push(req.params.milestoneId, req.params.projectId, req.workspaceId);
  const result = await pool.query(
    `UPDATE milestones SET ${setters.join(",")}
     WHERE id=$${values.length - 2} AND project_id=$${values.length - 1} AND workspace_id=$${values.length}
     RETURNING *`,
    values
  );
  if (!result.rows[0]) return apiError(res, 404, "Milestone not found");
  res.json({ success: true, milestone: result.rows[0] });
}

async function deleteMilestone(req, res) {
  const result = await pool.query(
    "DELETE FROM milestones WHERE id=$1 AND project_id=$2 AND workspace_id=$3 RETURNING id",
    [req.params.milestoneId, req.params.projectId, req.workspaceId]
  );
  if (!result.rows[0]) return apiError(res, 404, "Milestone not found");
  res.status(204).send();
}

module.exports = { createMilestone, deleteMilestone, getTimeline, updateMilestone };
