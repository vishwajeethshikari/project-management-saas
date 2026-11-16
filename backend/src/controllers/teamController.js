const pool = require("../config/db");
const { teamSchema, teamMemberSchema } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");

async function listTeams(req, res) {
  const result = await pool.query(
    `SELECT t.*, u.name AS manager_name, COUNT(tm.user_id)::int AS member_count
     FROM teams t LEFT JOIN users u ON u.id=t.manager_id
     LEFT JOIN team_members tm ON tm.team_id=t.id AND tm.workspace_id=t.workspace_id
     WHERE t.workspace_id=$1 GROUP BY t.id,u.name ORDER BY t.name`, [req.workspaceId]);
  res.json({ success: true, teams: result.rows });
}

async function getTeam(req, res) {
  const result = await pool.query("SELECT * FROM teams WHERE id=$1 AND workspace_id=$2", [req.params.teamId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Team not found");
  res.json({ success: true, team: result.rows[0] });
}

async function createTeam(req, res) {
  const parsed = teamSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  if (parsed.data.managerId != null) {
    const member = await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role IN ('owner','admin','manager')", [req.workspaceId, parsed.data.managerId]);
    if (!member.rows[0]) return apiError(res, 400, "Team manager must be an owner, admin, or manager in this workspace");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO teams(workspace_id,name,description,manager_id,created_by)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [req.workspaceId, parsed.data.name, parsed.data.description ?? null, parsed.data.managerId ?? null, req.user.id]);
    if (parsed.data.managerId != null) {
      await client.query(
        `INSERT INTO team_members(workspace_id,team_id,user_id,role) VALUES($1,$2,$3,'manager')
         ON CONFLICT(team_id,user_id) DO UPDATE SET role='manager'`,
        [req.workspaceId, created.rows[0].id, parsed.data.managerId]);
    }
    await client.query("COMMIT");
    res.status(201).json({ success: true, team: created.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return apiError(res, 409, "A team with this name already exists");
    throw error;
  } finally { client.release(); }
}

async function updateTeam(req, res) {
  const parsed = teamSchema.partial().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  if (parsed.data.managerId != null) {
    const member = await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role IN ('owner','admin','manager')", [req.workspaceId, parsed.data.managerId]);
    if (!member.rows[0]) return apiError(res, 400, "Team manager must be an owner, admin, or manager in this workspace");
  }
  const columns = { name: "name", description: "description", managerId: "manager_id" };
  const values = [];
  const updates = [];
  for (const [field, column] of Object.entries(columns)) {
    if (Object.hasOwn(parsed.data, field)) { values.push(parsed.data[field]); updates.push(`${column}=$${values.length}`); }
  }
  if (!updates.length) return apiError(res, 400, "Provide at least one team field to update");
  values.push(req.params.teamId, req.workspaceId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = await client.query("SELECT manager_id FROM teams WHERE id=$1 AND workspace_id=$2 FOR UPDATE", [req.params.teamId, req.workspaceId]);
    if (!before.rows[0]) {
      await client.query("ROLLBACK");
      return apiError(res, 404, "Team not found");
    }
    const result = await client.query(`UPDATE teams SET ${updates.join(",")},updated_at=NOW() WHERE id=$${values.length - 1} AND workspace_id=$${values.length} RETURNING *`, values);
    if (Object.hasOwn(parsed.data, "managerId")) {
      const priorManager = before.rows[0].manager_id;
      if (priorManager != null && String(priorManager) !== String(parsed.data.managerId)) {
        await client.query("UPDATE team_members SET role='employee' WHERE workspace_id=$1 AND team_id=$2 AND user_id=$3", [req.workspaceId, req.params.teamId, priorManager]);
      }
      if (parsed.data.managerId != null) {
        await client.query(`INSERT INTO team_members(workspace_id,team_id,user_id,role) VALUES($1,$2,$3,'manager')
          ON CONFLICT(team_id,user_id) DO UPDATE SET role='manager'`, [req.workspaceId, req.params.teamId, parsed.data.managerId]);
      }
    }
    await client.query("COMMIT");
    res.json({ success: true, team: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return apiError(res, 409, "A team with this name already exists");
    throw error;
  } finally { client.release(); }
}

async function deleteTeam(req, res) {
  const result = await pool.query("DELETE FROM teams WHERE id=$1 AND workspace_id=$2 RETURNING id", [req.params.teamId, req.workspaceId]);
  if (!result.rows[0]) return apiError(res, 404, "Team not found");
  res.status(204).send();
}

async function listTeamMembers(req, res) {
  const result = await pool.query(
    `SELECT u.id,u.name,u.email,tm.role,tm.joined_at FROM team_members tm
     JOIN users u ON u.id=tm.user_id JOIN teams t ON t.id=tm.team_id AND t.workspace_id=tm.workspace_id
     WHERE tm.workspace_id=$1 AND tm.team_id=$2 ORDER BY u.name`, [req.workspaceId, req.params.teamId]);
  const team = await pool.query("SELECT 1 FROM teams WHERE id=$1 AND workspace_id=$2", [req.params.teamId, req.workspaceId]);
  if (!team.rows[0]) return apiError(res, 404, "Team not found");
  res.json({ success: true, members: result.rows });
}

async function addTeamMember(req, res) {
  const parsed = teamMemberSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const member = await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", [req.workspaceId, parsed.data.userId]);
  if (!member.rows[0]) return apiError(res, 404, "Workspace member not found");
  const team = await pool.query("SELECT 1 FROM teams WHERE id=$1 AND workspace_id=$2", [req.params.teamId, req.workspaceId]);
  if (!team.rows[0]) return apiError(res, 404, "Team not found");
  const result = await pool.query(
    `INSERT INTO team_members(workspace_id,team_id,user_id,role) VALUES($1,$2,$3,$4)
     ON CONFLICT(team_id,user_id) DO UPDATE SET role=EXCLUDED.role
     RETURNING *`, [req.workspaceId, req.params.teamId, parsed.data.userId, parsed.data.role]);
  res.status(201).json({ success: true, member: result.rows[0] });
}

async function removeTeamMember(req, res) {
  const result = await pool.query("DELETE FROM team_members WHERE workspace_id=$1 AND team_id=$2 AND user_id=$3 RETURNING user_id", [req.workspaceId, req.params.teamId, req.params.userId]);
  if (!result.rows[0]) return apiError(res, 404, "Team member not found");
  res.status(204).send();
}

module.exports = { listTeams, getTeam, createTeam, updateTeam, deleteTeam, listTeamMembers, addTeamMember, removeTeamMember };
