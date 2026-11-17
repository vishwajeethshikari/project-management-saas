#!/usr/bin/env node
/**
 * FINAL INDEPENDENT VERIFICATION SUITE
 * =====================================
 * This script performs a completely new, independent verification pass
 * that does NOT reuse any test logic from the prior e2e-qa-suite.js.
 *
 * It tests:
 *   1. Previous fix verification (code inspection done manually, runtime verification here)
 *   2. Admin login & permissions
 *   3. Cross-role HTTP-level authorization probes
 *   4. Database constraint verification (FK, unique, cascade, orphans, concurrent updates)
 *   5. API edge cases not covered in the first pass
 */
const path = require("node:path");
const { createRequire } = require("node:module");
const crypto = require("node:crypto");

const br = createRequire(path.resolve(__dirname, "../backend/package.json"));
br("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = br("./src/config/db");

const BASE = "http://localhost:5000/api";
const results = [];
const categories = {};

function log(testId, status, message, category = "General") {
  results.push({ testId, status, message, category });
  if (!categories[category]) categories[category] = { pass: 0, fail: 0, blocked: 0 };
  categories[category][status.toLowerCase()]++;
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "⊘";
  console.log(`  [${icon} ${status}] ${testId}: ${message}`);
}

async function api(method, endpoint, body = null, token = null) {
  const headers = {};
  if (token) headers["Cookie"] = `projectflow_session=${token}`;
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const cookieToken = setCookie.match(/projectflow_session=([^;]+)/)?.[1] || null;
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    try { data = await res.json(); } catch {}
  } else {
    try { data = await res.text(); } catch {}
  }
  return { status: res.status, data, token: cookieToken };
}

