# Project Management & Team Collaboration SaaS — Audit and Phase C verification

**Audit basis:** initial source audit on `feature/full-stack-integration` followed by Phase B read-only database inspection and Phase C smoke verification on 2026-11-16. The Phase B/C findings below supersede earlier notes that the live database could not be inspected. Runtime claims are limited to the commands and endpoints explicitly marked Verified.

## Executive summary

The repository contains a broad full-stack implementation: authentication, organization/workspace membership, projects/tasks, team collaboration, attachments, notifications, reporting, time tracking, recurrence, timeline, and analytics. Phase C verified the core API smoke path and applied the missing attachment schema on the live application database. The product still uses a large single React screen rather than complete navigable pages, and security/authorization consistency needs further review. A safety snapshot commit preserves the prior working tree; the pre-existing modified backend env example remains excluded from commits.

| Module | Estimated completion from source review |
|---|---:|
| Auth and account recovery | 75% |
| Organization/workspace access | 65% |
| Projects, tasks, teams | 70% |
| Collaboration (comments, files, activity, notifications) | 60% |
| Calendar, timeline, time tracking, recurring tasks | 60% |
| Analytics and reports | 55% |
| Frontend navigation and UX | 45% |
| Production security/operations | 40% |
| **Overall** | **~60%** |

These are audit estimates, not test-coverage or runtime claims.

### Ten highest-priority findings

1. **Attachment schema was missing on the live database.** Migration 006 was applied and catalog checks now show the table, ten columns, and index. Name-level migration comparison passes; `CREATE TABLE IF NOT EXISTS` still does not repair incompatible pre-existing columns.
2. **Workspace access depends on paired memberships.** `requireWorkspaceMember` checks both membership tables. Migration 009 backfills legacy gaps idempotently; workspace creation and invitation acceptance now write both rows in one transaction.
3. **Role policy is centralized and documented.** Organization and workspace middleware use `backend/src/security/roles.js`; product-role mapping and endpoint actions are recorded in `docs/ROLES.md`.
4. **Route IDs are validated before controller queries.** Every route parameter in the organization, workspace, team, project, task, comment, subtask, dependency, attachment, time-entry, recurring-task, notification, and milestone routes uses `validateIds`; invalid numeric IDs return 400.
5. **A pre-existing environment template remains modified.** It was intentionally excluded from the snapshot commit; all other audited work was preserved on the safety branch and current feature branch.
6. **No `helmet`, rate limiter, or explicit XSS sanitization is installed.** Input validation exists in places via Zod, but not all request surfaces are proven validated. CORS uses an allowlist defaulting to local Vite origins.
7. **No change-password endpoint or credential re-authentication path exists.** Profile update changes only the name; forgot/reset is implemented.
8. **Frontend is a monolithic `App.jsx` with state-driven modes.** There is no React Router or route-level protected-route component; authentication gating is app initialization state.
9. **Keyboard-equivalent board reordering is not apparent.** Board status updates use interactive controls/drag state; accessible keyboard alternative was not found in source scan.
10. **Runtime verification covers only a focused path.** Core account, organization/workspace/project/task/comment/notification-list/attachment flows passed, but broad browser UX, email delivery, multi-user isolation, and advanced workflows remain unverified.

## 1. Repository, branches, contributors

### Checkout and Git state

- Current branch: `feature/full-stack-integration` at `7453acd` (agent-session checkpoint commit); upstream is `origin/feature/full-stack-integration`.
- `git status --short --branch` showed modified tracked files: `README.md`, backend package/config/controllers/middleware/routes/tests, database docs/schema/queries/seed, docs, and frontend package/app/styles/API/tests. Untracked additions include backend controllers/middleware/services/utils, migrations 003–008, frontend env/test files, `incoming-App.jsx`, and `review-branches/`.
- No merge, reset, checkout, stash, pull, or commit was performed.
- The project root `package.json` only declares dependencies (`cors`, `dotenv`, `express`, `pg`); it has no scripts. Frontend and backend have their own scripts.

### Every listed branch: latest commit and diff against `origin/main`

“Diff” is `git diff --stat origin/main...branch`; empty means no file diff from that base. Backup branches are snapshots. Branch features are inferred from commit subjects and changed-file paths; this is not a claim that each branch’s feature works.

