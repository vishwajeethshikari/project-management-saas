// src/App.jsx
import React, { useState } from 'react';
import './App.css';

export default function App() {
  // 1. Navigation State (Controls which "page" is visible)
  const [currentView, setCurrentView] = useState('Dashboard'); // 'Dashboard' or 'Projects'

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. Active Projects State (Interactive!)
  const [projects, setProjects] = useState([
    {
      id: 'p1',
      name: 'Website Redesign',
      icon: 'W',
      iconClass: 'purple-icon',
      fillClass: 'purple-fill',
      progress: 70,
      status: 'In Progress',
      statusClass: 'progress',
      description: 'Modernizing the SaaS landing page and dashboard UI components.'
    },
    {
      id: 'p2',
      name: 'Mobile App Launch',
      icon: 'M',
      iconClass: 'pink-icon',
      fillClass: 'pink-fill',
      progress: 45,
      status: 'In Review',
      statusClass: 'review',
      description: 'Building cross-platform notifications and user onboarding flows.'
    },
    {
      id: 'p3',
      name: 'Marketing Portal',
      icon: 'A',
      iconClass: 'blue-icon',
      fillClass: 'blue-fill',
      progress: 100,
      status: 'Completed',
      statusClass: 'completed',
      description: 'Analytics tracking and automated reporting dashboard for teams.'
    }
  ]);

  // Tasks state
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Design system components & color tokens', project: 'Website Redesign', due: 'Today, 4:00 PM', color: 'purple-dot', completed: false },
    { id: 2, title: 'Fix authentication API token refresh', project: 'Mobile App Launch', due: 'Tomorrow, 11:00 AM', color: 'pink-dot', completed: false },
    { id: 3, title: 'Finalize Q3 analytics dashboard report', project: 'Marketing Portal', due: 'Completed', color: 'blue-dot', completed: true },
  ]);

  // Form input states for creating a new task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProject, setTaskProject] = useState('Website Redesign');
  const [taskDue, setTaskDue] = useState('Today, 6:00 PM');

  // Calculations for Stat Cards
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const inProgressTasks = totalTasks - completedTasks;

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

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

  const toggleTaskStatus = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="dashboard">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h2 className="logo" onClick={() => setCurrentView('Dashboard')} style={{ cursor: 'pointer' }}>
          TaskFlow
        </h2>
        <nav>
          <button
            className={`nav-item ${currentView === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('Dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-item ${currentView === 'Projects' ? 'active' : ''}`}
            onClick={() => setCurrentView('Projects')}
          >
            My Projects
          </button>
          <button className="nav-item" onClick={() => alert('Kanban coming in tomorrow\'s update!')}>
            Kanban Board
          </button>
          <button className="nav-item" onClick={() => alert('To-Do list feature coming soon!')}>
            My To-Do List
          </button>
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

      {/* Main Content View Switcher */}
      <div className="main-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* VIEW 1: DASHBOARD PAGE */}
        {currentView === 'Dashboard' && (
          <main className="main-content">
            <header className="topbar">
              <div>
                <h1>Welcome back, Alex! ✨</h1>
                <p>Here is your workspace overview. Click any task below to complete it!</p>
              </div>
              <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
                + Create Task
              </button>
            </header>

            {/* Dynamic Stat Cards */}
            <section className="stats">
              <div className="stat-card purple">
                <p>Total Tasks</p>
                <h2>{totalTasks}</h2>
                <span>Across {projects.length} active projects</span>
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

            {/* Projects Preview Row */}
            <section className="projects-section">
              <div className="section-heading">
                <h2>Active Projects Preview</h2>
                <button className="text-btn" onClick={() => setCurrentView('Projects')}>
                  View All Projects →
                </button>
              </div>

              <div className="project-grid">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="project-card">
                    <div className={`project-icon ${project.iconClass}`}>{project.icon}</div>
                    <span className={`status ${project.statusClass}`}>{project.status}</span>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                    <div className="progress-info">
                      <span>Progress</span>
                      <strong>{project.progress}%</strong>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${project.fillClass}`} style={{ width: `${project.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Tasks Section */}
            <section className="tasks-section">
              <h2>Today&apos;s Tasks</h2>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-row ${task.completed ? 'task-done' : ''}`}
                  onClick={() => toggleTaskStatus(task.id)}
                >
                  <span className={`task-dot ${task.color}`}></span>
                  <div>
                    <h4>{task.title}</h4>
                    <p>{task.project}</p>
                  </div>
                  <span className={`status ${task.completed ? 'completed' : 'progress'}`}>
                    {task.completed ? '✓ Completed' : task.due}
                  </span>
                </div>
              ))}
            </section>
          </main>
        )}

        {/* VIEW 2: DEDICATED PROJECTS PORTFOLIO PAGE */}
        {currentView === 'Projects' && (
          <main className="main-content">
            <header className="topbar">
              <div>
                <h1>Workspace Portfolios 📂</h1>
                <p>Detailed breakdown of tracking instances managed inside this organization.</p>
              </div>
              <button 
                className="primary-btn" 
                onClick={() => alert('Create Project database routing coming up in our milestones!')}
              >
                + Create Project
              </button>
            </header>

            {/* Full-width interactive projects view */}
            <section className="projects-section">
              <div className="project-grid">
                {projects.map((project) => (
                  <div key={project.id} className="project-card" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="project-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div className={`project-icon ${project.iconClass}`} style={{ marginBottom: 0 }}>{project.icon}</div>
                        <span className={`status ${project.statusClass}`}>{project.status}</span>
                      </div>
                      <h3>{project.name}</h3>
                      <p style={{ minHeight: '60px' }}>{project.description}</p>
                    </div>
                    
                    <div className="project-footer-progress" style={{ marginTop: 'auto' }}>
                      <div className="progress-info">
                        <span>Overall Integrity Rate</span>
                        <strong>{project.progress}%</strong>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${project.fillClass}`} style={{ width: `${project.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        )}
      </div>

      {/* Task Creation Modal Popup */}
      {isModalOpen && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleAddTask}>
            <div className="modal-header">
              <h3>Create New Task ✨</h3>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
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
              <select value={taskProject} onChange={(e) => setTaskProject(e.target.value)}>
                <option value="Website Redesign">Website Redesign</option>
                <option value="Mobile App Launch">Mobile App Launch</option>
                <option value="Marketing Portal">Marketing Portal</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Time / Deadline</label>
              <input type="text" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-btn">Add Task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}