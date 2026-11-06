process.env.JWT_SECRET = require("node:crypto").randomBytes(32).toString("hex");
process.env.JWT_EXPIRES_IN = "1h";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const http = require("node:http");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");
const app = require("../src/app");

const users = new Map();
let nextId = 1;
let server;
let baseUrl;

function rowFor(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.password_hash,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

pool.query = async (query, values = []) => {
  if (query.startsWith("INSERT INTO users")) {
    const [name, email, passwordHash] = values;
    if (users.has(email)) {
      const error = new Error("duplicate key");
      error.code = "23505";
      throw error;
    }

    const now = new Date().toISOString();
    const user = {
      id: String(nextId++),
      name,
      email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };
    users.set(email, user);
    return { rows: [rowFor(user)] };
  }

  if (query.includes("WHERE email = $1")) {
    const user = users.get(values[0]);
    return { rows: user ? [rowFor(user)] : [] };
  }

  if (query.includes("WHERE id = $1")) {
    const user = [...users.values()].find((candidate) => candidate.id === values[0]);
    return { rows: user ? [rowFor(user)] : [] };
  }

  throw new Error(`Unexpected test query: ${query}`);
};

async function request(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

test("registers users without returning the password hash", async () => {
  const response = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Test User", email: "Test@Example.com", password: "secure-pass-123" },
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, "test@example.com");
  assert.equal("password_hash" in response.body.user, false);
  assert.equal("password" in response.body.user, false);
  assert.equal(
    await bcrypt.compare("secure-pass-123", users.get("test@example.com").password_hash),
    true
  );
});

test("validates registration fields and minimum password length", async () => {
  const missingFields = await request("/api/auth/register", {
    method: "POST",
    body: {},
  });
  const invalidEmail = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Test", email: "not-an-email", password: "secure-pass-123" },
  });
  const shortPassword = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Test", email: "valid@example.com", password: "short" },
  });

  assert.equal(missingFields.status, 400);
  assert.equal(
    missingFields.body.errors.some((error) => error.field === "name"),
    true
  );
  assert.equal(invalidEmail.status, 400);
  assert.equal(
    invalidEmail.body.errors.some((error) => error.field === "email"),
    true
  );
  assert.equal(shortPassword.status, 400);
  assert.equal(
    shortPassword.body.errors.some((error) => error.field === "password"),
    true
  );
});

test("rejects duplicate email registrations", async () => {
  const response = await request("/api/auth/register", {
    method: "POST",
    body: { name: "Duplicate", email: "test@example.com", password: "secure-pass-123" },
  });

  assert.equal(response.status, 409);
});

test("logs in with valid credentials and returns a signed JWT", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { email: "TEST@example.com", password: "secure-pass-123" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.id, "1");
  assert.equal("password_hash" in response.body.user, false);
  assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).sub, "1");
});

test("rejects invalid login credentials with a generic error", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { email: "test@example.com", password: "wrong-password" },
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid email or password");
});

test("rejects login for an unknown email with the generic error", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { email: "unknown@example.com", password: "secure-pass-123" },
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid email or password");
});

test("requires a bearer token and rejects invalid or expired tokens", async () => {
  const missing = await request("/api/auth/me");
  const invalid = await request("/api/auth/me", { token: "not-a-jwt" });
  const invalidSignatureToken = jwt.sign(
    { sub: "1" },
    require("node:crypto").randomBytes(32).toString("hex"),
    { expiresIn: "1h", algorithm: "HS256" }
  );
  const invalidSignature = await request("/api/auth/me", {
    token: invalidSignatureToken,
  });
  const expiredToken = jwt.sign({ sub: "1" }, process.env.JWT_SECRET, {
    expiresIn: -1,
    algorithm: "HS256",
  });
  const expired = await request("/api/auth/me", { token: expiredToken });

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal(invalidSignature.status, 401);
  assert.equal(expired.status, 401);
});

test("returns the authenticated user profile only", async () => {
  const token = jwt.sign({ sub: "1" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
    algorithm: "HS256",
  });
  const response = await request("/api/auth/me", { token });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.id, "1");
  assert.equal(response.body.user.email, "test@example.com");
  assert.equal("password_hash" in response.body.user, false);
});

test("handles a valid token for a user who no longer exists", async () => {
  const token = jwt.sign({ sub: "999" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
    algorithm: "HS256",
  });
  const response = await request("/api/auth/me", { token });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    success: false,
    message: "User not found",
  });
});