| Branch | Latest commit (author — subject) | Diff/touched area relative to `origin/main` |
|---|---|---|
| `backup/before-integration` | `3856c95` vishwajeethshikari — Revise README for Express API Backend | No reported diff; earlier backend documentation snapshot |
| `backup/integration-after-main` | `928a184` vishwajeethshikari — auth security merge | No reported diff |
| `backup/main-before-cleanup` | `a7a118b` Surabhi Yadav — database setup merge | No reported diff |
| `backup/pre-integration` | `928a184` vishwajeethshikari — auth security merge | No reported diff |
| `chore/clean-main-legacy-code` | `a7a118b` Surabhi Yadav — database setup merge | No reported diff |
| `feature/full-stack-integration` | `d7f9618` vishwajeethshikari — connect ProjectFlow UI to SaaS APIs | 27 files, +1800/-874; backend API/auth/workspaces/projects/tasks, frontend API wiring, docs/database |
| `feature/project-audit-fixes` | `928a184` vishwajeethshikari — auth security merge | No reported diff |
| `integration/final-consolidation` | `d7f9618` vishwajeethshikari — connect ProjectFlow UI to SaaS APIs | Same 27-file integration diff |
| `main` | `928a184` vishwajeethshikari — auth security merge | Default branch; no diff |
| `vishwajeeth-user-auth-security` | `d7f9618` vishwajeethshikari — connect ProjectFlow UI to SaaS APIs | Same 27-file integration diff |
| `origin` | `928a184` vishwajeethshikari — auth security merge | Symbolic/remote-tracking ref reported by Git; no diff |
| `origin/Madhupriya/project-tasks` | `73c45b7` silencesypher — Updated lib | 19 files, +7706/-755; task feature branch (large frontend/docs/backend changes) |
| `origin/backup/main-before-cleanup` | `a7a118b` Surabhi Yadav — database setup merge | No reported diff |
| `origin/backup/pre-integration` | `928a184` vishwajeethshikari — auth security merge | No reported diff |
| `origin/feat/advanced-task-management` | `0181d52` avni — persist projects and activity history | 1 file, +188/-23; project/activity persistence |
| `origin/feat/task-priority-due-dates` | `e1ea948` avni — dashboard task completion summary | 1 file, +239/-191; task priority/due dates/dashboard |
| `origin/feat/task-search` | `d823f20` avni — ProjectFlow authentication screens | 1 file, +385/-77; task search/auth UI history |
| `origin/feature/dashboard-search` | `1951ee9` avni — Add dashboard project search | No reported diff from current default |
| `origin/feature/database-schema` | `f6da141` surabhiyadav11 — add database architecture docs | 1 file, +47; schema documentation |
| `origin/feature/database-setup` | `d20f98d` surabhiyadav11 — add comments, attachments, notifications | 1 file, +24; initial database additions |
| `origin/feature/full-stack-integration` | `d7f9618` vishwajeethshikari — connect ProjectFlow UI to SaaS APIs | Same 27-file integration diff |
| `origin/feature/projects-ui` | `1b8a218` avni — expand project management dashboard | No reported diff from current default |
| `origin/fix/project-activity-persistence` | `a3db024` avni — centralize local storage handling | 1 file, +237/-78; UI persistence refactor |
| `origin/keerthi-dashboard` | `b18d16f` Sri keerthi — Final Errors are handled | 6 files, +798/-2239; dashboard cleanup/error handling |
| `origin/main` | `928a184` vishwajeethshikari — auth security merge | Default branch; no diff |
| `origin/revert-6-feat/task-priority-due-dates` | `d30a130` Avnirajput — revert task-priority feature | No reported diff; explicit revert branch |
| `origin/vishwajeeth-user-auth-security` | `d7f9618` vishwajeethshikari — connect ProjectFlow UI to SaaS APIs | Same 27-file integration diff |

Git shortlog (`git shortlog -sn --all`) ranks commits: vishwajeethshikari 66; avni 14; surabhiyadav11 13; Sri keerthi 11; silencesypher 5; Avnirajput 3; Surabhi Yadav 3; srikeerthi01 3. This is commit authorship, not a reliable measure of work preserved in the snapshot commits.

### Contributors / purpose overlap

- **vishwajeethshikari:** authentication/security baseline, Express backend integration and UI-to-API wiring; dominates merged history.
- **avni:** project dashboard, task search, task status/priority/due-date and activity persistence branches; duplicate UI implementations occur across `review-branches/` snapshots.
- **surabhiyadav11 / Surabhi Yadav:** initial PostgreSQL schema/setup and schema documentation.
- **Sri keerthi / srikeerthi01:** dashboard and cleanup/error handling branch.
- **silencesypher:** task-focused branch (`origin/Madhupriya/project-tasks`); branch name and commit author differ.
- **Avnirajput:** task-priority revert.
- Current worktree adds a second, substantially expanded full-stack implementation on top of the committed integration branch; its author is not derivable from Git until committed.

Conflicts in purpose: multiple `review-branches/*/frontend/src/App.jsx` copies implement competing versions of the same dashboard/task UI; archived Java Spring backends under `review-branches/*/backend` conflict architecturally with the active Express/PostgreSQL backend. `incoming-App.jsx` is another frontend candidate. They are snapshots, not mounted active implementations.

## 2. Structure and technology

