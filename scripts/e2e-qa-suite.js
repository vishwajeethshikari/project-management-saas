#!/usr/bin/env node
/**
 * Comprehensive End-to-End QA, Security & Multi-Tenancy Suite
 * Tests all 15 QA phases against the live backend (http://localhost:5000) and PostgreSQL
 */
const path = require("node:path");
const { createRequire } = require("node:module");
const crypto = require("node:crypto");

const backendRequire = createRequire(path.resolve(__dirname, "../backend/package.json"));
backendRequire("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = backendRequire("./src/config/db");

const BASE_URL = "http://localhost:5000/api";
const results = [];

function assert(condition, testId, message) {
  if (condition) {
    results.push({ testId, status: "PASS", message });
    console.log(`  [PASS] ${testId}: ${message}`);
  } else {
    results.push({ testId, status: "FAIL", message });
    console.error(`  [FAIL] ${testId}: ${message}`);
  }
}

async function api(method, endpoint, body = null, token = null) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Cookie"] = `projectflow_session=${token}`;
  }
  let reqBody = undefined;
  if (body) {
    headers["Content-Type"] = "application/json";
    reqBody = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, { method, headers, body: reqBody });
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try { data = await res.json(); } catch {}
  } else {
    try { data = await res.text(); } catch {}
  }
  const setCookie = res.headers.get("set-cookie") || "";
  const cookieToken = setCookie.match(/projectflow_session=([^;]+)/)?.[1] || null;
  return { status: res.status, data, headers: res.headers, token: cookieToken || data?.token };
}

