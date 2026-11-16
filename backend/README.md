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
`DATABASE_URL` or the database host, port, name, username, and password.
Generate a random `JWT_SECRET` of at least 32 bytes. `CORS_ORIGINS` is a
comma-separated allowlist of browser origins. Never commit `.env` or print
secret values in logs.

Task attachments are limited to 10 MB and validated as PDF, GIF, JPEG, PNG, or
WebP. The backend stores files outside its static/public paths. Set
`ATTACHMENT_STORAGE_DIR` to a private persistent directory in deployments;
the default is `backend/private-uploads`.

From the repository root, create the database if needed and apply all
versioned migrations:

```powershell
psql -U <db_user> -d <db_name> -f database/schema.sql
```

Inspect a pre-existing schema before applying the migrations: they are
additive, but do not alter incompatible legacy tables.

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

## Email delivery

Set `EMAIL_API_KEY` and `EMAIL_FROM` together to deliver invitation and
password recovery links through Resend. Without those settings, local
development returns a manual invitation link or recovery token; production
responses never expose either token. Configure `FRONTEND_URL` for generated
links.
