const express = require("express");
const {
  register,
  login,
  currentUser,
  updateCurrentUser,
} = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

router.post("/register", (req, res, next) => {
  register(req, res).catch(next);
});
router.post("/login", (req, res, next) => {
  login(req, res).catch(next);
});
router.get("/me", authenticateToken, (req, res, next) => {
  currentUser(req, res).catch(next);
});
router.patch("/me", authenticateToken, (req, res, next) => {
  updateCurrentUser(req, res).catch(next);
});

module.exports = router;