- **Frontend:** `frontend/src/{App.jsx,App.css,index.css,api.js,main.jsx}` plus assets/public; currently the UI is concentrated in `App.jsx` (one app, state-driven screens/modes). Vite + React 19. API utility is `frontend/src/api.js`.
- **Backend:** `backend/src/{app.js,server.js}`, config (`db.js`, `env.js`, `testDb.js`), routes (auth, organization, workspace, project, task, collaboration), controllers, middleware, validators, services and utils. PostgreSQL access uses `pg`.
- **Database:** `database/schema.sql` includes migrations 001–008; `database/seed.sql`, `queries.sql`, `db.js`. Also numerous historical schemas under `review-branches/`.
- **Root dependencies:** cors, dotenv, express, pg; no root scripts.
- **Frontend deps:** react/react-dom; dev: Vite, Vitest, jsdom, ESLint and React lint plugins. Scripts: `dev`, `build`, `lint`, `test`, `preview`.
- **Backend deps:** bcrypt, cors, dotenv, express, jsonwebtoken, multer, pg, zod; dev nodemon. Scripts: `test` (Node test runner), `test:integration`, `build` (syntax check only), `dev`, `start`.
- **Tests present:** 9 backend test files and 2 frontend test files. Test cases were not run.
- **Backend middleware:** `authenticateToken`, `optionalAuthenticateToken`, `requireWorkspaceMember`, `requireOrganizationMember`, `validateIds`; CORS and JSON parsing in `app.js`. No helmet/rate-limit middleware found.
- **Server:** `server.js` validates required env, checks DB, starts Express, then schedules recurring-task and due-date jobs. Health and DB readiness are `/api/health`, `/api/ready`.
- **CORS:** explicit `CLIENT_URL` allowlist plus localhost development origins; credentials enabled. No wildcard default.
- **Environment variable names only:** `PORT`, `CLIENT_URL`, `DATABASE_URL`, `DATABASE_SSL_MODE`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `TEST_DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `EMAIL_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`, `ATTACHMENT_STORAGE_DIR`, `NODE_ENV`, `VITE_API_URL`. `.env` values were not read or printed.

## 3. Database audit (live database inspected in Phase B/C)

### Migration-defined tables

`users`, `workspaces`, `workspace_members`, `workspace_invitations`, `projects`, `tasks`, `task_comments`, `notifications`, `subtasks`, `task_dependencies`, `activity_logs`, `milestones`, `labels`, `task_labels`, `time_entries`, `recurring_tasks`, `teams`, `team_members`, `password_reset_tokens`, `organizations`, `organization_members`, `organization_invitations`, `task_attachments`, `notification_preferences` (24 tables total from migrations 001–008).

The live database PKs, FKs, unique/check constraints, columns, indexes, and exact row counts are inventoried in [DB_STATUS.md](DB_STATUS.md). All 24 migration-defined tables are present after applying migration 006. Migration 006's table and index were verified by catalog inspection.

| Required entity | Source assessment | Notes |
|---|---|---|
| users | Exists | `001_create_users.sql`; password hash, unique email |
| organizations | Exists | `005_organizations_sessions.sql` |
| memberships | Partial | `organization_members` and `workspace_members`; no generic `memberships` table |
| workspaces | Exists | organization association added in migration 005 |
| teams | Exists | `004_teams_and_account_recovery.sql` |
| team_members | Exists | workspace-scoped membership in migration 004 |
| projects | Partial | project table exists; project-member join table is absent |
| project_members | Missing | No table in migrations |
| tasks | Exists | status/priority expanded in migration 003 |
| subtasks | Exists | migration 003 |
| labels | Partial | `labels` and `task_labels` exist; controller/API surface for label management not found in active routes |
| task_comments | Exists | migration 002; mention linkage absent |
| attachments | Exists | metadata table migration 006; content stored in private filesystem |
| activity_logs | Exists | migration 003 |
| notifications | Exists | migration 002 and dedupe/preference additions in 008 |

`organization_id` does not appear on every domain row: workspaces carry it; many child tables are scoped through `workspace_id`. This can be sound if every query joins/checks workspace and organization membership consistently. A missing `organization_id` column alone is not proof of leakage. Review nested resource queries and composite constraints carefully. The current authorization middleware requires both workspace membership and an organization membership row.

Potential gaps: no project member/manager assignment table; no mention model/foreign key; notification triggers beyond the smoke-tested notification list were not independently verified. Migration 005 backfill is reflected in the inspected live schema; migration 006 was applied in Phase C. `schema.sql` is a psql include wrapper; applying it to an existing database can leave incompatible old columns because most creates use `IF NOT EXISTS`.

## 4. Backend API inventory

All application routes are mounted under `/api`; route files below are active. SQL in controllers is generally parameterized with `$n`; some dynamic SQL builds identifiers/assignment lists from allowlisted validator fields. No endpoint was dynamically exercised. Auth route inventory: register/login/forgot/reset are public; `/me` GET/PATCH use `authenticateToken`; logout uses optional auth then revokes token version and clears cookie.

- **Organizations** (`organizationRoutes.js`): `GET/POST /organizations`; `POST /organizations/invitations/accept`; `GET/PATCH /organizations/:organizationId`; `GET /organizations/:organizationId/analytics`; `GET /organizations/:organizationId/members`; `DELETE /organizations/:organizationId/members/:userId`; `GET/POST /organizations/:organizationId/invitations`; `POST .../:invitationId/resend`; `PATCH .../:invitationId/revoke`. Router-wide authentication; organization membership and admin role gates on scoped routes. SQL parameterization appears consistent in reviewed controllers.
- **Workspaces and teams** (`workspaceRoutes.js`): `GET/POST /workspaces`; `POST /workspaces/invitations/accept`; `GET/PATCH/DELETE /workspaces/:workspaceId`; `GET /:workspaceId/members`; `POST /:workspaceId/invitations`; team routes `GET/POST /:workspaceId/teams`, `GET/PATCH/DELETE /:workspaceId/teams/:teamId`, member list/add/remove, and team productivity. Router-wide auth; workspace membership, with role checks for mutations. ID validation on team IDs/user IDs, but not every route parameter.
- **Projects** (`projectRoutes.js`): project list/create/read/update/delete; project timeline and analytics; milestone create/update/delete under `/:workspaceId/projects/:projectId`. Router-wide auth and workspace membership; manager for create/update/milestones, admin for delete; project ID validation on project-specific routes.
- **Tasks and workflows** (`taskRoutes.js`): project task list; task create/read/update/delete; comments GET/POST; subtasks GET/POST/PATCH/DELETE; dependencies GET/POST/DELETE; attachments list/upload/download/delete; active timer/start; time report; project time summary; task time list/create/stop/edit/delete; recurring task list/create/pause/resume/delete. Router-wide auth/workspace membership. Upload middleware runs before controller and uses Multer. Task-related role gates vary: member can update/create workflow data; manager can create/delete tasks and manage recurring tasks. Not all nested resource IDs are validated in the router.
- **Collaboration** (`collaborationRoutes.js`): dashboard, workload, analytics, CSV export, notifications, preferences, activity, mark-read. Router-wide auth and workspace membership.
- **Health** (`app.js`): `GET /`, `/api/health`, `/api/ready`; no auth.

The expected report endpoints exist in source as analytics functions; no PDF export, general global search, or organization/project membership management API exists. Validation is Zod-based for many bodies, but coverage of every endpoint is not proven. API error middleware returns generic 500. No reviewed route returns `password_hash`; auth responses use `publicUser`, and login selects the hash only for bcrypt comparison. No SQL interpolation of user-supplied values was observed in scanned controller statements; dynamic SQL fragments should remain strictly validator-derived.

## 5. Frontend inventory

- **Pages/routes:** no React Router routes found. `App.jsx` handles auth screen and a single authenticated workspace application. Auth modes include login/register/forgot/reset. App mode switches expose dashboard/project/task list, board, calendar, timeline, team/organization views, notification panel, reports/analytics, comments, attachments, and time tracking. Protected route is effectively initialization plus whether `user` exists; no reusable route guard.
- **API/state:** `apiRequest` in `frontend/src/api.js` uses `VITE_API_URL` or `http://localhost:5000/api`, JSON/form-data handling and `credentials: include`. State is mostly component-level React `useState`; no Redux/Context/query cache was identified. No hardcoded token storage found in API client.
- **API-backed flows visible in source:** auth, org/workspace/member/team, dashboard, projects/tasks, comments, subtasks/dependencies, notifications/preferences, attachments, time tracking/reports, analytics, milestones/timeline. Source presence is not runtime proof. Some dashboard presentation/formulas are client-derived.
- **Navigation:** the active sidebar is not a complete 10-item product navigation. Workspace/org selection, create/invite forms and app mode controls exist. Exact named sidebar list status: Dashboard (present as dashboard view); My Work (not separately found); Projects (present); My Tasks (not independently surfaced as a dedicated page); Kanban Board (present as Board mode); Teams (present); Members (present within org/team views); Calendar (present as mode); Notifications (present); Reports (analytics/time report UI exists, not a complete Reports page); Settings (not found).
- **Role visibility:** some mutation controls are conditionally shown by selected organization/workspace role; backend remains the enforcement layer. Full menu-level RBAC is not implemented as a route/menu matrix.
- **Loading/empty/error:** loading state and explicit empty-state copy exist in multiple sections; auth form errors and general app error state exist. No complete global toast system or systematic retry/error boundary found. Confirm dialogs are not consistently evident; destructive actions should be checked. Responsive CSS uses media queries in `App.css`/`index.css`.
- **Mock/fake data:** current active tree appears substantially API wired; no runtime fixture/mock package identified. Local UI state and derived KPI values are not the same as persisted/server-computed values. Historic branches contain local-storage/simulated data implementations.