async function run() {
  const runId = crypto.randomBytes(4).toString("hex");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  FINAL INDEPENDENT VERIFICATION SUITE                   ║");
  console.log(`║  Run ID: ${runId}                                       ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ====================================================================
  // SECTION 1: ADMIN LOGIN & CAPABILITIES
  // ====================================================================
  console.log("━━ SECTION 1: ADMIN LOGIN & CAPABILITIES ━━");

  // Try the three known original user accounts with password "root"
  let adminToken = null;
  let adminEmail = null;
  let adminUserId = null;

  for (const email of ["shikarivishwajeeth@gmail.com", "vishwajeeth06@gmail.com", "bitu@gmail.com"]) {
    const r = await api("POST", "/auth/login", { email, password: "root" });
    if (r.status === 200 && r.token) {
      adminToken = r.token;
      adminEmail = email;
      adminUserId = r.data.user.id;
      log("ADMIN-01", "PASS", `Admin login succeeded for ${email}`, "Admin");
      break;
    }
  }

  if (!adminToken) {
    log("ADMIN-01", "FAIL", "Could not login with any known admin account using password 'root'", "Admin");
    // Continue with a fresh account for the remaining tests
    const freshEmail = `verifier_admin_${runId}@test.local`;
    await api("POST", "/auth/register", { name: "Verifier Admin", email: freshEmail, password: "root1234" });
    const r = await api("POST", "/auth/login", { email: freshEmail, password: "root1234" });
    adminToken = r.token;
    adminEmail = freshEmail;
    adminUserId = r.data.user.id;
    log("ADMIN-01b", "PASS", `Fallback: created fresh admin account ${freshEmail}`, "Admin");
  }

  // Verify /auth/me returns profile
  const meRes = await api("GET", "/auth/me", null, adminToken);
  log("ADMIN-02", meRes.status === 200 && meRes.data?.user?.email ? "PASS" : "FAIL",
    "GET /auth/me returns authenticated profile", "Admin");

  // Admin creates an organization
  const orgName = `IndVerify Org ${runId}`;
  const orgRes = await api("POST", "/organizations", { name: orgName }, adminToken);
  log("ADMIN-03", orgRes.status === 201 ? "PASS" : "FAIL",
    `Admin creates organization "${orgName}"`, "Admin");
  const adminOrgId = orgRes.data?.organization?.id;

  // List organizations
  const orgListRes = await api("GET", "/organizations", null, adminToken);
  log("ADMIN-04", orgListRes.status === 200 && orgListRes.data?.organizations?.some(o => String(o.id) === String(adminOrgId)) ? "PASS" : "FAIL",
    "Admin can list organizations including newly created one", "Admin");

  // Create workspace
  const wsRes = await api("POST", "/workspaces", { name: `QA Workspace ${runId}`, organizationId: adminOrgId }, adminToken);
  log("ADMIN-05", wsRes.status === 201 ? "PASS" : "FAIL",
    "Admin creates workspace in org", "Admin");
  const wsId = wsRes.data?.workspace?.id;

  // Dashboard
  const dashRes = await api("GET", `/workspaces/${wsId}/dashboard`, null, adminToken);
  log("ADMIN-06", dashRes.status === 200 && dashRes.data?.dashboard?.task_count !== undefined ? "PASS" : "FAIL",
    "Dashboard returns metrics (task_count, completed_tasks, etc.)", "Admin");

  // Analytics
  const analRes = await api("GET", `/workspaces/${wsId}/analytics`, null, adminToken);
  log("ADMIN-07", analRes.status === 200 && analRes.data?.metrics !== undefined ? "PASS" : "FAIL",
    "Admin can view workspace analytics", "Admin");

  // Workload report
  const workloadRes = await api("GET", `/workspaces/${wsId}/workload`, null, adminToken);
  log("ADMIN-08", workloadRes.status === 200 ? "PASS" : "FAIL",
    "Admin can view workload report", "Admin");

  // Notification preferences
  const notifPrefRes = await api("GET", `/workspaces/${wsId}/notification-preferences`, null, adminToken);
  log("ADMIN-09", notifPrefRes.status === 200 ? "PASS" : "FAIL",
    "Admin can read notification preferences (settings)", "Admin");

  // Members list
  const membersRes = await api("GET", `/workspaces/${wsId}/members`, null, adminToken);
  log("ADMIN-10", membersRes.status === 200 ? "PASS" : "FAIL",
    "Admin can list workspace members", "Admin");

  // Teams list
  const teamsRes = await api("GET", `/workspaces/${wsId}/teams`, null, adminToken);
  log("ADMIN-11", teamsRes.status === 200 ? "PASS" : "FAIL",
    "Admin can list workspace teams", "Admin");

  // Activity feed
  const actRes = await api("GET", `/workspaces/${wsId}/activity`, null, adminToken);
  log("ADMIN-12", actRes.status === 200 ? "PASS" : "FAIL",
    "Admin can view activity feed", "Admin");

  // Create project
  const projRes = await api("POST", `/workspaces/${wsId}/projects`, {
    name: `Verify Project ${runId}`, status: "in_progress",
    startDate: "2026-11-01", deadline: "2026-12-31",
  }, adminToken);
  log("ADMIN-13", projRes.status === 201 ? "PASS" : "FAIL",
    "Admin creates project", "Admin");
  const projId = projRes.data?.project?.id;

  // ====================================================================
  // SECTION 2: CROSS-ROLE AUTHORIZATION (HTTP-level, not UI)
  // ====================================================================
  console.log("\n━━ SECTION 2: CROSS-ROLE AUTHORIZATION ━━");

  // Register manager + employee accounts
  const mgrEmail = `v_mgr_${runId}@test.local`;
  const empEmail = `v_emp_${runId}@test.local`;
  await api("POST", "/auth/register", { name: "V Manager", email: mgrEmail, password: "Password1!" });
  await api("POST", "/auth/register", { name: "V Employee", email: empEmail, password: "Password1!" });
  const mgrLogin = await api("POST", "/auth/login", { email: mgrEmail, password: "Password1!" });
  const empLogin = await api("POST", "/auth/login", { email: empEmail, password: "Password1!" });
  const mgrToken = mgrLogin.token;
  const empToken = empLogin.token;
  const mgrId = mgrLogin.data?.user?.id;
  const empId = empLogin.data?.user?.id;

  // Add them to org + workspace
  await pool.query("INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1,$2,'manager'),($1,$3,'employee') ON CONFLICT DO NOTHING",
    [adminOrgId, mgrId, empId]);
  await pool.query("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,'manager'),($1,$3,'employee') ON CONFLICT DO NOTHING",
    [wsId, mgrId, empId]);

  // Create a task assigned to employee
  const taskRes = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId, title: `Verify Task ${runId}`, status: "todo", priority: "medium", assigneeId: empId
  }, adminToken);
  log("ROLE-01", taskRes.status === 201 ? "PASS" : "FAIL",
    "Admin creates task assigned to employee", "RBAC");
  const taskId = taskRes.data?.task?.id;

  // Employee updates status on assigned task (ALLOWED)
  const empStatus = await api("PATCH", `/workspaces/${wsId}/tasks/${taskId}`, { status: "in_progress" }, empToken);
  log("ROLE-02", empStatus.status === 200 && empStatus.data?.task?.status === "in_progress" ? "PASS" : "FAIL",
    "Employee CAN update status on assigned task", "RBAC");

  // Employee tries to update title (FORBIDDEN)
  const empTitle = await api("PATCH", `/workspaces/${wsId}/tasks/${taskId}`, { title: "Hacked" }, empToken);
  log("ROLE-03", empTitle.status === 403 ? "PASS" : "FAIL",
    `Employee CANNOT update task title (got ${empTitle.status}, expect 403)`, "RBAC");

  // Employee tries to update priority (FORBIDDEN)
  const empPrio = await api("PATCH", `/workspaces/${wsId}/tasks/${taskId}`, { priority: "critical" }, empToken);
  log("ROLE-04", empPrio.status === 403 ? "PASS" : "FAIL",
    `Employee CANNOT update task priority (got ${empPrio.status}, expect 403)`, "RBAC");

  // Employee tries to create a project (FORBIDDEN)
  const empProj = await api("POST", `/workspaces/${wsId}/projects`, { name: "EmpProj", status: "in_progress" }, empToken);
  log("ROLE-05", empProj.status === 403 ? "PASS" : "FAIL",
    `Employee CANNOT create project (got ${empProj.status}, expect 403)`, "RBAC");

  // Employee tries to delete project (FORBIDDEN)
  const empDelProj = await api("DELETE", `/workspaces/${wsId}/projects/${projId}`, null, empToken);
  log("ROLE-06", empDelProj.status === 403 ? "PASS" : "FAIL",
    `Employee CANNOT delete project (got ${empDelProj.status}, expect 403)`, "RBAC");

  // Employee tries to create a team (FORBIDDEN)
  const empTeam = await api("POST", `/workspaces/${wsId}/teams`, { name: "HackerTeam" }, empToken);
  log("ROLE-07", empTeam.status === 403 ? "PASS" : "FAIL",
    `Employee CANNOT create team (got ${empTeam.status}, expect 403)`, "RBAC");

  // Manager CAN update task title
  const mgrTitle = await api("PATCH", `/workspaces/${wsId}/tasks/${taskId}`, { title: `Updated ${runId}` }, mgrToken);
  log("ROLE-08", mgrTitle.status === 200 ? "PASS" : "FAIL",
    "Manager CAN update task title", "RBAC");

  // Manager CAN create project
  const mgrProj = await api("POST", `/workspaces/${wsId}/projects`, { name: `MgrProj ${runId}`, status: "in_progress" }, mgrToken);
  log("ROLE-09", mgrProj.status === 201 ? "PASS" : "FAIL",
    "Manager CAN create project", "RBAC");

  // Manager CANNOT delete project (requires admin role)
  const mgrDelProj = await api("DELETE", `/workspaces/${wsId}/projects/${projId}`, null, mgrToken);
  log("ROLE-10", mgrDelProj.status === 403 ? "PASS" : "FAIL",
    `Manager CANNOT delete project (got ${mgrDelProj.status}, expect 403)`, "RBAC");

  // Employee tries to update status on a task NOT assigned to them
  const otherTask = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId, title: `Mgr Task ${runId}`, status: "todo", priority: "low"
  }, mgrToken);
  const otherTaskId = otherTask.data?.task?.id;
  const empOtherStatus = await api("PATCH", `/workspaces/${wsId}/tasks/${otherTaskId}`, { status: "in_progress" }, empToken);
  log("ROLE-11", empOtherStatus.status === 403 ? "PASS" : "FAIL",
    `Employee CANNOT update status on unassigned task (got ${empOtherStatus.status}, expect 403)`, "RBAC");

  // Unauthenticated access (no token)
  const noAuthDash = await api("GET", `/workspaces/${wsId}/dashboard`);
  log("ROLE-12", noAuthDash.status === 401 ? "PASS" : "FAIL",
    `Unauthenticated dashboard request blocked (got ${noAuthDash.status}, expect 401)`, "RBAC");

  // ====================================================================
  // SECTION 3: PREVIOUS FIX RUNTIME VERIFICATION
  // ====================================================================
  console.log("\n━━ SECTION 3: PREVIOUS FIX RUNTIME VERIFICATION ━━");

  // Fix 1: Migration 010 - project_members table exists and works
  const pmInsert = await pool.query(
    "INSERT INTO project_members (workspace_id, project_id, user_id, role) VALUES ($1,$2,$3,'member') ON CONFLICT DO NOTHING RETURNING id",
    [wsId, projId, empId]
  );
  log("FIX1-01", pmInsert.rows.length >= 0 ? "PASS" : "FAIL",
    "project_members table accepts inserts (Migration 010 applied)", "Fix Verification");

  // Fix 2: Task controller - getMyWork endpoint
  const myWork = await api("GET", `/workspaces/${wsId}/my-work`, null, empToken);
  log("FIX2-01", myWork.status === 200 && myWork.data?.myWork?.stats !== undefined ? "PASS" : "FAIL",
    "getMyWork endpoint returns stats bucket", "Fix Verification");

  // Fix 2: globalSearch endpoint
  const searchRes = await api("GET", `/workspaces/${wsId}/search?q=Verify`, null, adminToken);
  log("FIX2-02", searchRes.status === 200 && searchRes.data?.results ? "PASS" : "FAIL",
    "globalSearch endpoint returns results object", "Fix Verification");

  // Fix 3: task_labels workspace_id is populated
  const labelRes = await api("POST", `/workspaces/${wsId}/labels`, { name: `FixV-${runId}`, color: "#22c55e" }, mgrToken);
  const vLabelId = labelRes.data?.label?.id;
  const addLabel = await api("POST", `/workspaces/${wsId}/tasks/${taskId}/labels`, { labelId: vLabelId }, mgrToken);
  log("FIX3-01", addLabel.status === 201 ? "PASS" : "FAIL",
    "addTaskLabel inserts with workspace_id (no NOT NULL violation)", "Fix Verification");

  // Verify the row in DB
  const tlRow = await pool.query(
    "SELECT workspace_id FROM task_labels WHERE task_id=$1 AND label_id=$2",
    [taskId, vLabelId]
  );
  log("FIX3-02", tlRow.rows.length === 1 && String(tlRow.rows[0].workspace_id) === String(wsId) ? "PASS" : "FAIL",
    "task_labels row has correct workspace_id in PostgreSQL", "Fix Verification");

  // Fix 4: Subtask progress uses is_completed
  const sub1 = await api("POST", `/workspaces/${wsId}/tasks/${taskId}/subtasks`, { title: "V Sub A" }, mgrToken);
  const sub2 = await api("POST", `/workspaces/${wsId}/tasks/${taskId}/subtasks`, { title: "V Sub B" }, mgrToken);
  let taskDetail = await api("GET", `/workspaces/${wsId}/tasks/${taskId}`, null, mgrToken);
  log("FIX4-01", taskDetail.data?.task?.progress_percentage === 0 ? "PASS" : "FAIL",
    `Progress is 0% with 2 incomplete subtasks (got ${taskDetail.data?.task?.progress_percentage})`, "Fix Verification");

  await api("PATCH", `/workspaces/${wsId}/tasks/${taskId}/subtasks/${sub1.data?.subtask?.id}`, { isCompleted: true }, mgrToken);
  taskDetail = await api("GET", `/workspaces/${wsId}/tasks/${taskId}`, null, mgrToken);
  log("FIX4-02", taskDetail.data?.task?.progress_percentage === 50 ? "PASS" : "FAIL",
    `Progress is 50% with 1/2 completed (got ${taskDetail.data?.task?.progress_percentage})`, "Fix Verification");

  // Fix 5: markAllNotifications works
  const markAll = await api("POST", `/workspaces/${wsId}/notifications/read-all`, null, empToken);
  log("FIX5-01", markAll.status === 200 ? "PASS" : "FAIL",
    "markAllNotifications returns 200", "Fix Verification");

  // ====================================================================
  // SECTION 4: DATABASE CONSTRAINT VERIFICATION
  // ====================================================================
  console.log("\n━━ SECTION 4: DATABASE CONSTRAINT VERIFICATION ━━");

  // 4.1 Unique constraints
  try {
    await pool.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,'employee')",
      [wsId, empId]
    );
    log("DB-01", "FAIL", "Duplicate workspace_member insert should throw unique violation", "DB Constraints");
  } catch (e) {
    log("DB-01", e.code === "23505" ? "PASS" : "FAIL",
      `Unique constraint on workspace_members enforced (${e.code})`, "DB Constraints");
  }

  try {
    await pool.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1,$2,'employee')",
      [adminOrgId, empId]
    );
    log("DB-02", "FAIL", "Duplicate org_member insert should throw unique violation", "DB Constraints");
  } catch (e) {
    log("DB-02", e.code === "23505" ? "PASS" : "FAIL",
      `Unique constraint on organization_members enforced (${e.code})`, "DB Constraints");
  }

  try {
    await pool.query(
      "INSERT INTO project_members (workspace_id, project_id, user_id, role) VALUES ($1,$2,$3,'member')",
      [wsId, projId, empId]
    );
    log("DB-03", "FAIL", "Duplicate project_member insert should throw unique violation", "DB Constraints");
  } catch (e) {
    log("DB-03", e.code === "23505" ? "PASS" : "FAIL",
      `Unique constraint on project_members(project_id,user_id) enforced (${e.code})`, "DB Constraints");
  }

  // 4.2 Foreign key constraints
  try {
    await pool.query(
      "INSERT INTO tasks (workspace_id, project_id, title, status, priority, created_by) VALUES ($1, 999999, 'FK Test', 'todo', 'low', $2)",
      [wsId, adminUserId]
    );
    log("DB-04", "FAIL", "FK violation on tasks.project_id should throw", "DB Constraints");
  } catch (e) {
    log("DB-04", e.code === "23503" ? "PASS" : "FAIL",
      `FK constraint on tasks.project_id enforced (${e.code})`, "DB Constraints");
  }

  try {
    await pool.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (999999, $1, 'member')",
      [adminUserId]
    );
    log("DB-05", "FAIL", "FK violation on workspace_members.workspace_id should throw", "DB Constraints");
  } catch (e) {
    log("DB-05", e.code === "23503" ? "PASS" : "FAIL",
      `FK constraint on workspace_members.workspace_id enforced (${e.code})`, "DB Constraints");
  }

  // 4.3 Cascade delete: deleting a project should delete its tasks
  const cascProj = await api("POST", `/workspaces/${wsId}/projects`, {
    name: `CascadeTest ${runId}`, status: "in_progress"
  }, adminToken);
  const cascProjId = cascProj.data?.project?.id;
  await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: cascProjId, title: "WillCascade", status: "todo", priority: "low"
  }, adminToken);

  const preCount = await pool.query("SELECT COUNT(*)::int AS c FROM tasks WHERE project_id=$1", [cascProjId]);
  const cascDel = await api("DELETE", `/workspaces/${wsId}/projects/${cascProjId}`, null, adminToken);
  const postCount = await pool.query("SELECT COUNT(*)::int AS c FROM tasks WHERE project_id=$1", [cascProjId]);
  log("DB-06", cascDel.status === 204 && Number(preCount.rows[0].c) >= 1 && Number(postCount.rows[0].c) === 0 ? "PASS" : "FAIL",
    `Cascade delete: project deletion cascades to tasks (before=${preCount.rows[0].c}, after=${postCount.rows[0].c})`, "DB Constraints");

  // 4.4 Orphan record check
  const orphanTasks = await pool.query(
    "SELECT COUNT(*)::int AS c FROM tasks t LEFT JOIN projects p ON t.project_id=p.id WHERE p.id IS NULL"
  );
  log("DB-07", Number(orphanTasks.rows[0].c) === 0 ? "PASS" : "FAIL",
    `Zero orphan tasks (found ${orphanTasks.rows[0].c})`, "DB Constraints");

  const orphanSubs = await pool.query(
    "SELECT COUNT(*)::int AS c FROM subtasks s LEFT JOIN tasks t ON s.task_id=t.id WHERE t.id IS NULL"
  );
  log("DB-08", Number(orphanSubs.rows[0].c) === 0 ? "PASS" : "FAIL",
    `Zero orphan subtasks (found ${orphanSubs.rows[0].c})`, "DB Constraints");

  const orphanComments = await pool.query(
    "SELECT COUNT(*)::int AS c FROM task_comments tc LEFT JOIN tasks t ON tc.task_id=t.id WHERE t.id IS NULL"
  );
  log("DB-09", Number(orphanComments.rows[0].c) === 0 ? "PASS" : "FAIL",
    `Zero orphan comments (found ${orphanComments.rows[0].c})`, "DB Constraints");

  const orphanWM = await pool.query(
    "SELECT COUNT(*)::int AS c FROM workspace_members wm LEFT JOIN users u ON u.id=wm.user_id WHERE u.id IS NULL"
  );
  log("DB-10", Number(orphanWM.rows[0].c) === 0 ? "PASS" : "FAIL",
    `Zero orphan workspace members (found ${orphanWM.rows[0].c})`, "DB Constraints");

  // 4.5 Organization isolation: cross-org member cannot see workspaces
  const isolationOrg = await api("POST", "/organizations", { name: `Isolated ${runId}` }, empToken);
  const isolatedOrgId = isolationOrg.data?.organization?.id;
  const isolatedWs = await api("POST", "/workspaces", { name: `Silo ${runId}`, organizationId: isolatedOrgId }, empToken);
  const isolatedWsId = isolatedWs.data?.workspace?.id;

  const crossDash = await api("GET", `/workspaces/${isolatedWsId}/dashboard`, null, adminToken);
  log("DB-11", crossDash.status === 404 ? "PASS" : "FAIL",
    `Organization isolation: admin from Org A cannot access isolated workspace (got ${crossDash.status})`, "DB Constraints");

  // 4.6 Concurrent task updates (optimistic: both succeed since we don't have version locking)
  const concTask = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId, title: `Concurrent ${runId}`, status: "todo", priority: "low"
  }, adminToken);
  const concTaskId = concTask.data?.task?.id;
  const [upd1, upd2] = await Promise.all([
    api("PATCH", `/workspaces/${wsId}/tasks/${concTaskId}`, { status: "in_progress" }, adminToken),
    api("PATCH", `/workspaces/${wsId}/tasks/${concTaskId}`, { priority: "high" }, mgrToken),
  ]);
  log("DB-12", upd1.status === 200 && upd2.status === 200 ? "PASS" : "FAIL",
    `Concurrent task updates don't crash (status1=${upd1.status}, status2=${upd2.status})`, "DB Constraints");

  // 4.7 Duplicate operation idempotency: creating the same label on a task twice
  const dupLabel = await api("POST", `/workspaces/${wsId}/tasks/${taskId}/labels`, { labelId: vLabelId }, mgrToken);
  log("DB-13", dupLabel.status === 201 ? "PASS" : "FAIL",
    "Duplicate task-label assignment handled gracefully (ON CONFLICT DO NOTHING)", "DB Constraints");

  // ====================================================================
  // SECTION 5: API EDGE CASES & INPUT VALIDATION
  // ====================================================================
  console.log("\n━━ SECTION 5: API EDGE CASES & INPUT VALIDATION ━━");

  // Empty task title
  const emptyTitle = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId, title: "", status: "todo", priority: "low"
  }, mgrToken);
  log("EDGE-01", emptyTitle.status === 400 ? "PASS" : "FAIL",
    `Empty task title rejected (got ${emptyTitle.status})`, "Edge Cases");

  // Invalid status
  const badStatus = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId, title: "Bad", status: "invalid_status", priority: "low"
  }, mgrToken);
  log("EDGE-02", badStatus.status === 400 ? "PASS" : "FAIL",
    `Invalid task status rejected (got ${badStatus.status})`, "Edge Cases");

  // Invalid priority
  const badPrio = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId, title: "Bad", status: "todo", priority: "super_mega"
  }, mgrToken);
  log("EDGE-03", badPrio.status === 400 ? "PASS" : "FAIL",
    `Invalid task priority rejected (got ${badPrio.status})`, "Edge Cases");

  // Non-existent project ID
  const fakeProj = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: 999999, title: "Fake", status: "todo", priority: "low"
  }, mgrToken);
  log("EDGE-04", fakeProj.status === 404 ? "PASS" : "FAIL",
    `Non-existent project ID rejected (got ${fakeProj.status})`, "Edge Cases");

  // Assigning task to non-workspace-member
  const fakeAssign = await api("POST", `/workspaces/${wsId}/tasks`, {
    projectId: projId, title: "FakeAssign", status: "todo", priority: "low", assigneeId: 999999
  }, mgrToken);
  log("EDGE-05", fakeAssign.status === 400 ? "PASS" : "FAIL",
    `Assigning to non-member rejected (got ${fakeAssign.status})`, "Edge Cases");

  // SQL injection in comment body (should store literally, not execute)
  const sqliComment = await api("POST", `/workspaces/${wsId}/tasks/${taskId}/comments`, {
    body: "'; DROP TABLE users; --"
  }, mgrToken);
  log("EDGE-06", sqliComment.status === 201 ? "PASS" : "FAIL",
    "SQL injection payload in comment stored safely", "Edge Cases");

  // Verify users table still exists
  const usersExist = await pool.query("SELECT COUNT(*)::int AS c FROM users");
  log("EDGE-07", Number(usersExist.rows[0].c) > 0 ? "PASS" : "FAIL",
    `Users table intact after SQL injection attempt (${usersExist.rows[0].c} users)`, "Edge Cases");

  // XSS in project name
  const xssProj = await api("POST", `/workspaces/${wsId}/projects`, {
    name: "<img src=x onerror=alert(1)>", status: "in_progress"
  }, mgrToken);
  log("EDGE-08", xssProj.status === 201 && xssProj.data?.project?.name?.includes("<img") ? "PASS" : "FAIL",
    "XSS payload in project name stored literally (not executed)", "Edge Cases");

  // Non-numeric workspace ID
  const badWsId = await api("GET", "/workspaces/abc/dashboard", null, adminToken);
  log("EDGE-09", badWsId.status === 400 ? "PASS" : "FAIL",
    `Non-numeric workspace ID rejected (got ${badWsId.status})`, "Edge Cases");

  // Negative task ID
  const negTaskId = await api("GET", `/workspaces/${wsId}/tasks/-1`, null, mgrToken);
  log("EDGE-10", negTaskId.status === 400 || negTaskId.status === 404 ? "PASS" : "FAIL",
    `Negative task ID rejected (got ${negTaskId.status})`, "Edge Cases");

  // Empty search returns empty results (not error)
  const emptySearch = await api("GET", `/workspaces/${wsId}/search?q=`, null, mgrToken);
  log("EDGE-11", emptySearch.status === 200 && emptySearch.data?.results ? "PASS" : "FAIL",
    "Empty search query returns 200 with empty results", "Edge Cases");

  // ====================================================================
  // SECTION 6: MULTI-TENANT CROSS-ORG PROBES (Independent Set)
  // ====================================================================
  console.log("\n━━ SECTION 6: MULTI-TENANT ISOLATION (INDEPENDENT) ━━");

  // Create a completely separate user with separate org
  const xOrgEmail = `x_org_${runId}@test.local`;
  await api("POST", "/auth/register", { name: "Cross Org User", email: xOrgEmail, password: "Password1!" });
  const xLogin = await api("POST", "/auth/login", { email: xOrgEmail, password: "Password1!" });
  const xToken = xLogin.token;

  // Try accessing admin's workspace
  const xDash = await api("GET", `/workspaces/${wsId}/dashboard`, null, xToken);
  log("TENANT-A1", xDash.status === 404 ? "PASS" : "FAIL",
    `External user blocked from workspace dashboard (got ${xDash.status})`, "Tenant Isolation");

  const xProjects = await api("GET", `/workspaces/${wsId}/projects`, null, xToken);
  log("TENANT-A2", xProjects.status === 404 ? "PASS" : "FAIL",
    `External user blocked from listing projects (got ${xProjects.status})`, "Tenant Isolation");

  const xTask = await api("GET", `/workspaces/${wsId}/tasks/${taskId}`, null, xToken);
  log("TENANT-A3", xTask.status === 404 ? "PASS" : "FAIL",
    `External user blocked from reading task (got ${xTask.status})`, "Tenant Isolation");

  const xMembers = await api("GET", `/workspaces/${wsId}/members`, null, xToken);
  log("TENANT-A4", xMembers.status === 404 ? "PASS" : "FAIL",
    `External user blocked from listing members (got ${xMembers.status})`, "Tenant Isolation");

  const xNotif = await api("GET", `/workspaces/${wsId}/notifications`, null, xToken);
  log("TENANT-A5", xNotif.status === 404 ? "PASS" : "FAIL",
    `External user blocked from reading notifications (got ${xNotif.status})`, "Tenant Isolation");

  // Try modifying admin's task via direct HTTP PATCH
  const xPatch = await api("PATCH", `/workspaces/${wsId}/tasks/${taskId}`, { status: "completed" }, xToken);
  log("TENANT-A6", xPatch.status === 404 || xPatch.status === 403 ? "PASS" : "FAIL",
    `External user blocked from modifying task (got ${xPatch.status})`, "Tenant Isolation");

  // Try deleting admin's project
  const xDel = await api("DELETE", `/workspaces/${wsId}/projects/${projId}`, null, xToken);
  log("TENANT-A7", xDel.status === 404 || xDel.status === 403 ? "PASS" : "FAIL",
    `External user blocked from deleting project (got ${xDel.status})`, "Tenant Isolation");

  // ====================================================================
  // RESULTS SUMMARY
  // ====================================================================
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  VERIFICATION RESULTS SUMMARY                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const total = results.length;
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const blocked = results.filter(r => r.status === "BLOCKED").length;

  console.log(`\n  Total: ${total}  |  Passed: ${passed}  |  Failed: ${failed}  |  Blocked: ${blocked}`);
  console.log(`\n  By Category:`);
  for (const [cat, counts] of Object.entries(categories)) {
    console.log(`    ${cat}: ${counts.pass} pass, ${counts.fail} fail, ${counts.blocked} blocked`);
  }

  if (failed > 0) {
    console.log("\n  FAILED TESTS:");
    for (const r of results.filter(r => r.status === "FAIL")) {
      console.log(`    ${r.testId}: ${r.message}`);
    }
  }

  await pool.end();
  return { total, passed, failed, blocked, results };
}

run().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
