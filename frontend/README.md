# FlowBoard — Enterprise Project & Task Management SaaS Core
> **Developer:** Keerthi (Project & Task Management Lead)  
> **Target Branch:** `keerthi-dashboard`  
> **Base Style Palette:** Glassmorphic Dark Developer-Cyberpunk (Deep Purples, Pinks, Neon Cyan, and Transparent Overlays)

---

## 🚀 Overview & Division of Labor
This module houses the fully interactive, relational **Project & Task Management Engine** designed for Page 5-9 requirements of the Enterprise Software SaaS specification. All metrics, task states, calendar planning slots, and project nodes operate dynamically in a single-page reactive architecture.

### My Area of Responsibility (Completed)
- **Home/Dashboard Page:** A high-level control panel tracking global SaaS metrics (Completion Rates, Overdue Counts, Coverage Rates) calculated on the fly.
- **My Projects Listing Page:** A high-visibility view mapping all initialized project nodes, tech stacks, and team scopes.
- **Project Details/Diagnostics overview:** A deep-dive panel detailing individual node metrics, specifications, and associated live task tickets.
- **Kanban Board Column Workflows:** Responsive column boards representing pipeline structures (`To Do`, `In Progress`, `Review`, `Done`) with inline overdue indicators and context locking.
- **Unified Global To-Dos Page:** A tabular, high-density ledger listing all tasks across projects with real-time dropdown filters (Assignee, Project context, status).
- **Worker Focus & Conflict Matrix (Calendar View):** A monthly planner allowing planners to schedule specific daily tasks, DB tuning sessions, or leave requests with smart double-booking alerts.
- **Interactive Modals:** Dynamic modal interfaces handling full task CRUD operations (Create, Edit, Delete) on the fly.
- **Role-Based Access Control (RBAC) Switcher:** Fully simulated and enforced permissions for `Owner`, `Manager`, and `Employee` clearance.

---

## 🛠️ Key Technical Features & Implementation Details

### 1. Dynamic Analytical Engine (Page 7 Compliance)
All success KPIs calculate on the fly inside reactive hooks using relational models:
*   **Task Completion Rate:** $\frac{\text{Completed Eligible Tasks}}{\text{Total Eligible Tasks}} \times 100$
*   **On-Time Completion Rate:** $\frac{\text{Tasks Completed on or before Due Date}}{\text{Tasks Completed with valid Due Dates}} \times 100$
*   **Overdue Task Counter:** Scans active tasks matching criteria: `status !== 'Done'` and `dueDate < systemDate` (March 2, 2025).
*   **Assignment Coverage Rate:** $\frac{\text{Tasks with an Assigned Specialist}}{\text{Total Active Tasks}} \times 100$

### 2. Relational Schema Structure (Database-Ready)
Data states are split into independent entity arrays mimicking clean database tables:
- `users`: ID-indexed workspace accounts containing distinct security roles (`owner`, `manager`, `employee`).
- `projects`: Nodes with descriptors, workspaces, and targeted deadlines.
- `tasks`: Tickets linked directly to `projectId` and `assigneeId` foreign keys.
- `workPlans`: Calendar schedule blocks containing planning types and dates.

### 3. Client-Side Authorization Gatekeeper (Page 6 & 7 Compliance)
Features dynamic UI restrictions based on the logged-in credentials:
*   **Owner (Elena):** Full read/write and project provisioning clearance.
*   **Manager (Sarah):** Task and planning clearance; project creation terminal is locked.
*   **Employee (Alex/Dave):** Read-only dashboards and calendars. Can **only** edit or transition status for task cards explicitly assigned to their user ID. Other cards are locked (`🔒 Locked`).

---

## 📦 Local Setup and Development Instructions

1. **Navigate to the frontend workspace directory:**
   ```bash
   cd C:\Users\USER\Desktop\ship\project-management-saas\frontend