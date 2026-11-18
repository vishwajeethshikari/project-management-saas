const assert = require("node:assert/strict");
const { test } = require("node:test");
const pool = require("../src/config/db");
const { removeTaskLabel } = require("../src/controllers/taskController");

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function removeLabel({ taskRows, labelRows }) {
  const originalQuery = pool.query;
  const queries = [];
  const response = createResponse();

  pool.query = async (query, values) => {
    queries.push({ query, values });
    if (query.includes("FROM tasks")) return { rows: taskRows };
    if (query.includes("FROM labels")) return { rows: labelRows };
    if (query.includes("DELETE FROM task_labels")) return { rows: [] };
    throw new Error(`Unexpected query: ${query}`);
  };

  try {
    await removeTaskLabel({
      workspaceId: "10",
      params: { taskId: "20", labelId: "30" },
    }, response);
  } finally {
    pool.query = originalQuery;
  }

  return { queries, response };
}

test("does not delete a task label when the task belongs to another workspace", async () => {
  const { queries, response } = await removeLabel({ taskRows: [], labelRows: [] });

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.message, "Task not found");
  assert.equal(queries.length, 1);
});

test("does not delete a task label when the label belongs to another workspace", async () => {
  const { queries, response } = await removeLabel({
    taskRows: [{ id: "20" }],
    labelRows: [],
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.message, "Label not found");
  assert.equal(queries.length, 2);
});

test("scopes a valid task-label deletion to its workspace", async () => {
  const { queries, response } = await removeLabel({
    taskRows: [{ id: "20" }],
    labelRows: [{ id: "30" }],
  });
  const deletion = queries[2];

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { success: true });
  assert.match(deletion.query, /DELETE FROM task_labels WHERE workspace_id=\$1/);
  assert.deepEqual(deletion.values, ["10", "20", "30"]);
});
