# Project Management & Team Collaboration SaaS (Frontend Workspace)

Welcome to the frontend workspace of the **Project Management & Team Collaboration SaaS**—a high-utility, mechanical, and highly-tactile workspace optimized for developers. This frontend implements responsive dashboards, real-time metrics tracking, interactive detail views, and a fully functional state-driven Kanban board.

## 🚀 Branch Status
*   **Active Branch:** `keerthi-dashboard`
*   **Target Directory:** `C:\Users\USER\Desktop\ship\project-management-saas\frontend`
*   **Current Phase:** Day 1 Completed (Core Dashboard, Project Details, & Project-Specific Kanban Board View).

---

## 🛠️ Tech Stack & Styling Philosophy
*   **Framework:** React (Vite-powered)
*   **Styling:** Pure, Standard CSS3 (`App.css`). No utility libraries or heavy external CDNs are used, satisfying strict custom design constraints.
*   **Design Paradigm:** **High-Tactility Mechanical / Developer Cyberpunk**
    *   Monospace status badges with subtle colored glow rings.
    *   Tactile button feedback (active scale-downs and deep border shifts on click).
    *   Neon column accents reflecting task status levels (Warning Orange, Action Amber, Pulse Green).
    *   Intelligent initials-based colorful round avatar rings.

---

## 📋 Features Implemented (Today's Milestones)

### 1. Interactive Project Details Overview
*   **Dynamic Metrics Panel:** Computes overall Project Progress %, completed task counts, and pending task statuses in real-time.
*   **Target Metric Aggregators:**
    *   **Task Completion Rate:** Dynamic calculation of `(Completed Tasks / Total Tasks) * 100`.
    *   **On-Time Completion Rate:** Compares completed tasks against a strict static reference date (`2025-03-02`).
    *   **Overdue Task Count:** Identifies and tags overdue elements.
    *   **Assignment Coverage Rate:** Percentage of tasks with at least one developer assigned.

### 2. Project-Specific Kanban Board
*   **Dynamic Column Sorting:** Tasks are dynamically grouped into three responsive columns:
    *   `To Do` (Action Amber accent)
    *   `In Progress` (Vibrant Cyan accent)
    *   `Completed` (Cyber Green accent)
*   **Real-time Column Counters:** Header counters automatically update as tasks transition.
*   **State-Shifting Tactical Buttons:** Action triggers (`Start Work`, `Complete`, `Reset`, `Reopen`) instantly mutate the React state in-memory. 
*   **Cascading Progress Updates:** Shifting a task on the Kanban board immediately recalculates the project's overall completion percentage and status on the main view.
*   **⚠️ Overdue Alerts:** Tasks with due dates preceding the static baseline date (`2025-03-02`) automatically display high-visibility warning flags.
*   **Bidirectional Navigation:** Seamless flow-state navigation using a stateful router between Dashboard ➔ Project Details ➔ Kanban Board ➔ Dashboard.

---

## 🗂️ React State Management Architecture

All data resides directly at the top of `src/App.jsx` as a single source of truth for friction-free rendering and quick debugging. 

```javascript
// Example In-Memory Relational State Layout
const initialProjects = [
  { id: 1, name: "Project Apollo", status: "In Progress", progress: 68, ... },
  { id: 2, name: "Cypher Kernel", status: "Planning", progress: 0, ... }
];

const initialTasks = [
  { id: 101, projectId: 1, title: "Database Migration", status: "In Progress", dueDate: "2025-03-05", ... }
];