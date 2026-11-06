const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const JWT_EXPIRATION_PATTERN = /^[1-9]\d*(?:s|m|h|d|w|y)$/i;

function validateEnvironment(env = process.env) {
  const errors = [];
  const jwtSecret = env.JWT_SECRET;

  if (
    !jwtSecret ||
    !jwtSecret.trim() ||
    Buffer.byteLength(jwtSecret, "utf8") < 32 ||
    (/^<.*>$/.test(jwtSecret) && jwtSecret.includes("generate-a-random-secret"))
  ) {
    errors.push("JWT_SECRET must be a configured secret of at least 32 bytes.");
  }

  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(databaseUrl);
    } catch {
      errors.push("DATABASE_URL must be a valid PostgreSQL connection URL.");
    }

    if (
      parsedUrl &&
      (!POSTGRES_PROTOCOLS.has(parsedUrl.protocol) ||
        !parsedUrl.hostname ||
        parsedUrl.pathname.length <= 1)
    ) {
      errors.push("DATABASE_URL must be a valid PostgreSQL connection URL.");
    }
  } else if (!env.DB_USER || !env.DB_USER.trim()) {
    errors.push("DB_USER is required when DATABASE_URL is not configured.");
  }

  if (env.DB_PORT !== undefined && env.DB_PORT !== "") {
    const port = Number(env.DB_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push("DB_PORT must be an integer between 1 and 65535.");
    }
  }

  if (
    env.JWT_EXPIRES_IN &&
    !JWT_EXPIRATION_PATTERN.test(env.JWT_EXPIRES_IN)
  ) {
    errors.push(
      "JWT_EXPIRES_IN must be a positive duration using s, m, h, d, w, or y."
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  }
}

module.exports = { validateEnvironment };
