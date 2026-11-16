const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireWorkspaceMember = require("../middleware/requireWorkspaceMember");
const validateIds = require("../middleware/validateIds");
const c = require("../controllers/collaborationController");
const analytics = require("../controllers/analyticsController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/:workspaceId/dashboard", requireWorkspaceMember(), wrap(c.dashboard));
router.get("/:workspaceId/workload", requireWorkspaceMember(), wrap(analytics.getWorkspaceWorkload));
router.get("/:workspaceId/analytics", requireWorkspaceMember(), wrap(analytics.getWorkspaceAnalytics));
router.get("/:workspaceId/analytics/export.csv", requireWorkspaceMember(), wrap(analytics.exportWorkspaceAnalytics));
router.get("/:workspaceId/notifications", requireWorkspaceMember(), wrap(c.listNotifications));
router.get("/:workspaceId/notification-preferences", requireWorkspaceMember(), wrap(c.getNotificationPreferences));
router.patch("/:workspaceId/notification-preferences", requireWorkspaceMember(), wrap(c.updateNotificationPreferences));
router.get("/:workspaceId/activity", requireWorkspaceMember(), wrap(c.listActivity));
router.patch("/:workspaceId/notifications/:notificationId/read", validateIds(["notificationId"]), requireWorkspaceMember(), wrap(c.markNotification));

module.exports = router;
