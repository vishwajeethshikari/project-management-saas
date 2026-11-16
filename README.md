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
