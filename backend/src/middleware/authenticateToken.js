const jwt = require("jsonwebtoken");
const { getRequestToken } = require("../utils/authCookie");
const pool = require("../config/db");

async function authenticateToken(req, res, next) {
  const token = getRequestToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  if (
    !process.env.JWT_SECRET ||
    Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
  ) {
    return next(new Error("JWT_SECRET must contain at least 32 bytes"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    const user = await pool.query("SELECT token_version FROM users WHERE id = $1", [payload.sub]);
    if (!user.rows[0] || Number(user.rows[0].token_version || 0) !== Number(payload.ver || 0)) {
      return res.status(401).json({ success: false, message: "Invalid or revoked authentication token" });
    }
    req.user = { id: payload.sub };
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }
    return next(error);
  }
}

module.exports = authenticateToken;
