const pool = require("../config/db");
const { subtaskCreateSchema, subtaskUpdateSchema, positiveId } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");

async function listSubtasks(req, res) {
  const parent = await pool.query("SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2", [req.params.taskId, req.workspaceId]);
  if (!parent.rows[0]) return apiError(res, 404, "Task not found");
  const result = await pool.query(
    `SELECT s.*, u.name AS assignee_name FROM subtasks s
     LEFT JOIN users u ON u.id=s.assignee_id
     WHERE s.workspace_id=$1 AND s.task_id=$2 ORDER BY s.created_at, s.id`,
    [req.workspaceId, req.params.taskId]);
  res.json({ success: true, subtasks: result.rows });
}

async function createSubtask(req, res) {
  const parsed = subtaskCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const parent = await pool.query("SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2", [req.params.taskId, req.workspaceId]);
  if (!parent.rows[0]) return apiError(res, 404, "Task not found");
  if (parsed.data.assigneeId != null) {
    const member = await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", [req.workspaceId, parsed.data.assigneeId]);
    if (!member.rows[0]) return apiError(res, 400, "Assignee must be a member of this workspace");
  }
  const result = await pool.query(
    `INSERT INTO subtasks(workspace_id,task_id,title,assignee_id,due_date,created_by)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.workspaceId, req.params.taskId, parsed.data.title, parsed.data.assigneeId ?? null, parsed.data.dueDate ?? null, req.user.id]);
  res.status(201).json({ success: true, subtask: result.rows[0] });
}

async function updateSubtask(req, res) {
  const parsed = subtaskUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const columns = { title: "title", assigneeId: "assignee_id", dueDate: "due_date", isCompleted: "is_completed" };
  const values = [];
  const setters = [];
  for (const [field, column] of Object.entries(columns)) {
    if (Object.hasOwn(parsed.data, field)) {
      if (field === "assigneeId" && parsed.data[field] != null) {
        const member = await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", [req.workspaceId, parsed.data[field]]);
        if (!member.rows[0]) return apiError(res, 400, "Assignee must be a member of this workspace");
      }
      values.push(parsed.data[field]);
      setters.push(`${column}=$${values.length}`);
    }
  }
  if (!setters.length) return apiError(res, 400, "Provide at least one subtask field to update");
  values.push(req.params.taskId, req.params.subtaskId, req.workspaceId);
  const result = await pool.query(
    `UPDATE subtasks SET ${setters.join(",")}, updated_at=NOW()
     WHERE task_id=$${values.length - 2} AND id=$${values.length - 1} AND workspace_id=$${values.length} RETURNING *`, values);
  if (!result.rows[0]) return apiError(res, 404, "Subtask not found");
  res.json({ success: true, subtask: result.rows[0] });
}

async function deleteSubtask(req, res) {
  const result = await pool.query("DELETE FROM subtasks WHERE id=$1 AND task_id=$2 AND workspace_id=$3 RETURNING id", [req.params.subtaskId, req.params.taskId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Subtask not found");
  res.status(204).send();
}

async function listDependencies(req, res) {
  const task = await pool.query("SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2", [req.params.taskId, req.workspaceId]);
  if (!task.rows[0]) return apiError(res, 404, "Task not found");
  const result = await pool.query(
    `SELECT d.depends_on_task_id, t.title, t.status FROM task_dependencies d
     JOIN tasks t ON t.id=d.depends_on_task_id AND t.workspace_id=d.workspace_id
     WHERE d.workspace_id=$1 AND d.task_id=$2 ORDER BY t.title`,
    [req.workspaceId, req.params.taskId]);
  res.json({ success: true, dependencies: result.rows });
}

async function createDependency(req, res) {
  const parsed = positiveId.safeParse(req.body.dependsOnTaskId);
  if (!parsed.success) return validationError(res, parsed.error);
  const blockerId = parsed.data;
  if (String(blockerId) === String(req.params.taskId)) return apiError(res, 400, "A task cannot depend on itself");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize graph edits within a workspace so simultaneous requests cannot create a cycle.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`task-dependencies:${req.workspaceId}`]);
    const tasks = await client.query("SELECT id FROM tasks WHERE workspace_id=$1 AND id=ANY($2::bigint[])", [req.workspaceId, [req.params.taskId, blockerId]]);
    if (tasks.rows.length !== 2) {
      await client.query("ROLLBACK");
      return apiError(res, 404, "Task not found in this workspace");
    }
    const cycle = await client.query(
      `WITH RECURSIVE blockers(task_id) AS (
         SELECT depends_on_task_id FROM task_dependencies WHERE workspace_id=$1 AND task_id=$2
         UNION
         SELECT d.depends_on_task_id FROM task_dependencies d JOIN blockers b ON d.task_id=b.task_id
         WHERE d.workspace_id=$1
       ) SELECT 1 FROM blockers WHERE task_id=$3 LIMIT 1`,
      [req.workspaceId, blockerId, req.params.taskId]);
    if (cycle.rows[0]) {
      await client.query("ROLLBACK");
      return apiError(res, 409, "This dependency would create a cycle");
    }
    const result = await client.query(
      `INSERT INTO task_dependencies(workspace_id,task_id,depends_on_task_id,created_by)
       VALUES($1,$2,$3,$4) ON CONFLICT(task_id,depends_on_task_id) DO NOTHING
       RETURNING task_id,depends_on_task_id`,
      [req.workspaceId, req.params.taskId, blockerId, req.user.id]);
    await client.query("COMMIT");
    return res.status(result.rows[0] ? 201 : 200).json({ success: true, dependency: result.rows[0] || { task_id: req.params.taskId, depends_on_task_id: blockerId } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteDependency(req, res) {
  const blocker = positiveId.safeParse(req.params.blockerId);
  if (!blocker.success) return validationError(res, blocker.error);
  const result = await pool.query(
    "DELETE FROM task_dependencies WHERE workspace_id=$1 AND task_id=$2 AND depends_on_task_id=$3 RETURNING task_id",
    [req.workspaceId, req.params.taskId, blocker.data]);
  if (!result.rows[0]) return apiError(res, 404, "Dependency not found");
  res.status(204).send();
}

module.exports = { listSubtasks, createSubtask, updateSubtask, deleteSubtask, listDependencies, createDependency, deleteDependency };
