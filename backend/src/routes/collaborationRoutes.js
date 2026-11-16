const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireWorkspaceMember = require("../middleware/requireWorkspaceMember");
const validateIds = require("../middleware/validateIds");
const c = require("../controllers/collaborationController");
const analytics = require("../controllers/analyticsController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/:workspaceId/dashboard", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(c.dashboard));
router.get("/:workspaceId/workload", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(analytics.getWorkspaceWorkload));
router.get("/:workspaceId/analytics", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(analytics.getWorkspaceAnalytics));
router.get("/:workspaceId/analytics/export.csv", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(analytics.exportWorkspaceAnalytics));
router.get("/:workspaceId/notifications", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(c.listNotifications));
router.get("/:workspaceId/notification-preferences", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(c.getNotificationPreferences));
router.patch("/:workspaceId/notification-preferences", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(c.updateNotificationPreferences));
router.get("/:workspaceId/activity", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(c.listActivity));
router.post("/:workspaceId/notifications/read-all", validateIds(["workspaceId"]), requireWorkspaceMember(), wrap(c.markAllNotifications));
router.patch("/:workspaceId/notifications/:notificationId/read", validateIds(["workspaceId", "notificationId"]), requireWorkspaceMember(), wrap(c.markNotification));
router.delete("/:workspaceId/notifications/:notificationId", validateIds(["workspaceId", "notificationId"]), requireWorkspaceMember(), wrap(c.deleteNotification));

module.exports = router;
