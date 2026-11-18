# Express API

The backend provides the REST API for the Project Management SaaS frontend.
It uses Express, PostgreSQL (`pg`), Zod validation, bcrypt password hashing,
and HS256 JWT authentication.

## Routes

- `GET /api/health`: process liveness.
- `GET /api/ready`: PostgreSQL readiness check.
- `/api/auth`: registration, login/logout, current-user lookup/update.
- `/api/workspaces`: workspace CRUD, membership listing, invitations.
- Workspace project/task routes: CRUD, task comments, dashboard metrics, and
  notifications, and private task file attachments.

See [`docs/api-contracts.md`](../docs/api-contracts.md) for request/response
details and role requirements.

## Local setup

Requirements: Node.js, npm, and PostgreSQL.

From `backend/`, copy `.env.example` to `.env`. Configure either
`DATABASE_URL` or the database host, port, name, username, and password for
local development. Production requires `DATABASE_URL`. Set
`DATABASE_SSL_MODE=disable` for Railway private networking, or `require` for
Railway's public TCP proxy. Use `verify-full` when the database endpoint has a
trusted certificate. If the connection URL already has PostgreSQL SSL query
parameters, leave `DATABASE_SSL_MODE` empty. Generate a random `JWT_SECRET` of
at least 32 bytes. `CORS_ORIGINS` and `CLIENT_URL` are comma-separated
allowlists of exact browser origins (the deployed Vercel origin is allowed
explicitly). Set `FRONTEND_URL` to the frontend origin for invitation links.
Never commit `.env` or print secret values in logs.

Task attachments are limited to 10 MB and validated as PDF, GIF, JPEG, PNG, or
WebP. The backend stores files outside its static/public paths. Set
`ATTACHMENT_STORAGE_DIR` to a private persistent directory in deployments;
the default is `backend/private-uploads`.

For an existing database, inspect its schema before applying the incremental
migrations. For a newly created, empty database, use the separate
[`database/fresh-install.sql`](../database/fresh-install.sql) script instead.
Do not run either script automatically against production.

From `backend/`, after setting `DATABASE_URL` in the current PowerShell session:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/fresh-install.sql
```

Install and start:

```powershell
npm install
npm run dev
```

## Commands

- `npm test`: API and configuration unit tests. The PostgreSQL integration test
  is skipped unless `TEST_DATABASE_URL` points to a dedicated test database.
- `npm run test:integration`: PostgreSQL-backed endpoint checks. Set
  `TEST_DATABASE_URL` to a dedicated test-named database first; this suite
  applies additive migrations and removes only its uniquely generated test
  users and workspace.
- `npm run build`: syntax checks for the app and server entry points.
- `npm start`: start the API.
- `npm run dev`: start with nodemon.

For manual test-database connectivity checks, configure
`TEST_DATABASE_URL` with a dedicated test-named database. The test database
guard refuses the configured application database and production-marked
targets.

## Railway service settings

This repository does not contain Railway service IDs or Railway
configuration-as-code; `render.yaml` configures Render only. In Railway, set
the API service root directory to `/backend`, build command to `npm ci`, start
command to `npm start`, and HTTP health check path to `/api/health`. Configure
the frontend as a separate service with root directory `/frontend`, build
command `npm ci && npm run build`, output directory `dist`, and a fallback
from client-side routes to `/index.html`. Set `VITE_API_URL` to the API's
public origin followed by `/api`. Use the Railway Postgres private URL with
`DATABASE_SSL_MODE=disable`, or the public TCP URL with
`DATABASE_SSL_MODE=require`.

## Email delivery

Set `EMAIL_API_KEY` and `EMAIL_FROM` together to deliver invitation and
password recovery links through Resend. Without those settings, local
development returns a manual invitation link or recovery token; production
responses never expose either token. Configure `FRONTEND_URL` for generated
links.

The browser session uses an HttpOnly cookie. When the frontend and API are on
different sites, production sets `SameSite=None; Secure` so credentialed
cross-origin fetches can send it. Browsers that block third-party cookies may
still require a same-site custom domain or reverse proxy.
