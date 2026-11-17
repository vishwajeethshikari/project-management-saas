# SaaS Verification Test Cases & Matrix

This document catalogs the test cases executed against the Project Management & Team Collaboration SaaS platform, detailing the Test ID, Category, Scenario, Test Input, Expected Result, Actual Result, and Execution Status.

---

## 1. System Health & Infrastructure

| Test ID | Module | Scenario | Test Inputs | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HEALTH-01** | System | API Server Liveness Check | `GET /api/health` | HTTP 200 with `{ success: true, message: "Project Management API is running" }` | HTTP 200 returned matching payload | **PASS** |
| **HEALTH-02** | System | PostgreSQL Database Readiness | `GET /api/ready` | HTTP 200 with `{ success: true, message: "API and PostgreSQL are ready" }` | HTTP 200 returned confirming pool connectivity | **PASS** |
| **BUILD-01** | Client | Frontend Static Analysis | `eslint .` | 0 syntax errors, 0 lint warnings | 0 errors, 0 warnings across all components | **PASS** |
| **BUILD-02** | Client | Production Bundle Compilation | `vite build` | Clean compilation with minified JS/CSS chunks | Compiled in 367ms (`index.html`, CSS, JS) | **PASS** |

---

## 2. Authentication & Session Management

| Test ID | Module | Scenario | Test Inputs | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Auth | Valid User Registration | `POST /api/auth/register` with valid name, email, password | HTTP 201; returns sanitized user object without `password_hash` | HTTP 201; password hash omitted | **PASS** |
| **AUTH-02** | Auth | Duplicate Email Registration | `POST /api/auth/register` with previously registered email | HTTP 409 Conflict with friendly duplicate message | HTTP 409 Conflict returned | **PASS** |
| **AUTH-03** | Auth | Missing Required Fields | `POST /api/auth/register` missing password field | HTTP 400 Bad Request with validation errors | HTTP 400 Bad Request with field error | **PASS** |
| **AUTH-04** | Auth | Malformed Email Validation | `POST /api/auth/register` with `not-an-email` | HTTP 400 Bad Request | HTTP 400 rejected invalid email format | **PASS** |
| **AUTH-05** | Auth | Weak Password Rejection | `POST /api/auth/register` with 5-character password | HTTP 400 Bad Request (minimum 8 characters required) | HTTP 400 rejected weak password | **PASS** |
| **AUTH-06** | Auth | Valid Login & Cookie Issue | `POST /api/auth/login` with correct email and password | HTTP 200; `set-cookie` header with `projectflow_session` HttpOnly | HTTP 200 with secure session cookie | **PASS** |
| **AUTH-07** | Auth | Invalid Password Login | `POST /api/auth/login` with incorrect password | HTTP 401 Unauthorized with generic message | HTTP 401 returned | **PASS** |
| **AUTH-08** | Auth | Nonexistent Email Login | `POST /api/auth/login` with unknown email | HTTP 401 Unauthorized with generic message | HTTP 401 returned; no timing leakage | **PASS** |
| **AUTH-09** | Auth | Tampered JWT Signature | `GET /api/auth/me` with modified signature token | HTTP 401 Unauthorized; token rejection | HTTP 401 Unauthorized | **PASS** |
| **AUTH-10** | Auth | Unauthenticated API Access | `GET /api/auth/me` without Authorization or Cookie | HTTP 401 Unauthorized | HTTP 401 returned | **PASS** |
| **AUTH-11** | Auth | Authenticated Profile Check | `GET /api/auth/me` with valid JWT session | HTTP 200 with user profile (`id`, `name`, `email`, `avatar_url`) | HTTP 200 with expected user profile | **PASS** |
| **AUTH-12** | Auth | Password Change Verification | `POST /api/auth/password/change` with current & new password | HTTP 200; subsequent login with old password fails (401), new succeeds (200) | HTTP 200; old password revoked | **PASS** |

---

## 3. Multi-Tenancy & Data Isolation

