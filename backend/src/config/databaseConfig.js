const SSL_QUERY_PARAMETERS = [
  "ssl",
  "sslcert",
  "sslkey",
  "sslmode",
  "sslrootcert",
  "sslpassword",
  "sslcrl",
  "sslsni",
];

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".railway.internal")
  );
}

function getSslOptions(databaseUrl, sslMode) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length <= 1
  ) {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  const urlHasSslOptions = SSL_QUERY_PARAMETERS.some((parameter) =>
    url.searchParams.has(parameter)
  );

  if (sslMode && urlHasSslOptions) {
    throw new Error(
      "Configure PostgreSQL TLS with DATABASE_SSL_MODE or DATABASE_URL SSL parameters, not both."
    );
  }
  if (urlHasSslOptions) return undefined;

  const mode = sslMode || (isPrivateHost(url.hostname) ? "disable" : "require");
  if (mode === "disable") return false;
  if (mode === "require") return { rejectUnauthorized: false };
  if (mode === "verify-full") return { rejectUnauthorized: true };

  throw new Error(
    "DATABASE_SSL_MODE must be disable, require, or verify-full."
  );
}

function getDatabaseConfig(env = process.env) {
  const poolOptions = {
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  };

  if (env.DATABASE_URL) {
    const ssl = getSslOptions(env.DATABASE_URL, env.DATABASE_SSL_MODE);
    return {
      ...poolOptions,
      connectionString: env.DATABASE_URL,
      ...(ssl === undefined ? {} : { ssl }),
    };
  }

  return {
    ...poolOptions,
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT) || 5432,
    database: env.DB_NAME || "project_management_saas",
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: false,
  };
}

module.exports = { getDatabaseConfig };
