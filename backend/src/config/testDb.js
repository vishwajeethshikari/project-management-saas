
require("dotenv").config();

const { Pool } = require("pg");

const productionMarker = /(^|[-_.])(prod|production)([-_.]|$)/i;
const testDatabaseMarker = /(^|[-_.])test(s)?($|[-_.])/i;

function databaseNameFromUrl(databaseUrl) {
  return decodeURIComponent(databaseUrl.pathname.slice(1));
}

function targetsApplicationDatabase(databaseUrl, databaseName) {
  let applicationHost;
  let applicationPort;
  let applicationDatabase;

  if (process.env.DATABASE_URL) {
    try {
      const applicationUrl = new URL(process.env.DATABASE_URL);
      applicationHost = applicationUrl.hostname;
      applicationPort = applicationUrl.port || "5432";
      applicationDatabase = databaseNameFromUrl(applicationUrl);
    } catch {
      return false;
    }
  } else {
    applicationHost = process.env.DB_HOST || "localhost";
    applicationPort = process.env.DB_PORT || "5432";
    applicationDatabase = process.env.DB_NAME || "project_management_saas";
  }

  return (
    databaseUrl.hostname.toLowerCase() === applicationHost.toLowerCase() &&
    (databaseUrl.port || "5432") === applicationPort &&
    databaseName === applicationDatabase
  );
}

function getTestDatabaseUrl() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL is required; refusing to use application database settings."
    );
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !databaseUrl.hostname
  ) {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (productionMarker.test(process.env.NODE_ENV || "")) {
    throw new Error(
      "Refusing to run the test database check when NODE_ENV is production."
    );
  }

  let databaseName;
  try {
    databaseName = databaseNameFromUrl(databaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (
    !databaseName ||
    !testDatabaseMarker.test(databaseName) ||
    productionMarker.test(databaseName) ||
    productionMarker.test(databaseUrl.hostname) ||
    targetsApplicationDatabase(databaseUrl, databaseName)
  ) {
    throw new Error(
      "TEST_DATABASE_URL must target a test-named database and must not identify a production host or database."
    );
  }

  return connectionString;
}

async function testDatabase() {
  let pool;
  try {
    pool = new Pool({ connectionString: getTestDatabaseUrl() });
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );
    const databaseName = result.rows[0].database;

    if (
      !testDatabaseMarker.test(databaseName) ||
      productionMarker.test(databaseName)
    ) {
      throw new Error("Connected database is not identified as a test database.");
    }

    console.log("PostgreSQL test database connection successful!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error(
      error.message.startsWith("TEST_DATABASE_URL") ||
        error.message.startsWith("Connected database") ||
        error.message.startsWith("Refusing to")
        ? error.message
        : "PostgreSQL test database connection failed."
    );
    process.exitCode = 1;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch {
        console.error("Could not close PostgreSQL test database connection.");
        process.exitCode = 1;
      }
    }
  }
}

testDatabase();
