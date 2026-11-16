const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireWorkspaceMember = require("../middleware/requireWorkspaceMember");
const validateIds = require("../middleware/validateIds");
const c = require("../controllers/projectController");
const timeline = require("../controllers/timelineController");
const analytics = require("../controllers/analyticsController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/:workspaceId/projects", requireWorkspaceMember(), wrap(c.listProjects));
router.post("/:workspaceId/projects", requireWorkspaceMember({ role: "manager" }), wrap(c.createProject));
router.get("/:workspaceId/projects/:projectId", validateIds(["projectId"]), requireWorkspaceMember(), wrap(c.getProject));
router.patch("/:workspaceId/projects/:projectId", validateIds(["projectId"]), requireWorkspaceMember({ role: "manager" }), wrap(c.updateProject));
router.delete("/:workspaceId/projects/:projectId", validateIds(["projectId"]), requireWorkspaceMember({ role: "admin" }), wrap(c.deleteProject));
router.get("/:workspaceId/projects/:projectId/timeline", validateIds(["projectId"]), requireWorkspaceMember(), wrap(timeline.getTimeline));
router.get("/:workspaceId/projects/:projectId/analytics", validateIds(["projectId"]), requireWorkspaceMember(), wrap(analytics.getProjectAnalytics));
router.post("/:workspaceId/projects/:projectId/milestones", validateIds(["projectId"]), requireWorkspaceMember({ role: "manager" }), wrap(timeline.createMilestone));
router.patch("/:workspaceId/projects/:projectId/milestones/:milestoneId", validateIds(["projectId", "milestoneId"]), requireWorkspaceMember({ role: "manager" }), wrap(timeline.updateMilestone));
router.delete("/:workspaceId/projects/:projectId/milestones/:milestoneId", validateIds(["projectId", "milestoneId"]), requireWorkspaceMember({ role: "manager" }), wrap(timeline.deleteMilestone));

module.exports = router;
