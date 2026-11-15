import React, { useMemo, useState } from "react";
import "./App.css";

const initialProjects = [
  {
    id: 1,
    name: "Website Redesign",
    description: "Improve the website design and user experience.",
    deadline: "2026-11-20",
    manager: "Alex",
  },
  {
    id: 2,
    name: "Mobile App Development",
    description: "Develop a mobile application for customers.",
    deadline: "2026-12-10",
    manager: "Sarah",
  },
];

const initialTasks = [
  {
    id: 1,
    title: "Design homepage",
    projectId: 1,
    assignee: "Alex",
    status: "To Do",
    priority: "High",
    dueDate: "2026-11-10",
  },
  {
    id: 2,
    title: "Create navigation bar",
    projectId: 1,
    assignee: "Sarah",
    status: "In Progress",
    priority: "Medium",
    dueDate: "2026-11-12",
  },
  {
    id: 3,
    title: "Test responsive layout",
    projectId: 2,
    assignee: "John",
    status: "Completed",
    priority: "Low",
    dueDate: "2026-11-05",
  },
];

const statuses = ["To Do", "In Progress", "Completed"];

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f3ff",
  color: "#25213b",
  fontFamily: "Inter, sans-serif",
};

const buttonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
  background: "#7656d6",
  color: "white",
  fontWeight: "600",
};

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
};

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedProject, setSelectedProject] = useState(1);
  const [editingTask, setEditingTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [taskForm, setTaskForm] = useState({
    title: "",
    projectId: 1,
    assignee: "",
    status: "To Do",
    priority: "Medium",
    dueDate: "",
  });

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    deadline: "",
    manager: "",
  });

  const activeProject = projects.find(
    (project) => project.id === selectedProject
  );

  const projectTasks = tasks.filter(
    (task) => task.projectId === selectedProject
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const todoTasks = tasks.filter(
    (task) => task.status === "To Do"
  ).length;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesProject =
        projectFilter === "All" ||
        task.projectId === Number(projectFilter);

      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [tasks, search, projectFilter, statusFilter]);

  function openCreateTask() {
    setEditingTask(null);
    setTaskForm({
      title: "",
      projectId: selectedProject,
      assignee: "",
      status: "To Do",
      priority: "Medium",
      dueDate: "",
    });
    setShowTaskForm(true);
  }

  function openEditTask(task) {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      projectId: task.projectId,
      assignee: task.assignee,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    });
    setShowTaskForm(true);
  }

  function saveTask(e) {
    e.preventDefault();

    if (!taskForm.title.trim()) return;

    if (editingTask) {
      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                ...taskForm,
                projectId: Number(taskForm.projectId),
              }
            : task
        )
      );
    } else {
      const newTask = {
        id: Date.now(),
        ...taskForm,
        projectId: Number(taskForm.projectId),
      };

      setTasks((previousTasks) => [...previousTasks, newTask]);
    }

    setShowTaskForm(false);
    setEditingTask(null);
  }

  function deleteTask(id) {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setTasks((previousTasks) =>
        previousTasks.filter((task) => task.id !== id)
      );

      setShowTaskForm(false);
    }
  }

  function updateTaskStatus(taskId, newStatus) {
    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  }

  function createProject(e) {
    e.preventDefault();

    if (!projectForm.name.trim()) return;

    const newProject = {
      id: Date.now(),
      ...projectForm,
    };

    setProjects((previousProjects) => [
      ...previousProjects,
      newProject,
    ]);

    setSelectedProject(newProject.id);

    setProjectForm({
      name: "",
      description: "",
      deadline: "",
      manager: "",
    });

    setShowProjectForm(false);
  }

  function openProject(projectId) {
    setSelectedProject(projectId);
    setPage("Project Details");
  }

  return (
    <div style={pageStyle}>
      <div className="app-container">
        <aside className="sidebar">
          <div className="logo">
            <span>✦</span> FlowBoard
          </div>

          <p className="sidebar-label">WORKSPACE</p>

          <nav>
            <button
              className={page === "Dashboard" ? "nav-item active" : "nav-item"}
              onClick={() => setPage("Dashboard")}
            >
              <span>▦</span> Dashboard
            </button>

            <button
              className={page === "Projects" ? "nav-item active" : "nav-item"}
              onClick={() => setPage("Projects")}
            >
              <span>▤</span> My Projects
            </button>

            <button
              className={page === "My Tasks" ? "nav-item active" : "nav-item"}
              onClick={() => setPage("My Tasks")}
            >
              <span>☷</span> My Tasks
            </button>
          </nav>

          <div className="sidebar-bottom">
            <div className="profile-avatar">KS</div>
            <div>
              <strong>Workspace User</strong>
              <small>Team Member</small>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div>
              <span className="breadcrumb">Workspace /</span>
              <strong>{page}</strong>
            </div>
            <div className="topbar-right">
              <span className="notification-icon">♧</span>
              <div className="topbar-avatar">KS</div>
            </div>
          </header>

          {page === "Dashboard" && (
            <section className="dashboard">
              <div className="dashboard-hero">
                <div className="hero-content">
                  <span className="hero-label">WORKSPACE OVERVIEW</span>
                  <h1>Good to see you! 👋</h1>
                  <p>
                    Here's what's happening across your projects. Stay focused
                    and keep moving forward.
                  </p>
                  <button
                    className="hero-button"
                    onClick={() => setPage("Projects")}
                  >
                    Explore Projects <span>→</span>
                  </button>
                </div>

                <div className="hero-decoration">
                  <div className="hero-orbit orbit-one"></div>
                  <div className="hero-orbit orbit-two"></div>
                  <div className="hero-glass-card">
                    <span>✦</span>
                    <strong>{completedTasks}</strong>
                    <small>Tasks completed</small>
                  </div>
                </div>
              </div>

              <div className="dashboard-heading">
                <div>
                  <span className="section-eyebrow">YOUR WORKSPACE</span>
                  <h2>Overview</h2>
                  <p>A quick snapshot of your team's progress.</p>
                </div>

                <button
                  className="dashboard-add-button"
                  onClick={openCreateTask}
                >
                  + New Task
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card stat-purple">
                  <div className="stat-top">
                    <span>Total Projects</span>
                    <span className="stat-icon">▦</span>
                  </div>
                  <h2>{projects.length}</h2>
                  <p>Projects in your workspace</p>
                  <div className="stat-bottom-line"></div>
                </div>

                <div className="stat-card stat-blue">
                  <div className="stat-top">
                    <span>Total Tasks</span>
                    <span className="stat-icon">☷</span>
                  </div>
                  <h2>{tasks.length}</h2>
                  <p>Tasks across all projects</p>
                  <div className="stat-bottom-line"></div>
                </div>

                <div className="stat-card stat-orange">
                  <div className="stat-top">
                    <span>In Progress</span>
                    <span className="stat-icon">◷</span>
                  </div>
                  <h2>{inProgressTasks}</h2>
                  <p>Tasks currently underway</p>
                  <div className="stat-bottom-line"></div>
                </div>

                <div className="stat-card stat-green">
                  <div className="stat-top">
                    <span>Completed</span>
                    <span className="stat-icon">✓</span>
                  </div>
                  <h2>{completedTasks}</h2>
                  <p>Tasks successfully finished</p>
                  <div className="stat-bottom-line"></div>
                </div>
              </div>

              <div className="dashboard-content-grid">
                <div className="dashboard-panel projects-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent Projects</h3>
                      <p>Keep track of your active work.</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setPage("Projects")}
                    >
                      View all →
                    </button>
                  </div>

                  <div className="dashboard-project-list">
                    {projects.slice(0, 4).map((project, index) => {
                      const relatedTasks = tasks.filter(
                        (task) => task.projectId === project.id
                      );

                      const finishedTasks = relatedTasks.filter(
                        (task) => task.status === "Completed"
                      ).length;

                      const progress = relatedTasks.length
                        ? Math.round(
                            (finishedTasks / relatedTasks.length) * 100
                          )
                        : 0;

                      const projectColors = [
                        "project-purple",
                        "project-blue",
                        "project-orange",
                        "project-green",
                      ];

                      return (
                        <div
                          className="dashboard-project-row"
                          key={project.id}
                        >
                          <div
                            className={`project-symbol ${
                              projectColors[index % 4]
                            }`}
                          >
                            {project.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="project-row-info">
                            <div className="project-row-title">
                              <strong>{project.name}</strong>
                              <span>{relatedTasks.length} tasks</span>
                            </div>

                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>

                            <div className="progress-caption">
                              <span>{progress}% completed</span>
                              <span>
                                {finishedTasks}/{relatedTasks.length} tasks
                              </span>
                            </div>
                          </div>

                          <button
                            className="project-open-button"
                            onClick={() => openProject(project.id)}
                            aria-label={`Open ${project.name}`}
                          >
                            →
                          </button>
                        </div>
                      );
                    })}

                    {projects.length === 0 && (
                      <div className="dashboard-empty">
                        No projects yet. Create your first project!
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-panel task-overview-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Task Overview</h3>
                      <p>Current task distribution.</p>
                    </div>
                    <span className="overview-icon">◉</span>
                  </div>

                  <div className="task-overview-total">
                    <strong>{tasks.length}</strong>
                    <span>Total tasks</span>
                  </div>

                  <div className="task-breakdown">
                    <div className="task-breakdown-item">
                      <div className="breakdown-label">
                        <span>
                          <i className="dot dot-todo"></i> To Do
                        </span>
                        <strong>{todoTasks}</strong>
                      </div>
                      <div className="breakdown-track">
                        <div
                          className="breakdown-fill fill-todo"
                          style={{
                            width: `${
                              tasks.length
                                ? (todoTasks / tasks.length) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="task-breakdown-item">
                      <div className="breakdown-label">
                        <span>
                          <i className="dot dot-progress"></i> In Progress
                        </span>
                        <strong>{inProgressTasks}</strong>
                      </div>
                      <div className="breakdown-track">
                        <div
                          className="breakdown-fill fill-progress"
                          style={{
                            width: `${
                              tasks.length
                                ? (inProgressTasks / tasks.length) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="task-breakdown-item">
                      <div className="breakdown-label">
                        <span>
                          <i className="dot dot-completed"></i> Completed
                        </span>
                        <strong>{completedTasks}</strong>
                      </div>
                      <div className="breakdown-track">
                        <div
                          className="breakdown-fill fill-completed"
                          style={{
                            width: `${
                              tasks.length
                                ? (completedTasks / tasks.length) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="overview-link"
                    onClick={() => setPage("My Tasks")}
                  >
                    Manage all tasks →
                  </button>
                </div>
              </div>

              <div className="dashboard-panel recent-tasks-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Tasks</h3>
                    <p>Take a look at your latest tasks.</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setPage("My Tasks")}
                  >
                    View all →
                  </button>
                </div>

                <div className="recent-task-list">
                  {tasks.slice(0, 5).map((task) => {
                    const relatedProject = projects.find(
                      (project) => project.id === task.projectId
                    );

                    return (
                      <div className="recent-task-row" key={task.id}>
                        <div
                          className={`task-status-indicator ${
                            task.status === "Completed"
                              ? "indicator-completed"
                              : task.status === "In Progress"
                              ? "indicator-progress"
                              : "indicator-todo"
                          }`}
                        ></div>

                        <div className="recent-task-info">
                          <strong>{task.title}</strong>
                          <span>
                            {relatedProject?.name || "Unknown project"}
                          </span>
                        </div>

                        <span
                          className={`priority-tag priority-${(
                            task.priority || "medium"
                          ).toLowerCase()}`}
                        >
                          {task.priority}
                        </span>

                        <span
                          className={`task-status-tag ${
                            task.status === "Completed"
                              ? "tag-completed"
                              : task.status === "In Progress"
                              ? "tag-progress"
                              : "tag-todo"
                          }`}
                        >
                          {task.status}
                        </span>

                        <button
                          className="task-edit-button"
                          onClick={() => openEditTask(task)}
                        >
                          Edit
                        </button>
                      </div>
                    );
                  })}

                  {tasks.length === 0 && (
                    <div className="dashboard-empty">
                      No tasks available yet.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {page === "Projects" && (
            <section>
              <div className="page-heading">
                <div>
                  <h1>My Projects</h1>
                  <p>Manage and track all your projects.</p>
                </div>
                <button
                  style={buttonStyle}
                  onClick={() => setShowProjectForm(true)}
                >
                  + Create Project
                </button>
              </div>

              <div className="projects-grid">
                {projects.map((project) => {
                  const relatedTasks = tasks.filter(
                    (task) => task.projectId === project.id
                  );

                  const completed = relatedTasks.filter(
                    (task) => task.status === "Completed"
                  ).length;

                  const progress = relatedTasks.length
                    ? Math.round((completed / relatedTasks.length) * 100)
                    : 0;

                  return (
                    <div key={project.id} className="project-card">
                      <div className="project-card-top">
                        <div className="project-symbol project-purple">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="project-card-menu">•••</span>
                      </div>

                      <h3>{project.name}</h3>
                      <p>{project.description}</p>

                      <div className="project-card-meta">
                        <span>Manager: {project.manager || "Not assigned"}</span>
                        <span>Deadline: {project.deadline || "Not set"}</span>
                      </div>

                      <div className="project-card-progress">
                        <div className="progress-caption">
                          <span>Progress</span>
                          <strong>{progress}%</strong>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      <button
                        className="project-card-button"
                        onClick={() => openProject(project.id)}
                      >
                        View Project →
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {page === "Project Details" && activeProject && (
            <section>
              <button
                style={{ ...buttonStyle, marginBottom: "20px" }}
                onClick={() => setPage("Projects")}
              >
                ← Back to Projects
              </button>

              <div className="page-heading">
                <div>
                  <h1>{activeProject.name}</h1>
                  <p>{activeProject.description}</p>
                </div>
                <button style={buttonStyle} onClick={openCreateTask}>
                  + Add Task
                </button>
              </div>

              <div className="project-details-meta">
                <span>
                  <strong>Manager:</strong>{" "}
                  {activeProject.manager || "Not assigned"}
                </span>
                <span>
                  <strong>Deadline:</strong>{" "}
                  {activeProject.deadline || "Not set"}
                </span>
                <span>
                  <strong>Total Tasks:</strong> {projectTasks.length}
                </span>
              </div>

              <div className="kanban-board">
                {statuses.map((status) => (
                  <div className="kanban-column" key={status}>
                    <div className="kanban-column-heading">
                      <h3>{status}</h3>
                      <span>
                        {
                          projectTasks.filter(
                            (task) => task.status === status
                          ).length
                        }
                      </span>
                    </div>

                    {projectTasks
                      .filter((task) => task.status === status)
                      .map((task) => (
                        <div
                          className="kanban-task-card"
                          key={task.id}
                          onClick={() => openEditTask(task)}
                        >
                          <div className="kanban-task-top">
                            <span
                              className={`priority-tag priority-${(
                                task.priority || "medium"
                              ).toLowerCase()}`}
                            >
                              {task.priority}
                            </span>
                            <span className="kanban-task-menu">•••</span>
                          </div>

                          <h4>{task.title}</h4>
                          <p>{task.assignee || "Unassigned"}</p>
                          <small>Due: {task.dueDate || "Not set"}</small>

                          <select
                            className="kanban-status-select"
                            value={task.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateTaskStatus(task.id, e.target.value)
                            }
                          >
                            {statuses.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}

                    {projectTasks.filter(
                      (task) => task.status === status
                    ).length === 0 && (
                      <div className="kanban-empty">No tasks here yet</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {page === "My Tasks" && (
            <section>
              <div className="page-heading">
                <div>
                  <h1>My Tasks</h1>
                  <p>View, search and manage your tasks.</p>
                </div>
                <button style={buttonStyle} onClick={openCreateTask}>
                  + Create Task
                </button>
              </div>

              <div className="task-filters">
                <input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={inputStyle}
                />

                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="All">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="All">All Statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tasks-table-wrapper">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      {[
                        "Task",
                        "Project",
                        "Assignee",
                        "Priority",
                        "Due Date",
                        "Status",
                        "Action",
                      ].map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTasks.map((task) => {
                      const project = projects.find(
                        (item) => item.id === task.projectId
                      );

                      return (
                        <tr key={task.id}>
                          <td>{task.title}</td>
                          <td>{project?.name || "Unknown"}</td>
                          <td>{task.assignee || "Unassigned"}</td>
                          <td>{task.priority}</td>
                          <td>{task.dueDate || "Not set"}</td>
                          <td>{task.status}</td>
                          <td>
                            <button
                              style={buttonStyle}
                              onClick={() => openEditTask(task)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTasks.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-table">
                          No tasks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {showTaskForm && (
            <div className="modal-overlay">
              <form onSubmit={saveTask} className="modal">
                <h2>{editingTask ? "Edit Task" : "Create Task"}</h2>

                <label>Task Title</label>
                <input
                  style={inputStyle}
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  required
                />

                <label>Project</label>
                <select
                  style={inputStyle}
                  value={taskForm.projectId}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, projectId: e.target.value })
                  }
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <label>Assignee</label>
                <input
                  style={inputStyle}
                  value={taskForm.assignee}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, assignee: e.target.value })
                  }
                  placeholder="Enter assignee name"
                />

                <label>Status</label>
                <select
                  style={inputStyle}
                  value={taskForm.status}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, status: e.target.value })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <label>Priority</label>
                <select
                  style={inputStyle}
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, priority: e.target.value })
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>

                <label>Due Date</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, dueDate: e.target.value })
                  }
                />

                <div className="modal-actions">
                  <button type="submit" style={buttonStyle}>
                    Save Task
                  </button>

                  {editingTask && (
                    <button
                      type="button"
                      style={{ ...buttonStyle, background: "#dc3545" }}
                      onClick={() => deleteTask(editingTask.id)}
                    >
                      Delete
                    </button>
                  )}

                  <button
                    type="button"
                    style={{ ...buttonStyle, background: "#777" }}
                    onClick={() => setShowTaskForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {showProjectForm && (
            <div className="modal-overlay">
              <form onSubmit={createProject} className="modal">
                <h2>Create Project</h2>

                <label>Project Name</label>
                <input
                  style={inputStyle}
                  value={projectForm.name}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, name: e.target.value })
                  }
                  required
                />

                <label>Description</label>
                <textarea
                  style={inputStyle}
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      description: e.target.value,
                    })
                  }
                />

                <label>Deadline</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={projectForm.deadline}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      deadline: e.target.value,
                    })
                  }
                />

                <label>Project Manager</label>
                <input
                  style={inputStyle}
                  value={projectForm.manager}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      manager: e.target.value,
                    })
                  }
                />

                <div className="modal-actions">
                  <button type="submit" style={buttonStyle}>
                    Create Project
                  </button>

                  <button
                    type="button"
                    style={{ ...buttonStyle, background: "#777" }}
                    onClick={() => setShowProjectForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "11px",
  border: "1px solid #ddd",
  borderRadius: "7px",
  margin: "8px 0 16px",
  background: "white",
};

const cellStyle = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "1px solid #eee",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(25, 20, 40, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  zIndex: 10,
};

const modalStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "14px",
  width: "100%",
  maxWidth: "480px",
  maxHeight: "90vh",
  overflowY: "auto",
};