const express = require("express");
const {
  register,
  login,
  logout,
  currentUser,
  updateCurrentUser,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");
const optionalAuthenticateToken = require("../middleware/optionalAuthenticateToken");

const router = express.Router();

router.post("/register", (req, res, next) => {
  register(req, res).catch(next);
});
router.post("/login", (req, res, next) => {
  login(req, res).catch(next);
});
router.post("/logout", optionalAuthenticateToken, (req, res, next) => {
  logout(req, res).catch(next);
});
router.post("/password/forgot", (req, res, next) => {
  requestPasswordReset(req, res).catch(next);
});
router.post("/password/reset", (req, res, next) => {
  resetPassword(req, res).catch(next);
});
router.get("/me", authenticateToken, (req, res, next) => {
  currentUser(req, res).catch(next);
});
router.patch("/me", authenticateToken, (req, res, next) => {
  updateCurrentUser(req, res).catch(next);
});

module.exports = router;
