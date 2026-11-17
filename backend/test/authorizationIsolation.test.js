require("dotenv").config();

const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { mkdtemp, rm, writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { test } = require("node:test");
const { getTestDatabaseUrl } = require("../src/config/testDb");

test(
  "organization and workspace authorization isolates every tenant resource and role",
  { skip: !process.env.TEST_DATABASE_URL && "Set TEST_DATABASE_URL to run PostgreSQL isolation tests." },
  async () => {
    const testDatabaseUrl = getTestDatabaseUrl();
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = randomBytes(32).toString("hex");
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.NODE_ENV = "test";
    process.env.CORS_ORIGINS = "http://localhost:5173";
    const setupPool = new Pool({ connectionString: testDatabaseUrl });
    let appPool;
    let server;
    let storageDirectory;
    const fixture = { users: [], organizations: [], workspaces: [] };

    try {
      const connected = await setupPool.query("SELECT current_database() AS database");
      assert.equal(connected.rows[0].database, "project_management_test");
      assert.notEqual(connected.rows[0].database, process.env.DB_NAME || "project_management_saas");

      storageDirectory = await mkdtemp(join(tmpdir(), "projectflow-isolation-"));
      process.env.ATTACHMENT_STORAGE_DIR = storageDirectory;
      const app = require("../src/app");
      appPool = require("../src/config/db");
      server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const baseUrl = `http://127.0.0.1:${server.address().port}`;

      async function request(route, { method = "GET", body, token } = {}) {
        const response = await fetch(`${baseUrl}${route}`, {
          method,
          headers: {
            ...(body !== undefined ? { "content-type": "application/json" } : {}),
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        const text = response.status === 204 ? "" : await response.text();
        let parsedBody = text;
        try { parsedBody = text ? JSON.parse(text) : null; } catch { /* CSV and file bodies stay text. */ }
        return { status: response.status, body: parsedBody, text, response };
      }

      async function upload(route, token, contents = Buffer.from("%PDF-1.4 cross scope")) {
        const form = new FormData();
        form.append("file", new Blob([contents], { type: "application/pdf" }), "cross-scope.pdf");
        const response = await fetch(`${baseUrl}${route}`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: form,
        });
        const text = await response.text();
        return { status: response.status, body: text ? JSON.parse(text) : null };
      }

      async function createTenant(label) {
        const tenant = { users: {}, tokens: {}, resources: {} };
        for (const role of ["owner", "manager", "employee"]) {
          const email = `${label}-${role}-${randomUUID()}@isolation.test`;
          const result = await setupPool.query(
            "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,token_version",
            [`${label} ${role}`, email, "unused-test-hash"]
          );
          const user = { id: result.rows[0].id, email, role };
          tenant.users[role] = user;
          fixture.users.push(user.id);
          tenant.tokens[role] = jwt.sign(
            { sub: String(user.id), ver: Number(result.rows[0].token_version) },
            process.env.JWT_SECRET,
            { expiresIn: "1h", algorithm: "HS256" }
          );
        }

        const organization = await setupPool.query(
          "INSERT INTO organizations(name,owner_id) VALUES($1,$2) RETURNING id",
          [`${label} organization`, tenant.users.owner.id]
        );
        tenant.resources.organizationId = organization.rows[0].id;
        fixture.organizations.push(tenant.resources.organizationId);
        const organizationRoles = { owner: "owner", manager: "manager", employee: "employee" };
        for (const role of Object.keys(tenant.users)) {
          await setupPool.query(
            "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3)",
            [tenant.resources.organizationId, tenant.users[role].id, organizationRoles[role]]
          );
        }

        const workspace = await setupPool.query(
          "INSERT INTO workspaces(name,owner_id,organization_id) VALUES($1,$2,$3) RETURNING id",
          [`${label} workspace`, tenant.users.owner.id, tenant.resources.organizationId]
        );
        tenant.resources.workspaceId = workspace.rows[0].id;
        fixture.workspaces.push(tenant.resources.workspaceId);
        const workspaceRoles = { owner: "owner", manager: "manager", employee: "employee" };
        for (const role of Object.keys(tenant.users)) {
          await setupPool.query(
            "INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)",
            [tenant.resources.workspaceId, tenant.users[role].id, workspaceRoles[role]]
          );
        }

        const project = await setupPool.query(
          "INSERT INTO projects(workspace_id,name,owner_id) VALUES($1,$2,$3) RETURNING id",
          [tenant.resources.workspaceId, `${label} project`, tenant.users.owner.id]
        );
        tenant.resources.projectId = project.rows[0].id;
        tenant.resources.projectName = `${label} project`;
        const firstTask = await setupPool.query(
          `INSERT INTO tasks(workspace_id,project_id,title,created_by,assignee_id)
           VALUES($1,$2,$3,$4,$5) RETURNING id`,
          [tenant.resources.workspaceId, tenant.resources.projectId, `${label} task`, tenant.users.owner.id, tenant.users.employee.id]
        );
        tenant.resources.taskId = firstTask.rows[0].id;
        tenant.resources.taskTitle = `${label} task`;
        const secondTask = await setupPool.query(
          "INSERT INTO tasks(workspace_id,project_id,title,created_by) VALUES($1,$2,$3,$4) RETURNING id",
          [tenant.resources.workspaceId, tenant.resources.projectId, `${label} blocker`, tenant.users.owner.id]
        );
        tenant.resources.blockerId = secondTask.rows[0].id;
        const comment = await setupPool.query(
          "INSERT INTO task_comments(workspace_id,task_id,user_id,body) VALUES($1,$2,$3,$4) RETURNING id",
          [tenant.resources.workspaceId, tenant.resources.taskId, tenant.users.employee.id, `${label} private comment`]
        );
        tenant.resources.commentId = comment.rows[0].id;
        const team = await setupPool.query(
          "INSERT INTO teams(workspace_id,name,manager_id,created_by) VALUES($1,$2,$3,$4) RETURNING id",
          [tenant.resources.workspaceId, `${label} team`, tenant.users.manager.id, tenant.users.owner.id]
        );
        tenant.resources.teamId = team.rows[0].id;
        for (const role of ["manager", "employee"]) {
          await setupPool.query(
            "INSERT INTO team_members(workspace_id,team_id,user_id,role) VALUES($1,$2,$3,$4)",
            [tenant.resources.workspaceId, tenant.resources.teamId, tenant.users[role].id, role]
          );
        }
        const milestone = await setupPool.query(
          "INSERT INTO milestones(workspace_id,project_id,name) VALUES($1,$2,$3) RETURNING id",
          [tenant.resources.workspaceId, tenant.resources.projectId, `${label} milestone`]
        );
        tenant.resources.milestoneId = milestone.rows[0].id;
        const subtask = await setupPool.query(
          "INSERT INTO subtasks(workspace_id,task_id,title,assignee_id,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
          [tenant.resources.workspaceId, tenant.resources.taskId, `${label} subtask`, tenant.users.employee.id, tenant.users.owner.id]
        );
        tenant.resources.subtaskId = subtask.rows[0].id;
        await setupPool.query(
          "INSERT INTO task_dependencies(workspace_id,task_id,depends_on_task_id,created_by) VALUES($1,$2,$3,$4)",
          [tenant.resources.workspaceId, tenant.resources.taskId, tenant.resources.blockerId, tenant.users.owner.id]
        );
        const entry = await setupPool.query(
          `INSERT INTO time_entries(workspace_id,task_id,user_id,started_at,ended_at,duration_seconds)
           VALUES($1,$2,$3,NOW()-INTERVAL '1 hour',NOW(),3600) RETURNING id`,
          [tenant.resources.workspaceId, tenant.resources.taskId, tenant.users.employee.id]
        );
        tenant.resources.entryId = entry.rows[0].id;
        const recurring = await setupPool.query(
          `INSERT INTO recurring_tasks(workspace_id,project_id,created_by,title,recurrence_rule,next_run_at,
             recurrence_unit,interval_count,assignee_id)
           VALUES($1,$2,$3,$4,'daily:1',NOW()+INTERVAL '1 day','daily',1,$5) RETURNING id`,
          [tenant.resources.workspaceId, tenant.resources.projectId, tenant.users.owner.id, `${label} recurring`, tenant.users.employee.id]
        );
        tenant.resources.recurringTaskId = recurring.rows[0].id;
        tenant.resources.notificationIds = {};
        for (const role of Object.keys(tenant.users)) {
          const notification = await setupPool.query(
            `INSERT INTO notifications(workspace_id,user_id,type,message,resource_type,resource_id)
             VALUES($1,$2,'assignment',$3,'task',$4) RETURNING id`,
            [tenant.resources.workspaceId, tenant.users[role].id, `${label} ${role} notification`, tenant.resources.taskId]
          );
          tenant.resources.notificationIds[role] = notification.rows[0].id;
        }
        tenant.resources.notificationId = tenant.resources.notificationIds.owner;
        const activity = await setupPool.query(
          `INSERT INTO activity_logs(workspace_id,actor_id,resource_type,resource_id,action,details)
           VALUES($1,$2,'task',$3,'created',$4::jsonb) RETURNING id`,
          [tenant.resources.workspaceId, tenant.users.owner.id, tenant.resources.taskId, JSON.stringify({ label })]
        );
        tenant.resources.activityId = activity.rows[0].id;
        const storageKey = randomUUID();
        await writeFile(join(storageDirectory, storageKey), Buffer.from("%PDF-1.4 isolated attachment"));
        const attachment = await setupPool.query(
          `INSERT INTO task_attachments(organization_id,workspace_id,task_id,uploaded_by,original_name,
             storage_key,mime_type,byte_size)
           VALUES($1,$2,$3,$4,$5,$6,'application/pdf',$7) RETURNING id`,
          [tenant.resources.organizationId, tenant.resources.workspaceId, tenant.resources.taskId,
            tenant.users.owner.id, `${label}.pdf`, storageKey, Buffer.byteLength("%PDF-1.4 isolated attachment")]
        );
        tenant.resources.attachmentId = attachment.rows[0].id;
        tenant.resources.attachmentStorageKey = storageKey;
        return tenant;
      }

      const orgA = await createTenant("OrgA");
      const orgB = await createTenant("OrgB");
      const a = orgA.resources;
      const b = orgB.resources;
      const denied = new Set([403, 404]);
      const crossRequests = [
        ["GET", `/api/organizations/${b.organizationId}`],
        ["PATCH", `/api/organizations/${b.organizationId}`, { name: "Changed" }],
        ["GET", `/api/organizations/${b.organizationId}/analytics`],
        ["GET", `/api/organizations/${b.organizationId}/members`],
        ["GET", `/api/organizations/${b.organizationId}/invitations`],
        ["POST", `/api/organizations/${b.organizationId}/invitations`, { email: "intruder@isolation.test" }],
        ["DELETE", `/api/organizations/${b.organizationId}/members/${orgB.users.employee.id}`],
        ["GET", `/api/workspaces/${b.workspaceId}`],
        ["PATCH", `/api/workspaces/${b.workspaceId}`, { name: "Changed" }],
        ["DELETE", `/api/workspaces/${b.workspaceId}`],
        ["GET", `/api/workspaces/${b.workspaceId}/members`],
        ["POST", `/api/workspaces/${b.workspaceId}/invitations`, { email: "intruder@isolation.test" }],
        ["GET", `/api/workspaces/${b.workspaceId}/teams`],
        ["GET", `/api/workspaces/${b.workspaceId}/projects`],
        ["GET", `/api/workspaces/${b.workspaceId}/projects/${b.projectId}/tasks`],
        ["GET", `/api/workspaces/${b.workspaceId}/dashboard`],
        ["GET", `/api/workspaces/${b.workspaceId}/workload`],
        ["GET", `/api/workspaces/${b.workspaceId}/analytics`],
        ["GET", `/api/workspaces/${b.workspaceId}/analytics/export.csv`],
        ["GET", `/api/workspaces/${b.workspaceId}/notifications`],
        ["GET", `/api/workspaces/${b.workspaceId}/notification-preferences`],
        ["GET", `/api/workspaces/${b.workspaceId}/activity`],
        ["GET", `/api/workspaces/${a.workspaceId}/teams/${b.teamId}`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/teams/${b.teamId}`, { name: "Changed" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/teams/${b.teamId}`],
        ["GET", `/api/workspaces/${a.workspaceId}/teams/${b.teamId}/members`],
        ["GET", `/api/workspaces/${a.workspaceId}/teams/${b.teamId}/productivity`],
        ["POST", `/api/workspaces/${a.workspaceId}/teams/${a.teamId}/members`, { userId: orgB.users.employee.id, role: "employee" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/teams/${a.teamId}/members/${orgB.users.employee.id}`],
        ["GET", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}`, { name: "Changed" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}`],
        ["GET", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}/timeline`],
        ["GET", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}/analytics`],
        ["POST", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}/milestones`, { name: "Cross milestone" }],
        ["PATCH", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}/milestones/${b.milestoneId}`, { name: "Changed" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}/milestones/${b.milestoneId}`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/projects/${a.projectId}/milestones/${b.milestoneId}`, { name: "Changed" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/projects/${a.projectId}/milestones/${b.milestoneId}`],
        ["GET", `/api/workspaces/${a.workspaceId}/projects/${b.projectId}/tasks`],
        ["POST", `/api/workspaces/${a.workspaceId}/tasks`, { projectId: b.projectId, title: "Cross task" }],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}`, { title: "Changed" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/comments`],
        ["POST", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/comments`, { body: "Cross comment" }],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/subtasks`],
        ["POST", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/subtasks`, { title: "Cross subtask" }],
        ["PATCH", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/subtasks/${b.subtaskId}`, { title: "Changed" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/subtasks/${b.subtaskId}`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/dependencies`],
        ["POST", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/dependencies`, { dependsOnTaskId: b.taskId }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/dependencies/${b.blockerId}`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/attachments`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/attachments/${b.attachmentId}/download`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/attachments/${b.attachmentId}/download`],
        ["DELETE", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/attachments/${b.attachmentId}`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/time-entries`],
        ["POST", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/time-entries`, {
          startedAt: new Date(Date.now() - 120000).toISOString(), endedAt: new Date().toISOString(), note: "Cross time",
        }],
        ["POST", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/time-entries/${b.entryId}/stop`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/time-entries/${b.entryId}`, { note: "Changed" }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/time-entries/${b.entryId}`],
        ["POST", `/api/workspaces/${a.workspaceId}/recurring-tasks`, { projectId: b.projectId, title: "Cross recurring", recurrenceUnit: "daily", startsAt: new Date().toISOString() }],
        ["POST", `/api/workspaces/${a.workspaceId}/recurring-tasks/${b.recurringTaskId}/pause`],
        ["POST", `/api/workspaces/${a.workspaceId}/recurring-tasks/${b.recurringTaskId}/resume`],
        ["DELETE", `/api/workspaces/${a.workspaceId}/recurring-tasks/${b.recurringTaskId}`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/notifications/${b.notificationId}/read`],
      ];
      for (const role of ["owner", "manager", "employee"]) {
        for (const [method, route, body] of crossRequests) {
          const result = await request(route, { method, body, token: orgA.tokens[role] });
          assert.ok(denied.has(result.status), `${role} ${method} ${route} returned ${result.status}`);
        }
      }

      const crossUpload = await upload(
        `/api/workspaces/${a.workspaceId}/tasks/${b.taskId}/attachments`, orgA.tokens.owner
      );
      assert.equal(crossUpload.status, 404);

      for (const role of ["owner", "manager", "employee"]) {
        const token = orgA.tokens[role];
        const orgList = await request("/api/organizations", { token });
        assert.ok(orgList.body.organizations.some((item) => String(item.id) === String(a.organizationId)));
        assert.ok(orgList.body.organizations.every((item) => String(item.id) !== String(b.organizationId)));
        const workspaceList = await request("/api/workspaces", { token });
        assert.ok(workspaceList.body.workspaces.some((item) => String(item.id) === String(a.workspaceId)));
        assert.ok(workspaceList.body.workspaces.every((item) => String(item.id) !== String(b.workspaceId)));
        const teams = await request(`/api/workspaces/${a.workspaceId}/teams`, { token });
        assert.ok(teams.body.teams.some((item) => String(item.id) === String(a.teamId)));
        assert.ok(teams.body.teams.every((item) => String(item.id) !== String(b.teamId)));
        const projects = await request(`/api/workspaces/${a.workspaceId}/projects`, { token });
        assert.ok(projects.body.projects.some((item) => String(item.id) === String(a.projectId)));
        assert.ok(projects.body.projects.every((item) => String(item.id) !== String(b.projectId)));
        const tasks = await request(`/api/workspaces/${a.workspaceId}/projects/${a.projectId}/tasks`, { token });
        assert.ok(tasks.body.tasks.some((item) => String(item.id) === String(a.taskId)));
        assert.ok(tasks.body.tasks.every((item) => String(item.id) !== String(b.taskId)));
        const comments = await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/comments`, { token });
        assert.ok(comments.body.comments.some((item) => String(item.id) === String(a.commentId)));
        const subtasks = await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/subtasks`, { token });
        assert.ok(subtasks.body.subtasks.every((item) => String(item.id) !== String(b.subtaskId)));
        const dependencies = await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/dependencies`, { token });
        assert.ok(dependencies.body.dependencies.every((item) => String(item.depends_on_task_id) !== String(b.blockerId)));
        const attachments = await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/attachments`, { token });
        assert.ok(attachments.body.attachments.every((item) => String(item.id) !== String(b.attachmentId)));
        const entries = await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/time-entries`, { token });
        assert.ok(entries.body.entries.every((item) => String(item.id) !== String(b.entryId)));
        const recurring = await request(`/api/workspaces/${a.workspaceId}/recurring-tasks`, { token });
        assert.ok(recurring.body.recurringTasks.every((item) => String(item.id) !== String(b.recurringTaskId)));
        const notifications = await request(`/api/workspaces/${a.workspaceId}/notifications`, { token });
        assert.ok(notifications.body.notifications.some((item) => String(item.id) === String(a.notificationIds[role])));
        assert.ok(notifications.body.notifications.every((item) => String(item.id) !== String(b.notificationId)));
        const activity = await request(`/api/workspaces/${a.workspaceId}/activity`, { token });
        assert.ok(activity.body.activity.some((item) => String(item.id) === String(a.activityId)));
        assert.ok(activity.body.activity.every((item) => String(item.id) !== String(b.activityId)));
        const analytics = await request(`/api/organizations/${a.organizationId}/analytics`, { token });
        assert.ok(!JSON.stringify(analytics.body).includes(b.projectName));
        const csv = await request(`/api/workspaces/${a.workspaceId}/analytics/export.csv`, { token });
        assert.equal(csv.status, 200);
        assert.ok(csv.text.includes(a.taskTitle));
        assert.ok(!csv.text.includes(b.taskTitle));
      }

      const invalidIdRequests = [
        ["GET", "/api/organizations/zero"],
        ["GET", "/api/workspaces/nope"],
        ["GET", `/api/workspaces/${a.workspaceId}/teams/nope`],
        ["GET", `/api/workspaces/${a.workspaceId}/projects/nope`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/nope`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/subtasks/nope`, { isCompleted: true }],
        ["DELETE", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/dependencies/nope`],
        ["GET", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/attachments/nope/download`],
        ["DELETE", `/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/time-entries/nope`],
        ["DELETE", `/api/workspaces/${a.workspaceId}/recurring-tasks/nope`],
        ["PATCH", `/api/workspaces/${a.workspaceId}/notifications/nope/read`],
        ["PATCH", `/api/organizations/${a.organizationId}/invitations/nope/revoke`],
        ["DELETE", `/api/organizations/${a.organizationId}/members/nope`],
        ["DELETE", `/api/workspaces/${a.workspaceId}/teams/${a.teamId}/members/nope`],
        ["DELETE", `/api/workspaces/${a.workspaceId}/projects/${a.projectId}/milestones/nope`],
        ["GET", "/api/workspaces/9223372036854775808"],
      ];
      for (const [method, route, body] of invalidIdRequests) {
        const response = await request(route, { method, body, token: orgA.tokens.owner });
        assert.equal(response.status, 400, `${method} ${route} returned ${response.status}`);
      }

      const employee = orgA.users.employee;
      const employeeToken = orgA.tokens.employee;
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/projects`, {
        method: "POST", body: { name: "Employee project" }, token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/projects/${a.projectId}`, {
        method: "DELETE", token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/tasks`, {
        method: "POST", body: { projectId: a.projectId, title: "Employee task" }, token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}`, {
        method: "DELETE", token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/invitations`, {
        method: "POST", body: { email: "employee-invite@isolation.test" }, token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/organizations/${a.organizationId}/invitations`, {
        method: "POST", body: { email: "employee-org-invite@isolation.test" }, token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/organizations/${a.organizationId}/members/${orgA.users.manager.id}`, {
        method: "DELETE", token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/teams/${a.teamId}/members`, {
        method: "POST", body: { userId: employee.id, role: "employee" }, token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/teams/${a.teamId}/members/${employee.id}`, {
        method: "DELETE", token: employeeToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/comments/${a.commentId}`, {
        method: "DELETE", token: employeeToken,
      })).status, 204);

      const managerToken = orgA.tokens.manager;
      assert.equal((await request(`/api/workspaces/${a.workspaceId}`, {
        method: "DELETE", token: managerToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}`, {
        method: "PATCH", body: { name: "Manager cannot administer workspace" }, token: managerToken,
      })).status, 403);
      assert.equal((await request(`/api/organizations/${a.organizationId}`, {
        method: "PATCH", body: { name: "Manager cannot administer organization" }, token: managerToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/projects/${a.projectId}`, {
        method: "DELETE", token: managerToken,
      })).status, 403);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/invitations`, {
        method: "POST", body: { email: "manager-invite@isolation.test" }, token: managerToken,
      })).status, 403);

      const ownerToken = orgA.tokens.owner;
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/tasks`, {
        method: "POST", body: { projectId: a.projectId, title: "Cross assignee", assigneeId: orgB.users.employee.id }, token: ownerToken,
      })).status, 400);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/subtasks`, {
        method: "POST", body: { title: "Cross assignee subtask", assigneeId: orgB.users.employee.id }, token: ownerToken,
      })).status, 400);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/recurring-tasks`, {
        method: "POST", body: { projectId: a.projectId, title: "Cross assignee recurrence", recurrenceUnit: "daily", startsAt: new Date().toISOString(), assigneeId: orgB.users.employee.id }, token: ownerToken,
      })).status, 400);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}/teams`, {
        method: "POST", body: { name: "Cross manager team", managerId: orgB.users.manager.id }, token: ownerToken,
      })).status, 400);

      const managerWorkspace = await request("/api/workspaces", {
        method: "POST", body: { name: "Manager created workspace", organizationId: a.organizationId }, token: managerToken,
      });
      assert.equal(managerWorkspace.status, 201);
      const managerWorkspaceId = managerWorkspace.body.workspace.id;
      const pairedManagerMemberships = await setupPool.query(
        `SELECT wm.role AS workspace_role,om.role AS organization_role
         FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
         JOIN organization_members om ON om.organization_id=w.organization_id AND om.user_id=wm.user_id
         WHERE wm.workspace_id=$1 AND wm.user_id=$2`,
        [managerWorkspaceId, orgA.users.manager.id]
      );
      assert.deepEqual(pairedManagerMemberships.rows[0], { workspace_role: "manager", organization_role: "manager" });

      const inviteeEmail = `invitee-${randomUUID()}@isolation.test`;
      const invitee = await setupPool.query(
        "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,token_version",
        ["Invited manager", inviteeEmail, "unused-test-hash"]
      );
      fixture.users.push(invitee.rows[0].id);
      const inviteeToken = jwt.sign(
        { sub: String(invitee.rows[0].id), ver: Number(invitee.rows[0].token_version) },
        process.env.JWT_SECRET,
        { expiresIn: "1h", algorithm: "HS256" }
      );
      const invitation = await request(`/api/workspaces/${a.workspaceId}/invitations`, {
        method: "POST", body: { email: inviteeEmail, role: "manager" }, token: ownerToken,
      });
      assert.equal(invitation.status, 201);
      const inviteToken = new URL(invitation.body.inviteUrl).searchParams.get("invite");
      const accepted = await request("/api/workspaces/invitations/accept", {
        method: "POST", body: { token: inviteToken }, token: inviteeToken,
      });
      assert.equal(accepted.status, 200);
      const acceptedMemberships = await setupPool.query(
        `SELECT wm.role AS workspace_role,om.role AS organization_role
         FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
         JOIN organization_members om ON om.organization_id=w.organization_id AND om.user_id=wm.user_id
         WHERE wm.workspace_id=$1 AND wm.user_id=$2`,
        [a.workspaceId, invitee.rows[0].id]
      );
      assert.deepEqual(acceptedMemberships.rows[0], { workspace_role: "manager", organization_role: "manager" });

      const mentioned = await request(`/api/workspaces/${a.workspaceId}/tasks/${a.taskId}/comments`, {
        method: "POST", body: { body: `This mention must stay workspace local: @${orgB.users.employee.email}` }, token: ownerToken,
      });
      assert.equal(mentioned.status, 201);
      const crossMentionNotifications = await setupPool.query(
        "SELECT count(*)::int AS count FROM notifications WHERE workspace_id=$1 AND user_id=$2 AND type='mention'",
        [a.workspaceId, orgB.users.employee.id]
      );
      assert.equal(crossMentionNotifications.rows[0].count, 0);

      const removedToken = orgA.tokens.employee;
      const removedMember = await request(`/api/organizations/${a.organizationId}/members/${employee.id}`, {
        method: "DELETE", token: ownerToken,
      });
      assert.equal(removedMember.status, 204);
      assert.equal((await request("/api/auth/me", { token: removedToken })).status, 401);
      assert.equal((await request(`/api/workspaces/${a.workspaceId}`, { token: removedToken })).status, 401);
    } finally {
      if (fixture.organizations.length) {
        await setupPool.query("DELETE FROM organizations WHERE id=ANY($1::bigint[])", [fixture.organizations]);
      }
      if (fixture.workspaces.length) {
        await setupPool.query("DELETE FROM workspaces WHERE id=ANY($1::bigint[])", [fixture.workspaces]);
      }
      if (fixture.users.length) {
        await setupPool.query("DELETE FROM users WHERE id=ANY($1::bigint[])", [fixture.users]);
      }
      if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      if (appPool) await appPool.end();
      await setupPool.end();
      if (storageDirectory) await rm(storageDirectory, { recursive: true, force: true });
      delete process.env.ATTACHMENT_STORAGE_DIR;
    }
  }
);
