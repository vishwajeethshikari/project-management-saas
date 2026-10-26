// src/App.jsx
import React, { useState } from 'react';
import './App.css';

export default function App() {
  // Active sidebar button state
  const [activeNav, setActiveNav] = useState('Dashboard');

  // Modal open/close state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tasks state (Interactive!)
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Design system components & color tokens',
      project: 'Website Redesign',
      due: 'Today, 4:00 PM',
      color: 'purple-dot',
      completed: false,
    },
    {
      id: 2,
      title: 'Fix authentication API token refresh',
      project: 'Mobile App Launch',
      due: 'Tomorrow, 11:00 AM',
      color: 'pink-dot',
      completed: false,
    },
    {
      id: 3,
      title: 'Finalize Q3 analytics dashboard report',
      project: 'Marketing Portal',
      due: 'Completed',
      color: 'blue-dot',
      completed: true,
    },
  ]);

  // Form input states for creating a new task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProject, setTaskProject] = useState('Website Redesign');
  const [taskDue, setTaskDue] = useState('Today, 6:00 PM');

  // Dynamic Calculations for your 3 colorful Stat Cards
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const inProgressTasks = totalTasks - completedTasks;

  // Function to add a new task from the modal
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    // Pick dot color based on project
    const dotColor =
      taskProject === 'Website Redesign'
        ? 'purple-dot'
        : taskProject === 'Mobile App Launch'
        ? 'pink-dot'
        : 'blue-dot';

    const newTask = {
      id: Date.now(),
      title: taskTitle,
      project: taskProject,
      due: taskDue,
      color: dotColor,
      completed: false,
    };

    setTasks([newTask, ...tasks]);
    setTaskTitle('');
    setIsModalOpen(false);
  };

  // Function to toggle task completed status when clicked
  const toggleTaskStatus = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="dashboard">
      {/* Vibrant Dark Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">TaskFlow</h2>
        <nav>
          {['Dashboard', 'My Projects', 'Kanban Board', 'My To-Do List'].map(
            (item) => (
              <button
                key={item}
                className={`nav-item ${activeNav === item ? 'active' : ''}`}
                onClick={() => setActiveNav(item)}
              >
                {item}
              </button>
            )
          )}
          <button className="nav-item calendar-item">📅 Schedule</button>
        </nav>

        <div className="profile">
          <div className="avatar">AR</div>
          <div>
            <h4>Alex Rivera</h4>
            <p>Frontend Developer</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Welcome back, Alex! ✨</h1>
            <p>
              Here is your workspace overview. Click any task below to mark it
              complete!
            </p>
          </div>
          <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
            + Create Task
          </button>
        </header>

        {/* Colorful Overview Cards (Now Dynamic!) */}
        <section className="stats">
          <div className="stat-card purple">
            <p>Total Tasks</p>
            <h2>{totalTasks}</h2>
            <span>Across 3 active projects</span>
          </div>

          <div className="stat-card pink">
            <p>In Progress</p>
            <h2>{inProgressTasks}</h2>
            <span>Active tasks pending completion</span>
          </div>

          <div className="stat-card blue">
            <p>Completed Tasks</p>
            <h2>{completedTasks}</h2>
            <span>
              {totalTasks > 0
                ? `${Math.round((completedTasks / totalTasks) * 100)}% overall completion rate`
                : '0% completion rate'}
            </span>
          </div>
        </section>

        {/* Projects Section */}
        <section className="projects-section">
          <div className="section-heading">
            <h2>Active Projects</h2>
            <button className="text-btn">View All →</button>
          </div>

          <div className="project-grid">
            <div className="project-card">
              <div className="project-icon purple-icon">W</div>
              <span className="status progress">In Progress</span>
              <h3>Website Redesign</h3>
              <p>
                Modernizing the SaaS landing page and dashboard UI components.
              </p>
              <div className="progress-info">
                <span>Progress</span>
                <strong>70%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill purple-fill"></div>
              </div>
            </div>

            <div className="project-card">
              <div className="project-icon pink-icon">M</div>
              <span className="status review">In Review</span>
              <h3>Mobile App Launch</h3>
              <p>
                Building cross-platform notifications and user onboarding flows.
              </p>
              <div className="progress-info">
                <span>Progress</span>
                <strong>45%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill pink-fill"></div>
              </div>
            </div>

            <div className="project-card">
              <div className="project-icon blue-icon">A</div>
              <span className="status completed">Completed</span>
              <h3>Marketing Portal</h3>
              <p>
                Analytics tracking and automated reporting dashboard for teams.
              </p>
              <div className="progress-info">
                <span>Progress</span>
                <strong>100%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill blue-fill"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Tasks Section */}
        <section className="tasks-section">
          <h2>Today&apos;s Tasks (Click a task to toggle Complete)</h2>

          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task-row ${task.completed ? 'task-done' : ''}`}
              onClick={() => toggleTaskStatus(task.id)}
              title="Click to mark complete/incomplete"
            >
              <span className={`task-dot ${task.color}`}></span>
              <div>
                <h4>{task.title}</h4>
                <p>{task.project}</p>
              </div>
              <span
                className={`status ${
                  task.completed ? 'completed' : 'progress'
                }`}
              >
                {task.completed ? '✓ Completed' : task.due}
              </span>
            </div>
          ))}
        </section>
      </main>

      {/* Working "+ Create Task" Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleAddTask}>
            <div className="modal-header">
              <h3>Create New Task ✨</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="form-group">
              <label>Task Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Build Kanban drag and drop"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Select Project</label>
              <select
                value={taskProject}
                onChange={(e) => setTaskProject(e.target.value)}
              >
                <option value="Website Redesign">Website Redesign</option>
                <option value="Mobile App Launch">Mobile App Launch</option>
                <option value="Marketing Portal">Marketing Portal</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Time / Deadline</label>
              <input
                type="text"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-btn">
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}