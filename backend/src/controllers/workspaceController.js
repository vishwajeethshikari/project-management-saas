const crypto = require("crypto");
const pool = require("../config/db");
const { workspaceSchema, invitationSchema } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");

async function listWorkspaces(req, res) {
  const result = await pool.query(
    `SELECT w.id, w.name, w.description, w.owner_id, w.created_at, w.updated_at, wm.role
     FROM workspaces w JOIN workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = $1 ORDER BY w.created_at DESC`, [req.user.id]);
  res.json({ success: true, workspaces: result.rows });
}

async function createWorkspace(req, res) {
  const parsed = workspaceSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await client.query(
      `INSERT INTO workspaces (name, description, owner_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [parsed.data.name, parsed.data.description || null, req.user.id]);
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [workspace.rows[0].id, req.user.id]);
    await client.query("COMMIT");
    res.status(201).json({ success: true, workspace: workspace.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function getWorkspace(req, res) {
  const result = await pool.query(
    `SELECT id, name, description, owner_id, created_at, updated_at
     FROM workspaces WHERE id = $1`, [req.workspaceId]);
  res.json({ success: true, workspace: result.rows[0] });
}

async function updateWorkspace(req, res) {
  const parsed = workspaceSchema.partial().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const result = await pool.query(
    `UPDATE workspaces SET name = COALESCE($1, name),
     description = COALESCE($2, description), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [parsed.data.name ?? null, parsed.data.description ?? null, req.workspaceId]);
  res.json({ success: true, workspace: result.rows[0] });
}

async function inviteMember(req, res) {
  const parsed = invitationSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const result = await pool.query(
    `INSERT INTO workspace_invitations
     (workspace_id, email, role, invited_by, token_hash, expires_at)
     VALUES ($1, LOWER($2), $3, $4, $5, NOW() + INTERVAL '7 days')
     RETURNING id, workspace_id, email, role, status, expires_at`,
    [req.workspaceId, parsed.data.email, parsed.data.role, req.user.id, tokenHash]);
  res.status(201).json({ success: true, invitation: result.rows[0] });
}

async function listMembers(req, res) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, wm.role, wm.joined_at
     FROM workspace_members wm JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1 ORDER BY wm.joined_at`, [req.workspaceId]);
  res.json({ success: true, members: result.rows });
}

module.exports = { listWorkspaces, createWorkspace, getWorkspace, updateWorkspace, inviteMember, listMembers };
