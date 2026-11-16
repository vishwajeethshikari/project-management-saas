# Project Management & Team Collaboration SaaS — Read-only audit

**Audit basis:** checked out branch `feature/full-stack-integration`, commit `7453acd`; the checkout has extensive modified and untracked files. Findings describe the working tree as inspected on 2026-11-16. No files were changed during inspection except this report. The live database was not queried: `psql` is unavailable, and an attempted client invocation did not reach PostgreSQL. Consequently, schema descriptions below are from SQL migrations and code, not proof of the deployed schema or its row counts. Runtime behavior is **not executed** unless explicitly stated.

## Executive summary

The working tree contains a broad full-stack implementation: authentication, organization/workspace membership, projects/tasks, team collaboration, attachments, notifications, reporting, time tracking, recurrence, timeline, and analytics. Most modules have source-level end-to-end paths, but the product is a single large React screen rather than a complete navigable set of pages, the actual database state is unknown, and security/authorization consistency needs careful review. The selected worktree has uncommitted changes in 30+ tracked paths plus many untracked additions; committed branch history does not include much of the code being audited.

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

1. **Live schema cannot be confirmed.** Migrations are extensive, but no catalog/constraint/index/row-count query could run. `CREATE TABLE IF NOT EXISTS` does not repair incompatible pre-existing tables.
2. **Workspace access depends on an organization membership join.** `requireWorkspaceMember` joins `organization_members` (backend/src/middleware/requireWorkspaceMember.js); any workspace membership without a matching org membership is denied, including legacy or partially migrated data.
3. **Role semantics are inconsistent.** Organization and workspace roles use different rank maps and route minimums. `member` is not an organization role; workspace membership status is not enough to confirm org-role propagation or workspace membership synchronization.
4. **Several IDs are not passed through `validateIds`.** Workspace IDs are checked in membership middleware; many nested controller IDs (e.g. project IDs in task list are validated, but task IDs only in some routes; organization IDs are validated in membership middleware) need route-by-route validation. Invalid IDs may become DB errors.
5. **Current tree is not a clean release candidate.** Many changes are uncommitted/untracked, including new controllers and migrations, while branch commit history predates them. Reproducible review requires preserving this working-tree state.
6. **No `helmet`, rate limiter, or explicit XSS sanitization is installed.** Input validation exists in places via Zod, but not all request surfaces are proven validated. CORS uses an allowlist defaulting to local Vite origins.
7. **No change-password endpoint or credential re-authentication path exists.** Profile update changes only the name; forgot/reset is implemented.
8. **Frontend is a monolithic `App.jsx` with state-driven modes.** There is no React Router or route-level protected-route component; authentication gating is app initialization state.
9. **Keyboard-equivalent board reordering is not apparent.** Board status updates use interactive controls/drag state; accessible keyboard alternative was not found in source scan.
10. **No runtime/API/database integration was executed.** Backend syntax and frontend lint passed; this does not verify server startup, migration compatibility, endpoint behavior, or UI flows.

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

Git shortlog (`git shortlog -sn --all`) ranks commits: vishwajeethshikari 66; avni 14; surabhiyadav11 13; Sri keerthi 11; silencesypher 5; Avnirajput 3; Surabhi Yadav 3; srikeerthi01 3. This is commit authorship, not a reliable measure of work in this uncommitted checkout.

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
- **CORS:** explicit `CORS_ORIGINS` list; defaults to localhost Vite origins; credentials enabled. No wildcard default.
- **Environment variable names only:** `PORT`, `CORS_ORIGINS`, `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `TEST_DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `EMAIL_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`, `ATTACHMENT_STORAGE_DIR`, `NODE_ENV`, `VITE_API_URL`. `.env` values were not read or printed.

## 3. Database audit (migration-defined, live database unavailable)

### Migration-defined tables

`users`, `workspaces`, `workspace_members`, `workspace_invitations`, `projects`, `tasks`, `task_comments`, `notifications`, `subtasks`, `task_dependencies`, `activity_logs`, `milestones`, `labels`, `task_labels`, `time_entries`, `recurring_tasks`, `teams`, `team_members`, `password_reset_tokens`, `organizations`, `organization_members`, `organization_invitations`, `task_attachments`, `notification_preferences` (24 tables total from migrations 001–008).

PKs are identity `id` columns on entity tables; join tables use composite keys/unique constraints as declared. The migrations declare foreign keys between workspaces/users, workspace members/invitations, projects/tasks/comments/notifications, task workflow records, organizations/memberships/invitations, teams/members, time entries, and attachments. They add project/workspace composite integrity for tasks and multiple lookup indexes. Exact live PK/FK/index/unique definitions **not verified**. To determine them, run catalog queries against the intended database after the audit; do not infer deployed constraints solely from files.

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

Potential gaps: no project member/manager assignment table; no mention model/foreign key; notification triggers cover assignment/mention/due reminders only by code/docs, not independently verified; no actual indexes can be confirmed. Migration 005 backfills organizations/workspaces via `INSERT`/`UPDATE`, but **these statements were inspected only, not executed**. `schema.sql` is a psql include wrapper; applying it to an existing database can leave incompatible old columns because most creates use `IF NOT EXISTS`.

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

Status is based on source chain inspection, not runtime verification. `COMPLETE` means a plausible UI/API/controller/schema chain exists; it still needs execution.

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
- `npm run lint --prefix frontend` **passed**.
- No tests were run. No server or browser was started. Static check cannot establish DB connection or runtime correctness.
- Potential startup issue: `server.js` requires valid `JWT_SECRET` and database configuration at startup; deployment must provide required settings. Environment values were not inspected.

