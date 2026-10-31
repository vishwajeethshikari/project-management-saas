
import React, { useState, useMemo } from 'react';
import './App.css';

// ==========================================
// RELATIONAL INITIAL SEED DATA (PDF PAGE 6 COMPLIANT)
// ==========================================
const INITIAL_USERS = [
  { id: 'usr-1', name: 'Elena Rostova', email: 'elena@flowboard.io', role: 'owner', avatar: '👩‍💻' },
  { id: 'usr-2', name: 'Sarah Jenkins', email: 'sarah@flowboard.io', role: 'manager', avatar: '👩‍💼' },
  { id: 'usr-3', name: 'Alex Rivera', email: 'alex@flowboard.io', role: 'employee', avatar: '👨‍💻' },
  { id: 'usr-4', name: 'Dave Kincaid', email: 'dave@flowboard.io', role: 'employee', avatar: '⚙️' },
];

const INITIAL_PROJECTS = [
  { 
    id: 'proj-alpha', 
    name: 'Project Alpha (Smart Recruitment)', 
    workspace: 'Global HR Workspace',
    techStack: 'React, Node.js, PostgreSQL', 
    description: 'Enterprise ATS system with automated resume ingestion pipelines and multi-tenant isolation.', 
    targetDeadline: '2025-03-28',
    managerId: 'usr-2' 
  },
  { 
    id: 'proj-beta', 
    name: 'Project Beta (Metrics & Analytics)', 
    workspace: 'Core Platform Team',
    techStack: 'Python, FastAPI, TimescaleDB', 
    description: 'High-throughput analytics engines calculating live metrics, workspace progress, and pipeline latency.', 
    targetDeadline: '2025-04-15',
    managerId: 'usr-1' 
  }
];

const INITIAL_TASKS = [
  { id: 'task-1', projectId: 'proj-alpha', title: 'Design DB Schemas & Multitenancy', assigneeId: 'usr-1', status: 'Done', priority: 'High', dueDate: '2025-03-01', completedDate: '2025-03-01' },
  { id: 'task-2', projectId: 'proj-alpha', title: 'Implement Resume Upload Validation', assigneeId: 'usr-3', status: 'In Progress', priority: 'Medium', dueDate: '2025-03-06' },
  { id: 'task-3', projectId: 'proj-alpha', title: 'Configure SMTP Notification Routes', assigneeId: 'usr-2', status: 'To Do', priority: 'Low', dueDate: '2025-02-28' }, // Overdue
  { id: 'task-4', projectId: 'proj-beta', title: 'Deploy TimescaleDB Tuning Pipeline', assigneeId: 'usr-4', status: 'In Progress', priority: 'High', dueDate: '2025-03-12' },
  { id: 'task-5', projectId: 'proj-beta', title: 'Verify Real-time Metric Sync Hook', assigneeId: 'usr-3', status: 'Done', priority: 'Medium', dueDate: '2025-03-02', completedDate: '2025-03-02' },
];

const INITIAL_WORK_PLANS = [
  { id: 'plan-1', userId: 'usr-3', focusText: 'ATS Database Tuning Session', date: '2025-03-05', type: 'tuning' },
  { id: 'plan-2', userId: 'usr-4', focusText: 'API Gateway Security Audit', date: '2025-03-12', type: 'focus' },
  { id: 'plan-3', userId: 'usr-2', focusText: 'Annual Leave / Out of Office', date: '2025-03-15', type: 'leave' },
  { id: 'plan-4', userId: 'usr-3', focusText: 'Duplicate Sprint Refactoring Block', date: '2025-03-05', type: 'focus' }, // Creates overload collision warning
];

