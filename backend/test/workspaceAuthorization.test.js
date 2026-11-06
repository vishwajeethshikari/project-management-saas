process.env.JWT_SECRET = require("node:crypto").randomBytes(32).toString("hex");

const assert = require("node:assert/strict");
const { test } = require("node:test");
const pool = require("../src/config/db");
const requireWorkspaceMember = require("../src/middleware/requireWorkspaceMember");

test("workspace authorization rejects a non-member as not found", async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [] });
  const middleware = requireWorkspaceMember();
  const response = await new Promise((resolve) => {
    middleware(
      { params: { workspaceId: "12" }, user: { id: "7" } },
      { status(code) { return { json(body) { resolve({ code, body }); } }; } },
      () => resolve({ next: true })
    );
  });
  pool.query = originalQuery;
  assert.equal(response.code, 404);
  assert.equal(response.body.success, false);
});

test("workspace authorization rejects viewer from member actions", async () => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [{ role: "viewer" }] });
  const middleware = requireWorkspaceMember({ role: "member" });
  const response = await new Promise((resolve) => {
    middleware(
      { params: { workspaceId: "12" }, user: { id: "7" } },
      { status(code) { return { json(body) { resolve({ code, body }); } }; } },
      () => resolve({ next: true })
    );
  });
  pool.query = originalQuery;
  assert.equal(response.code, 403);
  assert.equal(response.body.success, false);
});
