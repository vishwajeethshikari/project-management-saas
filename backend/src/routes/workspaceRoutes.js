const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireWorkspaceMember = require("../middleware/requireWorkspaceMember");
const c = require("../controllers/workspaceController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/", wrap(c.listWorkspaces));
router.post("/", wrap(c.createWorkspace));
router.get("/:workspaceId", requireWorkspaceMember(), wrap(c.getWorkspace));
router.patch("/:workspaceId", requireWorkspaceMember({ role: "admin" }), wrap(c.updateWorkspace));
router.get("/:workspaceId/members", requireWorkspaceMember(), wrap(c.listMembers));
router.post("/:workspaceId/invitations", requireWorkspaceMember({ role: "admin" }), wrap(c.inviteMember));

module.exports = router;
