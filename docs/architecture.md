# Architecture

## Active application

The active branch uses React/Vite, Express, and PostgreSQL. The frontend calls
the REST API through `frontend/src/api.js`; the API base defaults to `/api`
and can be overridden by `VITE_API_URL`.

```text
Browser
  React/Vite
    | JSON fetch with credentialed HttpOnly-cookie session
    v
  Express API
    | validation, JWT authentication, organization and workspace membership/role checks
    v
  PostgreSQL (node-postgres pool)
```

The browser does not persist application records locally. The legacy token
and user keys are cleared when the app initializes; session identity is
verified with `GET /api/auth/me`.

## Backend

`backend/src/server.js` loads dotenv, validates the configuration, and starts
the Express app. The API configures JSON parsing and an origin allowlist from
`CLIENT_URL`, then mounts authentication, organization, workspace, project,
task, and collaboration routes. `GET /api/health` is liveness; `GET /api/ready` checks
the PostgreSQL pool.

Login signs an HS256 JWT and sets an HttpOnly, SameSite=Lax cookie, Secure in
production. A database token version revokes sessions on logout and password
reset. Authentication middleware also accepts bearer tokens for API
compatibility. Passwords are bcrypt-hashed. Organization and workspace
membership/role middleware protects tenant-scoped records.

## Database

The canonical schema is applied in order from
`database/migrations/001_create_users.sql` through
`database/migrations/005_organizations_sessions.sql`. The Express pool reads
`DATABASE_URL` or the `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD` settings. `database/schema.sql` delegates to those migrations;
legacy manual schema definitions are no longer used.

## Local configuration

- Backend: copy `backend/.env.example` to the ignored `backend/.env`, set
  PostgreSQL credentials, and generate a random `JWT_SECRET` of at least 32
  bytes.
- Frontend: optionally copy `frontend/.env.example` to `frontend/.env` and set
  `VITE_API_URL`.
- Set `CLIENT_URL` to the comma-separated browser origins that should call the API.
- For database integration checks, use a dedicated test-named database via
  `TEST_DATABASE_URL`; never point tests at the application or production
  database.

See [API contracts](api-contracts.md) and
[Database schema](database-schema.md) for route and migration details.
