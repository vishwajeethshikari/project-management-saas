const crypto = require("crypto");
const pool = require("../config/db");
const {
  organizationSchema,
  organizationInvitationSchema,
  organizationInvitationAcceptSchema,
} = require("../validators/domainValidator");
const { validationError, apiError } = require("../utils/api");
const { sendEmail } = require("../services/emailService");

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

async function listOrganizations(req, res) {
  const result = await pool.query(
    `SELECT o.id,o.name,o.owner_id,o.created_at,o.updated_at,om.role,
       (SELECT COUNT(*)::int FROM organization_members m WHERE m.organization_id=o.id) AS member_count,
       (SELECT COUNT(*)::int FROM workspaces w WHERE w.organization_id=o.id) AS workspace_count
     FROM organizations o JOIN organization_members om ON om.organization_id=o.id
     WHERE om.user_id=$1 ORDER BY o.created_at,o.id`, [req.user.id]);
  res.json({ success: true, organizations: result.rows });
}

async function createOrganization(req, res) {
  const parsed = organizationSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const organization = await client.query(
      "INSERT INTO organizations(name,owner_id) VALUES($1,$2) RETURNING *",
      [parsed.data.name, req.user.id]);
    await client.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
      [organization.rows[0].id, req.user.id]);
    await client.query("COMMIT");
    res.status(201).json({ success: true, organization: organization.rows[0] });
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function getOrganization(req, res) {
  const result = await pool.query(
    `SELECT o.id,o.name,o.owner_id,o.created_at,o.updated_at,
       (SELECT COUNT(*)::int FROM organization_members m WHERE m.organization_id=o.id) AS member_count,
       (SELECT COUNT(*)::int FROM workspaces w WHERE w.organization_id=o.id) AS workspace_count
     FROM organizations o WHERE o.id=$1`, [req.organizationId]);
  if (!result.rows[0]) return apiError(res, 404, "Organization not found");
  res.json({ success: true, organization: result.rows[0] });
}

async function updateOrganization(req, res) {
  const parsed = organizationSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const result = await pool.query(
    "UPDATE organizations SET name=$1,updated_at=NOW() WHERE id=$2 RETURNING *",
    [parsed.data.name, req.organizationId]);
  if (!result.rows[0]) return apiError(res, 404, "Organization not found");
  res.json({ success: true, organization: result.rows[0] });
}

async function listOrganizationMembers(req, res) {
  const result = await pool.query(
    `SELECT u.id,u.name,u.email,om.role,om.joined_at,
       (SELECT COUNT(*)::int FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
         WHERE w.organization_id=om.organization_id AND wm.user_id=om.user_id) AS workspace_count
     FROM organization_members om JOIN users u ON u.id=om.user_id
     WHERE om.organization_id=$1 ORDER BY CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,u.name`,
    [req.organizationId]);
  res.json({ success: true, members: result.rows });
}

