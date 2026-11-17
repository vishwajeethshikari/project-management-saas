import { expect, test } from "@playwright/test";

const project = { id: 3, name: "Platform Refresh", description: "Ship the workspace redesign.", status: "in_progress", manager_name: "Riley Chen", task_count: 1, completed_task_count: 0, progress_percentage: 0, members: [{ user_id: 11, name: "Riley Chen", email: "riley@example.test", role: "manager" }] };
const task = { id: 4, project_id: 3, project_name: project.name, title: "Review onboarding", description: "Check the new account flow.", status: "todo", priority: "high", assignee_id: 11, assignee_name: "Riley Chen", due_date: "2026-11-20", start_date: "2026-11-18", created_at: "2026-11-16T12:00:00Z" };

async function installApiMocks(page) {
  let activeTimer = null;
  await page.route("http://localhost:5000/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api", "");
    const role = new URL(page.url()).searchParams.get("role") || "owner";
    const team = { id: 5, name: "Product", description: "Product delivery team", manager_id: 11 };
    let body = { success: true };
    let status = 200;

    if (path === "/auth/me" && route.request().method() === "GET" && new URL(page.url()).searchParams.has("signedOut")) { status = 401; body = { success: false, message: "Please sign in" }; }
    else if (path === "/auth/me" && route.request().method() === "GET") body = { success: true, user: { id: 11, name: "Riley Chen", email: "riley@example.test" } };
    else if (path === "/auth/me" && route.request().method() === "PATCH") body = { success: true, user: { id: 11, name: route.request().postDataJSON().name, email: "riley@example.test" } };
    else if (path === "/organizations") body = { success: true, organizations: [{ id: 1, name: "Northstar", role: role === "owner" ? "owner" : "employee" }] };
    else if (path === "/workspaces") body = { success: true, workspaces: [{ id: 2, organization_id: 1, name: "Product Studio", role }] };
    else if (path === "/organizations/1/members") body = { success: true, members: [{ id: 11, name: "Riley Chen", email: "riley@example.test", role }] };
    else if (path === "/organizations/1/invitations") body = { success: true, invitations: [] };
    else if (path === "/organizations/1/analytics" || path === "/workspaces/2/analytics") body = { success: true, metrics: { task_count: 1, completion_rate: 0, on_time_completion_rate: 0, overdue_tasks: 0 }, trends: [{ month: "2026-11-01", completed_tasks: 0 }], workload: [], projects: [] };
    else if (path === "/workspaces/2/projects" && route.request().method() === "GET") body = { success: true, projects: [project] };
    else if (path === "/workspaces/2/projects/3") body = { success: true, project };
    else if (path === "/workspaces/2/projects" && route.request().method() === "POST") body = { success: true, project: { id: 6, name: route.request().postDataJSON().name, status: "in_progress" } };
    else if (path === "/workspaces/2/projects/6/tasks") body = { success: true, tasks: [] };
    else if (path === "/workspaces/2/projects/3/tasks") body = { success: true, tasks: [task] };
    else if (path === "/workspaces/2/projects/3/milestones" || path === "/workspaces/2/projects/3/timeline") body = { success: true, tasks: [task], milestones: [] };
    else if (path === "/workspaces/2/projects/3/members") body = { success: true, members: project.members };
    else if (path === "/workspaces/2/projects/3/analytics") body = { success: true, metrics: { task_count: 1, completion_rate: 0, overdue_tasks: 0 }, trends: [], workload: [], projects: [] };
    else if (path === "/workspaces/2/dashboard") body = { success: true, dashboard: { project_count: 1, active_projects: 1, completed_projects: 0, task_count: 1, completed_tasks: 0, user_count: 1, overdue_tasks: 0, todo_tasks: 1 } };
    else if (path === "/workspaces/2/workload") body = { success: true, workload: [{ assignee_id: 11, assignee_name: "Riley Chen", task_count: 1, overdue_tasks: 0, upcoming_tasks: 1, tracked_seconds: 0 }] };
    else if (path === "/workspaces/2/my-work") body = { success: true, myWork: { tasks: [task], overdue: [], dueToday: [], upcoming: [task], stats: { total: 1, overdue: 0, dueToday: 0, upcoming: 1 } } };
    else if (path === "/workspaces/2/teams" && route.request().method() === "GET") body = { success: true, teams: [team] };
    else if (path === "/workspaces/2/teams" && route.request().method() === "POST") body = { success: true, team: { id: 6, ...route.request().postDataJSON() } };
    else if (path === "/workspaces/2/teams/5") body = { success: true, team };
    else if (path === "/workspaces/2/teams/5/members") body = { success: true, members: [{ id: 11, name: "Riley Chen", email: "riley@example.test", role: "manager" }] };
    else if (path === "/workspaces/2/teams/6/members") body = { success: true, members: [{ id: 11, name: "Riley Chen", email: "riley@example.test", role: "manager" }] };
    else if (path === "/workspaces/2/teams/5/productivity") body = { success: true, productivity: [{ user_id: 11, name: "Riley Chen", task_count: 1, completed_tasks: 0, tracked_seconds: 0 }] };
    else if (path === "/workspaces/2/members") body = { success: true, members: [{ id: 11, name: "Riley Chen", email: "riley@example.test", role }] };
    else if (path === "/workspaces/2/notifications") body = { success: true, notifications: [{ id: 7, message: "A task is ready for review", is_read: false, created_at: "2026-11-16T12:00:00Z" }] };
    else if (path === "/workspaces/2/notification-preferences") body = { success: true, preferences: { assignment_enabled: true, mention_enabled: true, due_date_enabled: true } };
    else if (path === "/workspaces/2/activity") body = { success: true, activity: [] };
    else if (path === "/workspaces/2/tasks" && route.request().method() === "GET") body = { success: true, tasks: [task] };
    else if (path === "/workspaces/2/tasks" && route.request().method() === "POST") body = { success: true, task: { ...task, id: 99, title: route.request().postDataJSON().title } };
    else if (path.startsWith("/workspaces/2/tasks/") && route.request().method() === "PATCH") body = { success: true, task: { ...task, ...route.request().postDataJSON(), id: 4 } };
    else if (path === "/workspaces/2/tasks/4") body = { success: true, task };
    else if (path === "/workspaces/2/tasks/4/subtasks") body = { success: true, subtasks: [] };
    else if (path === "/workspaces/2/tasks/4/comments") body = { success: true, comments: [] };
    else if (path === "/workspaces/2/tasks/4/attachments") body = { success: true, attachments: [] };
    else if (path === "/workspaces/2/tasks/4/time-entries") body = { success: true, entries: [], summary: { total_seconds: 0 } };
    else if (path === "/workspaces/2/time-entries/active") body = { success: true, activeTimers: activeTimer ? [activeTimer] : [] };
    else if (path === "/workspaces/2/time-entries/start" && route.request().method() === "POST") { activeTimer = { task_id: task.id, task_title: task.title }; body = { success: true, active: activeTimer }; }
    else if (/\/tasks\/\d+\/time-entries\/\d+\/stop$/.test(path) && route.request().method() === "POST") { activeTimer = null; body = { success: true }; }
    else if (path === "/workspaces/2/time-reports") body = { success: true, daily: [], weekly: [], projects: [] };
    else if (path === "/workspaces/2/search") body = { success: true, results: { projects: [project], tasks: [task], members: [] } };
    else if (route.request().method() === "DELETE") { status = 204; body = undefined; }
    await route.fulfill({ status, contentType: "application/json", body: body === undefined ? undefined : JSON.stringify(body) });
  });
}

