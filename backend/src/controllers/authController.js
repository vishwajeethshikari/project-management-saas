const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { registerSchema, loginSchema } = require("../validators/authValidator");

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
    "SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign({ sub: String(user.id) }, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRATION,
    algorithm: "HS256",
  });

  return res.status(200).json({
    success: true,
    token,
    user: publicUser(user),
  });
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

module.exports = { register, login, currentUser };
