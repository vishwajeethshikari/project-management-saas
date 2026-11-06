const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireWorkspaceMember = require("../middleware/requireWorkspaceMember");
const c = require("../controllers/collaborationController");
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const router = express.Router();
router.use(authenticateToken);
router.get("/:workspaceId/dashboard", requireWorkspaceMember(), wrap(c.dashboard));
router.get("/:workspaceId/notifications", requireWorkspaceMember(), wrap(c.listNotifications));
router.patch("/:workspaceId/notifications/:notificationId/read", requireWorkspaceMember(), wrap(c.markNotification));

module.exports = router;
