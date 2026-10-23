
import './App.css'

function App() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="logo">TaskFlow</h2>

        <nav>
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">Projects</button>
          <button className="nav-item">Tasks</button>
          <button className="nav-item">Team</button>
          <button className="nav-item calendar-item">✦ Calendar</button>
        </nav>

        <div className="profile">
          <div className="avatar">S</div>
          <div>
            <h4>Student</h4>
            <p>Frontend Developer</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here's your project overview.</p>
          </div>
          <button className="primary-btn">+ New Project</button>
        </header>

        <section className="stats">
          <div className="stat-card purple">
            <p>Total Projects</p>
            <h2>12</h2>
            <span>Projects you're working on</span>
          </div>

          <div className="stat-card pink">
            <p>Active Tasks</p>
            <h2>08</h2>
            <span>Tasks in progress</span>
          </div>

          <div className="stat-card blue">
            <p>Completed</p>
            <h2>24</h2>
            <span>Tasks completed</span>
          </div>
        </section>

        <section className="projects-section">
          <div className="section-heading">
            <h2>Recent Projects</h2>
            <button className="text-btn">View all</button>
          </div>

          <div className="project-grid">
            <article className="project-card">
              <div className="project-icon purple-icon">W</div>
              <span className="status progress">In Progress</span>
              <h3>Website Redesign</h3>
              <p>Improve the website interface and user experience.</p>
              <div className="progress-info">
                <span>Progress</span>
                <strong>70%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill purple-fill"></div>
              </div>
            </article>

            <article className="project-card">
              <div className="project-icon pink-icon">M</div>
              <span className="status review">In Progress</span>
              <h3>Mobile Application</h3>
              <p>Build a simple and intuitive mobile experience.</p>
              <div className="progress-info">
                <span>Progress</span>
                <strong>45%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill pink-fill"></div>
              </div>
            </article>

            <article className="project-card">
              <div className="project-icon blue-icon">A</div>
              <span className="status completed">Completed</span>
              <h3>Analytics Dashboard</h3>
              <p>Organize project data into clear visual summaries.</p>
              <div className="progress-info">
                <span>Progress</span>
                <strong>100%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill blue-fill"></div>
              </div>
            </article>
          </div>
        </section>

        <section className="tasks-section">
          <h2>My Tasks</h2>

          <div className="task-row">
            <span className="task-dot purple-dot"></span>
            <div>
              <h4>Design dashboard layout</h4>
              <p>Website Redesign</p>
            </div>
            <span className="task-label">In Progress</span>
          </div>

          <div className="task-row">
            <span className="task-dot pink-dot"></span>
            <div>
              <h4>Review project requirements</h4>
              <p>Mobile Application</p>
            </div>
            <span className="task-label">Pending</span>
          </div>

          <div className="task-row">
            <span className="task-dot blue-dot"></span>
            <div>
              <h4>Prepare project documentation</h4>
              <p>Analytics Dashboard</p>
            </div>
            <span className="task-label">Completed</span>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
