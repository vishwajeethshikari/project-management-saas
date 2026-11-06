const pool = require("../config/db");

const roles = new Set(["owner", "admin", "member", "viewer"]);

module.exports = function requireWorkspaceMember(options = {}) {
  const minimumRole = options.role;

  return async (req, res, next) => {
    const workspaceId = req.params.workspaceId;
    if (!/^\d+$/.test(String(workspaceId || ""))) {
      return res.status(400).json({ success: false, message: "Invalid workspace ID" });
    }

    try {
      const result = await pool.query(
        `SELECT role FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, req.user.id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ success: false, message: "Workspace not found" });
      }

      if (minimumRole && roles.has(result.rows[0].role) &&
          ["viewer", "member", "admin", "owner"].indexOf(result.rows[0].role) <
          ["viewer", "member", "admin", "owner"].indexOf(minimumRole)) {
        return res.status(403).json({ success: false, message: "Insufficient workspace permission" });
      }

      req.workspaceRole = result.rows[0].role;
      req.workspaceId = workspaceId;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
