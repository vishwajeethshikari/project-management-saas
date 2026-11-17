# Project Management SaaS

A React/Vite frontend, Express REST API, and PostgreSQL database for managing
workspaces, projects, and tasks.

## Prerequisites

- Node.js and npm
- PostgreSQL and `psql`

## Configure PostgreSQL and the backend

From `backend/`, copy `.env.example` to `.env`. Configure `DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, or set `DATABASE_URL`.
Set `JWT_SECRET` to a random secret of at least 32 bytes. Keep `.env`
untracked. Set `CORS_ORIGINS` to the exact frontend origins you use.

From the repository root, create the database and apply the ordered canonical
migrations:

```powershell
psql -U <db_user> -d <db_name> -f database/schema.sql
```

This script includes the ordered migrations `001_create_users.sql`,
`002_create_workspace_domain.sql`, `003_expand_task_workflows.sql`,
`004_teams_and_account_recovery.sql`, `005_organizations_sessions.sql`, and
`006_task_attachments.sql`, `007_time_reporting_recurring_rules.sql`, and
`008_workload_analytics_notifications.sql`.
Inspect an existing schema before applying;
the migrations do not convert incompatible legacy tables.

Install and start the backend:

```powershell
Set-Location backend
npm install
npm run dev
```

The API listens on port `5000` by default. `GET /api/health` checks process
liveness; `GET /api/ready` checks PostgreSQL connectivity.

## Run the frontend

Optionally copy `frontend/.env.example` to `frontend/.env` and set
`VITE_API_URL` (defaults to `http://localhost:5000/api`). Then:

```powershell
Set-Location frontend
npm install
npm run dev
```

## Tests

Run backend unit/API tests with `npm test` from `backend/`, and frontend tests
with `npm test` from `frontend/`. The backend unit tests stub database
queries. Any live database tests must use `TEST_DATABASE_URL` pointed at a
dedicated test-named database, never the application or production database.

## Application features

- Registration, login, password recovery, and revocable HttpOnly JWT sessions.
- Organizations with organization and workspace membership, invitations, and
  owner/admin/manager/employee roles.
- HttpOnly, SameSite=Lax session cookies; Secure cookies in production.
- Role-protected workspace, project, and task operations.
- Workspace dashboard, task search, comments with mentions, notification inbox,
  teams, invitations, subtasks, task dependencies, and activity history.
- Private task attachments with PDF/image validation, previews, downloads, and
  uploader/manager deletion controls.
- Calendar views with month/week/day periods, project/team/assignee filters,
  and persistent task date changes.
- Task timers, manual/editable time entries, project/task totals, and
  daily/weekly reports.

See [API contracts](docs/api-contracts.md),
[Architecture](docs/architecture.md), and
[Database schema](docs/database-schema.md).

## Render deployment

The root [`render.yaml`](render.yaml) Blueprint defines the API, static
frontend, and PostgreSQL database for the `feature/full-stack-integration`
branch. It uses a paid API plan, a 1 GB persistent disk for task attachments,
and a paid PostgreSQL plan; check Render's current pricing and your workspace
before provisioning. The static site is free to deploy.

The API service uses `rootDir: backend`, `npm ci`, and `npm start`; the
backend's production start script is `node src/server.js`. The frontend is a
separate static site with a rewrite to `/index.html` so direct navigation and
browser refreshes work on client-side routes.

To deploy, connect the GitHub repository in the Render Dashboard, create a
Blueprint instance from `render.yaml`, and review the service names, assigned
`onrender.com` domains, region, plans, and estimated costs before confirming.
The YAML expects the API domain
`projectflow-fsi-api.onrender.com` and frontend domain
`projectflow-fsi-web.onrender.com`; update `VITE_API_URL`, `CORS_ORIGINS`, and
`FRONTEND_URL` if Render assigns different domains. Enter valid Resend
`EMAIL_API_KEY` and `EMAIL_FROM` values when prompted; production startup
requires both. Render generates `JWT_SECRET` and supplies the private
PostgreSQL connection string.

Database migrations are deliberately not run on every deploy. The prior
migration approval applies only to a new Render database. Before applying the
schema to any existing database, inspect its current schema and take a verified
backup; `database/schema.sql` does not reconcile incompatible existing tables.
After confirming the Render Postgres connection is the intended target, run
the ordered migrations once from the repository root with Render CLI:

```powershell
$databaseId = Read-Host "Render Postgres database ID"
render psql $databaseId -- -f database/schema.sql
```

The second command applies the repository's existing `database/schema.sql`;
do not substitute local database settings or run it against a local database.
In Render Dashboard, check the API service's **Settings → Build & Deploy**:
the root directory must be `backend`, the build command `npm ci`, and the start
command `npm start`. If the service is Blueprint-managed, sync the updated
Blueprint; a later Blueprint sync overwrites conflicting Dashboard settings.
Then verify `/api/ready`, the frontend, authentication, and CRUD using a
non-demo account. Do not run `backend/scripts/seed-demo.js` in production.
See
[Render Blueprint documentation](https://render.com/docs/blueprint-spec) and
[Render CLI documentation](https://render.com/docs/cli).