### b) API mismatches

- No broad URL-prefix mismatch found: `apiRequest` base URL ends in `/api` and frontend paths begin `/auth`, `/workspaces`, `/organizations`.
- API methods and UI payloads appear generally aligned in the inspected flows, but no endpoint was run. Nested resource scoping must be verified, particularly ensuring task/project IDs belong to the workspace in every controller query.
- API docs claim several precise behaviors (e.g. status values, email delivery) that source migrations/code should be checked against rather than accepted as runtime truth.

### c) Tables/columns

- Active migration source declares the domain tables listed above; no clear missing referenced table was established statically.
- Live schema could not be compared to migrations. Therefore missing/extra columns, broken constraints, row counts, unique constraints and actual indexes remain unknown.
- Project-member table is absent; labels table exists without active API surface.

### d) Authentication/authorization/isolation

- `requireWorkspaceMember` joins `workspace_members`, `workspaces`, and `organization_members`; mismatch/missing org membership blocks an otherwise valid workspace member.
- Route role thresholds use `roleRank` in workspace middleware and a separate `rank` map in organization middleware. Review policy consistency (e.g. whether `admin` outranks manager for every action, and owner/admin semantics).
- `validateIds` is applied selectively. Controllers should independently bind nested IDs to `req.workspaceId` and verify assignee/member ownership.
- Query parameters are generally parameterized in reviewed SQL; no observed obvious concatenation of raw request strings into SQL values.

### e) Security

- No `.env` values were read. Only variable names were reported. No claim about secret values or committed secret contents is made.
- `helmet`, rate limiting, explicit XSS sanitization, and CSRF token protection were not found. Cookie uses HttpOnly/SameSite and CORS credentials allowlist; assess CSRF based on deployment origins and cookie policy.
- `express.json()` has no explicit size limit in `app.js`; review oversized payload exposure.
- Attachments use signature/MIME validation and private storage per controller/docs, but file cleanup, storage persistence, and deployment permissions were not executed.
- No endpoint response exposing password hashes/secrets was found in reviewed auth controller (`publicUser` allowlists fields).

### f) Hardcoded/fake data

- Frontend API URL has local development fallback, not a production URL. Some display summaries are client-derived. The active frontend appears API-oriented; mock-data/runtime verification was not performed.
- Historical dashboard branches use local state/local storage/simulated metrics; they are not evidence of the active app’s persistence.

### g) Dead/duplicate/conflicting implementations

- `review-branches/` contains snapshots of duplicated React apps and multiple backend architectures, including Spring Java. These can confuse broad searches and are not mounted by current root scripts.
- `incoming-App.jsx` is another app candidate; no active import was found.
- Current working tree has substantial uncommitted changes beyond `origin/main`; branch attribution for those changes is unavailable.

### h) UI/UX gaps

- One large stateful app component instead of route-level pages; no dedicated Settings, My Work, or global search page.
- Role-gated visibility is partial, and no keyboard-equivalent board drag operation was identified.
- Error/loading/empty UI exists in places, but global toast/confirmation patterns and accessibility were not systematically established.
- Responsive media-query approach exists; device-level behavior not executed.

## 8. Prioritized implementation checklist

1. **Preserve/review current worktree and establish clean baseline** (Small): capture/attribute the many uncommitted additions before any integration.
2. **Verify live database safely** (Medium): on intended database, use SELECT-only `information_schema`/`pg_catalog` and counts; compare schema to migrations and resolve mismatches before migration execution.
3. **Harden authorization boundaries** (Large): normalize role policy, workspace/org membership expectations, validate all nested IDs, verify assignee/project/team membership and resource scoping with automated tests.
4. **Add operational protections** (Medium): request size limits, rate limits, secure headers, XSS strategy, CSRF/deployment review, upload storage/cleanup checks.
5. **Complete core account flows** (Medium): change password, session/device controls if required, profile fields; execute registration/login/logout/recovery flows.
6. **Complete core collaboration model** (Large): project membership/manager assignments; label API; mentions and notification triggers; ensure activity coverage.
7. **Stabilize projects/tasks** (Large): exact status/priority values, assignment constraints, progress formula, search/filter/sort, persisted board interactions and keyboard equivalent.
8. **Validate secondary workflows** (Medium): attachments, calendar dates/timezones, dependencies, recurring jobs, timers and notification dedupe under DB integration tests.
9. **Complete reporting and product navigation** (Large): dedicated My Work/admin reports/settings/global search; charts and exports with documented formulas; PDF only if needed.
10. **Run verification gates** (Medium): backend/frontend tests, integration tests on a dedicated test DB, build/lint, then browser smoke test; test execution was outside this audit.

## 9. Not verified

- Actual database tables, columns, constraints, indexes, migration state and row counts: `psql` was not installed; no live DB query completed.
- Startup, HTTP responses, SQL compatibility, full UI interactions, uploads/email delivery, scheduled jobs, authorization behavior under multiple users, and production deployment behavior: not executed.
- Test results: test files counted, but no test suite run.
- Exact endpoint-by-endpoint SQL filtering and payload shape for every controller: source-level sampled and route inventory complete, but full dynamic trace not executed.
- Whether any `.env` file is tracked or contains secrets: values were deliberately not inspected; repository file listing excluded `backend/.env`.
- Whether the user’s intended/default branch differs from `main`: branch comparison used `origin/main`, the configured remote HEAD.
