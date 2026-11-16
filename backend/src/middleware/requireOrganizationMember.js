const pool = require("../config/db");
const { hasMinimumRole } = require("../security/roles");

module.exports = function requireOrganizationMember(options = {}) {
  return async (req, res, next) => {
    const organizationId = req.params.organizationId;
    if (!/^\d+$/.test(String(organizationId || ""))) {
      return res.status(400).json({ success: false, message: "Invalid organization ID" });
    }
    try {
      const result = await pool.query(
        `SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2`,
        [organizationId, req.user.id]);
      if (!result.rows[0]) return res.status(404).json({ success: false, message: "Organization not found" });
      if (options.role && !hasMinimumRole(result.rows[0].role, options.role)) {
        return res.status(403).json({ success: false, message: "Insufficient organization permission" });
      }
      req.organizationId = organizationId;
      req.organizationRole = result.rows[0].role;
      return next();
    } catch (error) { return next(error); }
  };
};
