const pool = require("../config/db");
const { projectCreateSchema, projectUpdateSchema, projectMemberSchema } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");
const { removeStoredAttachmentFiles } = require("./attachmentController");
const { createNotification } = require("./notificationController");

async function listProjects(req, res) {
  const { search = "", status } = req.query;
  const result = await pool.query(
    `SELECT p.*,
            u_owner.name AS owner_name,
            u_mgr.name AS manager_name,
            COUNT(t.id)::int AS task_count,
            COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::int AS completed_task_count,
            ROUND(COALESCE(COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(t.id), 0) * 100, 0)) AS progress_percentage
     FROM projects p
     LEFT JOIN users u_owner ON u_owner.id = p.owner_id
     LEFT JOIN users u_mgr ON u_mgr.id = p.manager_id
     LEFT JOIN tasks t ON t.project_id = p.id AND t.workspace_id = p.workspace_id
     WHERE p.workspace_id = $1
       AND ($2 = '' OR p.name ILIKE '%' || $2 || '%' OR COALESCE(p.description, '') ILIKE '%' || $2 || '%')
       AND ($3::text IS NULL OR p.status = $3)
     GROUP BY p.id, u_owner.name, u_mgr.name
     ORDER BY p.created_at DESC`,
    [req.workspaceId, String(search), status || null]
  );
  res.json({ success: true, projects: result.rows });
}

async function createProject(req, res) {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const ownerId = parsed.data.ownerId ?? req.user.id;
  const managerId = parsed.data.managerId ?? null;

  if (ownerId != null) {
    const member = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.workspaceId, ownerId]
    );
    if (!member.rows[0]) return apiError(res, 400, "Project owner must be a member of this workspace");
  }

  if (managerId != null) {
    const member = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.workspaceId, managerId]
    );
    if (!member.rows[0]) return apiError(res, 400, "Project manager must be a member of this workspace");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO projects (workspace_id, name, description, status, owner_id, manager_id, start_date, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.workspaceId,
        parsed.data.name,
        parsed.data.description || null,
        parsed.data.status,
        ownerId,
        managerId,
        parsed.data.startDate || null,
        parsed.data.dueDate || null,
      ]
    );

    const project = result.rows[0];

    // Add owner as project member
    await client.query(
      `INSERT INTO project_members (workspace_id, project_id, user_id, role)
       VALUES ($1, $2, $3, 'manager')
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [req.workspaceId, project.id, ownerId]
    );

    // If manager is different, add manager as project member
    if (managerId && managerId !== ownerId) {
      await client.query(
        `INSERT INTO project_members (workspace_id, project_id, user_id, role)
         VALUES ($1, $2, $3, 'manager')
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [req.workspaceId, project.id, managerId]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, project });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getProject(req, res) {
  const result = await pool.query(
    `SELECT p.*,
            u_owner.name AS owner_name,
            u_mgr.name AS manager_name,
            COUNT(t.id)::int AS task_count,
            COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::int AS completed_task_count,
            ROUND(COALESCE(COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(t.id), 0) * 100, 0)) AS progress_percentage
     FROM projects p
     LEFT JOIN users u_owner ON u_owner.id = p.owner_id
     LEFT JOIN users u_mgr ON u_mgr.id = p.manager_id
     LEFT JOIN tasks t ON t.project_id = p.id AND t.workspace_id = p.workspace_id
     WHERE p.id = $1 AND p.workspace_id = $2
     GROUP BY p.id, u_owner.name, u_mgr.name`,
    [req.params.projectId, req.workspaceId]
  );
  if (!result.rows[0]) return apiError(res, 404, "Project not found");

  const membersResult = await pool.query(
    `SELECT pm.user_id, pm.role, pm.joined_at, u.name, u.email, u.avatar_url
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.workspace_id = $1 AND pm.project_id = $2
     ORDER BY u.name`,
    [req.workspaceId, req.params.projectId]
  );

  res.json({
    success: true,
    project: {
      ...result.rows[0],
      members: membersResult.rows,
    },
  });
}

