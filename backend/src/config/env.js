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
    if (
      parsedUrl &&
      env.DATABASE_SSL_MODE &&
      [
        "ssl",
        "sslcert",
        "sslkey",
        "sslmode",
        "sslrootcert",
        "sslpassword",
        "sslcrl",
        "sslsni",
      ].some((parameter) => parsedUrl.searchParams.has(parameter))
    ) {
      errors.push(
        "Configure PostgreSQL TLS with DATABASE_SSL_MODE or DATABASE_URL SSL parameters, not both."
      );
    }
  } else if (
    env.NODE_ENV !== "production" &&
    (!env.DB_USER || !env.DB_USER.trim())
  ) {
    errors.push("DB_USER is required when DATABASE_URL is not configured.");
  }

  if (
    env.NODE_ENV === "production" &&
    (!databaseUrl || !databaseUrl.trim())
  ) {
    errors.push("DATABASE_URL is required in production.");
  }

  if (
    env.DATABASE_SSL_MODE &&
    !["disable", "require", "verify-full"].includes(env.DATABASE_SSL_MODE)
  ) {
    errors.push(
      "DATABASE_SSL_MODE must be disable, require, or verify-full."
    );
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

  const clientOrigins = (env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of clientOrigins) {
    if (origin === "*") {
      errors.push("CLIENT_URL must contain comma-separated HTTP or HTTPS origins; '*' is not allowed.");
      break;
    }

    let parsedOrigin;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      errors.push("CLIENT_URL must contain comma-separated HTTP or HTTPS origins.");
      break;
    }

    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      errors.push("CLIENT_URL must contain comma-separated HTTP or HTTPS origins without paths or wildcards.");
      break;
    }
  }

  if (Boolean(env.EMAIL_API_KEY) !== Boolean(env.EMAIL_FROM)) {
    errors.push("EMAIL_API_KEY and EMAIL_FROM must be configured together.");
  }
  if (env.NODE_ENV === "production" && (!env.EMAIL_API_KEY || !env.EMAIL_FROM)) {
    errors.push("EMAIL_API_KEY and EMAIL_FROM are required in production for invitation and account recovery email.");
  }

  if (env.FRONTEND_URL) {
    try {
      const frontendUrl = new URL(env.FRONTEND_URL);
      if (!["http:", "https:"].includes(frontendUrl.protocol) || !frontendUrl.hostname) {
        errors.push("FRONTEND_URL must be a valid HTTP or HTTPS URL.");
      }
    } catch {
      errors.push("FRONTEND_URL must be a valid HTTP or HTTPS URL.");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  }
}

module.exports = { validateEnvironment };