test.beforeEach(async ({ page }) => installApiMocks(page));

test("all application routes load directly with protected, API-backed content", async ({ page }) => {
  const cases = [
    ["/dashboard", "dashboard", /dashboard/i], ["/inbox", "inbox", /inbox/i], ["/my-work", "my-work", /your day/i],
    ["/projects", "projects", /projects/i], ["/projects/3", "project-detail", /project details/i], ["/tasks", "tasks", /my tasks/i],
    ["/tasks/4", "task-detail", /task details/i], ["/board", "board", /kanban board/i], ["/teams", "teams", /teams/i],
    ["/teams/5", "team-detail", /team details/i], ["/members", "members", /members/i], ["/calendar", "calendar", /calendar/i],
    ["/timeline", "timeline", /project timeline/i], ["/reports", "reports", /reports/i], ["/time", "time", /time tracking/i],
    ["/settings", "settings", /settings/i], ["/profile", "profile", /my profile/i],
  ];
  for (const [path, pageKey, title] of cases) {
    await page.goto(path);
    await expect(page.locator(`[data-page="${pageKey}"]`)).toBeVisible();
    await expect(page.locator(".page-heading h1")).toContainText(title);
  }
});

test("navigation uses browser history and the unknown route has a recovery action", async ({ page }) => {
  await page.goto("/dashboard");
  await page.locator('aside button[title="Inbox"]').click();
  await expect(page).toHaveURL(/\/inbox$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goForward();
  await expect(page.locator(".page-heading h1")).toContainText("Inbox");
  await page.goto("/missing-page");
  await expect(page.locator(".not-found-panel")).toBeVisible();
  await page.getByRole("button", { name: "Go to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("protected routes return to authentication when there is no session", async ({ page }) => {
  await page.goto("/tasks?signedOut=1");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.locator("[data-page='tasks']")).toHaveCount(0);
});

test("task creation and profile update submit through the existing APIs", async ({ page }) => {
  const writes = [];
  page.on("request", (request) => {
    if (["POST", "PATCH"].includes(request.method()) && request.url().includes("localhost:5000/api/")) writes.push({ url: request.url(), method: request.method(), body: request.postDataJSON() });
  });
  await page.goto("/tasks");
  await page.getByRole("textbox", { name: "New task title" }).fill("Prepare launch checklist");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByRole("button", { name: "Prepare launch checklist" })).toBeVisible();
  await page.goto("/profile");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Riley Chen Updated");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  expect(writes.some((write) => write.method === "POST" && write.url.endsWith("/workspaces/2/tasks"))).toBe(true);
  expect(writes.some((write) => write.method === "PATCH" && write.url.endsWith("/auth/me"))).toBe(true);
});

test("project and team create forms call their existing APIs", async ({ page }) => {
  const writes = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("localhost:5000/api/")) writes.push(request.url());
  });
  await page.goto("/projects");
  await page.getByPlaceholder("New project name").fill("Customer Portal");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("button", { name: "Customer Portal" })).toBeVisible();
  await page.goto("/teams");
  await page.getByRole("textbox", { name: "Team name" }).fill("Design Systems");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page.getByRole("button", { name: /Design Systems/ })).toBeVisible();
  expect(writes.some((url) => url.endsWith("/workspaces/2/projects"))).toBe(true);
  expect(writes.some((url) => url.endsWith("/workspaces/2/teams"))).toBe(true);
});

