const crypto = require("crypto");
const pool = require("../config/db");
const { workspaceSchema, workspaceCreateSchema, invitationSchema, invitationAcceptSchema } = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");
const { sendEmail } = require("../services/emailService");
const { removeStoredAttachmentFiles } = require("./attachmentController");

async function listWorkspaces(req, res) {
  const result = await pool.query(
    `SELECT w.id,w.name,w.description,w.owner_id,w.organization_id,w.created_at,w.updated_at,
       wm.role,o.name AS organization_name
     FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id
     JOIN organization_members om ON om.organization_id=w.organization_id AND om.user_id=wm.user_id
     JOIN organizations o ON o.id=w.organization_id
     WHERE wm.user_id=$1 ORDER BY o.name,w.created_at DESC`, [req.user.id]);
  res.json({ success: true, workspaces: result.rows });
}

async function createWorkspace(req, res) {
  const parsed = workspaceCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let organizationId = parsed.data.organizationId;
    if (organizationId) {
      const organization = await client.query(
        `SELECT organization_id FROM organization_members
         WHERE organization_id=$1 AND user_id=$2 AND role IN ('owner','admin','manager')`,
        [organizationId, req.user.id]);
      if (!organization.rows[0]) {
        await client.query("ROLLBACK");
        return apiError(res, 403, "You cannot create a workspace in this organization");
      }
    } else {
      const organization = await client.query(
        "INSERT INTO organizations(name,owner_id) VALUES($1,$2) RETURNING id",
        [parsed.data.name, req.user.id]);
      organizationId = organization.rows[0].id;
      await client.query(
        "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
        [organizationId, req.user.id]);
    }
    const workspace = await client.query(
      `INSERT INTO workspaces(name,description,owner_id,organization_id)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [parsed.data.name, parsed.data.description || null, req.user.id, organizationId]);
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

async function deleteWorkspace(req, res) {
  const attachments = await pool.query(
    "SELECT storage_key FROM task_attachments WHERE workspace_id=$1 AND organization_id=$2",
    [req.workspaceId, req.organizationId]
  );
  const result = await pool.query(
    "DELETE FROM workspaces WHERE id = $1 AND owner_id = $2 RETURNING id",
    [req.workspaceId, req.user.id]
  );
  if (!result.rows[0]) return apiError(res, 404, "Workspace not found");
  await removeStoredAttachmentFiles(attachments.rows.map((attachment) => attachment.storage_key));
  res.status(204).send();
}

async function inviteMember(req, res) {
  const parsed = invitationSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await pool.query(
    `UPDATE workspace_invitations SET status='expired'
     WHERE workspace_id=$1 AND LOWER(email)=LOWER($2) AND status='pending' AND expires_at<=NOW()`,
    [req.workspaceId, parsed.data.email]);
  const frontendUrl = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
  frontendUrl.searchParams.set("invite", rawToken);
  const inviteUrl = frontendUrl.toString();
  let result;
  try {
    result = await pool.query(
      `INSERT INTO workspace_invitations
       (workspace_id, email, role, invited_by, token_hash, expires_at)
       VALUES ($1, LOWER($2), $3, $4, $5, NOW() + INTERVAL '7 days')
       RETURNING id, workspace_id, email, role, status, expires_at`,
      [req.workspaceId, parsed.data.email, parsed.data.role, req.user.id, tokenHash]);
  } catch (error) {
    if (error.code === "23505") return apiError(res, 409, "A pending invitation already exists for this email");
    throw error;
  }
  let delivery = "manual";
  try {
    const sent = await sendEmail({
      to: parsed.data.email,
      subject: "You have been invited to a workspace",
      text: `Accept your invitation: ${inviteUrl}`,
      html: `<p>You have been invited to a workspace.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
    });
    if (sent.delivered) delivery = "email";
  } catch (error) {
    await pool.query("UPDATE workspace_invitations SET status='revoked' WHERE id=$1", [result.rows[0].id]);
    throw error;
  }
  res.status(201).json({ success: true, invitation: result.rows[0], inviteUrl, delivery });
}

async function acceptInvitation(req, res) {
  const parsed = invitationAcceptSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const userResult = await pool.query("SELECT email FROM users WHERE id=$1", [req.user.id]);
  if (!userResult.rows[0]) return apiError(res, 404, "User not found");
  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const invitation = await client.query(
      `SELECT i.id,i.workspace_id,i.email,i.role,w.organization_id FROM workspace_invitations i
       JOIN workspaces w ON w.id=i.workspace_id
       WHERE i.token_hash=$1 AND i.status='pending' AND i.expires_at>NOW() FOR UPDATE OF i`, [tokenHash]);
    if (!invitation.rows[0]) {
      await client.query("ROLLBACK");
      return apiError(res, 404, "Invitation is invalid or expired");
    }
    if (invitation.rows[0].email.toLowerCase() !== userResult.rows[0].email.toLowerCase()) {
      await client.query("ROLLBACK");
      return apiError(res, 403, "Sign in with the email address that received this invitation");
    }
    await client.query(
      `INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)
       ON CONFLICT(workspace_id,user_id) DO NOTHING`,
      [invitation.rows[0].workspace_id, req.user.id, invitation.rows[0].role]);
    await client.query(
      `INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'employee')
       ON CONFLICT(organization_id,user_id) DO NOTHING`,
      [invitation.rows[0].organization_id, req.user.id]);
    await client.query("UPDATE workspace_invitations SET status='accepted' WHERE id=$1", [invitation.rows[0].id]);
    await client.query("COMMIT");
    return res.status(200).json({ success: true, workspaceId: invitation.rows[0].workspace_id });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function listMembers(req, res) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, wm.role, wm.joined_at
     FROM workspace_members wm JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1 ORDER BY wm.joined_at`, [req.workspaceId]);
  res.json({ success: true, members: result.rows });
}

module.exports = { listWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, inviteMember, acceptInvitation, listMembers };