## 6. Feature-by-feature status

The original status table records the source-review assessment. Runtime verification for the subset exercised in Phase C is listed in section 10 and supersedes earlier “not executed” notes for those flows.

| # | Feature | Status | Evidence and remaining gap |
|---:|---|---|---|
| 1 | Registration | PARTIAL | `AuthScreen` → `/auth/register` → `authController.register` → `users`; account is created but user must sign in separately; no executed flow. |
| 2 | Login | PARTIAL | API → `login` → bcrypt/DB and cookie; not executed. |
| 3 | bcrypt hashing | COMPLETE | `authController.register/resetPassword`, bcrypt cost 12; migration column `password_hash`; not executed. |
| 4 | JWT and expiry | COMPLETE | `jwt.sign` with `JWT_EXPIRES_IN` default 1h and HS256; token-version checked in auth middleware; not executed. |
| 5 | Logout/session | PARTIAL | logout increments `token_version`, clears HttpOnly cookie; no session listing/device revocation UI; optional auth means cookie clear still works. |
| 6 | Protected frontend routes | PARTIAL | `App.jsx` auth initialization/user gating; no route library or reusable protected route. |
| 7 | Protected backend routes | PARTIAL | Routers generally use `authenticateToken`; health/auth recovery public by design; route coverage/runtime not fully tested. |
| 8 | Profile management | PARTIAL | `/auth/me` GET/PATCH and profile name UI; email/avatar not editable. |
| 9 | Change password | MISSING | No authenticated change-password API/UI found. |
| 10 | Forgot/reset password | PARTIAL | token hashing/expiry/email service in auth controller; dev token fallback; not executed and mail provider unverified. |
| 11 | RBAC roles | PARTIAL | organization/workspace role checks exist; role mappings differ; project member/manager assignment absent. |
| 12 | Organization CRUD | PARTIAL | list/create/get/rename/member removal; no delete endpoint; scoped routes exist. |
| 13 | Invites/memberships | PARTIAL | org/workspace invite create/accept, org resend/revoke; invitation coverage differs by scope, email delivery unverified. |
| 14 | Workspaces | PARTIAL | create/list/read/update/delete; member requirement and role coupling warrants verification. |
| 15 | Teams/team members | PARTIAL | team controllers and schema plus UI; team operations not executed. |
| 16 | Organization data isolation | PARTIAL | org/workspace middleware and workspace query filters; no live test; middleware requires both memberships. |
| 17 | Project CRUD | PARTIAL | project list/create/read/update/delete API+schema+UI; project member assignments missing. |
| 18 | Project members/managers | MISSING | No `project_members` table/routes; `owner_id` alone does not implement membership/manager assignments. |
| 19 | Project progress | PARTIAL | analytics/controller computes from tasks; formulas not runtime checked. |
| 20 | Project search/filter/sort | PARTIAL | list query supports some filtering/search; no comprehensive sort behavior verified. |
| 21 | Task CRUD | PARTIAL | task controller routes and UI; not executed. |
| 22 | Task assignment | PARTIAL | task `assignee_id`, validator/controller, member UI; authorization that assignee belongs to same workspace must be verified end-to-end. |
| 23 | Priority values | PARTIAL | schema/code support low/medium/high; requested `CRITICAL` absent. |
| 24 | Status values | PARTIAL | code/schema use TODO/in-progress/completed variants; requested `IN_REVIEW` absent. |
| 25 | Labels/categories | PARTIAL | schema labels/task_labels but no active label routes/UI identified. |
| 26 | Subtasks/parent progress | PARTIAL | subtask API and UI exist; automatic parent progress consistency not proven. |
| 27 | Kanban board | PARTIAL | Board mode in App; no runtime proof. |
| 28 | Persisted drag/drop | PARTIAL | drag state and task PATCH call appear; no browser/DB confirmation. |
| 29 | Keyboard DnD alternative | MISSING | No explicit keyboard alternative found. |
| 30 | Comments | PARTIAL | comment APIs/schema/UI; not executed. |
| 31 | Mentions | MISSING | No mention parser, notification linkage, or UI flow found. |
| 32 | Activity log | PARTIAL | task/comment writes and activity endpoint/table exist; completeness of all event types unknown. |
| 33 | File attachments | PARTIAL | Multer, private storage, signature/MIME/size checks, scoped download; not executed; deployment storage durability unknown. |
| 34 | Notifications | PARTIAL | read/unread/preferences/dedupe and due reminder job exist; all event trigger types and dedupe behavior unverified. |
| 35 | Calendar | PARTIAL | calendar mode and task date update calls; not separately routed page. |
| 36 | Deadlines/overdue | PARTIAL | dates and UI overdue calculations/reminder jobs exist; timezone/boundary behavior unverified. |
| 37 | My Work dashboard | PARTIAL | workspace dashboard API/UI exists; no dedicated personal “My Work” page confirmed. |
| 38 | Admin/Manager dashboard | PARTIAL | analytics/workload and role-aware views exist; no explicit role-specific dashboard coverage. |
| 39 | Analytics/formulas | PARTIAL | analytics controller and UI; formulas need database-backed validation. |
| 40 | Charts | UI-ONLY | visual analytics elements exist; no verified chart library/deployed rendering or tested data binding. |
| 41 | Reports endpoints | PARTIAL | analytics/export CSV and time-report endpoints exist; no PDF; runtime not executed. |
| 42 | Global search | MISSING | no cross-entity global search endpoint/UI identified. |
| 43 | Gantt | PARTIAL | timeline endpoint and timeline UI with dates/milestones; dependency visualization/complete Gantt controls uncertain. |
| 44 | Dependencies | PARTIAL | task dependency API/schema with cycle handling; UI/behavior not executed. |
| 45 | Recurring tasks | PARTIAL | CRUD/pause/resume and scheduled generation; not executed; process-local timers are not distributed scheduling. |
| 46 | Time tracking | PARTIAL | timer/manual entry/report API and UI; not executed; concurrency behavior needs DB validation. |
| 47 | CSV/PDF export | PARTIAL | CSV endpoint exists; PDF missing. |
| 48 | Dark mode | MISSING | no theme toggle/persistence found. |
| 49 | Real-time updates | PARTIAL | notification polling every 30 seconds; no WebSocket/SSE, broader updates are not realtime. |
| 50 | Rate limit/helmet/validation/XSS | PARTIAL | Zod validation exists in many controllers and Multer file checks; no rate limiting/helmet or explicit XSS sanitization found. |