async function updateProject(req, res) {
  const parsed = projectUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  if (parsed.data.ownerId != null) {
    const member = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.workspaceId, parsed.data.ownerId]
    );
    if (!member.rows[0]) return apiError(res, 400, "Project owner must be a member of this workspace");
  }

  if (parsed.data.managerId != null) {
    const member = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",
      [req.workspaceId, parsed.data.managerId]
    );
    if (!member.rows[0]) return apiError(res, 400, "Project manager must be a member of this workspace");
  }

  const columns = {
    name: "name",
    description: "description",
    status: "status",
    ownerId: "owner_id",
    managerId: "manager_id",
    startDate: "start_date",
    dueDate: "due_date",
  };
  const values = [];
  const assignments = [];
  for (const [field, column] of Object.entries(columns)) {
    if (Object.hasOwn(parsed.data, field)) {
      values.push(parsed.data[field]);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) return apiError(res, 400, "Provide at least one project field to update");

  values.push(req.params.projectId, req.workspaceId);
  const result = await pool.query(
    `UPDATE projects SET ${assignments.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND workspace_id = $${values.length} RETURNING *`,
    values
  );
  if (!result.rows[0]) return apiError(res, 404, "Project not found");

  if (parsed.data.managerId) {
    await pool.query(
      `INSERT INTO project_members (workspace_id, project_id, user_id, role)
       VALUES ($1, $2, $3, 'manager')
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'manager'`,
      [req.workspaceId, req.params.projectId, parsed.data.managerId]
    );
  }

  res.json({ success: true, project: result.rows[0] });
}

async function deleteProject(req, res) {
  const attachments = await pool.query(
    `SELECT a.storage_key FROM task_attachments a
     JOIN tasks t ON t.id=a.task_id AND t.workspace_id=a.workspace_id
     WHERE t.project_id=$1 AND t.workspace_id=$2 AND a.organization_id=$3`,
    [req.params.projectId, req.workspaceId, req.organizationId]
  );
  const result = await pool.query(
    `DELETE FROM projects WHERE id = $1 AND workspace_id = $2 RETURNING id`,
    [req.params.projectId, req.workspaceId]
  );
  if (!result.rows[0]) return apiError(res, 404, "Project not found");
  await removeStoredAttachmentFiles(attachments.rows.map((attachment) => attachment.storage_key));
  res.status(204).send();
}

async function listProjectMembers(req, res) {
  const project = await pool.query(
    "SELECT id FROM projects WHERE id = $1 AND workspace_id = $2",
    [req.params.projectId, req.workspaceId]
  );
  if (!project.rows[0]) return apiError(res, 404, "Project not found");

  const result = await pool.query(
    `SELECT pm.user_id, pm.role, pm.joined_at, u.name, u.email, u.avatar_url
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.workspace_id = $1 AND pm.project_id = $2
     ORDER BY u.name`,
    [req.workspaceId, req.params.projectId]
  );
  res.json({ success: true, members: result.rows });
}

async function addProjectMember(req, res) {
  const parsed = projectMemberSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const project = await pool.query(
    "SELECT id, name FROM projects WHERE id = $1 AND workspace_id = $2",
    [req.params.projectId, req.workspaceId]
  );
  if (!project.rows[0]) return apiError(res, 404, "Project not found");

  const member = await pool.query(
    "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
    [req.workspaceId, parsed.data.userId]
  );
  if (!member.rows[0]) return apiError(res, 400, "User must be a member of this workspace");

  const result = await pool.query(
    `INSERT INTO project_members (workspace_id, project_id, user_id, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [req.workspaceId, req.params.projectId, parsed.data.userId, parsed.data.role]
  );

  // Notify member
  await createNotification({
    workspaceId: req.workspaceId,
    userId: parsed.data.userId,
    type: "project_member",
    message: `You were added as a ${parsed.data.role} to project "${project.rows[0].name}"`,
    resourceType: "project",
    resourceId: req.params.projectId,
    dedupeKey: `project_member:${req.params.projectId}:${parsed.data.userId}`,
  });

  res.status(201).json({ success: true, member: result.rows[0] });
}

async function removeProjectMember(req, res) {
  const result = await pool.query(
    "DELETE FROM project_members WHERE workspace_id = $1 AND project_id = $2 AND user_id = $3 RETURNING user_id",
    [req.workspaceId, req.params.projectId, req.params.userId]
  );
  if (!result.rows[0]) return apiError(res, 404, "Project member not found");
  res.status(204).send();
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
};
