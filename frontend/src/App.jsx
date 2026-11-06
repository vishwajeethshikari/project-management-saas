
import React, { useMemo, useState } from "react";

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
  fontFamily: "Arial, sans-serif",
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
            ? { ...task, ...taskForm, projectId: Number(taskForm.projectId) }
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
      {/* HEADER */}
      <header
        style={{
          background: "white",
          padding: "18px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h2 style={{ color: "#7656d6", margin: 0 }}>
          FlowBoard
        </h2>

        <nav style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["Dashboard", "Projects", "My Tasks"].map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              style={{
                ...buttonStyle,
                background: page === item ? "#7656d6" : "#eee9ff",
                color: page === item ? "white" : "#7656d6",
              }}
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ padding: "30px", maxWidth: "1400px", margin: "auto" }}>
        {/* DASHBOARD */}
        {page === "Dashboard" && (
          <section>
            <h1>Dashboard</h1>
            <p>Welcome to your project management workspace.</p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "20px",
                marginTop: "25px",
              }}
            >
              {[
                ["Total Projects", projects.length],
                ["Total Tasks", tasks.length],
                ["To Do", todoTasks],
                ["In Progress", inProgressTasks],
                ["Completed", completedTasks],
              ].map(([label, value]) => (
                <div key={label} style={cardStyle}>
                  <p style={{ color: "#777" }}>{label}</p>
                  <h2 style={{ color: "#7656d6", marginBottom: 0 }}>
                    {value}
                  </h2>
                </div>
              ))}
            </div>

            <h2 style={{ marginTop: "35px" }}>Recent Projects</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
              }}
            >
              {projects.slice(0, 3).map((project) => (
                <div key={project.id} style={cardStyle}>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <button
                    style={buttonStyle}
                    onClick={() => openProject(project.id)}
                  >
                    View Project
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECT LIST */}
        {page === "Projects" && (
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "15px",
              }}
            >
              <h1>My Projects</h1>
              <button
                style={buttonStyle}
                onClick={() => setShowProjectForm(true)}
              >
                + Create Project
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {projects.map((project) => (
                <div key={project.id} style={cardStyle}>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <p>
                    <strong>Manager:</strong> {project.manager || "Not assigned"}
                  </p>
                  <p>
                    <strong>Deadline:</strong> {project.deadline || "Not set"}
                  </p>
                  <button
                    style={buttonStyle}
                    onClick={() => openProject(project.id)}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECT DETAILS */}
        {page === "Project Details" && activeProject && (
          <section>
            <button
              style={{ ...buttonStyle, marginBottom: "20px" }}
              onClick={() => setPage("Projects")}
            >
              ← Back to Projects
            </button>

            <h1>{activeProject.name}</h1>
            <p>{activeProject.description}</p>
            <p>
              <strong>Deadline:</strong> {activeProject.deadline || "Not set"}
            </p>

            <div style={{ marginTop: "25px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "15px",
                }}
              >
                <h2>Project Tasks</h2>
                <button style={buttonStyle} onClick={openCreateTask}>
                  + Add Task
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "15px",
                  marginTop: "20px",
                }}
              >
                {statuses.map((status) => (
                  <div
                    key={status}
                    style={{
                      background: "#ebe7f8",
                      borderRadius: "12px",
                      padding: "15px",
                      minHeight: "250px",
                    }}
                  >
                    <h3>
                      {status} (
                      {
                        projectTasks.filter(
                          (task) => task.status === status
                        ).length
                      }
                      )
                    </h3>

                    {projectTasks
                      .filter((task) => task.status === status)
                      .map((task) => (
                        <div
                          key={task.id}
                          style={{
                            ...cardStyle,
                            marginBottom: "12px",
                            cursor: "pointer",
                          }}
                          onClick={() => openEditTask(task)}
                        >
                          <strong>{task.title}</strong>
                          <p>Assigned to: {task.assignee || "Unassigned"}</p>
                          <p>Priority: {task.priority}</p>
                          <p>Due: {task.dueDate || "Not set"}</p>
                          <small style={{ color: "#7656d6" }}>
                            Click to edit
                          </small>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* MY TASKS */}
        {page === "My Tasks" && (
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "15px",
              }}
            >
              <h1>My Tasks</h1>
              <button style={buttonStyle} onClick={openCreateTask}>
                + Create Task
              </button>
            </div>

            <div
              style={{
                ...cardStyle,
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
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

            <div style={{ ...cardStyle, overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "650px",
                }}
              >
                <thead>
                  <tr>
                    {["Task", "Project", "Assignee", "Priority", "Due Date", "Status", "Action"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{
                            textAlign: "left",
                            padding: "12px",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredTasks.map((task) => {
                    const project = projects.find(
                      (item) => item.id === task.projectId
                    );

                    return (
                      <tr key={task.id}>
                        <td style={cellStyle}>{task.title}</td>
                        <td style={cellStyle}>{project?.name || "Unknown"}</td>
                        <td style={cellStyle}>{task.assignee || "Unassigned"}</td>
                        <td style={cellStyle}>{task.priority}</td>
                        <td style={cellStyle}>{task.dueDate || "Not set"}</td>
                        <td style={cellStyle}>{task.status}</td>
                        <td style={cellStyle}>
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
                      <td colSpan="7" style={cellStyle}>
                        No tasks found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TASK FORM */}
        {showTaskForm && (
          <div style={overlayStyle}>
            <form onSubmit={saveTask} style={modalStyle}>
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

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
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

        {/* PROJECT FORM */}
        {showProjectForm && (
          <div style={overlayStyle}>
            <form onSubmit={createProject} style={modalStyle}>
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
                  setProjectForm({ ...projectForm, deadline: e.target.value })
                }
              />

              <label>Project Manager</label>
              <input
                style={inputStyle}
                value={projectForm.manager}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, manager: e.target.value })
                }
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
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