## 7. Problems and verification results

### a) Runtime errors / build checks

- `npm run build --prefix backend` **passed**; it only runs `node --check` for `src/app.js` and `src/server.js`, not a full build.
- `npm run lint --prefix frontend` **passed**; backend and frontend test/build results are recorded in section 10.
- Backend and frontend servers started on alternate ports because the defaults were occupied. API smoke requests confirmed health/readiness and the listed feature endpoints; a full browser UI flow was not run.
- `server.js` requires valid JWT and database configuration at startup. Credentials were loaded for connections but are not included in this report or command output.

### b) API mismatches

- No broad URL-prefix mismatch found: `apiRequest` base URL ends in `/api` and frontend paths begin `/auth`, `/workspaces`, `/organizations`.
- Phase C exercised the documented smoke subset. Other API methods and payloads remain source-reviewed but unexecuted; nested resource scoping still needs broader tests.
- API docs claim several precise behaviors (e.g. status values, email delivery) that source migrations/code should be checked against rather than accepted as runtime truth.

### c) Tables/columns

- Active migration source declares the domain tables listed above; no clear missing referenced table was established statically.
- Live catalog comparison found all migration-defined objects except task attachments before Phase C. Migration 006 was then applied and verified; the current report shows no parsed migration object mismatch. Runtime definitions beyond name-level comparison should still be reviewed for intentional drift.
- Project-member table is absent; labels table exists without active API surface.

