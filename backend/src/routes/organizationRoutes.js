const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireOrganizationMember = require("../middleware/requireOrganizationMember");
const validateIds = require("../middleware/validateIds");
const c = require("../controllers/organizationController");
const analytics = require("../controllers/analyticsController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/", wrap(c.listOrganizations));
router.post("/", wrap(c.createOrganization));
router.post("/invitations/accept", wrap(c.acceptInvitation));
router.get("/:organizationId", validateIds(["organizationId"]), requireOrganizationMember(), wrap(c.getOrganization));
router.patch("/:organizationId", validateIds(["organizationId"]), requireOrganizationMember({ role: "admin" }), wrap(c.updateOrganization));
router.get("/:organizationId/analytics", validateIds(["organizationId"]), requireOrganizationMember(), wrap(analytics.getOrganizationAnalytics));
router.get("/:organizationId/members", validateIds(["organizationId"]), requireOrganizationMember(), wrap(c.listOrganizationMembers));
router.delete("/:organizationId/members/:userId", validateIds(["organizationId", "userId"]), requireOrganizationMember({ role: "admin" }), wrap(c.removeOrganizationMember));
router.get("/:organizationId/invitations", validateIds(["organizationId"]), requireOrganizationMember({ role: "admin" }), wrap(c.listInvitations));
router.post("/:organizationId/invitations", validateIds(["organizationId"]), requireOrganizationMember({ role: "admin" }), wrap(c.createInvitation));
router.post("/:organizationId/invitations/:invitationId/resend", validateIds(["organizationId", "invitationId"]), requireOrganizationMember({ role: "admin" }), wrap(c.resendInvitation));
router.patch("/:organizationId/invitations/:invitationId/revoke", validateIds(["organizationId", "invitationId"]), requireOrganizationMember({ role: "admin" }), wrap(c.revokeInvitation));

module.exports = router;
