require("dotenv").config();

const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { mkdtemp, readdir, rm } = require("node:fs/promises");
const { test } = require("node:test");
const http = require("node:http");
const { Pool } = require("pg");
const { getTestDatabaseUrl } = require("../src/config/testDb");

test(
  "PostgreSQL-backed authentication and workspace/project/task operations",
  { skip: !process.env.TEST_DATABASE_URL && "Set TEST_DATABASE_URL to run PostgreSQL integration tests." },
  async () => {
    const testDatabaseUrl = getTestDatabaseUrl();
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = randomBytes(32).toString("hex");
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.NODE_ENV = "test";
    process.env.CLIENT_URL = "http://localhost:5173";

    const setupPool = new Pool({ connectionString: testDatabaseUrl });
    const email = `integration-${randomUUID()}@example.test`;
    let server;
    let appPool;
    let cookie;
    let userId;
    let outsiderUserId;
    let workspaceId;
    let secondWorkspaceId;
    let organizationId;
    let secondOrganizationId;
    let attachmentStorageDirectory;

    try {
      const connectedDatabase = await setupPool.query("SELECT current_database() AS database");
      if (connectedDatabase.rows[0].database !== "project_management_test") {
        throw new Error("Refusing integration setup unless connected to project_management_test.");
      }

      for (const migration of [
        "001_create_users.sql",
        "002_create_workspace_domain.sql",
        "003_expand_task_workflows.sql",
        "004_teams_and_account_recovery.sql",
        "005_organizations_sessions.sql",
        "006_task_attachments.sql",
        "007_time_reporting_recurring_rules.sql",
        "008_workload_analytics_notifications.sql",
        "009_backfill_organization_memberships.sql",
        "010_project_members_and_enhancements.sql",
      ]) {
        const sql = await readFile(
          join(__dirname, "../../database/migrations", migration),
          "utf8"
        );
        await setupPool.query(sql);
      }

      attachmentStorageDirectory = await mkdtemp(join(tmpdir(), "projectflow-attachments-"));
      process.env.ATTACHMENT_STORAGE_DIR = attachmentStorageDirectory;
      const app = require("../src/app");
      appPool = require("../src/config/db");
      const { runDueRecurringTasks } = require("../src/controllers/recurringTaskController");
      server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const baseUrl = `http://127.0.0.1:${server.address().port}`;

      async function request(route, { method = "GET", body, authenticated = true, authCookie = cookie } = {}) {
        const response = await fetch(`${baseUrl}${route}`, {
          method,
          headers: {
            ...(body !== undefined ? { "content-type": "application/json" } : {}),
            ...(authenticated && authCookie ? { cookie: authCookie } : {}),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        return {
          status: response.status,
          body: response.status === 204 ? null : await response.json(),
          response,
        };
      }

      async function upload(route, contents, mimeType, filename, authCookie = cookie) {
        const formData = new FormData();
        formData.append("file", new Blob([contents], { type: mimeType }), filename);
        const response = await fetch(`${baseUrl}${route}`, {
          method: "POST",
          headers: authCookie ? { cookie: authCookie } : {},
          body: formData,
        });
        return {
          status: response.status,
          body: await response.json(),
          response,
        };
      }

      assert.equal((await request("/api/ready", { authenticated: false })).status, 200);
      assert.equal((await request("/api/health", { authenticated: false })).status, 200);

      const registration = await request("/api/auth/register", {
        method: "POST",
        body: { name: "Integration User", email, password: "secure-pass-123" },
        authenticated: false,
      });
      assert.equal(registration.status, 201);
      userId = registration.body.user.id;

      const login = await request("/api/auth/login", {
        method: "POST",
        body: { email, password: "secure-pass-123" },
        authenticated: false,
      });
      assert.equal(login.status, 200);
      cookie = login.response.headers.get("set-cookie").split(";")[0];
      assert.equal((await request("/api/auth/me")).status, 200);

      const recovery = await request("/api/auth/password/forgot", {
        method: "POST",
        body: { email },
        authenticated: false,
      });
      assert.equal(recovery.status, 200);
      assert.ok(recovery.body.resetToken);
      assert.equal((await request("/api/auth/password/reset", {
        method: "POST",
        body: { token: recovery.body.resetToken, password: "changed-pass-456" },
        authenticated: false,
      })).status, 200);
      assert.equal((await request("/api/auth/password/reset", {
        method: "POST",
        body: { token: recovery.body.resetToken, password: "second-reset-789" },
        authenticated: false,
      })).status, 400);
      assert.equal((await request("/api/auth/me")).status, 401);
      assert.equal((await request("/api/auth/login", {
        method: "POST",
        body: { email, password: "secure-pass-123" },
        authenticated: false,
      })).status, 401);
      const newLogin = await request("/api/auth/login", {
        method: "POST",
        body: { email, password: "changed-pass-456" },
        authenticated: false,
      });
      assert.equal(newLogin.status, 200);
      cookie = newLogin.response.headers.get("set-cookie").split(";")[0];

      const createdWorkspace = await request("/api/workspaces", {
        method: "POST",
        body: { name: "Integration workspace" },
      });
      assert.equal(createdWorkspace.status, 201);
      workspaceId = createdWorkspace.body.workspace.id;
      organizationId = createdWorkspace.body.workspace.organization_id;
      const creatorMemberships = await setupPool.query(
        `SELECT wm.role AS workspace_role,om.role AS organization_role
         FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
         JOIN organization_members om ON om.organization_id=w.organization_id AND om.user_id=wm.user_id
         WHERE wm.workspace_id=$1 AND wm.user_id=$2`,
        [workspaceId, userId]
      );
      assert.deepEqual(creatorMemberships.rows[0], { workspace_role: "owner", organization_role: "owner" });
      const organizationList = await request("/api/organizations");
      assert.equal(organizationList.status, 200);
      assert.equal(organizationList.body.organizations.length, 1);
      assert.equal(String(organizationList.body.organizations[0].id), String(organizationId));
      const secondOrganization = await request("/api/organizations", {
        method: "POST",
        body: { name: "Second integration organization" },
      });
      assert.equal(secondOrganization.status, 201);
      secondOrganizationId = secondOrganization.body.organization.id;
      const secondWorkspace = await request("/api/workspaces", {
        method: "POST",
        body: { name: "Second organization workspace", organizationId: secondOrganizationId },
      });
      assert.equal(secondWorkspace.status, 201);
      secondWorkspaceId = secondWorkspace.body.workspace.id;
      const outsiderEmail = `outsider-${randomUUID()}@example.test`;
      const outsiderRegistration = await request("/api/auth/register", {
        method: "POST",
        body: { name: "Outsider User", email: outsiderEmail, password: "secure-pass-123" },
        authenticated: false,
      });
      assert.equal(outsiderRegistration.status, 201);
      outsiderUserId = outsiderRegistration.body.user.id;
      const outsiderLogin = await request("/api/auth/login", {
        method: "POST",
        body: { email: outsiderEmail, password: "secure-pass-123" },
        authenticated: false,
      });
      assert.equal(String(outsiderLogin.body.user.id), String(outsiderUserId));
      const outsiderCookie = outsiderLogin.response.headers.get("set-cookie").split(";")[0];
      assert.equal((await request(`/api/workspaces/${workspaceId}`, { authCookie: outsiderCookie })).status, 404);
      assert.equal((await request(`/api/workspaces/${secondWorkspaceId}`, { authCookie: outsiderCookie })).status, 404);
      assert.equal((await request(`/api/organizations/${organizationId}`, { authCookie: outsiderCookie })).status, 404);
      const organizationInvite = await request(`/api/organizations/${organizationId}/invitations`, {
        method: "POST",
        body: { email: outsiderEmail, role: "employee" },
      });
      assert.equal(organizationInvite.status, 201);
      const organizationInviteToken = new URL(organizationInvite.body.inviteUrl).searchParams.get("organizationInvite");
      assert.equal((await request("/api/organizations/invitations/accept", {
        method: "POST", body: { token: organizationInviteToken }, authCookie: outsiderCookie,
      })).status, 200);
      assert.equal((await request(`/api/organizations/${organizationId}`, { authCookie: outsiderCookie })).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}`, { authCookie: outsiderCookie })).status, 404);
      const invitation = await request(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        body: { email: outsiderEmail, role: "employee" },
      });
      assert.equal(invitation.status, 201);
      assert.equal(invitation.body.delivery, "manual");
      const inviteToken = new URL(invitation.body.inviteUrl).searchParams.get("invite");
      assert.equal((await request("/api/workspaces/invitations/accept", {
        method: "POST",
        body: { token: inviteToken },
        authCookie: outsiderCookie,
      })).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}`, { authCookie: outsiderCookie })).status, 200);
      const outsiderMembership = await setupPool.query("SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2", [workspaceId, outsiderUserId]);
      assert.equal(outsiderMembership.rows[0].role, "employee");
      const outsiderOrganizationMembership = await setupPool.query("SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2", [organizationId, outsiderUserId]);
      assert.equal(outsiderOrganizationMembership.rows[0].role, "employee");
      assert.equal((await request(`/api/workspaces/${workspaceId}`)).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: { name: "Updated integration workspace" },
      })).status, 200);

      const createdTeam = await request(`/api/workspaces/${workspaceId}/teams`, {
        method: "POST",
        body: { name: "Integration team", managerId: userId },
      });
      assert.equal(createdTeam.status, 201);
      const teamId = createdTeam.body.team.id;
      const addedTeamMember = await request(`/api/workspaces/${workspaceId}/teams/${teamId}/members`, {
        method: "POST",
        body: { userId: outsiderUserId, role: "employee" },
      });
      assert.equal(addedTeamMember.status, 201);
      assert.equal((await setupPool.query("SELECT user_id FROM team_members WHERE team_id=$1 AND user_id=$2", [teamId, outsiderUserId])).rowCount, 1);
      assert.equal((await request(`/api/workspaces/${workspaceId}/teams`)).body.teams[0].member_count, 2);
      const renamedTeam = await request(`/api/workspaces/${workspaceId}/teams/${teamId}`, {
        method: "PATCH", body: { name: "Renamed integration team", description: "Verified by integration" },
      });
      assert.equal(renamedTeam.status, 200);
      assert.equal((await setupPool.query("SELECT name FROM teams WHERE id=$1", [teamId])).rows[0].name, "Renamed integration team");
      assert.equal((await request(`/api/workspaces/${workspaceId}/teams/${teamId}/members/${outsiderUserId}`, { method: "DELETE" })).status, 204);
      assert.equal((await setupPool.query("SELECT user_id FROM team_members WHERE team_id=$1 AND user_id=$2", [teamId, outsiderUserId])).rowCount, 0);

      const createdProject = await request(`/api/workspaces/${workspaceId}/projects`, {
        method: "POST",
        body: { name: "Integration project" },
      });
      assert.equal(createdProject.status, 201);
      const projectId = createdProject.body.project.id;
      const createdProjectMember = await request(`/api/workspaces/${workspaceId}/projects/${projectId}/members`, {
        method: "POST", body: { userId: outsiderUserId },
      });
      assert.equal(createdProjectMember.status, 201);
      assert.equal((await setupPool.query("SELECT user_id FROM project_members WHERE project_id=$1 AND user_id=$2", [projectId, outsiderUserId])).rowCount, 1);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}/members/${outsiderUserId}`, { method: "DELETE" })).status, 204);
      assert.equal((await setupPool.query("SELECT user_id FROM project_members WHERE project_id=$1 AND user_id=$2", [projectId, outsiderUserId])).rowCount, 0);
      const milestone = await request(`/api/workspaces/${workspaceId}/projects/${projectId}/milestones`, {
        method: "POST", body: { name: "Integration milestone", dueDate: "2026-12-15" },
      });
      assert.equal(milestone.status, 201);
      const milestoneId = milestone.body.milestone.id;
      assert.equal((await setupPool.query("SELECT name FROM milestones WHERE id=$1", [milestoneId])).rows[0].name, "Integration milestone");
      const updatedMilestone = await request(`/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`, {
        method: "PATCH", body: { name: "Updated integration milestone", isCompleted: true },
      });
      assert.equal(updatedMilestone.body.milestone.name, "Updated integration milestone");
      assert.ok((await setupPool.query("SELECT completed_at FROM milestones WHERE id=$1", [milestoneId])).rows[0].completed_at);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`, { method: "DELETE" })).status, 204);
      assert.equal((await setupPool.query("SELECT id FROM milestones WHERE id=$1", [milestoneId])).rowCount, 0);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects`)).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks?status=not-a-status`)).status, 400);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        body: { projectId, title: "Invalid date task", dueDate: "2026-13-40" },
      })).status, 400);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}`)).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
        method: "PATCH",
        body: { status: "completed" },
      })).status, 200);
      const renamedProject = await request(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
        method: "PATCH",
        body: { name: "Renamed integration project" },
      });
      assert.equal(renamedProject.body.project.status, "completed");
      assert.equal((await setupPool.query("SELECT name,status FROM projects WHERE id=$1", [projectId])).rows[0].name, "Renamed integration project");

      const createdTask = await request(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        body: { projectId, title: "Integration task", estimatedMinutes: 45 },
      });
      assert.equal(createdTask.status, 201);
      const taskId = createdTask.body.task.id;
      assert.equal((await setupPool.query("SELECT title,estimated_minutes FROM tasks WHERE id=$1", [taskId])).rows[0].title, "Integration task");
      assert.equal((await request(`/api/workspaces/${workspaceId}/workload`)).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}/analytics`)).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/teams/${teamId}/productivity`)).status, 200);
      assert.equal((await request(`/api/organizations/${organizationId}/analytics`)).status, 200);
      const analyticsExport = await fetch(`${baseUrl}/api/workspaces/${workspaceId}/analytics/export.csv`, { headers: { cookie } });
      assert.equal(analyticsExport.status, 200);
      assert.match(analyticsExport.headers.get("content-type"), /text\/csv/);
      assert.match(await analyticsExport.text(), /Integration task/);
      const timerStart = await request(`/api/workspaces/${workspaceId}/time-entries/start`, {
        method: "POST",
        body: { taskId },
      });
      assert.equal(timerStart.status, 201);
      assert.equal((await setupPool.query("SELECT task_id,user_id,ended_at FROM time_entries WHERE id=$1", [timerStart.body.entry.id])).rowCount, 1);
      assert.equal((await request(`/api/workspaces/${workspaceId}/time-entries/active`)).body.activeTimers.length, 1);
      assert.equal((await request(`/api/workspaces/${workspaceId}/time-entries/start`, {
        method: "POST", body: { taskId },
      })).status, 409);
      const stoppedTimer = await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${timerStart.body.entry.id}/stop`, {
        method: "POST",
      });
      assert.equal(stoppedTimer.status, 200);
      const manualTimeStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const manualTimeEnd = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const manualTimeEntry = await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`, {
        method: "POST",
        body: { startedAt: manualTimeStart, endedAt: manualTimeEnd, note: "Integration manual entry" },
      });
      assert.equal(manualTimeEntry.status, 201);
      assert.equal(Number(manualTimeEntry.body.entry.duration_seconds), 1800);
      const updatedTimeEntry = await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${manualTimeEntry.body.entry.id}`, {
        method: "PATCH",
        body: { note: "Edited integration entry" },
      });
      assert.equal(updatedTimeEntry.body.entry.note, "Edited integration entry");
      assert.equal((await setupPool.query("SELECT note,duration_seconds FROM time_entries WHERE id=$1", [manualTimeEntry.body.entry.id])).rows[0].note, "Edited integration entry");
      assert.ok(Number((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`)).body.summary.total_seconds) >= 1800);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}/time-summary`)).status, 200);
      const timeReport = await request(`/api/workspaces/${workspaceId}/time-reports`);
      assert.equal(timeReport.status, 200);
      assert.ok(timeReport.body.daily.length);
      assert.ok(timeReport.body.weekly.length);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${manualTimeEntry.body.entry.id}`, {
        method: "DELETE",
      })).status, 204);
      const recurringRule = await request(`/api/workspaces/${workspaceId}/recurring-tasks`, {
        method: "POST",
        body: {
          projectId,
          title: "Generated recurring task",
          recurrenceUnit: "daily",
          intervalCount: 1,
          startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      assert.equal(recurringRule.status, 201);
      const weeklyRule = await request(`/api/workspaces/${workspaceId}/recurring-tasks`, {
        method: "POST",
        body: {
          projectId,
          title: "Generated weekly task",
          recurrenceUnit: "weekly",
          intervalCount: 1,
          startsAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      assert.equal(weeklyRule.status, 201);
      const monthlyRule = await request(`/api/workspaces/${workspaceId}/recurring-tasks`, {
        method: "POST",
        body: {
          projectId,
          title: "Generated monthly task",
          recurrenceUnit: "monthly",
          intervalCount: 1,
          monthDay: 31,
          startsAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      assert.equal(monthlyRule.status, 201);
      assert.equal((await request(`/api/workspaces/${workspaceId}/recurring-tasks`, {
        method: "POST", body: { projectId, title: "Unsupported recurrence", recurrenceUnit: "custom", startsAt: new Date().toISOString() },
      })).status, 400);
      assert.ok(await runDueRecurringTasks() > 0);
      assert.equal(await runDueRecurringTasks(), 0);
      const projectTasks = await request(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`);
      assert.ok(projectTasks.body.tasks.some((task) => String(task.recurrence_id) === String(recurringRule.body.recurringTask.id)));
      assert.ok(projectTasks.body.tasks.some((task) => String(task.recurrence_id) === String(weeklyRule.body.recurringTask.id)));
      assert.ok(projectTasks.body.tasks.some((task) => String(task.recurrence_id) === String(monthlyRule.body.recurringTask.id)));
      assert.equal((await request(`/api/workspaces/${workspaceId}/recurring-tasks/${recurringRule.body.recurringTask.id}/pause`, { method: "POST" })).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/recurring-tasks/${recurringRule.body.recurringTask.id}/resume`, { method: "POST" })).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/recurring-tasks/${recurringRule.body.recurringTask.id}`, { method: "DELETE" })).status, 204);
      const attachmentRoute = `/api/workspaces/${workspaceId}/tasks/${taskId}/attachments`;
      const pdfContent = Buffer.from("%PDF-1.4\nintegration attachment");
      const uploadedAttachment = await upload(attachmentRoute, pdfContent, "application/pdf", "brief.pdf");
      assert.equal(uploadedAttachment.status, 201, JSON.stringify(uploadedAttachment.body));
      const attachmentId = uploadedAttachment.body.attachment.id;
      assert.equal((await setupPool.query("SELECT task_id,workspace_id,original_name FROM task_attachments WHERE id=$1", [attachmentId])).rows[0].original_name, "brief.pdf");
      assert.equal(uploadedAttachment.body.attachment.original_name, "brief.pdf");
      assert.equal(Number(uploadedAttachment.body.attachment.byte_size), pdfContent.length);
      assert.equal("storage_key" in uploadedAttachment.body.attachment, false);
      const attachmentList = await request(attachmentRoute);
      assert.equal(attachmentList.status, 200);
      assert.equal(attachmentList.body.attachments.length, 1);
      const attachmentDownload = await fetch(`${baseUrl}${attachmentRoute}/${attachmentId}/download`, {
        headers: { cookie },
      });
      assert.equal(attachmentDownload.status, 200);
      assert.equal(attachmentDownload.headers.get("x-content-type-options"), "nosniff");
      assert.equal(Buffer.from(await attachmentDownload.arrayBuffer()).toString(), pdfContent.toString());
      const mismatchedMime = await upload(attachmentRoute, pdfContent, "image/png", "fake.png");
      assert.equal(mismatchedMime.status, 415);
      assert.equal((await request(
        `/api/workspaces/${secondWorkspaceId}/tasks/${taskId}/attachments/${attachmentId}/download`,
        { authCookie: outsiderCookie }
      )).status, 404);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects`, { method: "POST", body: { name: "Employee forbidden project" }, authCookie: outsiderCookie })).status, 403);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks`, { method: "POST", body: { projectId, title: "Employee forbidden task" }, authCookie: outsiderCookie })).status, 403);
      const assignedTask = await request(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        body: { projectId, title: "Assigned employee task", assigneeId: outsiderUserId, dueDate: (await setupPool.query("SELECT CURRENT_DATE::text AS today")).rows[0].today },
      });
      assert.equal(String(assignedTask.body.task.assignee_id), String(outsiderUserId), JSON.stringify(assignedTask.body.task));
      await setupPool.query("UPDATE tasks SET due_date=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-1 WHERE id=$1", [assignedTask.body.task.id]);
      const defaultPreferences = await request(`/api/workspaces/${workspaceId}/notification-preferences`, { authCookie: outsiderCookie });
      assert.deepEqual(defaultPreferences.body.preferences, {
        assignment_enabled: true, mention_enabled: true, due_date_enabled: true,
      });
      const assignmentNotifications = await request(`/api/workspaces/${workspaceId}/notifications`, { authCookie: outsiderCookie });
      assert.equal(assignmentNotifications.body.notifications.filter((notification) => notification.type === "assignment").length, 1);
      assert.ok(await require("../src/controllers/notificationController").runDueDateReminders() > 0);
      assert.equal(await require("../src/controllers/notificationController").runDueDateReminders(), 0);
      const overdueInbox = await request(`/api/workspaces/${workspaceId}/notifications`, { authCookie: outsiderCookie });
      assert.ok(overdueInbox.body.notifications.some((item) => String(item.resource_id) === String(assignedTask.body.task.id) && item.message.includes("is overdue")));
      assert.equal((await request(`/api/workspaces/${workspaceId}/notification-preferences`, {
        method: "PATCH", body: { mentionEnabled: false }, authCookie: outsiderCookie,
      })).body.preferences.mention_enabled, false);
      const assignedRow = await setupPool.query("SELECT assignee_id FROM tasks WHERE id=$1", [assignedTask.body.task.id]);
      assert.equal(String(assignedRow.rows[0].assignee_id), String(outsiderUserId));
      const employeeStatusUpdate = await request(`/api/workspaces/${workspaceId}/tasks/${assignedTask.body.task.id}`, {
        method: "PATCH", body: { status: "in_progress" }, authCookie: outsiderCookie,
      });
      assert.equal(employeeStatusUpdate.status, 200, JSON.stringify(employeeStatusUpdate.body));
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${assignedTask.body.task.id}`, {
        method: "PATCH", body: { title: "Unauthorized title change" }, authCookie: outsiderCookie,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`)).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}`)).status, 200);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: "PATCH",
        body: { status: "completed", priority: "high" },
      })).status, 200);
      const createdSubtask = await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks`, {
        method: "POST",
        body: { title: "Integration subtask" },
      });
      assert.equal(createdSubtask.status, 201);
      const subtaskId = createdSubtask.body.subtask.id;
      assert.equal((await setupPool.query("SELECT title FROM subtasks WHERE id=$1", [subtaskId])).rows[0].title, "Integration subtask");
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks`)).body.subtasks.length, 1);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        body: { isCompleted: true },
      })).body.subtask.is_completed, true);
      assert.equal((await setupPool.query("SELECT is_completed FROM subtasks WHERE id=$1", [subtaskId])).rows[0].is_completed, true);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" })).status, 204);
      assert.equal((await setupPool.query("SELECT id FROM subtasks WHERE id=$1", [subtaskId])).rowCount, 0);
      const blocker = await request(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        body: { projectId, title: "Integration blocker" },
      });
      assert.equal(blocker.status, 201);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/dependencies`, {
        method: "POST",
        body: { dependsOnTaskId: blocker.body.task.id },
      })).status, 201);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/dependencies`)).body.dependencies.length, 1);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${blocker.body.task.id}/dependencies`, {
        method: "POST",
        body: { dependsOnTaskId: taskId },
      })).status, 409);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/dependencies/${blocker.body.task.id}`, {
        method: "DELETE",
      })).status, 204);
      const concurrentDependencies = await Promise.all([
        request(`/api/workspaces/${workspaceId}/tasks/${taskId}/dependencies`, { method: "POST", body: { dependsOnTaskId: blocker.body.task.id } }),
        request(`/api/workspaces/${workspaceId}/tasks/${blocker.body.task.id}/dependencies`, { method: "POST", body: { dependsOnTaskId: taskId } }),
      ]);
      assert.deepEqual(concurrentDependencies.map((result) => result.status).sort(), [201, 409]);
      const successfulEdge = concurrentDependencies[0].status === 201
        ? [taskId, blocker.body.task.id]
        : [blocker.body.task.id, taskId];
      await request(`/api/workspaces/${workspaceId}/tasks/${successfulEdge[0]}/dependencies/${successfulEdge[1]}`, { method: "DELETE" });
      const taskComment = await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
        method: "POST",
        body: { body: `Integration comment for @${outsiderEmail}` },
      });
      assert.equal(taskComment.status, 201);
      const taskCommentId = taskComment.body.comment.id;
      assert.equal((await setupPool.query("SELECT body FROM task_comments WHERE id=$1", [taskCommentId])).rows[0].body, `Integration comment for @${outsiderEmail}`);
      const updatedComment = await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments/${taskCommentId}`, {
        method: "PATCH", body: { body: `Updated integration comment ${outsiderEmail}` },
      });
      assert.equal(updatedComment.body.comment.body, `Updated integration comment ${outsiderEmail}`);
      assert.equal((await request(`/api/workspaces/${workspaceId}/notifications`, { authCookie: outsiderCookie }))
        .body.notifications.some((notification) => notification.type === "mention"), false);
      assert.equal((await request(`/api/workspaces/${workspaceId}/notification-preferences`, {
        method: "PATCH", body: { mentionEnabled: true }, authCookie: outsiderCookie,
      })).body.preferences.mention_enabled, true);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
        method: "POST",
        body: { body: `Second integration mention for @${outsiderEmail}` },
      })).status, 201);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments`)).status, 200);
      const activity = await request(`/api/workspaces/${workspaceId}/activity`);
      assert.equal(activity.status, 200);
      assert.ok(activity.body.activity.some((event) => event.action === "commented"));
      const notifications = await request(`/api/workspaces/${workspaceId}/notifications`, { authCookie: outsiderCookie });
      assert.equal(notifications.status, 200);
      assert.ok(notifications.body.notifications.some((notification) => notification.type === "mention"));
      const mention = notifications.body.notifications.find((notification) => notification.type === "mention");
      assert.equal((await request(`/api/workspaces/${workspaceId}/notifications/${mention.id}/read`, { method: "PATCH", authCookie: outsiderCookie })).status, 200);
      assert.equal((await setupPool.query("SELECT is_read FROM notifications WHERE id=$1", [mention.id])).rows[0].is_read, true);
      assert.equal((await request(`/api/workspaces/${workspaceId}/notifications/${mention.id}`, { method: "DELETE", authCookie: outsiderCookie })).status, 204);
      assert.equal((await setupPool.query("SELECT id FROM notifications WHERE id=$1", [mention.id])).rowCount, 0);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments/${taskCommentId}`, { method: "DELETE" })).status, 204);
      assert.equal((await setupPool.query("SELECT id FROM task_comments WHERE id=$1", [taskCommentId])).rowCount, 0);
      assert.equal((await request(`/api/workspaces/${workspaceId}/dashboard`)).status, 200);

      assert.equal((await request(`/api/organizations/${organizationId}/members/${outsiderUserId}`, {
        method: "DELETE",
      })).status, 204);
      assert.equal((await request(`/api/workspaces/${workspaceId}`, { authCookie: outsiderCookie })).status, 401);

      assert.equal((await request(`${attachmentRoute}/${attachmentId}`, { method: "DELETE" })).status, 204);
      assert.equal((await request(`${attachmentRoute}/${attachmentId}/download`)).status, 404);
      const taskCleanupAttachment = await upload(attachmentRoute, pdfContent, "application/pdf", "task-cleanup.pdf");
      assert.equal(taskCleanupAttachment.status, 201);
      assert.equal((await request(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: "DELETE",
      })).status, 204);
      assert.deepEqual(await readdir(attachmentStorageDirectory), []);
      assert.equal((await request(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
        method: "DELETE",
      })).status, 204);
      assert.equal((await setupPool.query("SELECT id FROM projects WHERE id=$1", [projectId])).rowCount, 0);
      assert.equal((await request(`/api/workspaces/${workspaceId}/teams/${teamId}`, { method: "DELETE" })).status, 204);
      assert.equal((await setupPool.query("SELECT id FROM teams WHERE id=$1", [teamId])).rowCount, 0);
      assert.equal((await request(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      })).status, 204);
    } finally {
      if (workspaceId) {
        await setupPool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
      }
      if (secondWorkspaceId) await setupPool.query("DELETE FROM workspaces WHERE id=$1", [secondWorkspaceId]);
      if (organizationId) await setupPool.query("DELETE FROM organizations WHERE id=$1", [organizationId]);
      if (secondOrganizationId) await setupPool.query("DELETE FROM organizations WHERE id=$1", [secondOrganizationId]);
      if (userId) {
        await setupPool.query("DELETE FROM users WHERE id = $1", [userId]);
      }
      if (outsiderUserId) {
        await setupPool.query("DELETE FROM users WHERE id = $1", [outsiderUserId]);
      }
      if (server) {
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
      if (appPool) await appPool.end();
      await setupPool.end();
      if (attachmentStorageDirectory) {
        await rm(attachmentStorageDirectory, { recursive: true, force: true });
        delete process.env.ATTACHMENT_STORAGE_DIR;
      }
    }
  }
);