### d) Authentication/authorization/isolation

- Phase D uses the shared role rank and action policy in `docs/ROLES.md`. Workspace access still requires both workspace and organization membership, and migration 009 repairs legacy gaps.
- All route parameters in the listed organization and workspace resource routes are validated as positive numeric IDs. Nested resource queries and joins are bound to `req.workspaceId`; user assignments, team managers, team members, and comment mentions are checked against workspace membership.
- The integration isolation matrix covers cross-organization reads, writes, deletes, lists, analytics, exports, downloads, and notifications; employee/manager permissions; invalid IDs; assignment boundaries; and token revocation after member removal.
- Remaining deployment hardening (rate limiting, secure headers, explicit XSS/CSRF strategy) is tracked separately and was not part of Phase D.

### e) Security

- No `.env` values were printed or copied into audit artifacts. Environment variable names are reported without values.
- `helmet`, rate limiting, explicit XSS sanitization, and CSRF token protection were not found. Cookie uses HttpOnly/SameSite and CORS credentials allowlist; assess CSRF based on deployment origins and cookie policy.
- `express.json()` has no explicit size limit in `app.js`; review oversized payload exposure.
- Attachment signature validation, upload, authorized download, and cleanup passed the smoke flow. Persistent deployment storage and permissions remain unverified.
- No endpoint response exposing password hashes/secrets was found in reviewed auth controller (`publicUser` allowlists fields).

### f) Hardcoded/fake data

- Frontend API URL has local development fallback, not a production URL. Some display summaries are client-derived. The active frontend appears API-oriented; only the endpoint subset in section 10 was exercised.
- Historical dashboard branches use local state/local storage/simulated metrics; they are not evidence of the active app’s persistence.

