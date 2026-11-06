const assert = require("node:assert/strict");
const { test } = require("node:test");
const { validateEnvironment } = require("../src/config/env");
const { getTestDatabaseUrl } = require("../src/config/testDb");

function withEnvironment(values, callback) {
  const previousValues = new Map();
  for (const [key, value] of Object.entries(values)) {
    previousValues.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return callback();
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("accepts a valid database URL and JWT configuration", () => {
  assert.doesNotThrow(() =>
    validateEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/app",
      JWT_SECRET: "a".repeat(32),
      JWT_EXPIRES_IN: "1h",
    })
  );
});

test("reports missing required configuration without exposing secret values", () => {
  const secret = "short-sensitive-value";
  assert.throws(
    () =>
      validateEnvironment({
        JWT_SECRET: secret,
        DATABASE_URL: "",
        DB_USER: "",
      }),
    (error) => {
      assert.match(error.message, /JWT_SECRET/);
      assert.match(error.message, /DB_USER/);
      assert.equal(error.message.includes(secret), false);
      return true;
    }
  );
});

test("rejects blank JWT secrets and invalid database ports", () => {
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "",
        DB_USER: "app_user",
        DB_PORT: "70000",
        JWT_SECRET: " ".repeat(40),
      }),
    /JWT_SECRET.*DB_PORT/s
  );
});

test("rejects placeholder secrets and invalid database or expiry settings", () => {
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "mysql://user:password@localhost:3306/app",
        JWT_SECRET: "<generate-a-random-secret-of-at-least-32-characters>",
        JWT_EXPIRES_IN: "forever",
      }),
    /Invalid environment configuration/
  );
});

test("requires a dedicated test database URL for manual connectivity checks", () => {
  withEnvironment(
    {
      TEST_DATABASE_URL: undefined,
      DATABASE_URL: "postgresql://user:password@localhost:5432/application",
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "application",
      NODE_ENV: "test",
    },
    () =>
      assert.throws(getTestDatabaseUrl, /TEST_DATABASE_URL is required/)
  );
});

test("rejects production and application database targets", () => {
  withEnvironment(
    {
      TEST_DATABASE_URL:
        "postgresql://user:password@localhost:5432/project_management_test",
      DATABASE_URL: undefined,
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "project_management_test",
      NODE_ENV: "test",
    },
    () =>
      assert.throws(
        getTestDatabaseUrl,
        /must target a test-named database and must not identify/
      )
  );

  withEnvironment(
    {
      TEST_DATABASE_URL:
        "postgresql://user:password@localhost:5432/project_management_test",
      DATABASE_URL: undefined,
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "application",
      NODE_ENV: "production",
    },
    () =>
      assert.throws(
        getTestDatabaseUrl,
        /Refusing to run the test database check/
      )
  );
});

test("accepts a dedicated test-named database target", () => {
  withEnvironment(
    {
      TEST_DATABASE_URL:
        "postgresql://user:password@localhost:5432/project_management_test",
      DATABASE_URL: "postgresql://user:password@localhost:5432/application",
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "application",
      NODE_ENV: "test",
    },
    () =>
      assert.equal(
        getTestDatabaseUrl(),
        "postgresql://user:password@localhost:5432/project_management_test"
      )
  );
});
