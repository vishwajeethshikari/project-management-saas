const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireWorkspaceMember = require("../middleware/requireWorkspaceMember");
const c = require("../controllers/taskController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/:workspaceId/projects/:projectId/tasks", requireWorkspaceMember(), wrap(c.listTasks));
router.post("/:workspaceId/tasks", requireWorkspaceMember({ role: "member" }), wrap(c.createTask));
router.get("/:workspaceId/tasks/:taskId", requireWorkspaceMember(), wrap(c.getTask));
router.patch("/:workspaceId/tasks/:taskId", requireWorkspaceMember({ role: "member" }), wrap(c.updateTask));
router.delete("/:workspaceId/tasks/:taskId", requireWorkspaceMember({ role: "member" }), wrap(c.deleteTask));
router.get("/:workspaceId/tasks/:taskId/comments", requireWorkspaceMember(), wrap(c.listComments));
router.post("/:workspaceId/tasks/:taskId/comments", requireWorkspaceMember(), wrap(c.createComment));

module.exports = router;
