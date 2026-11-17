# REST API Test Results & Endpoint Verification Log

**Project**: Project Management & Team Collaboration SaaS  
**Host Tested**: `http://localhost:5000/api`  
**Database**: PostgreSQL `project_management_saas`  
**Execution Timestamp**: November 2026  
**Total Endpoints Tested**: 50+  
**Execution Outcome**: **100% Passed**  

---

## 1. Authentication Endpoints (`/api/auth`)

| Endpoint | Method | Payload / Params | Status Code | Response Verification |
| :--- | :---: | :--- | :---: | :--- |
| `/api/auth/register` | `POST` | Valid Name, Email, Password | `201 Created` | Sanitized user profile returned; no `password_hash`. |
| `/api/auth/register` | `POST` | Existing Email | `409 Conflict` | Message: "An account with this email already exists". |
| `/api/auth/register` | `POST` | Missing password | `400 Bad Request` | Zod validation error on `password`. |
| `/api/auth/register` | `POST` | Password < 8 characters | `400 Bad Request` | Zod validation error: minimum 8 characters. |
| `/api/auth/login` | `POST` | Valid credentials | `200 OK` | `set-cookie: projectflow_session=<jwt>` set; user profile returned. |
| `/api/auth/login` | `POST` | Wrong password | `401 Unauthorized` | Generic message: "Invalid email or password". |
| `/api/auth/login` | `POST` | Unknown email | `401 Unauthorized` | Generic message: "Invalid email or password". |
| `/api/auth/me` | `GET` | Valid JWT in cookie or Bearer | `200 OK` | Authenticated user profile (`id`, `name`, `email`, `avatar_url`). |
| `/api/auth/me` | `GET` | Tampered JWT signature | `401 Unauthorized` | Message: "Invalid or expired authentication token". |
| `/api/auth/me` | `GET` | No token supplied | `401 Unauthorized` | Message: "Authentication token is required". |
| `/api/auth/password/change`| `POST` | Current & new password | `200 OK` | Password updated; old password rejected on subsequent login. |
| `/api/auth/logout` | `POST` | Active session | `200 OK` | Token version incremented; session cookie cleared. |

---

## 2. Organization Endpoints (`/api/organizations`)

| Endpoint | Method | Payload / Params | Status Code | Response Verification |
| :--- | :---: | :--- | :---: | :--- |
| `/api/organizations` | `GET` | None | `200 OK` | Lists organizations where user is a member. |
| `/api/organizations` | `POST` | `{ name: "Org Name" }` | `201 Created` | Created organization; creator assigned `owner` role. |
| `/api/organizations/:id` | `GET` | Organization ID | `200 OK` | Returns organization details. |
| `/api/organizations/:id` | `PATCH` | `{ name: "New Name" }` | `200 OK` | Organization name updated by Owner. |
| `/api/organizations/:id/members`| `GET` | Organization ID | `200 OK` | Returns organization members list with roles. |
| `/api/organizations/:id/invitations`| `POST` | `{ email, role }` | `201 Created` | Creates pending invitation; generates secure invite URL. |
| `/api/organizations/:id/invitations`| `GET` | Organization ID | `200 OK` | Returns list of pending invitations. |

---

## 3. Workspace Endpoints (`/api/workspaces`)

| Endpoint | Method | Payload / Params | Status Code | Response Verification |
| :--- | :---: | :--- | :---: | :--- |
| `/api/workspaces` | `GET` | None | `200 OK` | Returns workspaces belonging to user. |
| `/api/workspaces` | `POST` | `{ name, organizationId }` | `201 Created` | Creates workspace; creator assigned `owner` in workspace. |
| `/api/workspaces/:id` | `GET` | Workspace ID | `200 OK` | Returns workspace details. |
| `/api/workspaces/:id/dashboard`| `GET` | Workspace ID | `200 OK` | Summary metrics: task counts, completed tasks, project counts. |
| `/api/workspaces/:id/members`| `GET` | Workspace ID | `200 OK` | Lists workspace members and assigned roles. |
| `/api/workspaces/:id/teams` | `GET` | Workspace ID | `200 OK` | Returns workspace teams list. |
| `/api/workspaces/:id/teams` | `POST` | `{ name: "Team Name" }` | `201 Created` | Manager/Owner creates team. |
| `/api/workspaces/:id/teams/:teamId`| `DELETE` | Team ID (by Employee) | `403 Forbidden` | Access blocked for employees without manager role. |

---

## 4. Project Endpoints (`/api/workspaces/:workspaceId/projects`)

