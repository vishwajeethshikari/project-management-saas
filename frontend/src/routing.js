const staticRoutes = {
  "/": { key: "dashboard", title: "Dashboard", nav: "dashboard" },
  "/dashboard": { key: "dashboard", title: "Dashboard", nav: "dashboard" },
  "/inbox": { key: "inbox", title: "Inbox", nav: "inbox" },
  "/my-work": { key: "my-work", title: "My Work", nav: "my-work" },
  "/projects": { key: "projects", title: "Projects", nav: "projects" },
  "/tasks": { key: "tasks", title: "My Tasks", nav: "tasks" },
  "/timeline": { key: "timeline", title: "Project Timeline", nav: "timeline" },
  "/board": { key: "board", title: "Kanban Board", nav: "board" },
  "/teams": { key: "teams", title: "Teams", nav: "teams" },
  "/members": { key: "members", title: "Members", nav: "members" },
  "/calendar": { key: "calendar", title: "Calendar", nav: "calendar" },
  "/reports": { key: "reports", title: "Reports", nav: "reports" },
  "/time": { key: "time", title: "Time Tracking", nav: "time" },
  "/settings": { key: "settings", title: "Settings", nav: "settings" },
  "/profile": { key: "profile", title: "My Profile", nav: "profile" },
};

export function resolveRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (staticRoutes[path]) return { ...staticRoutes[path], path };
  const project = path.match(/^\/projects\/([^/]+)$/);
  if (project) return { key: "project-detail", title: "Project Details", nav: "projects", id: project[1], path };
  const team = path.match(/^\/teams\/([^/]+)$/);
  if (team) return { key: "team-detail", title: "Team Details", nav: "teams", id: team[1], path };
  const task = path.match(/^\/tasks\/([^/]+)$/);
  if (task) return { key: "task-detail", title: "Task Details", nav: "tasks", id: task[1], path };
  return { key: "not-found", title: "Page not found", nav: "", path };
}

export const appRoutes = Object.values(staticRoutes).filter((route, index, routes) =>
  routes.findIndex((candidate) => candidate.key === route.key) === index && route.key !== "dashboard"
);
