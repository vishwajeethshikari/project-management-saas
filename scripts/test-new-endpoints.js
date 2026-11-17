#!/usr/bin/env node
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { createRequire } = require("node:module");

const backendRequire = createRequire(path.resolve(__dirname, "../backend/package.json"));
backendRequire("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = backendRequire("./src/config/db");

const apiBase = process.env.SMOKE_API_URL || "http://localhost:5000/api";
let cookie;
let userId, orgId, wsId, projId, taskId, commentId, labelId;

async function request(method, route, body) {
  const res = await fetch(`${apiBase}${route}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function test() {
  const uid = randomUUID().slice(0, 8);
  const email = `test-feat-${uid}@test.local`;
  const pass = `Password123!${uid}`;
  const newPass = `NewPassword123!${uid}`;

  console.log("1. Registering user...");
  let r = await request("POST", "/auth/register", { name: `Tester ${uid}`, email, password: pass });
  if (r.status !== 201) throw new Error("Register failed: " + JSON.stringify(r.data));
  userId = r.data.user.id;

  console.log("2. Logging in...");
  r = await request("POST", "/auth/login", { email, password: pass });
  if (r.status !== 200) throw new Error("Login failed: " + JSON.stringify(r.data));

  console.log("3. Testing Change Password...");
  r = await request("POST", "/auth/password/change", { currentPassword: pass, newPassword: newPass });
  if (r.status !== 200) throw new Error("Change password failed: " + JSON.stringify(r.data));

  console.log("4. Testing Login with New Password...");
  r = await request("POST", "/auth/login", { email, password: newPass });
  if (r.status !== 200) throw new Error("Login with new pass failed: " + JSON.stringify(r.data));

  console.log("5. Creating Organization...");
  r = await request("POST", "/organizations", { name: `Test Org ${uid}` });
  if (r.status !== 201) throw new Error("Create org failed: " + JSON.stringify(r.data));
  orgId = r.data.organization.id;

  console.log("6. Creating Workspace...");
  r = await request("POST", "/workspaces", { name: `Test WS ${uid}`, organizationId: orgId });
  if (r.status !== 201) throw new Error("Create ws failed: " + JSON.stringify(r.data));
  wsId = r.data.workspace.id;

  console.log("7. Creating Project with startDate and manager...");
  r = await request("POST", `/workspaces/${wsId}/projects`, {
    name: `Project Alpha ${uid}`,
    description: "Test description",
    startDate: "2026-11-01",
    dueDate: "2026-12-01",
    managerId: userId,
  });
  if (r.status !== 201) throw new Error("Create project failed: " + JSON.stringify(r.data));
  projId = r.data.project.id;
  console.log("   Project created: start_date =", r.data.project.start_date, "manager_id =", r.data.project.manager_id);

  console.log("8. Checking Project Members...");
  r = await request("GET", `/workspaces/${wsId}/projects/${projId}/members`);
  if (r.status !== 200 || !r.data.members?.length) throw new Error("Project members failed: " + JSON.stringify(r.data));
  console.log("   Found", r.data.members.length, "members in project.");

  console.log("9. Creating Workspace Label...");
  r = await request("POST", `/workspaces/${wsId}/labels`, { name: `Bug-${uid}`, color: "#ef4444" });
  if (r.status !== 201) throw new Error("Create label failed: " + JSON.stringify(r.data));
  labelId = r.data.label.id;

  console.log("10. Creating Task...");
  r = await request("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId,
    title: `Task Alpha ${uid}`,
    status: "todo",
    priority: "high",
    assigneeId: userId,
    dueDate: "2026-11-20",
  });
  if (r.status !== 201) throw new Error("Create task failed: " + JSON.stringify(r.data));
  taskId = r.data.task.id;

  console.log("11. Adding Label to Task...");
  r = await request("POST", `/workspaces/${wsId}/tasks/${taskId}/labels`, { labelId });
  if (r.status !== 201) throw new Error("Add task label failed: " + JSON.stringify(r.data));

  console.log("12. Creating Subtask...");
  r = await request("POST", `/workspaces/${wsId}/tasks/${taskId}/subtasks`, { title: "Subtask 1" });
  if (r.status !== 201) throw new Error("Create subtask failed: " + JSON.stringify(r.data));
  const subId = r.data.subtask.id;

  console.log("13. Marking Subtask completed...");
  r = await request("PATCH", `/workspaces/${wsId}/tasks/${taskId}/subtasks/${subId}`, { isCompleted: true });
  if (r.status !== 200) throw new Error("Update subtask failed: " + JSON.stringify(r.data));

  console.log("14. Verifying Task details (labels, subtask progress)...");
  r = await request("GET", `/workspaces/${wsId}/tasks/${taskId}`);
  if (r.status !== 200) throw new Error("Get task failed: " + JSON.stringify(r.data));
  console.log("   Task labels count:", r.data.task.labels?.length, "progress_percentage:", r.data.task.progress_percentage);

  console.log("15. Adding and Editing Comment...");
  r = await request("POST", `/workspaces/${wsId}/tasks/${taskId}/comments`, { body: "Initial comment" });
  if (r.status !== 201) throw new Error("Create comment failed: " + JSON.stringify(r.data));
  commentId = r.data.comment.id;

  r = await request("PATCH", `/workspaces/${wsId}/tasks/${taskId}/comments/${commentId}`, { body: "Edited comment" });
  if (r.status !== 200 || r.data.comment.body !== "Edited comment") throw new Error("Edit comment failed: " + JSON.stringify(r.data));

  console.log("16. Testing My Work API (/workspaces/:id/my-work)...");
  r = await request("GET", `/workspaces/${wsId}/my-work`);
  if (r.status !== 200 || !r.data.myWork?.stats) throw new Error("My work failed: " + JSON.stringify(r.data));
  console.log("   My Work stats:", r.data.myWork.stats);

  console.log("17. Testing Global Search (/workspaces/:id/search?q=Alpha)...");
  r = await request("GET", `/workspaces/${wsId}/search?q=Alpha`);
  if (r.status !== 200 || !r.data.results?.tasks?.length) throw new Error("Search failed: " + JSON.stringify(r.data));
  console.log("   Search matched", r.data.results.tasks.length, "tasks and", r.data.results.projects.length, "projects.");

  console.log("18. Testing Notifications (read-all & delete)...");
  r = await request("GET", `/workspaces/${wsId}/notifications`);
  const notifId = r.data.notifications?.[0]?.id;
  r = await request("POST", `/workspaces/${wsId}/notifications/read-all`);
  if (r.status !== 200) throw new Error("Read all failed: " + JSON.stringify(r.data));
  if (notifId) {
    r = await request("DELETE", `/workspaces/${wsId}/notifications/${notifId}`);
    if (r.status !== 204) throw new Error("Delete notification failed: " + r.status);
  }

  console.log("\nALL NEW ENDPOINTS VERIFIED SUCCESSFULLY!");
}

async function cleanup() {
  if (wsId) await pool.query("DELETE FROM workspaces WHERE id = $1", [wsId]);
  if (orgId) await pool.query("DELETE FROM organizations WHERE id = $1", [orgId]);
  if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
}

test()
  .then(() => cleanup())
  .catch(async (e) => {
    console.error(e);
    await cleanup();
    process.exit(1);
  });
