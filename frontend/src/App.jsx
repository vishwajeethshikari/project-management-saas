import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEYS = {
  projects: "projectflow-projects",
  tasks: "projectflow-tasks",
};

const initialProjects = [
  {
    id: 1,
    name: "Website Redesign",
    description: "Improve the website experience and navigation.",
    status: "In progress",
    owner: "AR",
    ownerName: "Avni Rajput",
    dueDate: "Oct 28, 2026",
    progress: 65,
    color: "violet",
  },
  {
    id: 2,
    name: "Mobile App",
    description: "Build a better mobile experience for customers.",
    status: "In progress",
    owner: "SK",
    ownerName: "Simran Kapoor",
    dueDate: "Nov 12, 2026",
    progress: 35,
    color: "blue",
  },
  {
    id: 3,
    name: "Marketing Campaign",
    description: "Coordinate campaign content and launch activities.",
    status: "Completed",
    owner: "RM",
    ownerName: "Rohan Mehta",
    dueDate: "Oct 10, 2026",
    progress: 100,
    color: "orange",
  },
];

const initialTasks = [
  {
    id: 1,
    title: "Finalize homepage layout",
    project: "Website Redesign",
    priority: "High",
    status: "In progress",
    dueDate: "Oct 25, 2026",
    assignee: "AR",
  },
  {
    id: 2,
    title: "Review mobile wireframes",
    project: "Mobile App",
    priority: "Medium",
    status: "To do",
    dueDate: "Oct 27, 2026",
    assignee: "SK",
  },
  {
    id: 3,
    title: "Prepare campaign assets",
    project: "Marketing Campaign",
    priority: "Low",
    status: "Completed",
    dueDate: "Oct 10, 2026",
    assignee: "RM",
  },
  {
    id: 4,
    title: "Test responsive navigation",
    project: "Website Redesign",
    priority: "Medium",
    status: "To do",
    dueDate: "Oct 26, 2026",
    assignee: "AR",
  },
];

const teamMembers = [
  { initials: "AR", name: "Avni Rajput", role: "Frontend Developer" },
  { initials: "SK", name: "Simran Kapoor", role: "UI/UX Designer" },
  { initials: "RM", name: "Rohan Mehta", role: "Project Coordinator" },
];

const navigation = [
  { label: "Dashboard", icon: "▦" },
  { label: "Projects", icon: "▤" },
  { label: "My Tasks", icon: "☷" },
  { label: "Team", icon: "♧" },
];

const projectStatuses = ["In progress", "Completed"];
const taskStatuses = ["To do", "In progress", "Completed"];
const priorities = ["Low", "Medium", "High"];
const projectColors = ["violet", "blue", "orange"];

function readStorage(key, fallback) {
  try {
    const savedValue = localStorage.getItem(key);
    if (!savedValue) return fallback;

    const parsedValue = JSON.parse(savedValue);
    return Array.isArray(parsedValue) ? parsedValue : fallback;
  } catch (error) {
    console.error(`Failed to read ${key} from local storage:`, error);
    return fallback;
  }
}

function normalizeProject(project, index) {
  const progress = Number(project.progress);
  const status =
    project.status === "In Progress" ? "In progress" : project.status;

  return {
    ...project,
    id: project.id ?? index + 1,
    name: project.name || "Untitled project",
    description: project.description || "No description provided",
    status: projectStatuses.includes(status) ? status : "In progress",
    owner: project.owner || "AR",
    ownerName: project.ownerName || "Avni Rajput",
    dueDate: project.dueDate || "Not set",
    progress: Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : 0,
    color: projectColors.includes(project.color) ? project.color : "violet",
  };
}

function normalizeTask(task, index) {
  return {
    ...task,
    id: task.id ?? index + 1,
    title: task.title || "Untitled task",
    project: task.project || "Unassigned project",
    priority: priorities.includes(task.priority) ? task.priority : "Medium",
    status: taskStatuses.includes(task.status) ? task.status : "To do",
    dueDate: task.dueDate || "Not set",
    assignee: task.assignee || "AR",
  };
}