| Endpoint | Method | Payload / Params | Status Code | Response Verification |
| :--- | :---: | :--- | :---: | :--- |
| `.../projects` | `GET` | Search / Status / Sort | `200 OK` | Returns projects with owner_name, manager_name, progress_percentage. |
| `.../projects` | `POST` | Name, startDate, deadline, managerId | `201 Created` | Creates project; associates project manager. |
| `.../projects/:id` | `GET` | Project ID | `200 OK` | Returns full project details and task progress metrics. |
| `.../projects/:id` | `PATCH` | Updated fields | `200 OK` | Manager/Owner updates project attributes. |
| `.../projects/:id` | `DELETE` | By Employee | `403 Forbidden` | Employees forbidden from deleting projects. |
| `.../projects/:id/members`| `GET` | Project ID | `200 OK` | Returns list of project team members. |
| `.../projects/:id/members`| `POST` | `{ userId, role }` | `201 Created` | Adds member to project team. |
| `.../projects/:id/members/:userId`| `DELETE` | User ID | `204 No Content` | Removes member from project. |
| `.../projects/:id/timeline`| `GET` | Project ID | `200 OK` | Returns milestones and scheduled tasks for Gantt chart. |
| `.../projects/:id/milestones`| `POST` | `{ name, dueDate }` | `201 Created` | Creates project milestone. |

---

## 5. Task & Workflow Endpoints (`/api/workspaces/:workspaceId/tasks`)

| Endpoint | Method | Payload / Params | Status Code | Response Verification |
| :--- | :---: | :--- | :---: | :--- |
| `.../tasks` | `GET` | Filter by `status`, `priority` | `200 OK` | Returns workspace tasks matching filter criteria. |
| `.../tasks` | `POST` | Title, priority, assigneeId | `201 Created` | Task created; assignment notification generated. |
| `.../tasks/:id` | `GET` | Task ID | `200 OK` | Returns task, labels, subtasks_count, progress_percentage. |
| `.../tasks/:id` | `PATCH` | Employee updates status | `200 OK` | Employee permitted to update status on assigned task. |
| `.../tasks/:id` | `PATCH` | Employee modifies title | `403 Forbidden` | Restricted: employees can only update task status. |
| `.../tasks/:id` | `DELETE` | Task ID by Manager | `204 No Content` | Task and associated attachments removed. |
| `.../tasks/:id/subtasks` | `POST` | `{ title: "Subtask 1" }` | `201 Created` | Subtask created; task progress recalculated. |
| `.../tasks/:id/subtasks/:subId`| `PATCH` | `{ isCompleted: true }` | `200 OK` | Progress increments (0% -> 50% -> 100%). |
| `.../tasks/:id/labels` | `POST` | `{ labelId }` | `201 Created` | Label attached to task. |
| `.../tasks/:id/labels` | `GET` | Task ID | `200 OK` | Returns labels associated with task. |
| `.../tasks/:id/comments` | `POST` | Body with `@email` mention | `201 Created` | Comment saved; mention notification generated. |
| `.../tasks/:id/comments/:cId`| `PATCH` | By author | `200 OK` | Author edits comment. Non-author edit blocked (403). |
| `.../tasks/:id/attachments` | `POST` | Multipart PDF upload | `201 Created` | File signature validated; attachment saved. |
| `.../tasks/:id/attachments` | `POST` | Upload > 10MB | `413 / 400` | Large payload rejected; rejected upload purged. |

---

## 6. Time Tracking, Notifications & Analytics

| Endpoint | Method | Payload / Params | Status Code | Response Verification |
| :--- | :---: | :--- | :---: | :--- |
| `.../time-entries/start` | `POST` | `{ taskId }` | `201 Created` | Starts live timer for user. |
| `.../time-entries/start` | `POST` | Duplicate active timer | `409 Conflict` | Second active timer rejected. |
| `.../tasks/:id/time-entries/:eId/stop` | `POST` | Stop active timer | `200 OK` | Timer stopped; duration recorded. |
| `.../projects/:id/time-summary` | `GET` | Project ID | `200 OK` | Returns aggregated tracked time per project. |
| `.../notifications` | `GET` | None | `200 OK` | Returns notifications list with unread flags. |
| `.../notifications/read-all` | `POST` | None | `200 OK` | Marks all user notifications read. |
| `.../activity` | `GET` | `?limit=10` | `200 OK` | Returns chronological audit log of workspace events. |
| `.../analytics` | `GET` | None | `200 OK` | Returns completion rates, on-time delivery %, trends. |
| `.../workload` | `GET` | None | `200 OK` | Returns assigned hours & task load per team member. |
| `.../analytics/export.csv` | `GET` | None | `200 OK` | Returns RFC-compliant CSV with project analytics headers. |