### g) Dead/duplicate/conflicting implementations

- `review-branches/` contains snapshots of duplicated React apps and multiple backend architectures, including Spring Java. These can confuse broad searches and are not mounted by current root scripts.
- `incoming-App.jsx` is another app candidate; no active import was found.
- The prior working-tree additions were captured in a safety snapshot commit; `review-branches/` and `incoming-App.jsx` remain ignored archive artifacts.

### h) UI/UX gaps

- One large stateful app component instead of route-level pages; no dedicated Settings, My Work, or global search page.
- Role-gated visibility is partial, and no keyboard-equivalent board drag operation was identified.
- Error/loading/empty UI exists in places, but global toast/confirmation patterns and accessibility were not systematically established.
- Responsive media-query approach exists; device-level behavior not executed.

## 8. Prioritized implementation checklist

1. **Preserve/review current worktree and establish clean baseline** (Small): **complete**; safety snapshot branch and feature-branch snapshot commit created.
2. **Verify live database safely** (Medium): **complete for inventory**; read-only catalog/count check done, migration 006 applied after backup confirmation, and schema rechecked.
3. **Harden authorization boundaries** (Large): **Phase D complete**; shared role rank, role matrix, paired memberships, route ID validation, scoped queries, and guarded test-DB isolation coverage are implemented. Broader production security hardening remains open.
4. **Add operational protections** (Medium): request size limits, rate limits, secure headers, XSS strategy, CSRF/deployment review, upload storage/cleanup checks.
5. **Complete core account flows** (Medium): registration/login/logout smoke path complete; change password, session/device controls if required, additional profile fields, and recovery email remain.
6. **Complete core collaboration model** (Large): project membership/manager assignments; label API; mentions and notification triggers; ensure activity coverage.
7. **Stabilize projects/tasks** (Large): exact status/priority values, assignment constraints, progress formula, search/filter/sort, persisted board interactions and keyboard equivalent.
8. **Validate secondary workflows** (Medium): attachment HTTP path verified; calendar dates/timezones, dependencies, recurring jobs, timers and notification dedupe still need DB-backed tests.
9. **Complete reporting and product navigation** (Large): dedicated My Work/admin reports/settings/global search; charts and exports with documented formulas; PDF only if needed.
10. **Run verification gates** (Medium): Phase D backend/frontend checks and guarded isolation integration tests are recorded in section 11; browser-based UI smoke test remains.

## 9. Not verified after Phase C

- Full browser interaction of the UI, email delivery, scheduled-job effects with due data, multi-user organization-isolation matrix, and production deployment behavior were not exercised.
- Email workflows were not invoked; invitation and recovery mail delivery remains unverified.
- Exact behavior of API endpoints not listed in the Phase C smoke table remains source-reviewed but not dynamically verified.
- Exact endpoint-by-endpoint SQL filtering and payload shape for every controller: source-level sampled and route inventory complete, but full dynamic trace not executed.
- Whether any `.env` file is tracked or contains secrets: values were deliberately not inspected; repository file listing excluded `backend/.env`.
- Whether the user’s intended/default branch differs from `main`: branch comparison used `origin/main`, the configured remote HEAD.

## 10. Phase C — runtime verification

### Database

- Main database `project_management_saas`: migration 006 (`task_attachments`) was applied after confirming its SQL contains only `BEGIN`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `COMMIT`. The read-only inspector then found 24 tables, all 10 attachment columns, and `idx_task_attachments_task`; no parsed migration objects are missing.
- Test database `project_management_test`: read-only inspection before tests found all 24 tables and all eight migration markers already present, with no mismatch. No migration was needed there. Integration tests were guarded to allow only `localhost:5432/project_management_test`, require the `_test` suffix, and reject the main database.
- The workspace membership isolation query returned zero workspace-member rows without the corresponding organization membership. The live `workspace_members` table was empty at inspection time.
- After smoke cleanup, the database inspector reported the main database back at its pre-smoke row counts (users 3, organizations 1, organization invitations 2; all other listed tables 0). The test database also returned to zero rows after integration cleanup.

### Verified endpoints

Smoke tests ran against this checkout's backend at `http://localhost:5001/api`. Each endpoint below returned the expected status; attachment download also returned the uploaded PDF signature.

| Request | Result |
|---|---|
| `GET /api/health` | Verified — 200 |
| `GET /api/ready` | Verified — 200 |
| `POST /api/auth/register` | Verified — 201 |
| `POST /api/auth/login` | Verified — 200 |
| `POST /api/auth/login` with invalid password | Verified — 401 |
| `GET /api/auth/me` | Verified — 200 |
| `POST /api/organizations` | Verified — 201 |
| `POST /api/workspaces` | Verified — 201 |
| `POST /api/workspaces/:workspaceId/projects` | Verified — 201 |
| `POST /api/workspaces/:workspaceId/tasks` | Verified — 201 |
| `PATCH /api/workspaces/:workspaceId/tasks/:taskId` | Verified — 200 (`in_progress`) |
| `POST /api/workspaces/:workspaceId/tasks/:taskId/comments` | Verified — 201 |
| `GET /api/workspaces/:workspaceId/notifications` | Verified — 200 |
| `POST /api/workspaces/:workspaceId/tasks/:taskId/attachments` | Verified — 201 |
| `GET /api/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId/download` | Verified — 200 and matching PDF signature |
| `POST /api/auth/logout` | Verified — 200 |

