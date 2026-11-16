const assert = require("node:assert/strict");
const { test } = require("node:test");
const pool = require("../src/config/db");
const { startTimer } = require("../src/controllers/timeTrackingController");
const {
  timeEntryCreateSchema,
  timeEntryUpdateSchema,
  timeReportQuerySchema,
} = require("../src/validators/domainValidator");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("time entry validators reject invalid ranges and inverted report dates", () => {
  assert.equal(timeEntryCreateSchema.safeParse({
    startedAt: "2026-01-02T10:00:00.000Z",
    endedAt: "2026-01-02T10:00:00.000Z",
  }).success, false);
  assert.equal(timeEntryCreateSchema.safeParse({
    startedAt: "2026-01-01T10:00:00.000Z",
    endedAt: "2026-02-02T10:00:00.000Z",
  }).success, false);
  assert.equal(timeEntryUpdateSchema.safeParse({}).success, false);
  assert.equal(timeReportQuerySchema.safeParse({
    fromDate: "2026-02-10",
    toDate: "2026-02-01",
  }).success, false);
});

test("starting a timer serializes per-user work and rejects a duplicate active timer", async () => {
  const originalConnect = pool.connect;
  const queryCalls = [];
  let hasActiveTimer = false;
  pool.connect = async () => ({
    async query(sql) {
      queryCalls.push(sql);
      if (sql === "SELECT id,workspace_id,task_id,started_at FROM time_entries WHERE workspace_id=$1 AND user_id=$2 AND ended_at IS NULL LIMIT 1 FOR UPDATE") {
        return { rows: hasActiveTimer ? [{ id: "8", workspace_id: "2", task_id: "9" }] : [] };
      }
      if (sql.startsWith("SELECT id FROM tasks")) return { rows: [{ id: "9" }] };
      if (sql.startsWith("INSERT INTO time_entries")) {
        hasActiveTimer = true;
        return { rows: [{ id: "8", task_id: "9" }] };
      }
      return { rows: [] };
    },
    release() {},
  });
  const request = {
    body: { taskId: "9" },
    params: {},
    workspaceId: "2",
    user: { id: "7" },
  };

  try {
    const firstResponse = createResponse();
    await startTimer(request, firstResponse);
    assert.equal(firstResponse.statusCode, 201);

    const secondResponse = createResponse();
    await startTimer(request, secondResponse);
    assert.equal(secondResponse.statusCode, 409);
    assert.equal(queryCalls.filter((sql) => sql.startsWith("INSERT INTO time_entries")).length, 1);
    assert.ok(queryCalls.some((sql) => sql.includes("pg_advisory_xact_lock")));
  } finally {
    pool.connect = originalConnect;
  }
});
