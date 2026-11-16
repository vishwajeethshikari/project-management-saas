const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/db");
const { registerSchema, loginSchema } = require("../validators/authValidator");
const { profileSchema, passwordResetRequestSchema, passwordResetSchema } = require("../validators/domainValidator");
const { clearAuthCookie, setAuthCookie } = require("../utils/authCookie");
const { sendEmail } = require("../services/emailService");

const SALT_ROUNDS = 12;
const TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN || "1h";

function getJwtSecret() {
  if (
    !process.env.JWT_SECRET ||
    Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
  ) {
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  }

  return process.env.JWT_SECRET;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function validationError(res, error) {
  return res.status(400).json({
    success: false,
    message: "Invalid request data",
    errors: error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message,
    })),
  });
}

async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return validationError(res, parsed.error);
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at, updated_at`,
      [name, email, passwordHash]
    );

    return res.status(201).json({
      success: true,
      user: publicUser(result.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    throw error;
  }
}

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return validationError(res, parsed.error);
  }

  const email = parsed.data.email.toLowerCase();
  const result = await pool.query(
    "SELECT id, name, email, password_hash, token_version, created_at, updated_at FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign({ sub: String(user.id), ver: Number(user.token_version || 0) }, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRATION,
    algorithm: "HS256",
  });

  setAuthCookie(res, token);

  return res.status(200).json({
    success: true,
    user: publicUser(user),
  });
}

async function logout(req, res) {
  if (req.user) await pool.query("UPDATE users SET token_version=token_version+1 WHERE id = $1", [req.user.id]);
  clearAuthCookie(res);
  return res.status(200).json({ success: true });
}

async function currentUser(req, res) {
  const result = await pool.query(
    "SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1",
    [req.user.id]
  );

  if (!result.rows[0]) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user: publicUser(result.rows[0]),
  });
}

async function updateCurrentUser(req, res) {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const result = await pool.query(
    `UPDATE users SET name = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, created_at, updated_at`,
    [parsed.data.name, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: "User not found" });
  return res.status(200).json({ success: true, user: publicUser(result.rows[0]) });
}

async function requestPasswordReset(req, res) {
  const parsed = passwordResetRequestSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const email = parsed.data.email.toLowerCase();
  const userResult = await pool.query("SELECT id,email FROM users WHERE email=$1", [email]);
  let resetToken;
  let delivered = false;
  if (userResult.rows[0]) {
    resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await pool.query(
      `UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL`,
      [userResult.rows[0].id]);
    await pool.query(
      `INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
       VALUES($1,$2,NOW()+INTERVAL '30 minutes')`, [userResult.rows[0].id, tokenHash]);
    const url = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
    url.searchParams.set("reset", resetToken);
    try {
      delivered = (await sendEmail({
        to: userResult.rows[0].email,
        subject: "Reset your password",
        text: `Use this link to reset your password within 30 minutes: ${url.toString()}`,
        html: `<p>Use this link to reset your password within 30 minutes.</p><p><a href="${url.toString()}">Reset password</a></p>`,
      })).delivered;
    } catch {
      await pool.query("UPDATE password_reset_tokens SET used_at=NOW() WHERE token_hash=$1", [tokenHash]);
    }
  }
  const response = { success: true, message: "If the account exists, password recovery instructions have been sent." };
  if (resetToken && !delivered && process.env.NODE_ENV !== "production") response.resetToken = resetToken;
  return res.status(200).json(response);
}

async function resetPassword(req, res) {
  const parsed = passwordResetSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const token = await client.query(
      `SELECT id,user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`, [tokenHash]);
    if (!token.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Password reset token is invalid or expired" });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
    await client.query("UPDATE users SET password_hash=$1,token_version=token_version+1,updated_at=NOW() WHERE id=$2", [passwordHash, token.rows[0].user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1", [token.rows[0].id]);
    await client.query("COMMIT");
    return res.status(200).json({ success: true, message: "Password has been reset. Sign in with your new password." });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

module.exports = { register, login, logout, currentUser, updateCurrentUser, requestPasswordReset, resetPassword };
