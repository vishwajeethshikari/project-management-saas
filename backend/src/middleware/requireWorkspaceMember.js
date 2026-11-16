const pool = require("../config/db");

const roleRank = { viewer: 1, member: 2, employee: 2, manager: 3, admin: 4, owner: 5 };

module.exports = function requireWorkspaceMember(options = {}) {
  const minimumRole = options.role;

  return async (req, res, next) => {
    const workspaceId = req.params.workspaceId;
    if (!/^\d+$/.test(String(workspaceId || ""))) {
      return res.status(400).json({ success: false, message: "Invalid workspace ID" });
    }

    try {
      const result = await pool.query(
        `SELECT wm.role,w.organization_id,om.role AS organization_role
         FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
         JOIN organization_members om ON om.organization_id=w.organization_id AND om.user_id=wm.user_id
         WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
        [workspaceId, req.user.id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ success: false, message: "Workspace not found" });
      }

      if (minimumRole && (roleRank[result.rows[0].role] || 0) < (roleRank[minimumRole] || 0)) {
        return res.status(403).json({ success: false, message: "Insufficient workspace permission" });
      }

      req.workspaceRole = result.rows[0].role;
      req.workspaceId = workspaceId;
      req.organizationId = result.rows[0].organization_id;
      req.organizationRole = result.rows[0].organization_role;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
