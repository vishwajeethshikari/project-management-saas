# End-to-End Bug & Remediation Report

**Project**: Project Management & Team Collaboration SaaS  
**Report Date**: November 2026  
**Status**: All Discovered Defects Remediated & Verified  

---

## 1. Summary of Discovered & Resolved Issues

During the comprehensive audit and test execution cycles, 6 distinct functional, relational, and integration defects were discovered across backend routes, database schema constraints, and frontend test expectations. All issues have been resolved, regression-tested, and verified in production code.

---

## 2. Detailed Defect Logs

### Defect 1: Migration 010 File Zero-Byte Truncation
- **Component**: `database/migrations/010_project_members_and_enhancements.sql` & `backend/test/migration.test.js`
- **Severity**: Critical
- **Symptoms**: `backend/test/migration.test.js` threw `AssertionError: The input did not match the regular expression /CREATE TABLE IF NOT EXISTS project_members/i. Input: ''`.
- **Root Cause**: The physical migration file on disk was 0 bytes due to an earlier unbuffered file flush.
- **Remediation**:
  Re-authored and verified the complete migration script:
  ```sql
  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

  CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_members UNIQUE (project_id, user_id)
  );
  ```
- **Verification**: `backend/test/migration.test.js` passed 9/9 non-destructive schema tests.

---

### Defect 2: Missing Workspace Label and Task Query Endpoints in `taskController.js`
- **Component**: `backend/src/controllers/taskController.js`
- **Severity**: High
- **Symptoms**: Requests to `POST /api/workspaces/:id/labels`, `GET /api/workspaces/:id/tasks`, `GET /api/workspaces/:id/my-work`, and `GET /api/workspaces/:id/search` failed with HTTP 500 (`TypeError: c.createWorkspaceLabel is not a function`).
- **Root Cause**: Route declarations in `taskRoutes.js` expected workspace-scoped label, task listing, my-work, and search controller functions that had not been exported.
- **Remediation**:
  Implemented and exported in `taskController.js`:
  - `listWorkspaceLabels` and `createWorkspaceLabel` (validated by `labelSchema`).
  - `listTaskLabels`, `addTaskLabel`, and `removeTaskLabel`.
  - `listWorkspaceTasks` with status, priority, assignee, and project filters.
  - `getMyWork` with overdue, due today, upcoming buckets and summary stats.
  - `globalSearch` matching projects, tasks, and workspace members.
  - `updateComment` and `deleteComment` with author & manager role checks.
- **Verification**: All 18 checks in `scripts/test-new-endpoints.js` passed.

---

### Defect 3: Missing `workspace_id` in `task_labels` Insertion
- **Component**: `backend/src/controllers/taskController.js` (`addTaskLabel`)
- **Severity**: Medium
- **Symptoms**: Adding a label to a task threw HTTP 500 with PostgreSQL error `null value in column "workspace_id" of relation "task_labels" violates not-null constraint`.
- **Root Cause**: Migration `003_expand_task_workflows.sql` defines `task_labels` with `workspace_id BIGINT NOT NULL`. The original insertion query only supplied `task_id` and `label_id`.
- **Remediation**:
  Updated insertion query to pass `req.workspaceId`:
  ```javascript
  await pool.query(
    "INSERT INTO task_labels (workspace_id, task_id, label_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [req.workspaceId, req.params.taskId, labelId]
  );
  ```
- **Verification**: Automated test `LABEL-02` succeeded with HTTP 201.

---

### Defect 4: Subtask Column Name Discrepancy (`s.completed` vs `s.is_completed`)
- **Component**: `backend/src/controllers/taskController.js` (`getTask` and `listWorkspaceTasks`)
- **Severity**: High
- **Symptoms**: Querying task details failed with PostgreSQL error `error: column s.completed does not exist`.
- **Root Cause**: SQL query in `taskController.js` used `WHERE s.completed = true`, but PostgreSQL schema in migration `003` defines the column as `is_completed BOOLEAN NOT NULL DEFAULT FALSE`.
- **Remediation**:
  Replaced all occurrences of `s.completed` with `s.is_completed = true` in progress aggregation queries:
  ```sql
  (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.is_completed = true)::int AS completed_subtasks_count
  ```
- **Verification**: `SUBTASK-02` through `SUBTASK-05` verified dynamic progress calculation from 0% to 50% to 100%.

---

### Defect 5: Missing Bulk Notification & Notification Deletion Handlers
- **Component**: `backend/src/controllers/collaborationController.js`
- **Severity**: Medium
- **Symptoms**: Invoking `POST /api/workspaces/:workspaceId/notifications/read-all` or `DELETE /api/workspaces/:workspaceId/notifications/:id` threw HTTP 500 (`markAllNotifications is not a function`).
- **Root Cause**: Functions were routed in `collaborationRoutes.js` but omitted from `collaborationController.js`.
- **Remediation**:
  Implemented and exported `markAllNotifications` and `deleteNotification` scoped by `workspace_id` and `user_id`.
- **Verification**: Test `NOTIF-03` passed and returned HTTP 200 marking all notifications as read.

---

### Defect 6: Frontend Test Component Mounting Discrepancy
- **Component**: `frontend/src/App.jsx` & `frontend/src/App.test.jsx`
- **Severity**: Medium
- **Symptoms**: `npm test --prefix frontend` failed on `loads task files and uploads through multipart form data` and `shows a dated task and saves a rescheduled deadline` (`TypeError: Cannot read properties of undefined (reading 'click')`).
- **Root Cause**: App.jsx had restructured default landing state to an unselected dashboard view, hiding task cards and the Calendar toggle button on initial mount.
- **Remediation**:
  Restored tested App structure ensuring tasks list and Calendar toggle button (`<button>Calendar</button>`) remain accessible in default view state while retaining all 11 role-gated navigation tabs.
- **Verification**: `npm test --prefix frontend` passed all 11/11 tests. Production build completed in 367ms.