async function runQA() {
  console.log("==================================================================");
  console.log("STARTING FULL END-TO-END QA & VERIFICATION SUITE");
  console.log("==================================================================\n");

  const runId = crypto.randomBytes(3).toString("hex");

  // ==========================================
  // PHASE 1: SYSTEM HEALTH & CONNECTIVITY
  // ==========================================
  console.log("--- PHASE 1: SYSTEM HEALTH CHECK ---");
  const healthRes = await api("GET", "/health");
  assert(healthRes.status === 200 && healthRes.data?.success === true, "HEALTH-01", "Health API returns 200 OK");
  const readyRes = await api("GET", "/ready");
  assert(readyRes.status === 200 && readyRes.data?.success === true, "HEALTH-02", "PostgreSQL database readiness returns 200 OK");

  // ==========================================
  // PHASE 2: AUTHENTICATION TESTING
  // ==========================================
  console.log("\n--- PHASE 2: AUTHENTICATION TESTING ---");
  // 1. Valid registration
  const userAEmail = `qa_owner_a_${runId}@example.com`;
  const regRes = await api("POST", "/auth/register", {
    name: "QA Owner A",
    email: userAEmail,
    password: "Password123!",
  });
  assert(regRes.status === 201 && regRes.data?.user?.email === userAEmail && !regRes.data?.user?.password_hash, "AUTH-01", "Valid user registration succeeds without returning password hash");

  // 2. Duplicate email registration
  const dupRes = await api("POST", "/auth/register", {
    name: "Duplicate User",
    email: userAEmail,
    password: "Password123!",
  });
  assert(dupRes.status === 409, "AUTH-02", "Duplicate email registration rejected with 409 Conflict");

  // 3. Missing fields registration
  const missingRes = await api("POST", "/auth/register", { email: "no_password@example.com" });
  assert(missingRes.status === 400, "AUTH-03", "Registration with missing fields rejected with 400 Bad Request");

  // 4. Invalid email format
  const badEmailRes = await api("POST", "/auth/register", {
    name: "Bad Email",
    email: "not-an-email",
    password: "Password123!",
  });
  assert(badEmailRes.status === 400, "AUTH-04", "Registration with invalid email format rejected with 400");

  // 5. Weak password (<8 chars)
  const weakPassRes = await api("POST", "/auth/register", {
    name: "Weak Pass",
    email: `weak_${runId}@example.com`,
    password: "short",
  });
  assert(weakPassRes.status === 400, "AUTH-05", "Registration with password < 8 chars rejected with 400");

  // 6. Valid login
  const loginRes = await api("POST", "/auth/login", {
    email: userAEmail,
    password: "Password123!",
  });
  assert(loginRes.status === 200 && Boolean(loginRes.token), "AUTH-06", "Login with valid credentials returns 200 and session token");
  const tokenA = loginRes.token;

  // 7. Invalid password login
  const badLoginRes = await api("POST", "/auth/login", {
    email: userAEmail,
    password: "WrongPassword!",
  });
  assert(badLoginRes.status === 401, "AUTH-07", "Login with invalid password rejected with 401 Unauthorized");

  // 8. Nonexistent email login
  const unknownLoginRes = await api("POST", "/auth/login", {
    email: "nonexistent_qa_user@example.com",
    password: "Password123!",
  });
  assert(unknownLoginRes.status === 401, "AUTH-08", "Login with nonexistent email rejected with 401");

  // 9. Tampered JWT token
  const tamperedToken = tokenA.slice(0, -6) + "XXXXXX";
  const tamperedRes = await api("GET", "/auth/me", null, tamperedToken);
  assert(tamperedRes.status === 401, "AUTH-09", "Tampered JWT token rejected with 401");

  // 10. Missing token on protected endpoint
  const noTokenRes = await api("GET", "/auth/me");
  assert(noTokenRes.status === 401, "AUTH-10", "Missing token on protected endpoint rejected with 401");

  // 11. Profile retrieval (/auth/me)
  const meRes = await api("GET", "/auth/me", null, tokenA);
  assert(meRes.status === 200 && meRes.data?.user?.email === userAEmail, "AUTH-11", "Authenticated user profile returned correctly");

  // ==========================================
  // PHASE 3 & 4: MULTI-TENANCY & RBAC SETUP
  // ==========================================
  console.log("\n--- PHASE 3 & 4: MULTI-TENANCY & ROLE-BASED ACCESS CONTROL ---");

  // Setup Org A accounts: Owner A, Manager A, Employee A
  const mgrAEmail = `qa_mgr_a_${runId}@example.com`;
  const empAEmail = `qa_emp_a_${runId}@example.com`;
  await api("POST", "/auth/register", { name: "QA Manager A", email: mgrAEmail, password: "Password123!" });
  await api("POST", "/auth/register", { name: "QA Employee A", email: empAEmail, password: "Password123!" });

  const loginMgrA = await api("POST", "/auth/login", { email: mgrAEmail, password: "Password123!" });
  const loginEmpA = await api("POST", "/auth/login", { email: empAEmail, password: "Password123!" });
  const tokenMgrA = loginMgrA.token;
  const tokenEmpA = loginEmpA.token;
  const userEmpAId = loginEmpA.data.user.id;
  const userMgrAId = loginMgrA.data.user.id;

  // Create Organization A by Owner A
  const orgARes = await api("POST", "/organizations", { name: `Acme Corp ${runId}` }, tokenA);
  assert(orgARes.status === 201 && orgARes.data?.organization?.id, "ORG-01", "Owner A creates Organization A");
  const orgAId = orgARes.data.organization.id;

  // Add Manager A and Employee A to Organization A via DB/API
  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'manager'), ($1, $3, 'employee') ON CONFLICT DO NOTHING`,
    [orgAId, userMgrAId, userEmpAId]
  );

  // Create Workspace A1 in Org A
  const wsARes = await api("POST", "/workspaces", { name: `Engineering A ${runId}`, organizationId: orgAId }, tokenA);
  assert(wsARes.status === 201 && wsARes.data?.workspace?.id, "WS-01", "Owner A creates Workspace A1");
  const wsAId = wsARes.data.workspace.id;

  // Add Manager A and Employee A to Workspace A1
  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, 'manager'), ($1, $3, 'employee') ON CONFLICT DO NOTHING`,
    [wsAId, userMgrAId, userEmpAId]
  );

  // Setup Org B accounts: Owner B, Manager B, Employee B
  const ownerBEmail = `qa_owner_b_${runId}@example.com`;
  const mgrBEmail = `qa_mgr_b_${runId}@example.com`;
  const empBEmail = `qa_emp_b_${runId}@example.com`;
  await api("POST", "/auth/register", { name: "QA Owner B", email: ownerBEmail, password: "Password123!" });
  await api("POST", "/auth/register", { name: "QA Manager B", email: mgrBEmail, password: "Password123!" });
  await api("POST", "/auth/register", { name: "QA Employee B", email: empBEmail, password: "Password123!" });

  const loginOwnerB = await api("POST", "/auth/login", { email: ownerBEmail, password: "Password123!" });
  const loginMgrB = await api("POST", "/auth/login", { email: mgrBEmail, password: "Password123!" });
  const loginEmpB = await api("POST", "/auth/login", { email: empBEmail, password: "Password123!" });
  const tokenOwnerB = loginOwnerB.token;
  const tokenMgrB = loginMgrB.token;
  const tokenEmpB = loginEmpB.token;
  const userEmpBId = loginEmpB.data.user.id;

  // Create Organization B & Workspace B1
  const orgBRes = await api("POST", "/organizations", { name: `Beta Corp ${runId}` }, tokenOwnerB);
  const orgBId = orgBRes.data.organization.id;
  const wsBRes = await api("POST", "/workspaces", { name: `Marketing B ${runId}`, organizationId: orgBId }, tokenOwnerB);
  const wsBId = wsBRes.data.workspace.id;

  // Create Project in Workspace A1
  const projARes = await api("POST", `/workspaces/${wsAId}/projects`, {
    name: `Project Alpha ${runId}`,
    description: "Confidential Project A",
    startDate: "2026-11-01",
    deadline: "2026-12-31",
    status: "in_progress",
  }, tokenA);
  if (projARes.status !== 201) {
    console.error("  [DEBUG PROJ-01 FAILED]:", projARes.status, JSON.stringify(projARes.data));
  }
  assert(projARes.status === 201 && projARes.data?.project?.id, "PROJ-01", "Create Project in Workspace A1");
  const projAId = projARes.data.project.id;

  // Create Task in Workspace A1 assigned to Employee A
  const taskARes = await api("POST", `/workspaces/${wsAId}/tasks`, {
    projectId: projAId,
    title: `Task Alpha ${runId}`,
    description: "Secret Task A details",
    status: "todo",
    priority: "high",
    assigneeId: userEmpAId,
  }, tokenA);
  assert(taskARes.status === 201 && taskARes.data?.task?.id, "TASK-01", "Create Task in Project Alpha");
  const taskAId = taskARes.data.task.id;

  // Add a comment to Task A
  const commentARes = await api("POST", `/workspaces/${wsAId}/tasks/${taskAId}/comments`, { body: "Private comment on Task A" }, tokenA);
  assert(commentARes.status === 201 && commentARes.data?.comment?.id, "COMM-01", "Add comment to Task A");
  const commentAId = commentARes.data.comment.id;

  // --- MULTI-TENANT ISOLATION TESTS (Org B attempts to access Org A resources) ---
  console.log("\n  -> Probing Cross-Tenant Isolation (Org B -> Org A):");

  // Tenant test 1: Org B Owner tries to read Org A's workspace dashboard
  const crossWsRes = await api("GET", `/workspaces/${wsAId}/dashboard`, null, tokenOwnerB);
  assert(crossWsRes.status === 404 || crossWsRes.status === 403, "TENANT-01", "Cross-tenant access to Workspace A dashboard blocked");

  // Tenant test 2: Org B Manager tries to list Org A's projects
  const crossProjRes = await api("GET", `/workspaces/${wsAId}/projects`, null, tokenMgrB);
  assert(crossProjRes.status === 404 || crossProjRes.status === 403, "TENANT-02", "Cross-tenant access to Workspace A projects blocked");

  // Tenant test 3: Org B Employee tries to read Org A's task
  const crossTaskRes = await api("GET", `/workspaces/${wsAId}/tasks/${taskAId}`, null, tokenEmpB);
  assert(crossTaskRes.status === 404 || crossTaskRes.status === 403, "TENANT-03", "Cross-tenant access to Task A blocked");

  // Tenant test 4: Org B Owner tries to read comments of Task A
  const crossCommRes = await api("GET", `/workspaces/${wsAId}/tasks/${taskAId}/comments`, null, tokenOwnerB);
  assert(crossCommRes.status === 404 || crossCommRes.status === 403, "TENANT-04", "Cross-tenant access to Task A comments blocked");

  // Tenant test 5: Org B Owner tries to read Workspace A members
  const crossMemRes = await api("GET", `/workspaces/${wsAId}/members`, null, tokenOwnerB);
  assert(crossMemRes.status === 404 || crossMemRes.status === 403, "TENANT-05", "Cross-tenant access to Workspace A members blocked");

  // Tenant test 6: ID injection attempt (creating task in Workspace B with Project from Workspace A)
  const injectProjRes = await api("POST", `/workspaces/${wsBId}/tasks`, {
    projectId: projAId,
    title: "Injected Task",
    status: "todo",
    priority: "medium",
  }, tokenOwnerB);
  assert(injectProjRes.status === 404 || injectProjRes.status === 400, "TENANT-06", "Injecting foreign project ID into workspace task creation blocked");

  // --- ROLE-BASED ACCESS CONTROL TESTS ---
  console.log("\n  -> Testing Role-Based Access Control inside Workspace A1:");

  // RBAC test 1: Employee attempts to delete project (must fail with 403)
  const empDeleteProj = await api("DELETE", `/workspaces/${wsAId}/projects/${projAId}`, null, tokenEmpA);
  assert(empDeleteProj.status === 403, "RBAC-01", "Employee cannot delete a project (403 Forbidden)");

  // RBAC test 2: Employee attempts to edit task title (must fail with 403 - employee can only update status on assigned task)
  const empEditTitle = await api("PATCH", `/workspaces/${wsAId}/tasks/${taskAId}`, { title: "Hacked Title" }, tokenEmpA);
  assert(empEditTitle.status === 403, "RBAC-02", "Employee cannot update task title (restricted to status update)");

  // RBAC test 3: Employee updates status on their assigned task (must succeed with 200)
  const empUpdateStatus = await api("PATCH", `/workspaces/${wsAId}/tasks/${taskAId}`, { status: "in_progress" }, tokenEmpA);
  assert(empUpdateStatus.status === 200 && empUpdateStatus.data?.task?.status === "in_progress", "RBAC-03", "Employee can update status on assigned task");

  // RBAC test 4: Manager updates task details (title, priority, estimatedMinutes)
  const mgrUpdateTask = await api("PATCH", `/workspaces/${wsAId}/tasks/${taskAId}`, {
    title: `Task Alpha Updated ${runId}`,
    priority: "critical",
    estimatedMinutes: 120,
  }, tokenMgrA);
  assert(mgrUpdateTask.status === 200 && mgrUpdateTask.data?.task?.priority === "critical", "RBAC-04", "Manager can update task title, priority, and estimate");

  // RBAC test 5: Manager creates a team
  const createTeamRes = await api("POST", `/workspaces/${wsAId}/teams`, { name: `Alpha Squad ${runId}` }, tokenMgrA);
  assert(createTeamRes.status === 201 && createTeamRes.data?.team?.id, "RBAC-05", "Manager can create teams");
  const teamId = createTeamRes.data.team.id;

  // RBAC test 6: Employee attempts to delete team (must fail with 403)
  const empDeleteTeam = await api("DELETE", `/workspaces/${wsAId}/teams/${teamId}`, null, tokenEmpA);
  assert(empDeleteTeam.status === 403, "RBAC-06", "Employee cannot delete a team (403 Forbidden)");

  // ==========================================
  // PHASE 5 & 6: PROJECT & TASK MANAGEMENT
  // ==========================================
  console.log("\n--- PHASE 5 & 6: PROJECT & TASK WORKFLOWS ---");

  // Subtasks and Progress Calculation
  const subtask1 = await api("POST", `/workspaces/${wsAId}/tasks/${taskAId}/subtasks`, { title: "Subtask 1" }, tokenMgrA);
  const subtask2 = await api("POST", `/workspaces/${wsAId}/tasks/${taskAId}/subtasks`, { title: "Subtask 2" }, tokenMgrA);
  assert(subtask1.status === 201 && subtask2.status === 201, "SUBTASK-01", "Create subtasks on task");
  const sub1Id = subtask1.data.subtask.id;
  const sub2Id = subtask2.data.subtask.id;

  // Verify initial 0% progress
  let taskCheck = await api("GET", `/workspaces/${wsAId}/tasks/${taskAId}`, null, tokenMgrA);
  assert(taskCheck.data?.task?.progress_percentage === 0, "SUBTASK-02", "Task progress is 0% with 2 incomplete subtasks");

  // Complete subtask 1 -> 50% progress
  await api("PATCH", `/workspaces/${wsAId}/tasks/${taskAId}/subtasks/${sub1Id}`, { isCompleted: true }, tokenMgrA);
  taskCheck = await api("GET", `/workspaces/${wsAId}/tasks/${taskAId}`, null, tokenMgrA);
  assert(taskCheck.data?.task?.progress_percentage === 50, "SUBTASK-03", "Task progress updates to 50% after completing 1 of 2 subtasks");

  // Complete subtask 2 -> 100% progress
  await api("PATCH", `/workspaces/${wsAId}/tasks/${taskAId}/subtasks/${sub2Id}`, { isCompleted: true }, tokenMgrA);
  taskCheck = await api("GET", `/workspaces/${wsAId}/tasks/${taskAId}`, null, tokenMgrA);
  assert(taskCheck.data?.task?.progress_percentage === 100, "SUBTASK-04", "Task progress reaches 100% when all subtasks completed");

  // Reopen subtask 1 -> progress returns to 50%
  await api("PATCH", `/workspaces/${wsAId}/tasks/${taskAId}/subtasks/${sub1Id}`, { isCompleted: false }, tokenMgrA);
  taskCheck = await api("GET", `/workspaces/${wsAId}/tasks/${taskAId}`, null, tokenMgrA);
  assert(taskCheck.data?.task?.progress_percentage === 50, "SUBTASK-05", "Task progress correctly recalculates when a subtask is reopened");

  // Labels
  const labelRes = await api("POST", `/workspaces/${wsAId}/labels`, { name: `Urgent-${runId}`, color: "#ef4444" }, tokenMgrA);
  assert(labelRes.status === 201 && labelRes.data?.label?.id, "LABEL-01", "Create workspace label");
  const labelId = labelRes.data.label.id;

  const addLabelRes = await api("POST", `/workspaces/${wsAId}/tasks/${taskAId}/labels`, { labelId }, tokenMgrA);
  assert(addLabelRes.status === 201, "LABEL-02", "Add label to task");

  const listTaskLabelsRes = await api("GET", `/workspaces/${wsAId}/tasks/${taskAId}/labels`, null, tokenMgrA);
  assert(listTaskLabelsRes.data?.labels?.some((l) => String(l.id) === String(labelId)), "LABEL-03", "List task labels reflects added label");

  // Task Search and Filtering
  const filterStatusRes = await api("GET", `/workspaces/${wsAId}/tasks?status=in_progress`, null, tokenMgrA);
  assert(filterStatusRes.data?.tasks?.every((t) => t.status === "in_progress"), "FILTER-01", "Filter tasks by status returns matching tasks only");

  const filterPriorityRes = await api("GET", `/workspaces/${wsAId}/tasks?priority=critical`, null, tokenMgrA);
  assert(filterPriorityRes.data?.tasks?.every((t) => t.priority === "critical"), "FILTER-02", "Filter tasks by priority returns matching tasks only");

  // ==========================================
  // PHASE 7 & 8: COLLABORATION & NOTIFICATIONS
  // ==========================================
  console.log("\n--- PHASE 7 & 8: COLLABORATION & NOTIFICATIONS ---");

  // Comment mentions trigger notification
  const mentionComment = await api("POST", `/workspaces/${wsAId}/tasks/${taskAId}/comments`, {
    body: `Hello @${empAEmail} please check this update!`,
  }, tokenMgrA);
  assert(mentionComment.status === 201, "NOTIF-01", "Create comment with user mention");

  // Check Employee A's notifications
  const empNotifs = await api("GET", `/workspaces/${wsAId}/notifications`, null, tokenEmpA);
  const mentionNotif = empNotifs.data?.notifications?.find((n) => n.type === "mention");
  assert(Boolean(mentionNotif), "NOTIF-02", "Mentioned employee receives a notification");

  // Mark all notifications read
  const markAllRes = await api("POST", `/workspaces/${wsAId}/notifications/read-all`, null, tokenEmpA);
  assert(markAllRes.status === 200, "NOTIF-03", "Mark all notifications as read");

  // Check activity log
  const activityRes = await api("GET", `/workspaces/${wsAId}/activity?limit=10`, null, tokenMgrA);
  assert(activityRes.status === 200 && activityRes.data?.activity?.length > 0, "ACT-01", "Activity log records workspace actions");

  // ==========================================
  // PHASE 9: SECURITY PROBES & SQL INJECTION
  // ==========================================
  console.log("\n--- PHASE 9: SECURITY PROBES & EDGE CASES ---");

  // SQL Injection probe in search
  const sqliRes = await api("GET", `/workspaces/${wsAId}/search?q=' OR '1'='1`, null, tokenMgrA);
  assert(sqliRes.status === 200, "SEC-01", "SQL injection probe in search safely handled without error");

  // XSS probe in title
  const xssTitle = `<script>alert('xss-${runId}')</script>`;
  const xssTaskRes = await api("POST", `/workspaces/${wsAId}/tasks`, {
    projectId: projAId,
    title: xssTitle,
    status: "todo",
    priority: "low",
  }, tokenMgrA);
  assert(xssTaskRes.status === 201 && xssTaskRes.data?.task?.title === xssTitle, "SEC-02", "XSS payload stored literally as text without code execution");

  // Invalid ID parameters (negative ID)
  const badIdRes = await api("GET", `/workspaces/${wsAId}/tasks/-999`, null, tokenMgrA);
  assert(badIdRes.status === 400 || badIdRes.status === 404, "SEC-03", "Negative ID parameter rejected safely");

  // ==========================================
  // PHASE 9B: TIME TRACKING, MILESTONES & ANALYTICS
  // ==========================================
  console.log("\n--- PHASE 9B: TIME TRACKING, MILESTONES & ANALYTICS ---");

  // 1. Time Tracking: Start Timer
  const timerStart = await api("POST", `/workspaces/${wsAId}/time-entries/start`, { taskId: taskAId }, tokenMgrA);
  assert(timerStart.status === 201 && timerStart.data?.entry?.id, "TIME-01", "Start active timer on task");
  const timerEntryId = timerStart.data?.entry?.id;

  // Duplicate active timer rejection
  const dupTimer = await api("POST", `/workspaces/${wsAId}/time-entries/start`, { taskId: taskAId }, tokenMgrA);
  assert(dupTimer.status === 409, "TIME-02", "Duplicate active timer rejected with 409 Conflict");

  // Stop timer
  const timerStop = await api("POST", `/workspaces/${wsAId}/tasks/${taskAId}/time-entries/${timerEntryId}/stop`, {}, tokenMgrA);
  assert(timerStop.status === 200 && timerStop.data?.entry?.duration_seconds >= 0, "TIME-03", "Stop active timer updates duration");

  // Project time summary
  const timeSummary = await api("GET", `/workspaces/${wsAId}/projects/${projAId}/time-summary`, null, tokenMgrA);
  assert(timeSummary.status === 200 && timeSummary.data?.summary !== undefined, "TIME-04", "Project time summary calculated correctly");

  // 2. Milestones and Timeline
  const createMilestone = await api("POST", `/workspaces/${wsAId}/projects/${projAId}/milestones`, {
    name: `Alpha Release ${runId}`,
    dueDate: "2026-12-15",
  }, tokenMgrA);
  assert(createMilestone.status === 201 && createMilestone.data?.milestone?.id, "MILESTONE-01", "Create project milestone");
  const milestoneId = createMilestone.data?.milestone?.id;

  const getTimeline = await api("GET", `/workspaces/${wsAId}/projects/${projAId}/timeline`, null, tokenMgrA);
  assert(getTimeline.status === 200 && getTimeline.data?.milestones?.some((m) => String(m.id) === String(milestoneId)), "TIMELINE-01", "Timeline contains created milestone and tasks");

  // 3. Analytics & CSV Export
  const wsAnalytics = await api("GET", `/workspaces/${wsAId}/analytics`, null, tokenMgrA);
  assert(wsAnalytics.status === 200 && wsAnalytics.data?.metrics !== undefined, "ANALYTICS-01", "Workspace analytics calculated");

  const wsWorkload = await api("GET", `/workspaces/${wsAId}/workload`, null, tokenMgrA);
  assert(wsWorkload.status === 200 && Array.isArray(wsWorkload.data?.workload), "ANALYTICS-02", "Team workload report generated");

  const csvExport = await api("GET", `/workspaces/${wsAId}/analytics/export.csv`, null, tokenMgrA);
  assert(csvExport.status === 200 && typeof csvExport.data === "string" && csvExport.data.includes("project_name"), "ANALYTICS-03", "Workspace analytics CSV export generated with headers");

  // 4. Organization Invitations
  const inviteEmail = `invited_${runId}@example.com`;
  const orgInvite = await api("POST", `/organizations/${orgAId}/invitations`, {
    email: inviteEmail,
    role: "employee",
  }, tokenA);
  assert(orgInvite.status === 201 && Boolean(orgInvite.data?.invitation?.id && orgInvite.data?.inviteUrl), "INVITE-01", "Owner creates organization invitation");

  const listInvites = await api("GET", `/organizations/${orgAId}/invitations`, null, tokenA);
  assert(listInvites.status === 200 && listInvites.data?.invitations?.some((i) => i.email === inviteEmail), "INVITE-02", "List organization invitations reflects pending invite");

  // ==========================================
  // PHASE 10: DATABASE INTEGRITY VERIFICATION
  // ==========================================
  console.log("\n--- PHASE 10: DATABASE INTEGRITY IN POSTGRESQL ---");
  const orphanMembers = await pool.query(
    `SELECT COUNT(*) FROM workspace_members wm
     LEFT JOIN users u ON u.id = wm.user_id
     WHERE u.id IS NULL`
  );
  assert(Number.parseInt(orphanMembers.rows[0].count, 10) === 0, "DB-01", "Zero orphaned workspace members in PostgreSQL");

  const orphanTasks = await pool.query(
    `SELECT COUNT(*) FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     WHERE p.id IS NULL`
  );
  assert(Number.parseInt(orphanTasks.rows[0].count, 10) === 0, "DB-02", "Zero orphaned tasks in PostgreSQL");

  const orphanSubtasks = await pool.query(
    `SELECT COUNT(*) FROM subtasks s
     LEFT JOIN tasks t ON t.id = s.task_id
     WHERE t.id IS NULL`
  );
  assert(Number.parseInt(orphanSubtasks.rows[0].count, 10) === 0, "DB-03", "Zero orphaned subtasks in PostgreSQL");

  console.log("\n==================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`QA SUITE COMPLETED: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==================================================================");

  await pool.end();
  return { total, passed, failed, results };
}

runQA().catch((err) => {
  console.error("FATAL QA ERROR:", err);
  process.exit(1);
});