export default function App() {
  // Navigation & Core States
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, projects, project-detail, kanban, my-todos, calendar
  const [selectedProjectId, setSelectedProjectId] = useState('proj-alpha');
  const [systemDate] = useState('2025-03-02'); // Fixed target evaluation date as baseline
  
  // Dynamic Datasets (API Mock-Swappable)
  const [users, setUsers] = useState(INITIAL_USERS);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [workPlans, setWorkPlans] = useState(INITIAL_WORK_PLANS);

  // Filter States for 'My To-Dos'
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal Control States
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form Fields: Project Provisioning
  const [newProjName, setNewProjName] = useState('');
  const [newProjWorkspace, setNewProjWorkspace] = useState('');
  const [newProjTech, setNewProjTech] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjDeadline, setNewProjDeadline] = useState('');
  const [newProjManager, setNewProjManager] = useState(INITIAL_USERS[0].id);

  // Form Fields: Focus Planner
  const [planUser, setPlanUser] = useState(INITIAL_USERS[0].id);
  const [planFocusText, setPlanFocusText] = useState('');
  const [planDate, setPlanDate] = useState('2025-03-05');
  const [planType, setPlanType] = useState('focus');

  // Form Fields: Task Creator/Editor
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProject, setTaskProject] = useState(INITIAL_PROJECTS[0].id);
  const [taskAssignee, setTaskAssignee] = useState(INITIAL_USERS[0].id);
  const [taskStatus, setTaskStatus] = useState('To Do');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('2025-03-10');

  // Interactive Calendar Selection
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('2025-03-05');

  // ==========================================
  // REAL-TIME METRICS CALCULATION (PDF COMPLIANT)
  // ==========================================
  const computedMetrics = useMemo(() => {
    return projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const total = projTasks.length;
      const completed = projTasks.filter(t => t.status === 'Done').length;
      
      // Task Completion Rate
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      // On-Time Completion Rate
      const completedWithDueDates = projTasks.filter(t => t.status === 'Done' && t.dueDate);
      const onTimeCompleted = completedWithDueDates.filter(t => {
        if (!t.completedDate) return false;
        return new Date(t.completedDate) <= new Date(t.dueDate);
      }).length;
      const onTimeRate = completedWithDueDates.length > 0 
        ? Math.round((onTimeCompleted / completedWithDueDates.length) * 100) 
        : 100; // Defaults to 100% on-time if all completed were on-time

      // Overdue Counts (Status !== Done && Due Date < System Date)
      const overdueCount = projTasks.filter(t => {
        return t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date(systemDate);
      }).length;

      // Assignment Coverage Rate (Tasks with assigned owner / total tasks)
      const assignedCount = projTasks.filter(t => t.assigneeId).length;
      const coverageRate = total > 0 ? Math.round((assignedCount / total) * 100) : 0;

      return {
        projectId: proj.id,
        name: proj.name,
        completionRate,
        onTimeRate,
        overdueCount,
        coverageRate,
        totalTasks: total,
        completedTasks: completed
      };
    });
  }, [projects, tasks, systemDate]);

  // Overall Global Aggregates
  const globalMetrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Done').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overdue = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date(systemDate)).length;
    const assigned = tasks.filter(t => t.assigneeId).length;
    const coverage = total > 0 ? Math.round((assigned / total) * 100) : 0;

    return {
      completionRate,
      overdue,
      coverage,
      totalTasks: total,
      completedTasks: completed
    };
  }, [tasks, systemDate]);

  // ==========================================
  // HANDLERS (DYNAMIC & PROTECTED)
  // ==========================================
  const handleProvisionProject = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const newId = `proj-${Date.now()}`;
    const newProjectNode = {
      id: newId,
      name: newProjName,
      workspace: newProjWorkspace || 'Default Organization',
      techStack: newProjTech || 'N/A',
      description: newProjDesc || 'No description provided.',
      targetDeadline: newProjDeadline || '2025-12-31',
      managerId: newProjManager
    };

    setProjects([...projects, newProjectNode]);
    
    // Auto-select the newly created project node
    setSelectedProjectId(newId);
    setShowProvisionModal(false);

    // Reset Form
    setNewProjName('');
    setNewProjWorkspace('');
    setNewProjTech('');
    setNewProjDesc('');
  };

  const handleCreatePlan = (e) => {
    e.preventDefault();
    if (!planFocusText.trim()) return;

    const newPlan = {
      id: `plan-${Date.now()}`,
      userId: planUser,
      focusText: planFocusText,
      date: planDate,
      type: planType
    };

    setWorkPlans([...workPlans, newPlan]);
    setShowPlanModal(false);
    setPlanFocusText('');
  };

  const handleOpenTaskDeployer = (taskObj = null) => {
    if (taskObj) {
      setEditingTask(taskObj);
      setTaskTitle(taskObj.title);
      setTaskProject(taskObj.projectId);
      setTaskAssignee(taskObj.assigneeId);
      setTaskStatus(taskObj.status);
      setTaskPriority(taskObj.priority);
      setTaskDueDate(taskObj.dueDate || '');
    } else {
      setEditingTask(null);
      setTaskTitle('');
      setTaskProject(selectedProjectId || projects[0]?.id || '');
      setTaskAssignee(users[0]?.id || '');
      setTaskStatus('To Do');
      setTaskPriority('Medium');
      setTaskDueDate('2025-03-10');
    }
    setShowTaskModal(true);
  };

  const handleSaveTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTask) {
      // Edit Mode
      setTasks(tasks.map(t => {
        if (t.id === editingTask.id) {
          const wasDone = t.status === 'Done';
          const isNowDone = taskStatus === 'Done';
          return {
            ...t,
            title: taskTitle,
            projectId: taskProject,
            assigneeId: taskAssignee,
            status: taskStatus,
            priority: taskPriority,
            dueDate: taskDueDate,
            completedDate: isNowDone ? (wasDone ? t.completedDate : systemDate) : undefined
          };
        }
        return t;
      }));
    } else {
      // Create Mode
      const newTask = {
        id: `task-${Date.now()}`,
        projectId: taskProject,
        title: taskTitle,
        assigneeId: taskAssignee,
        status: taskStatus,
        priority: taskPriority,
        dueDate: taskDueDate,
        completedDate: taskStatus === 'Done' ? systemDate : undefined
      };
      setTasks([...tasks, newTask]);
    }

    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setTasks(tasks.filter(t => t.id !== taskId));
      setShowTaskModal(false);
      setEditingTask(null);
    }
  };

  // ==========================================
  // HELPERS FOR VIEWS
  // ==========================================
  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const activeProjectMetrics = computedMetrics.find(m => m.projectId === (activeProject?.id || ''));

  // Get User Name and Avatar safe utilities
  const getUserProfile = (userId) => {
    const u = users.find(x => x.id === userId);
    return u ? { name: u.name, avatar: u.avatar, role: u.role } : { name: 'Unassigned', avatar: '👤', role: 'employee' };
  };

  // Calendar Day Generation (March 2025)
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      const dayStr = `2025-03-${i < 10 ? '0' + i : i}`;
      // Find events and check conflicts
      const dayPlans = workPlans.filter(p => p.date === dayStr);
      
      // Determine conflicts: check if any individual user has > 1 plan allocated on this specific day
      const userAllocations = {};
      dayPlans.forEach(p => {
        userAllocations[p.userId] = (userAllocations[p.userId] || 0) + 1;
      });
      const hasConflict = Object.values(userAllocations).some(count => count > 1);

      days.push({
        dayNumber: i,
        dateString: dayStr,
        plans: dayPlans,
        hasConflict
      });
    }
    return days;
  }, [workPlans]);

  // Unified To-Do Filter Calculation
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchAssignee = filterAssignee === 'all' || t.assigneeId === filterAssignee;
      const matchProject = filterProject === 'all' || t.projectId === filterProject;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchAssignee && matchProject && matchStatus;
    });
  }, [tasks, filterAssignee, filterProject, filterStatus]);

  return (
    <div className="app-container">
      {/* GLOWING HEADER */}
      <header className="main-header">
        <div className="header-brand">
          <div className="neon-orb"></div>
          <h1>FlowBoard <span className="sub-tag">Enterprise SaaS Core</span></h1>
        </div>
        <nav className="header-nav">
          <button className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${currentView === 'projects' ? 'active' : ''}`} onClick={() => setCurrentView('projects')}>Projects Mapping</button>
          <button className={`nav-btn ${currentView === 'kanban' ? 'active' : ''}`} onClick={() => setCurrentView('kanban')}>Kanban Pipelines</button>
          <button className={`nav-btn ${currentView === 'my-todos' ? 'active' : ''}`} onClick={() => setCurrentView('my-todos')}>Global To-Dos</button>
          <button className={`nav-btn ${currentView === 'calendar' ? 'active' : ''}`} onClick={() => setCurrentView('calendar')}>Conflict Scheduler</button>
        </nav>
        <div className="header-actions">
          <button className="terminal-trigger" onClick={() => setShowProvisionModal(true)}>
            ⚡ Provision Node
          </button>
        </div>
      </header>

      {/* CORE FRAMEWORK BODY */}
      <main className="view-container">

        {/* ==========================================
            1. GLOBAL DASHBOARD VIEW
            ========================================== */}
        {currentView === 'dashboard' && (
          <div className="dashboard-grid fade-in">
            {/* Top Workspace Aggregates */}
            <div className="full-width-card welcome-hero">
              <div className="hero-text">
                <h2>Workspace Pipeline Orchestrator</h2>
                <p>Global Evaluation Target Baseline: <strong>{systemDate}</strong></p>
              </div>
              <div className="quick-metrics-row">
                <div className="stat-node">
                  <span className="stat-label">Total Core Nodes</span>
                  <span className="stat-val">{projects.length}</span>
                </div>
                <div className="stat-node">
                  <span className="stat-label">Global Task Completion</span>
                  <span className="stat-val">{globalMetrics.completionRate}%</span>
                </div>
                <div className="stat-node text-alert">
                  <span className="stat-label">Total Overdue Items</span>
                  <span className="stat-val">{globalMetrics.overdue}</span>
                </div>
                <div className="stat-node">
                  <span className="stat-label">Assignment Coverage</span>
                  <span className="stat-val">{globalMetrics.coverage}%</span>
                </div>
              </div>
            </div>

            {/* List of Active Project Nodes with Metrics */}
            <div className="panel-col card">
              <div className="panel-header">
                <h3>Active Project Nodes</h3>
                <span className="badge">Calculations Active</span>
              </div>
              <div className="project-nodes-list">
                {projects.map(proj => {
                  const m = computedMetrics.find(metric => metric.projectId === proj.id);
                  const isSelected = selectedProjectId === proj.id;
                  return (
                    <div 
                      key={proj.id} 
                      className={`project-node-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setCurrentView('project-detail');
                      }}
                    >
                      <div className="node-info">
                        <h4>{proj.name}</h4>
                        <p className="tech-stack-tag">{proj.techStack}</p>
                      </div>
                      <div className="node-stats">
                        <div className="stat-bar-container">
                          <div className="stat-bar-fill" style={{ width: `${m?.completionRate || 0}%` }}></div>
                        </div>
                        <span className="stat-percent">{m?.completionRate || 0}% Done</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Analytics Dashboard Summary */}
            <div className="panel-col card">
              <div className="panel-header">
                <h3>System Integrity Metrics (SaaS Targets)</h3>
              </div>
              <div className="analytics-details-list">
                {computedMetrics.map(m => (
                  <div key={m.projectId} className="integrity-card">
                    <h5>{m.name}</h5>
                    <div className="metric-row">
                      <span>On-Time Completion Rate:</span>
                      <strong className={m.onTimeRate < 70 ? 'warn' : 'good'}>{m.onTimeRate}%</strong>
                    </div>
                    <div className="metric-row">
                      <span>Assigned Resource Coverage:</span>
                      <strong>{m.coverageRate}%</strong>
                    </div>
                    <div className="metric-row">
                      <span>Critical Overdue Task Alerts:</span>
                      <strong className={m.overdueCount > 0 ? 'critical' : 'good'}>{m.overdueCount} Critical</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            2. PROJECTS MAPPING LIST
            ========================================== */}
        {currentView === 'projects' && (
          <div className="projects-view fade-in">
            <div className="section-header">
              <h2>All Initialized Project Nodes</h2>
              <button className="primary-btn" onClick={() => setShowProvisionModal(true)}>+ Provision New Node</button>
            </div>
            <div className="projects-card-grid">
              {projects.map(proj => {
                const m = computedMetrics.find(metric => metric.projectId === proj.id);
                const manager = getUserProfile(proj.managerId);
                return (
                  <div key={proj.id} className="project-profile-card card">
                    <div className="profile-header">
                      <div>
                        <h3>{proj.name}</h3>
                        <span className="workspace-tag">{proj.workspace}</span>
                      </div>
                      <span className="tech-badge">{proj.techStack}</span>
                    </div>
                    <p className="project-desc">{proj.description}</p>
                    <div className="profile-manager">
                      <span>Responsible Manager:</span>
                      <strong>{manager.avatar} {manager.name} ({manager.role})</strong>
                    </div>
                    <div className="profile-metrics">
                      <div className="metric-box">
                        <span className="box-val">{m?.completionRate || 0}%</span>
                        <span className="box-lbl">Completion</span>
                      </div>
                      <div className="metric-box">
                        <span className="box-val">{m?.onTimeRate || 0}%</span>
                        <span className="box-lbl">On-Time</span>
                      </div>
                      <div className="metric-box">
                        <span className="box-val text-alert">{m?.overdueCount || 0}</span>
                        <span className="box-lbl">Overdue</span>
                      </div>
                    </div>
                    <div className="profile-footer">
                      <span>Target: {proj.targetDeadline}</span>
                      <button className="action-link" onClick={() => {
                        setSelectedProjectId(proj.id);
                        setCurrentView('project-detail');
                      }}>Enter Diagnostics →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            3. PROJECT DETAIL & DIAGNOSTICS VIEW
            ========================================== */}
        {currentView === 'project-detail' && activeProject && (
          <div className="project-details-view fade-in">
            <div className="details-header-row">
              <button className="back-link" onClick={() => setCurrentView('dashboard')}>← Back to Main Dashboard</button>
              <div className="header-meta">
                <h2>{activeProject.name} <span className="accent-text">({activeProject.workspace})</span></h2>
                <span className="tech-badge">{activeProject.techStack}</span>
              </div>
            </div>

            <div className="details-layout-grid">
              <div className="sidebar-details card">
                <h4>Node Specifications</h4>
                <div className="detail-spec">
                  <label>Target Deadline</label>
                  <p>{activeProject.targetDeadline}</p>
                </div>
                <div className="detail-spec">
                  <label>Responsible Node Manager</label>
                  <p>{getUserProfile(activeProject.managerId).avatar} {getUserProfile(activeProject.managerId).name}</p>
                </div>
                <div className="detail-spec">
                  <label>Core Description</label>
                  <p className="italic">{activeProject.description}</p>
                </div>

                <div className="diagnostics-panel-alert">
                  <h4>Metric Evaluations</h4>
                  <div className="diag-row">
                    <span>Task Completion Rate:</span>
                    <strong>{activeProjectMetrics?.completionRate}%</strong>
                  </div>
                  <div className="diag-row">
                    <span>On-Time Delivery Target:</span>
                    <strong>{activeProjectMetrics?.onTimeRate}%</strong>
                  </div>
                  <div className="diag-row">
                    <span>Active Team Allocation:</span>
                    <strong>{activeProjectMetrics?.coverageRate}% Covered</strong>
                  </div>
                </div>
              </div>

              <div className="main-tasks-panel card">
                <div className="panel-header-action">
                  <h3>Active Pipeline Tickets</h3>
                  <button className="primary-btn" onClick={() => handleOpenTaskDeployer()}>+ Deploy Task Card</button>
                </div>
                <div className="tasks-interactive-list">
                  {tasks.filter(t => t.projectId === activeProject.id).map(task => {
                    const assignee = getUserProfile(task.assigneeId);
                    const isOverdue = task.status !== 'Done' && task.dueDate && new Date(task.dueDate) < new Date(systemDate);
                    return (
                      <div key={task.id} className={`task-card-item ${isOverdue ? 'overdue-border' : ''}`}>
                        <div className="card-top">
                          <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                          <span className={`status-badge ${task.status.replace(/\s+/g, '-').toLowerCase()}`}>{task.status}</span>
                        </div>
                        <h4>{task.title}</h4>
                        <div className="card-bottom">
                          <span className="assignee-info">{assignee.avatar} {assignee.name}</span>
                          <div className="due-info">
                            <span className="due-date">Due: {task.dueDate || 'No Limit'}</span>
                            {isOverdue && <span className="overdue-tag">OVERDUE</span>}
                          </div>
                        </div>
                        <div className="card-edit-overlay">
                          <button className="edit-overlay-btn" onClick={() => handleOpenTaskDeployer(task)}>Edit Card</button>
                        </div>
                      </div>
                    );
                  })}
                  {tasks.filter(t => t.projectId === activeProject.id).length === 0 && (
                    <div className="empty-state">
                      <p>No active tasks in this project pipeline node.</p>
                      <button className="action-link" onClick={() => handleOpenTaskDeployer()}>Create First Task Now</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            4. KANBAN PIPELINES VIEW
            ========================================== */}
        {currentView === 'kanban' && (
          <div className="kanban-view fade-in">
            <div className="section-header-filters">
              <div>
                <h2>Workspace Pipeline Kanban</h2>
                <p>Orchestrate and update tasks interactively. Select active project node context:</p>
              </div>
              <div className="context-selector">
                <label>Project Context:</label>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button className="primary-btn" onClick={() => handleOpenTaskDeployer()}>+ Add Task Card</button>
              </div>
            </div>

            <div className="kanban-board">
              {['To Do', 'In Progress', 'Review', 'Done'].map(statusCol => {
                const columnTasks = tasks.filter(t => t.projectId === selectedProjectId && t.status === statusCol);
                return (
                  <div key={statusCol} className="kanban-column">
                    <div className="column-header">
                      <h3>{statusCol}</h3>
                      <span className="col-count">{columnTasks.length}</span>
                    </div>
                    <div className="column-body">
                      {columnTasks.map(task => {
                        const assignee = getUserProfile(task.assigneeId);
                        const isOverdue = task.status !== 'Done' && task.dueDate && new Date(task.dueDate) < new Date(systemDate);
                        return (
                          <div key={task.id} className={`kanban-card ${isOverdue ? 'overdue' : ''}`} onClick={() => handleOpenTaskDeployer(task)}>
                            <div className="kanban-card-header">
                              <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                              {isOverdue && <span className="warning-label-inline">Overdue</span>}
                            </div>
                            <p className="kanban-title">{task.title}</p>
                            <div className="kanban-card-footer">
                              <span className="kanban-assignee" title={assignee.name}>{assignee.avatar} {assignee.name.split(' ')[0]}</span>
                              <span className="kanban-due">{task.dueDate}</span>
                            </div>
                          </div>
                        );
                      })}
                      {columnTasks.length === 0 && (
                        <div className="column-empty">Drop / Add Tasks Here</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            5. GLOBAL CROSS-PROJECT TO-DO LIST VIEW
            ========================================== */}
        {currentView === 'my-todos' && (
          <div className="my-todos-view fade-in">
            <div className="section-header">
              <h2>Unified Workspace Task Ledger</h2>
              <button className="primary-btn" onClick={() => handleOpenTaskDeployer()}>+ Create Task</button>
            </div>

            {/* Filter Hub Panel */}
            <div className="filters-hub card">
              <div className="filter-group">
                <label>Assignee Filter:</label>
                <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                  <option value="all">All Workspace Personnel</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.avatar} {u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Project Map Filter:</label>
                <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                  <option value="all">All Active Project Nodes</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Pipeline Status:</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All Status Pillars</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>

            {/* Structured Table for To-Dos */}
            <div className="table-responsive card">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Task Card Details</th>
                    <th>Associated Project Map</th>
                    <th>Assignee Specialist</th>
                    <th>Priority</th>
                    <th>Due Target</th>
                    <th>Calculated Status</th>
                    <th>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const assignee = getUserProfile(task.assigneeId);
                    const proj = projects.find(p => p.id === task.projectId);
                    const isOverdue = task.status !== 'Done' && task.dueDate && new Date(task.dueDate) < new Date(systemDate);
                    return (
                      <tr key={task.id} className={isOverdue ? 'row-overdue-alert' : ''}>
                        <td>
                          <div className="task-ledger-title">
                            <strong>{task.title}</strong>
                            {isOverdue && <span className="overdue-badge">Overdue Target</span>}
                          </div>
                        </td>
                        <td>{proj ? proj.name : 'Unknown Node'}</td>
                        <td>{assignee.avatar} {assignee.name}</td>
                        <td>
                          <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        </td>
                        <td>{task.dueDate || 'Undefined'}</td>
                        <td>
                          <span className={`status-pill ${task.status.replace(/\s+/g, '-').toLowerCase()}`}>{task.status}</span>
                        </td>
                        <td>
                          <button className="table-action-btn" onClick={() => handleOpenTaskDeployer(task)}>Edit</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan="7" className="empty-cell">No tasks match selected workspace query filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            6. CONFLICT SCHEDULER & MONTH PLANNER
            ========================================== */}
        {currentView === 'calendar' && (
          <div className="calendar-view fade-in">
            <div className="section-header-filters">
              <div>
                <h2>Workspace Resource & Conflict Matrix</h2>
                <p>Plan schedules, track leaf slots, or database tuning. Active month evaluation: <strong>March 2025</strong></p>
              </div>
              <button className="primary-btn" onClick={() => setShowPlanModal(true)}>+ Register New Daily Focus</button>
            </div>

            <div className="calendar-layout-wrapper">
              {/* Left Calendar Grid */}
              <div className="calendar-grid-card card">
                <div className="calendar-days-header">
                  <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                </div>
                <div className="calendar-days-grid">
                  {/* Padding to start Wednesday March 1st */}
                  <div className="calendar-pad-day"></div>
                  <div className="calendar-pad-day"></div>

                  {calendarDays.map(day => {
                    const isSelected = selectedCalendarDate === day.dateString;
                    return (
                      <div 
                        key={day.dayNumber} 
                        className={`calendar-day-cell ${isSelected ? 'selected' : ''} ${day.hasConflict ? 'collision-danger' : ''}`}
                        onClick={() => setSelectedCalendarDate(day.dateString)}
                      >
                        <div className="day-number-header">
                          <span>{day.dayNumber}</span>
                          {day.hasConflict && <span className="collision-warning-orb" title="Workload Collision Alert!">⚠️</span>}
                        </div>
                        <div className="day-plans-preview">
                          {day.plans.slice(0, 2).map(p => {
                            const user = getUserProfile(p.userId);
                            return (
                              <div key={p.id} className={`plan-chip ${p.type}`}>
                                {user.avatar} {p.focusText.slice(0, 10)}...
                              </div>
                            );
                          })}
                          {day.plans.length > 2 && <span className="more-plans-tag">+{day.plans.length - 2} more</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Diagnostics Side Panel */}
              <div className="calendar-diagnostics card">
                <h3>Milestone Diagnostics</h3>
                <p className="sub-label">Evaluation Date: <strong>{selectedCalendarDate}</strong></p>
                
                <div className="diagnostics-event-list">
                  <h4>Scheduled Workspace Activities</h4>
                  {workPlans.filter(p => p.date === selectedCalendarDate).map(p => {
                    const user = getUserProfile(p.userId);
                    return (
                      <div key={p.id} className={`diagnostics-event-item border-${p.type}`}>
                        <div className="item-header">
                          <strong>{user.avatar} {user.name} ({user.role})</strong>
                          <span className={`plan-type-pill ${p.type}`}>{p.type}</span>
                        </div>
                        <p className="plan-text">"{p.focusText}"</p>
                      </div>
                    );
                  })}
                  {workPlans.filter(p => p.date === selectedCalendarDate).length === 0 && (
                    <div className="empty-diagnostics">
                      <p>No specialist allocations registered for this calendar date.</p>
                      <button className="action-link" onClick={() => {
                        setPlanDate(selectedCalendarDate);
                        setShowPlanModal(true);
                      }}>Allocate Day Focus Now</button>
                    </div>
                  )}
                </div>

                {/* Overload Analyzer */}
                <div className="overload-analyser-box">
                  <h4>Collision Matrix Assessment</h4>
                  {(() => {
                    const dayPlans = workPlans.filter(p => p.date === selectedCalendarDate);
                    const counts = {};
                    dayPlans.forEach(p => counts[p.userId] = (counts[p.userId] || 0) + 1);
                    const overloads = Object.entries(counts).filter(([_, count]) => count > 1);
                    
                    if (overloads.length > 0) {
                      return (
                        <div className="analyzer-alert positive">
                          <span className="danger-text">⚠️ CRITICAL OVERLOAD ENCOUNTERED:</span>
                          <ul>
                            {overloads.map(([uid, count]) => {
                              const u = getUserProfile(uid);
                              return (
                                <li key={uid}>
                                  <strong>{u.name}</strong> has been assigned {count} concurrent priority items for this calendar slot.
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    }
                    return (
                      <div className="analyzer-alert negative">
                        <span className="safe-text">✅ Workspace calendar collision matrix looks stable.</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ==========================================
          MODAL: PROJECT PROVISIONING TERMINAL
          ========================================== */}
      {showProvisionModal && (
        <div className="modal-backdrop">
          <div className="modal-panel glass-modal">
            <div className="modal-header">
              <h3>⚡ Project Provisioning Terminal</h3>
              <button className="close-btn" onClick={() => setShowProvisionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleProvisionProject} className="modal-form">
              <div className="form-group">
                <label>Project Node Identifier Name:</label>
                <input 
                  type="text" 
                  placeholder="e.g., Project Gamma" 
                  value={newProjName} 
                  onChange={(e) => setNewProjName(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group">
                <label>Workspace / Target Division:</label>
                <input 
                  type="text" 
                  placeholder="e.g., Systems Platform Core" 
                  value={newProjWorkspace} 
                  onChange={(e) => setNewProjWorkspace(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Technology Stack Frameworks:</label>
                <input 
                  type="text" 
                  placeholder="e.g., Node, Redis, PostgreSQL" 
                  value={newProjTech} 
                  onChange={(e) => setNewProjTech(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Project Objective Description:</label>
                <textarea 
                  placeholder="Describe the workspace objective node parameters..." 
                  value={newProjDesc} 
                  onChange={(e) => setNewProjDesc(e.target.value)}
                ></textarea>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Target Delivery Date:</label>
                  <input 
                    type="date" 
                    value={newProjDeadline} 
                    onChange={(e) => setNewProjDeadline(e.target.value)} 
                  />
                </div>
                <div className="form-group half">
                  <label>Responsible Manager:</label>
                  <select value={newProjManager} onChange={(e) => setNewProjManager(e.target.value)}>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="sec-btn" onClick={() => setShowProvisionModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Initialize Project Node</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: WORKER FOCUS & SCHEDULE PLANNER
          ========================================== */}
      {showPlanModal && (
        <div className="modal-backdrop">
          <div className="modal-panel glass-modal">
            <div className="modal-header">
              <h3>📅 Worker Daily Focus & Month Planner</h3>
              <button className="close-btn" onClick={() => setShowPlanModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePlan} className="modal-form">
              <div className="form-group">
                <label>Select Team Specialist:</label>
                <select value={planUser} onChange={(e) => setPlanUser(e.target.value)}>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.avatar} {u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Focus Allocation Description:</label>
                <input 
                  type="text" 
                  placeholder="e.g., PostgreSQL Performance Optimization" 
                  value={planFocusText} 
                  onChange={(e) => setPlanFocusText(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Target Date Slot (March 2025):</label>
                  <input 
                    type="date" 
                    value={planDate} 
                    onChange={(e) => setPlanDate(e.target.value)} 
                  />
                </div>
                <div className="form-group half">
                  <label>Allocation Stream Classification:</label>
                  <select value={planType} onChange={(e) => setPlanType(e.target.value)}>
                    <option value="focus">Priority Task Block</option>
                    <option value="tuning">Database Tuning Slot</option>
                    <option value="leave">Worker Leave / OOO</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="sec-btn" onClick={() => setShowPlanModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Deploy Schedule Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: TASK DEPLOYER & CARD EDITOR
          ========================================== */}
      {showTaskModal && (
        <div className="modal-backdrop">
          <div className="modal-panel glass-modal">
            <div className="modal-header">
              <h3>{editingTask ? '⚙️ Edit Task Specifications' : '🚀 Deploy New Workspace Task Card'}</h3>
              <button className="close-btn" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveTask} className="modal-form">
              <div className="form-group">
                <label>Task Description Title:</label>
                <input 
                  type="text" 
                  placeholder="e.g., Write API Unit Tests" 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Associated Project Mapping Node:</label>
                  <select value={taskProject} onChange={(e) => setTaskProject(e.target.value)}>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group half">
                  <label>Assigned Resource:</label>
                  <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.avatar} {u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Pillar Column Status:</label>
                  <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="form-group half">
                  <label>System Severity Priority:</label>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Target Delivery Date:</label>
                <input 
                  type="date" 
                  value={taskDueDate} 
                  onChange={(e) => setTaskDueDate(e.target.value)} 
                />
              </div>
              <div className="modal-actions-spaced">
                {editingTask ? (
                  <button type="button" className="danger-btn" onClick={() => handleDeleteTask(editingTask.id)}>
                    Delete Card
                  </button>
                ) : <div />}
                <div className="action-right">
                  <button type="button" className="sec-btn" onClick={() => setShowTaskModal(false)}>Cancel</button>
                  <button type="submit" className="primary-btn">Commit Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




