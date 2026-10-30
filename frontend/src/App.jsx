import { useEffect, useMemo, useState } from "react";
import "./App.css";

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

function loadProjects() {
  try {
    const savedProjects = localStorage.getItem("projectflow-projects");

    if (!savedProjects) {
      return initialProjects;
    }

    const parsedProjects = JSON.parse(savedProjects);

    if (!Array.isArray(parsedProjects)) {
      return initialProjects;
    }

    // Fill in fields used by the UI so older saved project records remain compatible.
    return parsedProjects.map((project) => ({
      ...project,
      status: project.status === "In Progress" ? "In progress" : (project.status || "In progress"),
      description: project.description || "No description provided",
      owner: project.owner || "AR",
      ownerName: project.ownerName || "Avni Rajput",
      dueDate: project.dueDate || "Not set",
      progress: Number.isFinite(project.progress) ? project.progress : 0,
      color: project.color || "violet",
    }));
  } catch (error) {
    console.error("Failed to load saved projects:", error);
    return initialProjects;
  }
}

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

function parseTaskDate(value) {
  if (!value || value === "Not set") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : new Date(
    parsed.getFullYear(), parsed.getMonth(), parsed.getDate()
  );
}

function getTaskDueState(task) {
  if (task.status === "Completed") return "Completed";
  const dueDate = parseTaskDate(task.dueDate);
  if (!dueDate) return "No due date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate < today) return "Overdue";
  if (dueDate.getTime() === today.getTime()) return "Due today";
  return "Upcoming";
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [projects, setProjects] = useState(loadProjects);
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("projectflow-tasks");

      if (!savedTasks) {
        return initialTasks;
      }

      const parsedTasks = JSON.parse(savedTasks);

      if (!Array.isArray(parsedTasks)) {
        return initialTasks;
      }

      // Keep older saved task records compatible with the current UI.
      return parsedTasks.map((task, index) => ({
        ...task,
        id: task.id ?? index + 1,
        title: task.title || "Untitled task",
        project: task.project || "Unassigned project",
        priority: ["Low", "Medium", "High"].includes(task.priority)
          ? task.priority
          : "Medium",
        status: ["To do", "In progress", "Completed"].includes(task.status)
          ? task.status
          : "To do",
        dueDate: task.dueDate || "Not set",
        assignee: task.assignee || "AR",
      }));
    } catch (error) {
      console.error("Failed to load saved tasks:", error);
      return initialTasks;
    }
  });
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All projects");
  const [taskFilter, setTaskFilter] = useState("All tasks");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [dueDateFilter, setDueDateFilter] = useState("All due dates");
  const [sortTasksBy, setSortTasksBy] = useState("Due date");
  const [activity, setActivity] = useState(() => {
    try {
      const savedActivity = JSON.parse(localStorage.getItem("projectflow-activity") || "[]");
      return Array.isArray(savedActivity) ? savedActivity : [];
    } catch (error) {
      console.error("Failed to load activity:", error);
      return [];
    }
  });
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

 useEffect(() => {
  try {
    localStorage.setItem("projectflow-tasks", JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save tasks:", error);
  }
}, [tasks]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "In progress"),
    [projects]
  );
  const filteredDashboardProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.ownerName.toLowerCase().includes(query)
    );
  }, [activeProjects, search]);
  const completedProjects = projects.filter(
    (project) => project.status === "Completed"
  );
  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.ownerName.toLowerCase().includes(query);

      const matchesStatus =
        projectFilter === "All projects" ||
        project.status === projectFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, projectFilter]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const priorityRank = { High: 3, Medium: 2, Low: 1 };

    return tasks
      .filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          task.project.toLowerCase().includes(query);
        const matchesStatus =
          taskFilter === "All tasks" || task.status === taskFilter;
        const matchesPriority =
          priorityFilter === "All priorities" || task.priority === priorityFilter;
        const dueState = getTaskDueState(task);
        const matchesDueDate =
          dueDateFilter === "All due dates" ||
          (dueDateFilter === "Overdue only" && dueState === "Overdue") ||
          (dueDateFilter === "Due today" && dueState === "Due today") ||
          (dueDateFilter === "Upcoming" && dueState === "Upcoming") ||
          (dueDateFilter === "No due date" && dueState === "No due date");

        return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
      })
      .sort((a, b) => {
        if (sortTasksBy === "Priority") {
          return priorityRank[b.priority] - priorityRank[a.priority];
        }
        if (sortTasksBy === "Title") {
          return a.title.localeCompare(b.title);
        }
        const dateA = parseTaskDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const dateB = parseTaskDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
  }, [tasks, search, taskFilter, priorityFilter, dueDateFilter, sortTasksBy]);

  function addProject(event) {
    event.preventDefault();

    const name = newProjectName.trim();
    const description = newProjectDescription.trim();

    if (!name) {
      alert("Please enter a project name.");
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
      color: "violet",
    };

    setProjects((previousProjects) => [...previousProjects, newProject]);
    recordActivity(`Created project "${name}"`);
    setNewProjectName("");
    setNewProjectDescription("");
    setShowProjectForm(false);
  }

  function updateTaskStatus(taskId, nextStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (task && task.status !== nextStatus) {
      recordActivity(`Changed "${task.title}" status to ${nextStatus}`);
    }
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === taskId ? { ...item, status: nextStatus } : item
      )
    );
  }

  function updateTaskField(taskId, field, value) {
    const editableFields = ["priority", "dueDate"];

    if (!editableFields.includes(field)) {
      return;
    }

    const task = tasks.find((item) => item.id === taskId);
    if (task && task[field] !== value) {
      recordActivity(`Updated ${field === "priority" ? "priority" : "due date"} for "${task.title}"`);
    }
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === taskId ? { ...item, [field]: value } : item
      )
    );
  }

  function navigateTo(page) {
    setActivePage(page);
    setSearch("");
  }

  function renderDashboard() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">WORKSPACE OVERVIEW</div>
            <h1>Good work starts here.</h1>
            <p className="page-description">
              Keep projects moving, stay on top of tasks, and see what
              your team is working on.
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
            <span>＋</span> New project
          </button>
        </div>

        <div className="overview-grid">
          <article className="overview-card">
            <div className="overview-card-top">
              <span>Total projects</span>
              <span className="metric-icon">▤</span>
            </div>
            <div className="metric-value">{projects.length}</div>
            <div className="metric-note">Across your workspace</div>
          </article>

          <article className="overview-card">
            <div className="overview-card-top">
              <span>Active projects</span>
              <span className="metric-icon progress-icon">◷</span>
            </div>
            <div className="metric-value">{activeProjects.length}</div>
            <div className="metric-note">Currently inprogress</div>
          </article>

          <article className="overview-card">
            <div className="overview-card-top">
              <span>Tasks completed</span>
              <span className="metric-icon completed-icon">✓</span>
            </div>
            <div className="metric-value">
              {completedTasks.length}
              <span className="metric-total"> / {tasks.length}</span>
            </div>
            <div className="metric-note">Tasks markedcomplete</div>
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
                <strong>
                  {tasks.filter((task) => task.status === "To do").length}
                </strong>
              </div>
              <div className="task-summary-row">
                <span className="summary-dot progress-dot" />
                <span>In progress</span>
                <strong>
                  {tasks.filter((task) => task.status === "In progress").length}
                </strong>
              </div>
              <div className="task-summary-row">
                <span className="summary-dot complete-dot" />
                <span>Completed</span>
                <strong>{completedTasks.length}</strong>
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

        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Latest changes across your workspace.</p>
            </div>
          </div>
          {activity.length > 0 ? (
            <div className="task-summary">
              {activity.slice(0, 5).map((item) => (
                <div className="task-summary-row" key={item.id}>
                  <span className="summary-dot progress-dot" />
                  <span>{item.message}</span>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="metric-note">No activity yet. Task and project changes will appear here.</p>
          )}
        </section>

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
              Plan work, coordinate your team, and track project progress
              from one place.
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => setShowProjectForm((visible) => !visible)}
          >
            <span>＋</span> New project
          </button>
        </div>

        {showProjectForm && (
          <form className="content-panel project-form" onSubmit={addProject}>
            <div className="section-heading">
              <div>
                <h2>New project</h2>
                <p>Enter the initial details for yourproject.</p>
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
              />
            </label>

            <p className="form-note">
              Projects are saved in this browser. A backend API is not connected yet.
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
              <span className="metric-icon">▤</span>
            </div>
            <div className="metric-value">{projects.length}</div>
            <div className="metric-note">Across your workspace</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>In progress</span>
              <span className="metric-icon progress-icon">◷</span>
            </div>
            <div className="metric-value">{activeProjects.length}</div>
            <div className="metric-note">Currently being worked on</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>Completed</span>
              <span className="metric-icon completed-icon">✓</span>
            </div>
            <div className="metric-value">{completedProjects.length}</div>
            <div className="metric-note">Successfullyfinished</div>
          </article>
        </div>

        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>Your team's projects</h2>
              <p>
                Track ownership, deadlines, and progress across active
                and completed work.
              </p>
            </div>
            <span className="project-count">
              {filteredProjects.length} projects
            </span>
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
              <option>In progress</option>
              <option>Completed</option>
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
                        <span className="progress-number">
                          {project.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      <strong>No projects found</strong>
                      <p>Try another search or statusfilter.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setProjectFilter("All projects");
                        }}
                      >
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
              <span className="metric-icon">☷</span>
            </div>
            <div className="metric-value">{tasks.length}</div>
            <div className="metric-note">Tasks in this demo</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>In progress</span>
              <span className="metric-icon progress-icon">◷</span>
            </div>
            <div className="metric-value">
              {tasks.filter((task) => task.status === "In progress").length}
            </div>
            <div className="metric-note">Currently being worked on</div>
          </article>
          <article className="overview-card">
            <div className="overview-card-top">
              <span>Completed</span>
              <span className="metric-icon completed-icon">✓</span>
            </div>
            <div className="metric-value">{completedTasks.length}</div>
            <div className="metric-note">Marked as completed</div>
          </article>
        </div>

        <section className="content-panel">
          <div className="section-heading">
            <div>
              <h2>Task list</h2>
              <p>Filter, sort, and update task priorities, deadlines, and status.</p>
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
                aria-label="Search tasks"
              />
            </label>

            <select
              className="status-filter"
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value)}
              aria-label="Filter tasks by status"
            >
              <option>All tasks</option>
              <option>To do</option>
              <option>In progress</option>
              <option>Completed</option>
            </select>

            <select
              className="status-filter"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter tasks by priority"
            >
              <option>All priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select
              className="status-filter"
              value={dueDateFilter}
              onChange={(event) => setDueDateFilter(event.target.value)}
              aria-label="Filter tasks by due date"
            >
              <option>All due dates</option>
              <option>Overdue only</option>
              <option>Due today</option>
              <option>Upcoming</option>
              <option>No due date</option>
            </select>

            <select
              className="status-filter"
              value={sortTasksBy}
              onChange={(event) => setSortTasksBy(event.target.value)}
              aria-label="Sort tasks"
            >
              <option>Due date</option>
              <option>Priority</option>
              <option>Title</option>
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
                  >
                    {task.status === "Completed" ? "✓" : ""}
                  </span>
                  <div>
                    <strong
                      className={
                        task.status === "Completed" ?"task-done" : ""
                      }
                    >
                      {task.title}
                    </strong>
                    <span>{task.project}</span>
                    <small className={`task-due-state ${getTaskDueState(task).toLowerCase().replaceAll(" ", "-")}`}>
                      {getTaskDueState(task)}
                    </small>
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
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
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

                <select
                  className="task-status-select"
                  value={task.status}
                  onChange={(event) =>
                    updateTaskStatus(task.id, event.target.value)
                  }
                  aria-label={`Status for ${task.title}`}
                >
                  <option>To do</option>
                  <option>In progress</option>
                  <option>Completed</option>
                </select>
              </article>
            ))}

            {filteredTasks.length === 0 && (
              <div className="empty-state">
                <strong>No tasks found</strong>
                <p>Try changing your search or filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTaskFilter("All tasks");
                    setPriorityFilter("All priorities");
                    setDueDateFilter("All due dates");
                  }}
                >
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
            <span className="project-count">
              {teamMembers.length} members
            </span>
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
                  <strong>{index === 0 ? 1 : index === 1 ? 1 : 1}</strong>
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
            <span>Invitations and permissions are notimplemented.</span>
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
          <span className="switcher-arrow">⌄</span>
        </div>

        <div className="nav-label">MENU</div>

        <nav className="main-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-item ${
                activePage === item.label ? "active" : ""
              }`}
              onClick={() => navigateTo(item.label)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.label === "My Tasks" && (
                <span className="nav-count">{tasks.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-symbol">?</span>
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