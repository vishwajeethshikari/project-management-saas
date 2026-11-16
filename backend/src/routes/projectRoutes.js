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
router.get("/:workspaceId/projects", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(c.listProjects));
router.post("/:workspaceId/projects", validateIds(["workspaceId"]), requireWorkspaceMember({ role: "manager" }), wrap(c.createProject));
router.get("/:workspaceId/projects/:projectId", validateIds(["workspaceId", "projectId"]), requireWorkspaceMember(), wrap(c.getProject));
router.patch("/:workspaceId/projects/:projectId", validateIds(["workspaceId", "projectId"]), requireWorkspaceMember({ role: "manager" }), wrap(c.updateProject));
router.delete("/:workspaceId/projects/:projectId", validateIds(["workspaceId", "projectId"]), requireWorkspaceMember({ role: "admin" }), wrap(c.deleteProject));
router.get("/:workspaceId/projects/:projectId/timeline", validateIds(["workspaceId", "projectId"]), requireWorkspaceMember(), wrap(timeline.getTimeline));
router.get("/:workspaceId/projects/:projectId/analytics", validateIds(["workspaceId", "projectId"]), requireWorkspaceMember(), wrap(analytics.getProjectAnalytics));
router.post("/:workspaceId/projects/:projectId/milestones", validateIds(["workspaceId", "projectId"]), requireWorkspaceMember({ role: "manager" }), wrap(timeline.createMilestone));
router.patch("/:workspaceId/projects/:projectId/milestones/:milestoneId", validateIds(["workspaceId", "projectId", "milestoneId"]), requireWorkspaceMember({ role: "manager" }), wrap(timeline.updateMilestone));
router.delete("/:workspaceId/projects/:projectId/milestones/:milestoneId", validateIds(["workspaceId", "projectId", "milestoneId"]), requireWorkspaceMember({ role: "manager" }), wrap(timeline.deleteMilestone));

module.exports = router;
