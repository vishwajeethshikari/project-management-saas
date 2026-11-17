import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const { Pool } = require("../../backend/node_modules/pg");
const apiBase = "http://localhost:5000/api";
const password = "Live-Test-Only-Password-8274!";
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const fixture = { users: [], emails: [], organizations: [], workspaces: [], workspaceId: null, taskId: null, admin: null, manager: null, employee: null, outsider: null };
let pool;

async function register(name, role) {
  const email = `projectflow-${role}-${suffix}@example.test`;
  console.log(`Live setup: registering ${role} account`);
  const response = await fetch(`${apiBase}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  expect(response.status, `register ${role}`).toBe(201);
  const payload = await response.json();
  fixture.users.push(payload.user.id);
  fixture.emails.push(email);
  return { ...payload.user, email, role };
}

async function login(page, account) {
  await page.goto("/");
  await page.getByLabel("Work Email").fill(account.email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
}

test.beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) throw new Error("Live browser tests require TEST_DATABASE_URL.");
  console.log("Live setup: checking isolated database");
  pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const database = await pool.query("SELECT current_database() AS name");
  expect(database.rows[0].name).toBe("project_management_test");

  fixture.admin = await register("Live Test Admin", "admin");
  fixture.manager = await register("Live Test Manager", "manager");
  fixture.employee = await register("Live Test Employee", "employee");
  fixture.outsider = await register("Live Test Outsider", "outsider");

  const adminOrg = await pool.query(
    "INSERT INTO organizations(name, owner_id) VALUES($1,$2) RETURNING id",
    [`Live test org ${suffix}`, fixture.admin.id]
  );
  console.log("Live setup: created role fixture accounts");
  const adminOrgId = adminOrg.rows[0].id;
  fixture.organizations.push(adminOrgId);
  await pool.query(
    "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3),($1,$4,$5),($1,$6,$7)",
    [adminOrgId, fixture.admin.id, "owner", fixture.manager.id, "manager", fixture.employee.id, "employee"]
  );
  const workspace = await pool.query(
    "INSERT INTO workspaces(name,owner_id,organization_id) VALUES($1,$2,$3) RETURNING id",
    [`Live test workspace ${suffix}`, fixture.admin.id, adminOrgId]
  );
  fixture.workspaceId = workspace.rows[0].id;
  fixture.workspaces.push(fixture.workspaceId);
  await pool.query(
    "INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'manager'),($1,$4,'employee')",
    [fixture.workspaceId, fixture.admin.id, fixture.manager.id, fixture.employee.id]
  );

  const outsiderOrg = await pool.query(
    "INSERT INTO organizations(name, owner_id) VALUES($1,$2) RETURNING id",
    [`Live outsider org ${suffix}`, fixture.outsider.id]
  );
  console.log("Live setup: created workspace and outsider organization");
  const outsiderOrgId = outsiderOrg.rows[0].id;
  fixture.organizations.push(outsiderOrgId);
  await pool.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')", [outsiderOrgId, fixture.outsider.id]);
  const outsiderWorkspace = await pool.query(
    "INSERT INTO workspaces(name,owner_id,organization_id) VALUES($1,$2,$3) RETURNING id",
    [`Live outsider workspace ${suffix}`, fixture.outsider.id, outsiderOrgId]
  );
  fixture.workspaces.push(outsiderWorkspace.rows[0].id);
  await pool.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner')", [outsiderWorkspace.rows[0].id, fixture.outsider.id]);
}, 120_000);

test.afterAll(async () => {
  if (!pool) return;
  if (fixture.workspaces.length) await pool.query("DELETE FROM workspaces WHERE id=ANY($1::bigint[])", [fixture.workspaces]);
  if (fixture.organizations.length) await pool.query("DELETE FROM organizations WHERE id=ANY($1::bigint[])", [fixture.organizations]);
  if (fixture.users.length) await pool.query("DELETE FROM users WHERE id=ANY($1::bigint[])", [fixture.users]);
  const fixtureUsers = await pool.query("SELECT count(*)::int AS count FROM users WHERE email=ANY($1::text[])", [fixture.emails]);
  expect(fixtureUsers.rows[0].count).toBe(0);
  await pool.end();
});

test("live Admin login creates project/task, assigns work, updates status, comments, and reads reports", async ({ page }) => {
  await login(page, fixture.admin);
  await expect(page.locator(".page-heading h1")).toHaveText("Admin dashboard");

  await page.goto("/projects");
  await page.getByPlaceholder("New project name").fill(`Live project ${suffix}`);
  const projectResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/workspaces/${fixture.workspaceId}/projects`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Add project" }).click();
  const projectResponse = await projectResponsePromise;
  expect(projectResponse.status()).toBe(201);
  const project = (await projectResponse.json()).project;
  const projectRow = await pool.query("SELECT name FROM projects WHERE id=$1 AND workspace_id=$2", [project.id, fixture.workspaceId]);
  expect(projectRow.rows[0].name).toBe(`Live project ${suffix}`);

  await page.goto("/tasks");
  await page.getByLabel("New task title").fill(`Live task ${suffix}`);
  await page.getByLabel("Project for new task").selectOption(String(project.id));
  const taskResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/workspaces/${fixture.workspaceId}/tasks`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create task" }).click();
  const taskResponse = await taskResponsePromise;
  expect(taskResponse.status()).toBe(201);
  const task = (await taskResponse.json()).task;
  fixture.taskId = task.id;
  let taskRow = await pool.query("SELECT title,assignee_id,status FROM tasks WHERE id=$1 AND workspace_id=$2", [task.id, fixture.workspaceId]);
  expect(taskRow.rows[0].title).toBe(`Live task ${suffix}`);

  await page.goto(`/tasks/${task.id}`);
  const assignmentResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/workspaces/${fixture.workspaceId}/tasks/${task.id}`) && response.request().method() === "PATCH");
  await page.getByLabel("Assignee").selectOption(String(fixture.employee.id));
  const assignmentResponse = await assignmentResponsePromise;
  expect(assignmentResponse.status()).toBe(200);
  await page.getByLabel("Status").selectOption("in_progress");
  await expect(page.getByLabel("Assignee")).toHaveValue(String(fixture.employee.id));
  taskRow = await pool.query("SELECT assignee_id,status FROM tasks WHERE id=$1", [task.id]);
  expect(String(taskRow.rows[0].assignee_id)).toBe(String(fixture.employee.id));
  expect(taskRow.rows[0].status).toBe("in_progress");

  await page.getByLabel("Task comment").fill(`Live comment ${suffix}`);
  const commentResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/tasks/${task.id}/comments`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  const commentResponse = await commentResponsePromise;
  expect(commentResponse.status()).toBe(201);
  const comments = await pool.query("SELECT body FROM task_comments WHERE task_id=$1", [task.id]);
  expect(comments.rows.some(({ body }) => body === `Live comment ${suffix}`)).toBe(true);

  await page.goto("/reports");
  await expect(page.locator(".page-heading h1")).toHaveText("Reports");
  const analytics = await page.request.get(`${apiBase}/organizations/${(await pool.query("SELECT organization_id FROM workspaces WHERE id=$1", [fixture.workspaceId])).rows[0].organization_id}/analytics`);
  expect(analytics.status()).toBe(200);
  const notifications = await pool.query("SELECT count(*)::int AS count FROM notifications WHERE workspace_id=$1 AND user_id=$2", [fixture.workspaceId, fixture.employee.id]);
  expect(notifications.rows[0].count).toBeGreaterThan(0);
});

test("live Manager can create a project while Employee and outsider are denied by API authorization", async ({ browser, baseURL }) => {
  const managerContext = await browser.newContext({ baseURL });
  const managerPage = await managerContext.newPage();
  await login(managerPage, fixture.manager);
  await expect(managerPage.locator(".page-heading h1")).toHaveText("Manager dashboard");
  await managerPage.goto("/projects");
  await managerPage.getByPlaceholder("New project name").fill(`Manager project ${suffix}`);
  const managerProjectPromise = managerPage.waitForResponse((response) => response.url().endsWith(`/workspaces/${fixture.workspaceId}/projects`) && response.request().method() === "POST");
  await managerPage.getByRole("button", { name: "Add project" }).click();
  const managerProjectResponse = await managerProjectPromise;
  expect(managerProjectResponse.status()).toBe(201);
  const managerProject = (await managerProjectResponse.json()).project;
  expect((await pool.query("SELECT name FROM projects WHERE id=$1", [managerProject.id])).rows[0].name).toBe(`Manager project ${suffix}`);
  await managerContext.close();

  const employeeContext = await browser.newContext({ baseURL });
  const employeePage = await employeeContext.newPage();
  await login(employeePage, fixture.employee);
  await expect(employeePage.locator(".page-heading h1")).toHaveText("Employee dashboard");
  await employeePage.goto("/inbox");
  await expect(employeePage.getByText(`You were assigned to task "Live task ${suffix}"`)).toBeVisible();
  await employeePage.goto("/tasks");
  await employeePage.getByLabel(`Status for Live task ${suffix}`).selectOption("completed");
  await expect.poll(async () => (await pool.query("SELECT status FROM tasks WHERE title=$1", [`Live task ${suffix}`])).rows[0]?.status).toBe("completed");
  await employeePage.goto(`/tasks/${fixture.taskId}`);
  await expect(employeePage.getByLabel("Assignee")).toBeDisabled();
  await employeePage.goto("/projects");
  await expect(employeePage.getByPlaceholder("New project name")).toHaveCount(0);
  const deniedCreate = await employeePage.request.post(`${apiBase}/workspaces/${fixture.workspaceId}/projects`, { data: { name: `Forbidden ${suffix}` } });
  expect(deniedCreate.status()).toBe(403);
  const inaccessibleWorkspace = await employeePage.request.get(`${apiBase}/workspaces/${fixture.outsider ? fixture.workspaces[1] : "0"}`);
  expect(inaccessibleWorkspace.status()).toBe(404);
  await employeeContext.close();

  const outsiderContext = await browser.newContext({ baseURL });
  const outsiderPage = await outsiderContext.newPage();
  await login(outsiderPage, fixture.outsider);
  const crossOrg = await outsiderPage.request.get(`${apiBase}/workspaces/${fixture.workspaceId}`);
  expect(crossOrg.status()).toBe(404);
  await outsiderContext.close();
  expect(baseURL).toBe("http://localhost:4173");
});
