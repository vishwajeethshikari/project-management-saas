const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireWorkspaceMember = require("../middleware/requireWorkspaceMember");
const c = require("../controllers/projectController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/:workspaceId/projects", requireWorkspaceMember(), wrap(c.listProjects));
router.post("/:workspaceId/projects", requireWorkspaceMember({ role: "member" }), wrap(c.createProject));
router.get("/:workspaceId/projects/:projectId", requireWorkspaceMember(), wrap(c.getProject));
router.patch("/:workspaceId/projects/:projectId", requireWorkspaceMember({ role: "member" }), wrap(c.updateProject));
router.delete("/:workspaceId/projects/:projectId", requireWorkspaceMember({ role: "admin" }), wrap(c.deleteProject));

module.exports = router;