| Test ID | Module | Scenario | Test Inputs | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ORG-01** | Tenant | Organization Creation | `POST /api/organizations` by Owner A | HTTP 201; organization record created with owner membership | HTTP 201 with organization ID | **PASS** |
| **WS-01** | Tenant | Workspace Creation | `POST /api/workspaces` referencing Organization A | HTTP 201; workspace created with owner role assigned | HTTP 201 with workspace ID | **PASS** |
| **TENANT-01** | Tenant | Cross-Tenant Dashboard Access | Org B Owner accesses `GET /api/workspaces/{WorkspaceAId}/dashboard` | HTTP 404/403 Access Denied | HTTP 404 Not Found (resource hidden) | **PASS** |
| **TENANT-02** | Tenant | Cross-Tenant Projects List | Org B Manager accesses `GET /api/workspaces/{WorkspaceAId}/projects` | HTTP 404/403 Access Denied | HTTP 404 Not Found | **PASS** |
| **TENANT-03** | Tenant | Cross-Tenant Task Retrieval | Org B Employee accesses `GET /api/workspaces/{WorkspaceAId}/tasks/{TaskAId}` | HTTP 404/403 Access Denied | HTTP 404 Not Found | **PASS** |
| **TENANT-04** | Tenant | Cross-Tenant Comments Access | Org B Owner accesses `GET /api/workspaces/{WorkspaceAId}/tasks/{TaskAId}/comments` | HTTP 404/403 Access Denied | HTTP 404 Not Found | **PASS** |
| **TENANT-05** | Tenant | Cross-Tenant Members Access | Org B Owner accesses `GET /api/workspaces/{WorkspaceAId}/members` | HTTP 404/403 Access Denied | HTTP 404 Not Found | **PASS** |
| **TENANT-06** | Tenant | Cross-Tenant ID Injection | Create task in Workspace B referencing Project A ID | HTTP 404/400 (Foreign project rejected) | HTTP 404 Project not found in workspace | **PASS** |

---

## 4. Role-Based Access Control (RBAC)

| Test ID | Module | Scenario | Test Inputs | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RBAC-01** | RBAC | Employee Project Deletion Attempt | Employee sends `DELETE /api/workspaces/{id}/projects/{id}` | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-02** | RBAC | Employee Task Edit (Non-Status) | Employee attempts to modify title of task | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-03** | RBAC | Employee Assigned Status Update | Employee updates status from `todo` to `in_progress` on assigned task | HTTP 200 OK; task status updated | HTTP 200 OK; status updated | **PASS** |
| **RBAC-04** | RBAC | Manager Task Details Update | Manager updates title, priority, estimate | HTTP 200 OK | HTTP 200 OK with updated attributes | **PASS** |
| **RBAC-05** | RBAC | Manager Team Creation | Manager sends `POST /api/workspaces/{id}/teams` | HTTP 201 Created | HTTP 201 Created with team ID | **PASS** |
| **RBAC-06** | RBAC | Employee Team Deletion Attempt | Employee sends `DELETE /api/workspaces/{id}/teams/{id}` | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |

---

## 5. Project & Task Workflows

| Test ID | Module | Scenario | Test Inputs | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PROJ-01** | Project | Project Creation with Start & Deadline | `POST /api/workspaces/{id}/projects` with start_date & deadline | HTTP 201 with project record | HTTP 201 with dates preserved | **PASS** |
| **TASK-01** | Task | Task Creation with Priority | `POST /api/workspaces/{id}/tasks` with priority `high` | HTTP 201 with task record | HTTP 201 with priority recorded | **PASS** |
| **SUBTASK-01**| Task | Subtask Creation | `POST /api/workspaces/{id}/tasks/{id}/subtasks` | HTTP 201 with subtask record | HTTP 201 created subtask | **PASS** |
| **SUBTASK-02**| Task | Initial Subtask Progress (0%) | Query task with 2 incomplete subtasks | `progress_percentage`: 0 | `progress_percentage`: 0 verified | **PASS** |
| **SUBTASK-03**| Task | Partial Subtask Progress (50%)| Complete 1 of 2 subtasks | `progress_percentage`: 50 | `progress_percentage`: 50 verified | **PASS** |
| **SUBTASK-04**| Task | Complete Subtask Progress (100%)| Complete 2 of 2 subtasks | `progress_percentage`: 100 | `progress_percentage`: 100 verified | **PASS** |
| **SUBTASK-05**| Task | Reopened Subtask Progress | Mark 1 completed subtask as incomplete | `progress_percentage`: 50 | `progress_percentage`: 50 verified | **PASS** |
| **LABEL-01** | Label | Create Workspace Label | `POST /api/workspaces/{id}/labels` with name & color | HTTP 201 with label record | HTTP 201 label created | **PASS** |
| **LABEL-02** | Label | Assign Label to Task | `POST /api/workspaces/{id}/tasks/{id}/labels` | HTTP 201 Created | HTTP 201 association created | **PASS** |
| **LABEL-03** | Label | List Task Labels | `GET /api/workspaces/{id}/tasks/{id}/labels` | HTTP 200 containing assigned label | HTTP 200 contains assigned label | **PASS** |
| **FILTER-01** | Filter | Filter Tasks by Status | `GET /api/workspaces/{id}/tasks?status=in_progress` | Returns only tasks with status `in_progress` | All returned tasks have status `in_progress` | **PASS** |
| **FILTER-02** | Filter | Filter Tasks by Priority | `GET /api/workspaces/{id}/tasks?priority=critical` | Returns only tasks with priority `critical` | All returned tasks have priority `critical` | **PASS** |

