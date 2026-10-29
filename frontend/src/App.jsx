import React, { useState } from 'react';
import './App.css';
import { initialProjects, initialTasks } from './mockData';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'projects', 'project-detail'
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Helper metrics calculation for Dashboard Overview
  const totalProjectsCount = projects.length;
  const completedProjectsCount = projects.filter(p => p.status === 'Completed').length;
  const inProgressProjectsCount = projects.filter(p => p.status === 'In Progress').length;
  
  // Calculate general quick-stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Navigation handlers
  const handleViewProjectDetails = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('project-detail');
  };

  const getSelectedProjectData = () => {
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return null;

    // Filter tasks specific to this project
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const totalProjTasks = projectTasks.length;
    const completedProjTasks = projectTasks.filter(t => t.status === 'Completed').length;

    // 1. Task Completion Rate
    const completionRate = totalProjTasks > 0 ? Math.round((completedProjTasks / totalProjTasks) * 100) : 0;

    // 2. On-Time Completion Rate (Of completed tasks, how many were marked on-time)
    const onTimeTasks = projectTasks.filter(t => t.status === 'Completed' && t.onTime).length;
    const onTimeRate = completedProjTasks > 0 ? Math.round((onTimeTasks / completedProjTasks) * 100) : 0;

    // 3. Overdue Task Count (To-Do/In-Progress whose dueDate is before today: Let's assume today is March 2, 2025)
    const todayStr = "2025-03-02";
    const overdueTasksCount = projectTasks.filter(t => {
      return t.status !== 'Completed' && t.dueDate < todayStr;
    }).length;

    // 4. Assignment Coverage (Percentage of tasks assigned to a team member)
    const assignedTasks = projectTasks.filter(t => t.assignedTo && t.assignedTo.trim() !== "").length;
    const coverageRate = totalProjTasks > 0 ? Math.round((assignedTasks / totalProjTasks) * 100) : 0;

    return {
      ...project,
      tasks: projectTasks,
      metrics: {
        completionRate,
        onTimeRate,
        overdueTasksCount,
        coverageRate,
        totalProjTasks
      }
    };
  };

  const activeProject = getSelectedProjectData();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <h2 className="logo-text">FlowBoard</h2>
        </div>
        <nav className="nav-menu">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="icon">📊</span> Dashboard
          </button>
          <button 
            className={`nav-item ${currentView === 'projects' || currentView === 'project-detail' ? 'active' : ''}`}
            onClick={() => setCurrentView('projects')}
          >
            <span className="icon">💼</span> My Projects
          </button>
        </nav>
        <div className="sidebar-footer">
          <p className="user-label">Logged in as:</p>
          <p className="user-name">Keerthi Kumar</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header-bar">
          <div className="header-search">
            <input type="text" placeholder="Search projects or metrics..." disabled />
          </div>
          <div className="profile-indicator">
            <span className="user-badge">KK</span>
          </div>
        </header>

        <div className="content-body">
          {/* VIEW: DASHBOARD */}
          {currentView === 'dashboard' && (
            <div className="view-fade-in">
              <div className="welcome-banner">
                <h1>Welcome back, Keerthi! 👋</h1>
                <p>Here is your team's project delivery intelligence and status overview.</p>
              </div>

              {/* KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-icon blue">📁</span>
                  <div className="kpi-info">
                    <h3>Total Projects</h3>
                    <p className="kpi-value">{totalProjectsCount}</p>
                  </div>
                </div>
                <div className="kpi-card">
                  <span className="kpi-icon yellow">⏳</span>
                  <div className="kpi-info">
                    <h3>In Progress</h3>
                    <p className="kpi-value">{inProgressProjectsCount}</p>
                  </div>
                </div>
                <div className="kpi-card">
                  <span className="kpi-icon green">✅</span>
                  <div className="kpi-info">
                    <h3>Completed</h3>
                    <p className="kpi-value">{completedProjectsCount}</p>
                  </div>
                </div>
                <div className="kpi-card">
                  <span className="kpi-icon purple">🎯</span>
                  <div className="kpi-info">
                    <h3>Avg Task Progress</h3>
                    <p className="kpi-value">{taskCompletionRate}%</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity / Quick Projects List */}
              <div className="section-header-row">
                <h2>Active Projects</h2>
                <button className="text-action-btn" onClick={() => setCurrentView('projects')}>View Portfolio →</button>
              </div>

              <div className="projects-grid">
                {projects.map(project => (
                  <div 
                    key={project.id} 
                    className="project-card interactive"
                    onClick={() => handleViewProjectDetails(project.id)}
                  >
                    <div className="card-header">
                      <span className={`status-badge ${project.status.toLowerCase().replace(" ", "-")}`}>
                        {project.status}
                      </span>
                      <span className="due-date">Due: {project.dueDate}</span>
                    </div>
                    <h3>{project.name}</h3>
                    <p className="project-desc">{project.description}</p>
                    
                    <div className="progress-section">
                      <div className="progress-label">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${project.progress}%` }}></div>
                      </div>
                    </div>

                    <div className="card-footer-tags">
                      <span className="tag-micro">👥 {project.teamName}</span>
                      <span className="tag-micro">🛠️ {project.techStack.length} Techs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: MY PROJECTS */}
          {currentView === 'projects' && (
            <div className="view-fade-in">
              <div className="portfolio-header">
                <div>
                  <h1>My Projects Portfolio</h1>
                  <p>Enterprise level workspace and metrics overview</p>
                </div>
              </div>

              <div className="projects-grid">
                {projects.map(project => (
                  <div 
                    key={project.id} 
                    className="project-card interactive-heavy"
                    onClick={() => handleViewProjectDetails(project.id)}
                  >
                    <div className="card-header">
                      <span className={`status-badge ${project.status.toLowerCase().replace(" ", "-")}`}>
                        {project.status}
                      </span>
                      <span className="due-date-bold">⏳ {project.dueDate}</span>
                    </div>
                    
                    <h2 className="project-title-large">{project.name}</h2>
                    <p className="project-desc">{project.description}</p>
                    
                    <div className="tech-badge-row">
                      {project.techStack.slice(0, 3).map((tech, idx) => (
                        <span key={idx} className="tech-micro-tag">{tech}</span>
                      ))}
                      {project.techStack.length > 3 && <span className="tech-micro-tag count">+{project.techStack.length - 3}</span>}
                    </div>

                    <div className="progress-section">
                      <div className="progress-label">
                        <span>Overall Health</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${project.progress}%` }}></div>
                      </div>
                    </div>

                    <div className="card-expanded-footer">
                      <span className="team-indicator">🏡 {project.teamName}</span>
                      <button className="view-details-action">View Intelligence ➔</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: PROJECT DETAILS OVERVIEW */}
          {currentView === 'project-detail' && activeProject && (
            <div className="view-fade-in project-details-page">
              {/* Back Navigation Header */}
              <div className="back-nav-row">
                <button className="back-btn" onClick={() => setCurrentView('projects')}>
                  &larr; Back to Projects
                </button>
                <div className="breadcrumbs">
                  <span>Workspace</span> / <span>Projects</span> / <span className="active-breadcrumb">{activeProject.name}</span>
                </div>
              </div>

              {/* Project Title Block Banner */}
              <div className="project-detail-hero">
                <div className="hero-left">
                  <span className={`status-badge-lg ${activeProject.status.toLowerCase().replace(" ", "-")}`}>
                    {activeProject.status}
                  </span>
                  <h1 className="hero-title">{activeProject.name}</h1>
                  <p className="hero-desc">{activeProject.description}</p>
                </div>
                <div className="hero-right">
                  <div className="hero-meta-item">
                    <span className="meta-label">DUE DATE</span>
                    <span className="meta-val">{activeProject.dueDate}</span>
                  </div>
                  <div className="hero-meta-item">
                    <span className="meta-label">TEAM ASSIGNED</span>
                    <span className="meta-val highlight-purple">{activeProject.teamName}</span>
                  </div>
                </div>
              </div>

              {/* Metrics Delivery Intelligence Row */}
              <h2 className="section-title">Delivery Intelligence Metrics</h2>
              <div className="metrics-summary-grid">
                
                {/* Metric Card: Project Progress */}
                <div className="metric-score-card">
                  <div className="score-header">
                    <h4>Overall Progress</h4>
                    <span className="score-icon">📈</span>
                  </div>
                  <div className="score-body">
                    <div className="score-percentage-circle">
                      <span className="percentage-value">{activeProject.progress}%</span>
                    </div>
                  </div>
                  <div className="score-footer">
                    <div className="progress-bar-bg min-height">
                      <div className="progress-bar-fill" style={{ width: `${activeProject.progress}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Metric Card: Task Completion */}
                <div className="metric-score-card">
                  <div className="score-header">
                    <h4>Task Completion</h4>
                    <span className="score-icon">🎯</span>
                  </div>
                  <div className="score-body">
                    <p className="score-large-stat">{activeProject.metrics.completionRate}%</p>
                    <p className="score-subtext">
                      {activeProject.tasks.filter(t => t.status === 'Completed').length} of {activeProject.metrics.totalProjTasks} tasks finished
                    </p>
                  </div>
                  <div className="score-footer">
                    <span className="score-badge-indicator green">Healthy Stream</span>
                  </div>
                </div>

                {/* Metric Card: On-Time Delivery */}
                <div className="metric-score-card">
                  <div className="score-header">
                    <h4>On-Time Delivery</h4>
                    <span className="score-icon">⚡</span>
                  </div>
                  <div className="score-body">
                    <p className="score-large-stat">{activeProject.metrics.onTimeRate}%</p>
                    <p className="score-subtext">Completed prior or on due-dates</p>
                  </div>
                  <div className="score-footer">
                    <span className={`score-badge-indicator ${activeProject.metrics.onTimeRate >= 75 ? 'green' : 'orange'}`}>
                      {activeProject.metrics.onTimeRate >= 75 ? 'Optimal Flow' : 'Minor Latency'}
                    </span>
                  </div>
                </div>

                {/* Metric Card: Overdue & Coverage */}
                <div className="metric-score-card">
                  <div className="score-header">
                    <h4>Overdue Tasks</h4>
                    <span className="score-icon alert-icon">⚠️</span>
                  </div>
                  <div className="score-body">
                    <p className="score-large-stat alert-text">{activeProject.metrics.overdueTasksCount}</p>
                    <p className="score-subtext">Awaiting resolution action</p>
                  </div>
                  <div className="score-footer">
                    <span className="score-badge-indicator purple">
                      Coverage: {activeProject.metrics.coverageRate}%
                    </span>
                  </div>
                </div>

              </div>

              {/* Tech Stack & Team Members Badging Layout */}
              <div className="details-metadata-split">
                
                {/* Tech Stack Badge Cluster */}
                <div className="meta-badge-box">
                  <div className="box-header">
                    <h3>🛠️ Technology Stack</h3>
                    <span className="badge-count-pill">{activeProject.techStack.length} Techs</span>
                  </div>
                  <p className="box-explainer">Core framework and developer dependencies mapped to this micro-repository:</p>
                  <div className="badge-pool">
                    {activeProject.techStack.map((tech, index) => (
                      <span key={index} className="badge-tag tech-pill">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Team Members Badge Cluster */}
                <div className="meta-badge-box">
                  <div className="box-header">
                    <h3>👥 Active Team Roster</h3>
                    <span className="badge-count-pill">{activeProject.teamMembers.length} Members</span>
                  </div>
                  <p className="box-explainer">Engineering specialists assigned to task tracks under <strong>{activeProject.teamName}</strong>:</p>
                  <div className="badge-pool">
                    {activeProject.teamMembers.map((member, index) => (
                      <span key={index} className="badge-tag member-pill">
                        <span className="avatar-dot"></span>
                        {member}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Tasks Breakdown list preview */}
              <div className="associated-tasks-section">
                <div className="tasks-section-header">
                  <h3>Project Implementation Plan Preview</h3>
                  <button className="kanban-jump-btn" disabled>
                    ⚡ Open Full Kanban Board (Coming Day 2)
                  </button>
                </div>
                <div className="simple-task-list">
                  {activeProject.tasks.length === 0 ? (
                    <p className="no-tasks-alert">No roadmap tasks created yet for this project.</p>
                  ) : (
                    activeProject.tasks.map(task => (
                      <div key={task.id} className="task-preview-row">
                        <div className="task-left">
                          <span className={`task-status-indicator ${task.status.toLowerCase().replace(" ", "-")}`}></span>
                          <span className="task-title-text">{task.title}</span>
                        </div>
                        <div className="task-right">
                          <span className="task-assignee">👤 {task.assignedTo || "Unassigned"}</span>
                          <span className="task-due">📅 {task.dueDate}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;