The smoke account used the `@smoketest.local` suffix. Its attachment, task, project, workspace, organization and user were removed; no smoke rows or file remained.

### Failure found and fixed

- First integration run failed at task creation with PostgreSQL `42P08` because parameter `$5` was inferred as conflicting types in the status insert and completion-time `CASE`. `backend/src/controllers/taskController.js` now explicitly casts that comparison to `varchar(20)`. The complete backend suite and standalone integration command passed after the fix.
- The default backend port 5000 and frontend port 5173 were already occupied by healthy local services. This checkout was started on ports 5001 and 5174; its frontend was configured to call port 5001. No existing listener was stopped.

### Phase C verification

- Backend syntax build: passed.
- Backend tests: 43 passed, 0 failed, including database integration against the guarded test database.
- Standalone backend integration command: 1 passed, 0 failed.
- Frontend lint: passed; frontend tests: 11 passed; frontend production build: passed.
- The exact runtime script is [smoke-api.js](../scripts/smoke-api.js); it prints statuses only, marks test records clearly, and performs scoped cleanup. The read-only schema tool is [db-inspect.js](../scripts/db-inspect.js).

## 11. Phase D — authorization and organization isolation

### Role policy and scope audit

- `docs/ROLES.md` maps OWNER/ADMIN, MANAGER, and EMPLOYEE onto the existing organization and workspace roles and lists view, create, edit, delete, invite, and member removal permissions for every requested resource.
- Organization and workspace middleware share the role ranks in `backend/src/security/roles.js`. Workspace creation carries the creator's organization role into the workspace, and accepting a workspace invitation creates both memberships transactionally.
- Migration 009 is insert-only and idempotent. On `project_management_test`, a temporary legacy membership fixture produced one missing organization membership on the first run and zero on the second; the fixture was removed and the orphan count was zero. On `project_management_saas`, the migration inserted zero rows and the orphan count remained zero.
- Scoped-query defects fixed: task lists now verify the project belongs to the workspace and join project and assignee records through workspace membership; comment and attachment lists verify their parent task; activity actors, team managers, subtask assignees, time-entry users, and timeline assignees resolve only through workspace membership. Team manager assignment and task assignment/mentions reject users outside the workspace. Organization member removal revokes existing tokens. Invitation updates are constrained to their organization or workspace.
- Cross-organization isolation and role-denial assertions run in `backend/test/authorizationIsolation.test.js`; fixtures and attachment files are cleaned only from the guarded test database.

### Test and verification results

| Test | Expected | Actual | Status |
|---|---|---|---|
| Migration 009 idempotence on `project_management_test` | Insert missing legacy membership once; second run inserts none; no orphan rows remain | First run inserted 1 test fixture row, second inserted 0; fixture cleaned; orphan count 0 | PASS |
| Migration 009 on `project_management_saas` | Apply only missing organization memberships | Inserted 0 rows; orphan count 0 | PASS |
| Phase D backend suite in isolated Phase D snapshot (`npm test`) | All backend tests pass against guarded test DB | 45 passed, 0 failed | PASS |
| Phase D integration suite in isolated Phase D snapshot (`npm run test:integration`) | Isolation tests pass against guarded test DB | 2 passed, 0 failed | PASS |
| Backend suite in shared working tree | All tests pass with the schema expected by checked-out source | 44 passed, 2 failed: concurrent Phase E source queried `projects.manager_id` and `users.avatar_url`, absent from `project_management_test` | FAIL — Phase E schema mismatch |
| Backend build (`npm run build --prefix backend`) | Backend syntax check passes | Passed | PASS |
| Frontend lint (`npm run lint --prefix frontend`) | No lint errors | Passed | PASS |
| Frontend tests (`npm test --prefix frontend`) | All frontend tests pass | 11 passed | PASS |
| Frontend production build (`npm run build --prefix frontend`) | Build completes | Passed | PASS |

The final catalog check found migration 010 schema objects already present in `project_management_saas`; this Phase D work did not apply migration 010, and its code and migration are excluded from the Phase D commit. The test database still lacks those 010 objects. The shared-worktree backend failures above therefore remain until the separate Phase E source/schema work is reconciled. No Phase D smoke-test records remain; the test database returned to zero rows after integration cleanup. Existing main-database rows were left untouched.