function loadProjects() {
  return readStorage(STORAGE_KEYS.projects, initialProjects).map(
    normalizeProject
  );
}

function loadTasks() {
  return readStorage(STORAGE_KEYS.tasks, initialTasks).map(normalizeTask);
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [projects, setProjects] = useState(loadProjects);
  const [tasks, setTasks] = useState(loadTasks);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All projects");
  const [taskFilter, setTaskFilter] = useState("All tasks");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
    } catch (error) {
      console.error("Failed to save projects:", error);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
    } catch (error) {
      console.error("Failed to save tasks:", error);
    }
  }, [tasks]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "In progress"),
    [projects]
  );

  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === "Completed"),
    [projects]
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "Completed"),
    [tasks]
  );

  const taskCounts = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === "To do").length,
      inProgress: tasks.filter((task) => task.status === "In progress").length,
      completed: completedTasks.length,
      total: tasks.length,
    }),
    [tasks, completedTasks.length]
  );

  const completionPercentage =
    taskCounts.total === 0
      ? 0
      : Math.round((taskCounts.completed / taskCounts.total) * 100);

  const filteredDashboardProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.ownerName.toLowerCase().includes(query)
    );
  }, [activeProjects, search]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.ownerName.toLowerCase().includes(query);

      const matchesStatus =
        projectFilter === "All projects" || project.status === projectFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, projectFilter]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        task.project.toLowerCase().includes(query);

      const matchesStatus =
        taskFilter === "All tasks" || task.status === taskFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, taskFilter]);

  function navigateTo(page) {
    setActivePage(page);
    setSearch("");
  }

  function addProject(event) {
    event.preventDefault();

    const name = newProjectName.trim();
    const description = newProjectDescription.trim();

    if (!name) {
      window.alert("Please enter a project name.");
      return;
    }

    const newProject = {
      id: Date.now(),
      name,
      description: description || "No description provided",
      status: "In progress",
      owner: "AR",
      ownerName: "Avni Rajput",
      dueDate: "Not set",
      progress: 0,
      color: projectColors[projects.length % projectColors.length],
    };

    setProjects((currentProjects) => [...currentProjects, newProject]);
    setNewProjectName("");
    setNewProjectDescription("");
    setShowProjectForm(false);
  }

  function updateTaskStatus(taskId, nextStatus) {
    if (!taskStatuses.includes(nextStatus)) return;

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task
      )
    );
  }

  function updateTaskField(taskId, field, value) {
    if (field === "priority" && !priorities.includes(value)) return;
    if (!["priority", "dueDate"].includes(field)) return;

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    );
  }

  function clearProjectFilters() {
    setSearch("");
    setProjectFilter("All projects");
  }

  function clearTaskFilters() {
    setSearch("");
    setTaskFilter("All tasks");
  }

  function renderDashboard() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">WORKSPACE OVERVIEW</div>
            <h1>Good work starts here.</h1>
            <p className="page-description">
              Keep projects moving, stay on top of tasks, and see what your
              team is working on.
            </p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setActivePage("Projects");
              setShowProjectForm(true);
            }}
          >
            <span aria-hidden="true">＋</span> New project
          </button>
        </div>

        <div className="overview-grid">
          <article className="overview-card">
            <div className="overview-card-top">
              <span>Total projects</span>
              <span className="metric-icon" aria-hidden="true">▤</span>
            </div>
            <div className="metric-value">{projects.length}</div>
            <div className="metric-note">Across your workspace</div>
          </article>

          <article className="overview-card">
            <div className="overview-card-top">
              <span>Active projects</span>
              <span className="metric-icon progress-icon" aria-hidden="true">◷</span>
            </div>
            <div className="metric-value">{activeProjects.length}</div>
            <div className="metric-note">Currently in progress</div>
          </article>

          <article className="overview-card">
            <div className="overview-card-top">
              <span>Tasks completed</span>
              <span className="metric-icon completed-icon" aria-hidden="true">✓</span>
            </div>
            <div className="metric-value">
              {taskCounts.completed}
              <span className="metric-total"> / {taskCounts.total}</span>
            </div>
            <div className="metric-note">{completionPercentage}% of all tasks</div>
          </article>
        </div>

        <div className="dashboard-grid">
          <section className="content-panel">
            <div className="section-heading">
              <div>
                <h2>Projects in progress</h2>
                <p>A quick look at your team's current work.</p>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => navigateTo("Projects")}
              >
                View all →
              </button>
            </div>

            <div className="project-toolbar">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Search active projects..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search active projects"
                />
              </label>
            </div>

            <div className="dashboard-project-list">
              {filteredDashboardProjects.map((project) => (
                <article className="dashboard-project" key={project.id}>
                  <span className={`project-marker ${project.color}`} />
                  <div className="dashboard-project-info">
                    <strong>{project.name}</strong>
                    <span>{project.dueDate}</span>
                  </div>
                  <div className="dashboard-progress">
                    <div className="progress-track">
                      <span
                        className={`progress-fill ${project.color}`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span>{project.progress}%</span>
                  </div>
                </article>
              ))}
              {filteredDashboardProjects.length === 0 && (
                <div className="empty-state">
                  <strong>No active projects found</strong>
                  <p>Try another project name, description, or owner.</p>
                  <button type="button" onClick={() => setSearch("")}>
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="content-panel activity-panel">
            <div className="section-heading">
              <div>
                <h2>Task overview</h2>
                <p>Work that needs attention.</p>
              </div>
            </div>

            <div className="task-summary">
              <div className="task-summary-row">
                <span className="summary-dot todo-dot" />
                <span>To do</span>
                <strong>{taskCounts.todo}</strong>
              </div>
              <div className="task-summary-row">
                <span className="summary-dot progress-dot" />
                <span>In progress</span>
                <strong>{taskCounts.inProgress}</strong>
              </div>
              <div className="task-summary-row">
                <span className="summary-dot complete-dot" />
                <span>Completed</span>
                <strong>{taskCounts.completed}</strong>
              </div>
            </div>

            <div className="completion-summary">
              <div className="completion-summary-label">
                <span>Overall completion</span>
                <strong>{completionPercentage}%</strong>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Overall task completion"
                aria-valuenow={completionPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  className="progress-fill violet"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <button
              className="secondary-button full-width"
              type="button"
              onClick={() => navigateTo("My Tasks")}
            >
              Open my tasks
            </button>
          </section>
        </div>

        <section className="content-panel team-panel">
          <div className="section-heading">
            <div>
              <h2>Who's on the team</h2>
              <p>People coordinating work in this demo workspace.</p>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => navigateTo("Team")}
            >
              View team →
            </button>
          </div>

          <div className="team-preview">
            {teamMembers.map((member) => (
              <div className="team-member" key={member.initials}>
                <span className="owner-avatar">{member.initials}</span>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderProjects() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">PROJECT MANAGEMENT</div>
            <h1>Projects</h1>
            <p className="page-description">
              Plan work, coordinate your team, and track project progress from
              one place.
            </p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowProjectForm((visible) => !visible)}
          >
            <span aria-hidden="true">＋</span> New project
          </button>
        </div>

        {showProjectForm && (
          <form className="content-panel project-form" onSubmit={addProject}>
            <div className="section-heading">
              <div>
                <h2>New project</h2>
                <p>Enter the initial details for your project.</p>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => setShowProjectForm(false)}
              >
                Cancel
              </button>
            </div>

            <label className="form-field">
              Project name
              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="e.g. Customer Portal"
                required
                maxLength={100}
              />
            </label>

            <label className="form-field">
              Description
              <textarea
                value={newProjectDescription}
                onChange={(event) =>
                  setNewProjectDescription(event.target.value)
                }
                placeholder="What is this project about?"
                rows={3}
                maxLength={500}
              />
            </label>

            <p className="form-note">
              Projects are saved in this browser. A backend API is not
              connected yet.
            </p>
            <button className="primary-button" type="submit">
              Save project details
            </button>
          </form>
        )}

        <div className="overview-grid">
          <article className="overview-card">
            <div className="overview-card-top">
              <span>Total projects</span>
              <span className="metric-icon" aria-hidden="true">▤</span>
            </div>
            <div className="metric-value">{projects.length}</div>
            <div className="metric-note">Across your workspace</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>In progress</span>
              <span className="metric-icon progress-icon" aria-hidden="true">◷</span>
            </div>
            <div className="metric-value">{activeProjects.length}</div>
            <div className="metric-note">Currently being worked on</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>Completed</span>
              <span className="metric-icon completed-icon" aria-hidden="true">✓</span>
            </div>
            <div className="metric-value">{completedProjects.length}</div>
            <div className="metric-note">Successfully finished</div>
          </article>
        </div>

        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>Your team's projects</h2>
              <p>
                Track ownership, deadlines, and progress across active and
                completed work.
              </p>
            </div>
            <span className="project-count">{filteredProjects.length} projects</span>
          </div>

          <div className="project-toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search projects..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search projects"
              />
            </label>
            <select
              className="status-filter"
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              aria-label="Filter projects by status"
            >
              <option>All projects</option>
              {projectStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="project-table-wrap">
            <table className="project-table">
              <thead>
                <tr>
                  <th>PROJECT</th>
                  <th>STATUS</th>
                  <th>OWNER</th>
                  <th>DUE DATE</th>
                  <th>PROGRESS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="project-name-cell">
                        <span className={`project-marker ${project.color}`} />
                        <div>
                          <strong>{project.name}</strong>
                          <p>{project.description}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          project.status === "Completed"
                            ? "status-completed"
                            : "status-progress"
                        }`}
                      >
                        <span className="status-dot" />
                        {project.status}
                      </span>
                    </td>
                    <td>
                      <div className="owner-cell">
                        <span className="owner-avatar">{project.owner}</span>
                        <span>{project.ownerName}</span>
                      </div>
                    </td>
                    <td className="due-date">{project.dueDate}</td>
                    <td>
                      <div className="progress-cell">
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-label={`${project.name} progress`}
                          aria-valuenow={project.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span
                            className={`progress-fill ${project.color}`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="progress-number">{project.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      <strong>No projects found</strong>
                      <p>Try another search or status filter.</p>
                      <button type="button" onClick={clearProjectFilters}>
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              Showing {filteredProjects.length} of {projects.length} projects
            </span>
            <span>Browser storage · Backend not connected</span>
          </div>
        </section>
      </>
    );
  }

  function renderTasks() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">WORK ORGANIZATION</div>
            <h1>My Tasks</h1>
            <p className="page-description">
              Keep track of assignments, priorities, and deadlines.
            </p>
          </div>
        </div>

        <div className="overview-grid">
          <article className="overview-card">
            <div className="overview-card-top">
              <span>All tasks</span>
              <span className="metric-icon" aria-hidden="true">☷</span>
            </div>
            <div className="metric-value">{taskCounts.total}</div>
            <div className="metric-note">Tasks in this demo</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>In progress</span>
              <span className="metric-icon progress-icon" aria-hidden="true">◷</span>
            </div>
            <div className="metric-value">{taskCounts.inProgress}</div>
            <div className="metric-note">Currently being worked on</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>Completed</span>
              <span className="metric-icon completed-icon" aria-hidden="true">✓</span>
            </div>
            <div className="metric-value">{taskCounts.completed}</div>
            <div className="metric-note">{completionPercentage}% completion</div>
          </article>
        </div>

        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>Task list</h2>
              <p>Update task status, priority, and due dates.</p>
            </div>
            <span className="project-count">{filteredTasks.length} tasks</span>
          </div>

          <div className="project-toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search tasks or projects..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search tasks or projects"
              />
            </label>
            <select
              className="status-filter"
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value)}
              aria-label="Filter tasks by status"
            >
              <option>All tasks</option>
              {taskStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="task-list">
            {filteredTasks.map((task) => (
              <article className="task-row" key={task.id}>
                <div className="task-main">
                  <span
                    className={`task-check ${
                      task.status === "Completed" ? "checked" : ""
                    }`}
                    aria-label={
                      task.status === "Completed" ? "Task completed" : "Task not completed"
                    }
                  >
                    {task.status === "Completed" ? "✓" : ""}
                  </span>
                  <div>
                    <strong className={task.status === "Completed" ? "task-done" : ""}>
                      {task.title}
                    </strong>
                    <span>{task.project}</span>
                  </div>
                </div>

                <label className="task-edit-field">
                  <span className="visually-hidden">Priority for {task.title}</span>
                  <select
                    className={`priority-pill priority-${task.priority.toLowerCase()}`}
                    value={task.priority}
                    onChange={(event) =>
                      updateTaskField(task.id, "priority", event.target.value)
                    }
                    aria-label={`Priority for ${task.title}`}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="task-edit-field">
                  <span className="visually-hidden">Due date for {task.title}</span>
                  <input
                    className="due-date task-due-date-input"
                    type="text"
                    value={task.dueDate}
                    onChange={(event) =>
                      updateTaskField(task.id, "dueDate", event.target.value)
                    }
                    placeholder="e.g. Oct 30, 2026"
                    aria-label={`Due date for ${task.title}`}
                  />
                </label>

                <label className="task-edit-field">
                  <span className="visually-hidden">Status for {task.title}</span>
                  <select
                    className="task-status-select"
                    value={task.status}
                    onChange={(event) =>
                      updateTaskStatus(task.id, event.target.value)
                    }
                    aria-label={`Status for ${task.title}`}
                  >
                    {taskStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))}

            {filteredTasks.length === 0 && (
              <div className="empty-state">
                <strong>No tasks found</strong>
                <p>Try changing your search or filter.</p>
                <button type="button" onClick={clearTaskFilters}>
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <div className="table-footer">
            <span>Task updates are saved in this browser.</span>
            <span>Backend not connected</span>
          </div>
        </section>
      </>
    );
  }

  function renderTeam() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">COLLABORATION</div>
            <h1>Team</h1>
            <p className="page-description">
              See who is coordinating work across your projects.
            </p>
          </div>
        </div>

        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>Workspace members</h2>
              <p>Demo members and their current responsibilities.</p>
            </div>
            <span className="project-count">{teamMembers.length} members</span>
          </div>

          <div className="team-list">
            {teamMembers.map((member, index) => (
              <article className="team-list-row" key={member.initials}>
                <span className={`team-avatar team-color-${index}`}>
                  {member.initials}
                </span>
                <div className="team-person">
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
                <div className="team-assignment">
                  <span>Assigned projects</span>
                  <strong>
                    {
                      projects.filter((project) => project.owner === member.initials)
                        .length
                    }
                  </strong>
                </div>
                <span className="status-pill status-progress">
                  <span className="status-dot" />
                  Active
                </span>
              </article>
            ))}
          </div>
          <div className="table-footer">
            <span>Member information is sample data.</span>
            <span>Invitations and permissions are not implemented.</span>
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">p</div>
          <span>projectflow</span>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">W</span>
          <span className="workspace-info">
            <strong>Team workspace</strong>
            <small>Project management</small>
          </span>
          <span className="switcher-arrow" aria-hidden="true">⌄</span>
        </div>

        <div className="nav-label">MENU</div>
        <nav className="main-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-item ${activePage === item.label ? "active" : ""}`}
              onClick={() => navigateTo(item.label)}
              aria-current={activePage === item.label ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === "My Tasks" && (
                <span className="nav-count">{tasks.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-symbol" aria-hidden="true">?</span>
            <div>
              <strong>Need a hand?</strong>
              <small>Help and documentation</small>
            </div>
          </div>
          <div className="profile">
            <div className="profile-avatar">AR</div>
            <div className="profile-info">
              <strong>Avni Rajput</strong>
              <small>Frontend Developer</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-label">DEMO WORKSPACE</span>
            <div className="topbar-avatar">AR</div>
          </div>
        </header>

        <section className="page-container">
          {activePage === "Dashboard" && renderDashboard()}
          {activePage === "Projects" && renderProjects()}
          {activePage === "My Tasks" && renderTasks()}
          {activePage === "Team" && renderTeam()}

          <footer className="page-footer">
            <span>ProjectFlow</span>
            <span>Organize work. Move forward together.</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