test("inbox actions and time tracking use their workspace APIs", async ({ page }) => {
  await page.goto("/inbox");
  await expect(page.getByText("A task is ready for review")).toBeVisible();
  await page.getByRole("button", { name: /Delete notification/ }).click();
  await expect(page.getByText("A task is ready for review")).toHaveCount(0);
  await page.goto("/time");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".active-timer-card")).toContainText("Review onboarding");
  await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
});

test("employee dashboard and responsive shell render without horizontal overflow", async ({ page }) => {
  await page.goto("/dashboard?role=employee");
  await expect(page.locator(".dashboard-role-panel h2")).toHaveText("Your workload");
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("every route stays within the viewport at the requested desktop, tablet, and mobile sizes", async ({ page }) => {
  const routes = ["/dashboard", "/inbox", "/my-work", "/projects", "/projects/3", "/tasks", "/tasks/4", "/board", "/teams", "/teams/5", "/members", "/calendar", "/timeline", "/reports", "/time", "/settings", "/profile"];
  const viewports = [
    { width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1024, height: 768 },
    { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 },
  ];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator(".page-heading h1")).toBeVisible();
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= window.innerWidth,
        viewport: `${window.innerWidth}/${document.documentElement.clientWidth}/${document.documentElement.scrollWidth}`,
        shell: [...document.querySelectorAll(".app-shell, .sidebar, .main-content, .topbar, .breadcrumb, .topbar-actions")].map((element) => `${element.className}:${Math.round(element.getBoundingClientRect().x)}-${Math.round(element.getBoundingClientRect().right)}:${Math.round(element.scrollWidth)}`).join(" | "),
        style: (() => { const e = document.querySelector(".sidebar"); const s = getComputedStyle(e); return `sidebar-style:${s.width}/${s.minWidth}/${s.flex}/${s.flexShrink};media:${matchMedia("(max-width: 768px)").matches}`; })(),
        overflow: [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 8).map((element) => `${element.tagName.toLowerCase()}.${String(element.className).replaceAll(" ", ".")}:${Math.round(element.getBoundingClientRect().right)}`),
      }));
      if (!dimensions.fits) await page.screenshot({ path: `test-results/overflow-${route.slice(1).replaceAll("/", "-")}-${viewport.width}x${viewport.height}.png`, fullPage: true });
      expect(dimensions.fits, `${route} overflows at ${viewport.width}x${viewport.height}; viewport ${dimensions.viewport}; ${dimensions.shell}; ${dimensions.style}; ${dimensions.overflow.join(", ")}`).toBe(true);
    }
  }
});

test("application routes have no browser console errors or failed API requests", async ({ page }) => {
  const consoleErrors = [];
  const failedRequests = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  for (const route of ["/dashboard", "/inbox", "/projects", "/projects/3", "/tasks", "/tasks/4", "/board", "/teams", "/teams/5", "/members", "/calendar", "/reports", "/time", "/settings", "/profile"]) {
    await page.goto(route);
    await expect(page.locator(".page-heading h1")).toBeVisible();
  }
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("manager receives the manager dashboard", async ({ page }) => {
  await page.goto("/dashboard?role=manager");
  await expect(page.locator(".page-heading h1")).toHaveText("Manager dashboard");
  await expect(page.locator(".dashboard-role-panel h2")).toHaveText("Team workload");
});
