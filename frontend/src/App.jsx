
import { useState } from 'react'
import './App.css'

const projects = [
  {
    id: 1,
    name: 'Website Redesign',
    description: 'Redesign the company website and improve user experience.',
    status: 'ACTIVE',
    progress: 65,
    dueDate: 'Oct 28, 2026',
  },
  {
    id: 2,
    name: 'Mobile App',
    description: 'Build the first version of the mobile application.',
    status: 'ACTIVE',
    progress: 35,
    dueDate: 'Nov 12, 2026',
  },
  {
    id: 3,
    name: 'Marketing Campaign',
    description: 'Prepare the launch campaign and marketing materials.',
    status: 'COMPLETED',
    progress: 100,
    dueDate: 'Oct 10, 2026',
  },
]

function App() {
  const [search, setSearch] = useState('')

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase()),
  )

  const activeProjects = projects.filter(
    (project) => project.status === 'ACTIVE',
  ).length

  const completedProjects = projects.filter(
    (project) => project.status === 'COMPLETED',
  ).length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">P</div>
          <span>ProjectFlow</span>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav className="navigation">
          <a href="#dashboard" className="nav-link">
            <span>▦</span> Dashboard
          </a>
          <a href="#projects" className="nav-link active">
            <span>▤</span> Projects
          </a>
          <a href="#tasks" className="nav-link">
            <span>✓</span> My Tasks
          </a>
          <a href="#team" className="nav-link">
            <span>♧</span> Team
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-avatar">AR</div>
          <div className="profile-info">
            <strong>Workspace Member</strong>
            <span>Frontend Developer</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Projects</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">DEMO DATA</span>
            <div className="user-avatar">AR</div>
          </div>
        </header>

        <section className="page-content" id="projects">
          <div className="page-heading">
            <div>
              <p className="eyebrow">WORKSPACE OVERVIEW</p>
              <h1>Projects</h1>
              <p className="page-description">
                Manage your projects and keep track of progress.
              </p>
            </div>
            <button className="primary-button" type="button" disabled>
              + New Project
            </button>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">Total Projects</span>
              <strong className="stat-number">{projects.length}</strong>
              <span className="stat-note">Across this workspace</span>
            </article>

            <article className="stat-card">
              <span className="stat-label">Active Projects</span>
              <strong className="stat-number">{activeProjects}</strong>
              <span className="stat-note">Currently in progress</span>
            </article>

            <article className="stat-card">
              <span className="stat-label">Completed</span>
              <strong className="stat-number">{completedProjects}</strong>
              <span className="stat-note">Successfully finished</span>
            </article>
          </div>

          <section className="projects-section">
            <div className="section-heading">
              <div>
                <h2>All Projects</h2>
                <p>Review your workspace projects.</p>
              </div>

              <label className="search-box">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>

            <div className="project-list">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <article className="project-card" key={project.id}>
                    <div className="project-main">
                      <div className="project-icon">
                        {project.name.charAt(0)}
                      </div>

                      <div className="project-details">
                        <h3>{project.name}</h3>
                        <p>{project.description}</p>
                        <span className="due-date">
                          Due {project.dueDate}
                        </span>
                      </div>
                    </div>

                    <div className="project-progress">
                      <div className="progress-heading">
                        <span>Progress</span>
                        <strong>{project.progress}%</strong>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="project-status">
                      <span
                        className={`status-badge ${project.status.toLowerCase()}`}
                      >
                        {project.status}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <h3>No projects found</h3>
                  <p>Try searching with a different project name.</p>
                </div>
              )}
            </div>

            <p className="demo-notice">
              This page currently uses sample data for frontend development.
              Project information is not connected to the backend yet.
            </p>
          </section>
        </section>
      </main>
    </div>
  )
}

export default App
