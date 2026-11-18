# Project Management SaaS

A React/Vite frontend, Express REST API, and PostgreSQL database for managing
workspaces, projects, and tasks.

## Prerequisites

- Node.js and npm
- PostgreSQL and `psql`

## Configure PostgreSQL and the backend

From `backend/`, copy `.env.example` to `.env`. Configure `DATABASE_URL`
(required in production), or the individual `DB_*` values for local
development. Set `DATABASE_SSL_MODE` to match the database connection, and
set `JWT_SECRET` to a random secret of at least 32 bytes. Keep `.env`
untracked. Set `CLIENT_URL` to the comma-separated frontend origins and
`FRONTEND_URL` to the frontend origin used in invitation links.

For a new, empty database, use the separate fresh-install script. Do not run
it on an existing database or automatically during deploy:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f database/fresh-install.sql
```

For an existing database, inspect it and review the ordered migrations
individually; `database/schema.sql` does not reconcile incompatible tables.

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
`VITE_API_URL` (defaults to `/api`; Vite proxies local development to port
5000). For a separate production frontend, set it to the API origin ending in
`/api`. Then:

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

The root [`render.yaml`](render.yaml) is a Render-only Blueprint for the API,
static frontend, and PostgreSQL database on `feature/full-stack-integration`.
It does not configure Railway. Review its current service plans and attachment
storage settings before using it; local filesystem storage is not durable
without a persistent volume.

The API service uses `rootDir: backend`, `npm ci`, and `npm start`; the
backend's production start script is `node src/server.js`. The frontend is a
separate static site with a rewrite to `/index.html` so direct navigation and
browser refreshes work on client-side routes.

To deploy, connect the GitHub repository in the Render Dashboard, create a
Blueprint instance from `render.yaml`, and review the service names, assigned
`onrender.com` domains, region, plans, and estimated costs before confirming.
The YAML expects Render-assigned API and frontend domains; update
`VITE_API_URL`, `CLIENT_URL`, and `FRONTEND_URL` if those domains differ. Enter valid Resend
`EMAIL_API_KEY` and `EMAIL_FROM` values when prompted; production startup
requires both. Render generates `JWT_SECRET` and supplies the private
PostgreSQL connection string.

Database schema setup is manual and must target only a confirmed new, empty
database using `database/fresh-install.sql`; never run it on the existing
Railway database. In Render Dashboard, check the API service's
**Settings → Build & Deploy**:
the root directory must be `backend`, the build command `npm ci`, and the start
command `npm start`. If the service is Blueprint-managed, sync the updated
Blueprint; a later Blueprint sync overwrites conflicting Dashboard settings.
Then verify `/api/ready`, the frontend, authentication, and CRUD using a
non-demo account. Do not run `backend/scripts/seed-demo.js` in production.
See
[Render Blueprint documentation](https://render.com/docs/blueprint-spec) and
[Render CLI documentation](https://render.com/docs/cli).