---

## 6. Collaboration, Notifications & Security

| Test ID | Module | Scenario | Test Inputs | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **COMM-01** | Comment | Create Task Comment | `POST /api/workspaces/{id}/tasks/{id}/comments` | HTTP 201 with comment record | HTTP 201 Created | **PASS** |
| **NOTIF-01** | Notif | User Mention Notification | Comment body with `@employee@example.com` | Notification record generated for mentioned employee | Mention notification created in PostgreSQL | **PASS** |
| **NOTIF-02** | Notif | List Notifications | `GET /api/workspaces/{id}/notifications` | Returns notifications list with unread flags | Returns list including mention event | **PASS** |
| **NOTIF-03** | Notif | Mark All Read | `POST /api/workspaces/{id}/notifications/read-all` | HTTP 200; `is_read` updated to `true` | HTTP 200; all marked read | **PASS** |
| **ACT-01** | Audit | Activity Log Recording | Actions on project, task, comment | Records in `activity_logs` table with actor and details | Audit records queryable in order | **PASS** |
| **SEC-01** | Security| SQL Injection Probe in Search | `GET /api/workspaces/{id}/search?q=' OR '1'='1` | HTTP 200 with sanitized query execution | Handled safely via parameterized query | **PASS** |
| **SEC-02** | Security| Stored XSS Mitigation | Task title `<script>alert('xss')</script>` | Stored as text; React escapes on render | Stored literally, safely returned | **PASS** |
| **SEC-03** | Security| Negative ID Parameter Validation| `GET /api/workspaces/{id}/tasks/-999` | HTTP 400 Bad Request or 404 Not Found | HTTP 400 rejected invalid ID | **PASS** |
| **TIME-01** | Time | Start Active Timer | `POST /api/workspaces/{id}/time-entries/start` | HTTP 201 with active timer record | HTTP 201 active timer started | **PASS** |
| **TIME-02** | Time | Duplicate Timer Prevention | Attempt starting second timer while first is running | HTTP 409 Conflict | HTTP 409 Conflict returned | **PASS** |
| **TIME-03** | Time | Stop Active Timer | `POST /api/workspaces/{id}/tasks/{id}/time-entries/{id}/stop` | HTTP 200 with calculated duration | HTTP 200 duration calculated | **PASS** |
| **MILESTONE-01**| Time | Create Milestone | `POST /api/workspaces/{id}/projects/{id}/milestones` | HTTP 201 Created | HTTP 201 Created | **PASS** |
| **TIMELINE-01**| Time | Get Project Timeline | `GET /api/workspaces/{id}/projects/{id}/timeline` | HTTP 200 with tasks and milestones | HTTP 200 with timeline array | **PASS** |
| **ANALYTICS-01**| Analytics| Workspace Analytics | `GET /api/workspaces/{id}/analytics` | HTTP 200 with completion metrics | HTTP 200 returned metrics | **PASS** |
| **ANALYTICS-02**| Analytics| Team Workload Report | `GET /api/workspaces/{id}/workload` | HTTP 200 with member workload | HTTP 200 returned array | **PASS** |
| **ANALYTICS-03**| Analytics| CSV Export | `GET /api/workspaces/{id}/analytics/export.csv` | HTTP 200 with `text/csv` attachment | HTTP 200 with CSV string | **PASS** |
| **INVITE-01** | Org | Organization Invitation | `POST /api/organizations/{id}/invitations` | HTTP 201 with tokenized invite link | HTTP 201 with invite URL | **PASS** |
| **INVITE-02** | Org | List Organization Invitations | `GET /api/organizations/{id}/invitations` | HTTP 200 with pending invitations list | HTTP 200 list returned | **PASS** |
| **DB-01** | Database| Foreign Key Integrity Check | Query PostgreSQL for orphaned workspace members | Count = 0 | Count = 0 verified | **PASS** |
| **DB-02** | Database| Task Foreign Key Integrity Check | Query PostgreSQL for orphaned tasks | Count = 0 | Count = 0 verified | **PASS** |
| **DB-03** | Database| Subtask Foreign Key Integrity Check| Query PostgreSQL for orphaned subtasks | Count = 0 | Count = 0 verified | **PASS** |