async function removeOrganizationMember(req, res) {
  if (String(req.params.userId) === String(req.user.id)) return apiError(res, 400, "Use organization ownership transfer before leaving as the owner");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const member = await client.query(
      "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR UPDATE",
      [req.organizationId, req.params.userId]);
    if (!member.rows[0]) { await client.query("ROLLBACK"); return apiError(res, 404, "Organization member not found"); }
    if (member.rows[0].role === "owner") { await client.query("ROLLBACK"); return apiError(res, 400, "Transfer ownership before removing the organization owner"); }
    await client.query(
      `DELETE FROM workspace_members wm USING workspaces w
       WHERE w.id=wm.workspace_id AND w.organization_id=$1 AND wm.user_id=$2`,
      [req.organizationId, req.params.userId]);
    await client.query("DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2", [req.organizationId, req.params.userId]);
    await client.query("COMMIT");
    res.status(204).send();
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function listInvitations(req, res) {
  const result = await pool.query(
    `SELECT id,organization_id,email,role,invited_by,status,expires_at,created_at
     FROM organization_invitations WHERE organization_id=$1 ORDER BY created_at DESC`, [req.organizationId]);
  res.json({ success: true, invitations: result.rows });
}

async function sendInvitation(req, res, invitation) {
  const url = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
  url.searchParams.set("organizationInvite", invitation.rawToken);
  let delivery = "manual";
  try {
    const result = await sendEmail({
      to: invitation.email,
      subject: `Invitation to join ${invitation.organizationName}`,
      text: `Accept your organization invitation: ${url.toString()}`,
      html: `<p>You have been invited to ${escapeHtml(invitation.organizationName)}.</p><p><a href="${escapeHtml(url.toString())}">Accept invitation</a></p>`,
    });
    if (result.delivered) delivery = "email";
  } catch (error) {
    await pool.query("UPDATE organization_invitations SET status='revoked' WHERE id=$1", [invitation.id]);
    throw error;
  }
  return { inviteUrl: url.toString(), delivery };
}

async function createInvitation(req, res) {
  const parsed = organizationInvitationSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await pool.query(
    `UPDATE organization_invitations SET status='expired'
     WHERE organization_id=$1 AND LOWER(email)=LOWER($2) AND status='pending' AND expires_at<=NOW()`,
    [req.organizationId, parsed.data.email]);
  let result;
  try {
    result = await pool.query(
      `INSERT INTO organization_invitations(organization_id,email,role,invited_by,token_hash,expires_at)
       VALUES($1,LOWER($2),$3,$4,$5,NOW()+INTERVAL '7 days')
       RETURNING id,organization_id,email,role,status,expires_at,created_at`,
      [req.organizationId, parsed.data.email, parsed.data.role, req.user.id, tokenHash]);
  } catch (error) {
    if (error.code === "23505") return apiError(res, 409, "A pending organization invitation already exists for this email");
    throw error;
  }
  const organization = await pool.query("SELECT name FROM organizations WHERE id=$1", [req.organizationId]);
  const delivery = await sendInvitation(req, res, { ...result.rows[0], rawToken, organizationName: organization.rows[0].name });
  res.status(201).json({ success: true, invitation: result.rows[0], ...delivery });
}

async function resendInvitation(req, res) {
  const existing = await pool.query(
    `SELECT i.id,i.email,i.role,i.expires_at,o.name AS organization_name
     FROM organization_invitations i JOIN organizations o ON o.id=i.organization_id
     WHERE i.id=$1 AND i.organization_id=$2 AND i.status='pending'`, [req.params.invitationId, req.organizationId]);
  if (!existing.rows[0]) return apiError(res, 404, "Pending invitation not found");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const updated = await pool.query(
    `UPDATE organization_invitations SET token_hash=$1,expires_at=NOW()+INTERVAL '7 days'
     WHERE id=$2 AND organization_id=$3 RETURNING id,email,role,expires_at`,
    [tokenHash, req.params.invitationId, req.organizationId]);
  const delivery = await sendInvitation(req, res, { ...updated.rows[0], rawToken, organizationName: existing.rows[0].organization_name });
  res.json({ success: true, invitation: updated.rows[0], ...delivery });
}

async function revokeInvitation(req, res) {
  const result = await pool.query(
    `UPDATE organization_invitations SET status='revoked'
     WHERE id=$1 AND organization_id=$2 AND status='pending' RETURNING id`,
    [req.params.invitationId, req.organizationId]);
  if (!result.rows[0]) return apiError(res, 404, "Pending invitation not found");
  res.status(204).send();
}

async function acceptInvitation(req, res) {
  const parsed = organizationInvitationAcceptSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const userResult = await pool.query("SELECT email FROM users WHERE id=$1", [req.user.id]);
  if (!userResult.rows[0]) return apiError(res, 404, "User not found");
  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const invitation = await client.query(
      `SELECT id,organization_id,email,role FROM organization_invitations
       WHERE token_hash=$1 AND status='pending' AND expires_at>NOW() FOR UPDATE`, [tokenHash]);
    if (!invitation.rows[0]) { await client.query("ROLLBACK"); return apiError(res, 404, "Organization invitation is invalid or expired"); }
    if (invitation.rows[0].email.toLowerCase() !== userResult.rows[0].email.toLowerCase()) {
      await client.query("ROLLBACK");
      return apiError(res, 403, "Sign in with the email address that received this invitation");
    }
    await client.query(
      `INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3)
       ON CONFLICT(organization_id,user_id) DO NOTHING`,
      [invitation.rows[0].organization_id, req.user.id, invitation.rows[0].role]);
    await client.query("UPDATE organization_invitations SET status='accepted' WHERE id=$1", [invitation.rows[0].id]);
    await client.query("COMMIT");
    res.json({ success: true, organizationId: invitation.rows[0].organization_id });
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

module.exports = {
  listOrganizations, createOrganization, getOrganization, updateOrganization,
  listOrganizationMembers, removeOrganizationMember, listInvitations,
  createInvitation, resendInvitation, revokeInvitation, acceptInvitation, escapeHtml,
};
