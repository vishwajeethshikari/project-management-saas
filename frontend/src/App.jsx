import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { apiRequest, getToken } from "./api";

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await apiRequest(`/auth/${mode}`, {
        method: "POST",
        body: mode === "register" ? { name, email, password } : { email, password },
      });
      if (mode === "register") {
        setMode("login");
        setPassword("");
        setError("Account created. Sign in to continue.");
        return;
      }
      localStorage.setItem("projectflow-token", result.token);
      localStorage.setItem("projectflow-user", JSON.stringify(result.user));
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="content-panel auth-card" onSubmit={submit}>
        <div className="brand"><div className="brand-mark">p</div><span>projectflow</span></div>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        {mode === "register" && (
          <label className="form-field">Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        )}
        <label className="form-field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="form-field">Password<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-width" type="submit">{mode === "login" ? "Sign in" : "Create account"}</button>
        <button className="text-button" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create an account" : "Already have an account?"}
        </button>
      </form>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("projectflow-user")); } catch { return null; }
  });
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [search, setSearch] = useState("");
  const [projectName, setProjectName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState("");

  async function loadWorkspace(id) {
    setWorkspaceId(id);
    const [workspaceProjects, analytics] = await Promise.all([
      apiRequest(`/workspaces/${id}/projects`),
      apiRequest(`/workspaces/${id}/dashboard`),
    ]);
    setProjects(workspaceProjects.projects);
    setDashboard(analytics.dashboard);
    const firstProject = workspaceProjects.projects[0];
    setSelectedProjectId(firstProject?.id ?? null);
    if (firstProject) await refreshTasks(firstProject.id, id);
  }

  async function refreshTasks(projectId = selectedProjectId, id = workspaceId) {
    if (!id || !projectId) {
      setTasks([]);
      return;
    }
    const result = await apiRequest(`/workspaces/${id}/projects/${projectId}/tasks?search=${encodeURIComponent(search)}`);
    setTasks(result.tasks);
  }

  async function initialize() {
    setError("");
    try {
      const me = await apiRequest("/auth/me");
      setUser(me.user);
      localStorage.setItem("projectflow-user", JSON.stringify(me.user));
      const result = await apiRequest("/workspaces");
      setWorkspaces(result.workspaces);
      if (result.workspaces[0]) await loadWorkspace(result.workspaces[0].id);
    } catch (requestError) {
      localStorage.removeItem("projectflow-token");
      localStorage.removeItem("projectflow-user");
      setUser(null);
      setError(requestError.message);
    }
  }

  useEffect(() => {
    if (getToken()) queueMicrotask(initialize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createWorkspace() {
    const name = window.prompt("Workspace name");
    if (!name?.trim()) return;
    try {
      const result = await apiRequest("/workspaces", { method: "POST", body: { name: name.trim() } });
      setWorkspaces((current) => [...current, { ...result.workspace, role: "owner" }]);
      await loadWorkspace(result.workspace.id);
    } catch (requestError) { setError(requestError.message); }
  }

  async function createProject(event) {
    event.preventEvent?.();
    event.preventDefault();
    if (!projectName.trim()) return;
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/projects`, {
        method: "POST", body: { name: projectName.trim() },
      });
      setProjects((current) => [result.project, ...current]);
      setSelectedProjectId(result.project.id);
      setProjectName("");
    } catch (requestError) { setError(requestError.message); }
  }

  async function createTask(event) {
    event.preventDefault();
    if (!taskTitle.trim() || !selectedProjectId) return;
    try {
      await apiRequest(`/workspaces/${workspaceId}/tasks`, {
        method: "POST", body: { projectId: selectedProjectId, title: taskTitle.trim() },
      });
      setTaskTitle("");
      await refreshTasks(selectedProjectId);
    } catch (requestError) { setError(requestError.message); }
  }

  async function updateTask(task, status) {
    await apiRequest(`/workspaces/${workspaceId}/tasks/${task.id}`, { method: "PATCH", body: { status } });
    await refreshTasks(selectedProjectId);
  }

  function logout() {
    localStorage.removeItem("projectflow-token");
    localStorage.removeItem("projectflow-user");
    setUser(null);
  }

  const completion = useMemo(() => {
    if (!dashboard?.task_count) return 0;
    return Math.round((dashboard.completed_tasks / dashboard.task_count) * 100);
  }, [dashboard]);

  if (!user || !getToken()) return <AuthScreen onAuthenticated={setUser} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">p</div><span>projectflow</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <select className="status-filter" value={workspaceId || ""} onChange={(e) => loadWorkspace(e.target.value)}>
          {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
        </select>
        <button className="text-button" onClick={createWorkspace}>＋ New workspace</button>
        <div className="sidebar-bottom">
          <div className="profile"><div className="profile-avatar">{user.name?.[0]}</div><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
          <button className="text-button" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><strong>Workspace dashboard</strong></div></header>
        <section className="page-container">
          <div className="page-heading"><div><div className="eyebrow">WORKSPACE OVERVIEW</div><h1>Good work starts here.</h1></div></div>
          {error && <p className="form-error">{error}</p>}
          <div className="overview-grid">
            <article className="overview-card"><span>Total projects</span><div className="metric-value">{dashboard?.project_count ?? 0}</div></article>
            <article className="overview-card"><span>Active tasks</span><div className="metric-value">{dashboard ? dashboard.task_count - dashboard.completed_tasks : 0}</div></article>
            <article className="overview-card"><span>Completion</span><div className="metric-value">{completion}%</div></article>
          </div>
          <section className="content-panel">
            <div className="section-heading"><div><h2>Projects</h2></div></div>
            <form className="project-toolbar" onSubmit={createProject}>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="New project name" />
              <button className="primary-button" type="submit">Add project</button>
            </form>
            <div className="project-toolbar">
              {projects.map((project) => (
                <button key={project.id} className={`secondary-button ${Number(selectedProjectId) === Number(project.id) ? "active" : ""}`} onClick={() => {
                  setSelectedProjectId(project.id);
                  refreshTasks(project.id);
                }}>
                  {project.name}
                </button>
              ))}
            </div>
          </section>
          <section className="content-panel">
            <div className="section-heading"><h2>Tasks</h2></div>
            <input
              className="search-box"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                queueMicrotask(() => refreshTasks(selectedProjectId));
              }}
              placeholder="Search tasks..."
            />
            <form className="project-toolbar" onSubmit={createTask}>
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="New task title" />
              <button className="primary-button" type="submit" disabled={!selectedProjectId}>Add task</button>
            </form>
            <div className="task-list">
              {tasks.map((task) => (
                <article className="task-row" key={task.id}>
                  <strong>{task.title}</strong>
                  <span className={`priority-pill priority-${task.priority}`}>{task.priority}</span>
                  <select value={task.status} onChange={(e) => updateTask(task, e.target.value)}>
                    <option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
                  </select>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
