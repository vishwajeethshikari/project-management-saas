const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getDatabaseConfig } = require("../src/config/databaseConfig");

test("uses Railway private networking without database TLS by default", () => {
  const config = getDatabaseConfig({
    DATABASE_URL:
      "postgresql://user:password@postgres.railway.internal:5432/projectflow",
  });

  assert.equal(config.ssl, false);
  assert.equal(config.max, 10);
  assert.equal(config.connectionTimeoutMillis, 5000);
});

test("requires TLS for public database URLs and supports verified TLS", () => {
  const publicConfig = getDatabaseConfig({
    DATABASE_URL: "postgresql://user:password@db.example.test:5432/projectflow",
  });
  const verifiedConfig = getDatabaseConfig({
    DATABASE_URL: "postgresql://user:password@db.example.test:5432/projectflow",
    DATABASE_SSL_MODE: "verify-full",
  });

  assert.deepEqual(publicConfig.ssl, { rejectUnauthorized: false });
  assert.deepEqual(verifiedConfig.ssl, { rejectUnauthorized: true });
});

test("respects SSL parameters embedded in DATABASE_URL without overriding them", () => {
  const config = getDatabaseConfig({
    DATABASE_URL:
      "postgresql://user:password@db.example.test:5432/projectflow?sslmode=verify-full",
  });

  assert.equal(Object.hasOwn(config, "ssl"), false);
});

test("rejects competing SSL configuration without including the URL", () => {
  const secretUrl =
    "postgresql://sensitive:password@db.example.test:5432/projectflow?sslmode=require";

  assert.throws(
    () =>
      getDatabaseConfig({
        DATABASE_URL: secretUrl,
        DATABASE_SSL_MODE: "require",
      }),
    (error) => {
      assert.match(error.message, /not both/);
      assert.equal(error.message.includes(secretUrl), false);
      return true;
    }
  );
});
