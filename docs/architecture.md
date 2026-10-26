# Architecture

## Current checkout

The checked-out branch is `vishwajeeth-user-auth-security`. In this branch, the
repository has a React/Vite frontend, an Express.js API, and PostgreSQL
configuration plus a users-table migration. The frontend and API are separate
applications; the frontend currently does not make API requests.

```text
Browser
  |
  +-- React 19 / Vite frontend (frontend/)
  |     Current App.jsx: Vite starter screen and local counter state
  |
  +-- Express 5 API (backend/)
        |-- JSON parsing, CORS, routes, controllers, validation
        |-- JWT authentication middleware
        +-- PostgreSQL through node-postgres (pg)
              +-- users table (database/migrations/001_create_users.sql)
```

### Frontend

The frontend uses React and React DOM with Vite and the React plugin. Its entry
point is `frontend/src/main.jsx`, which renders `App.jsx`. Styling is in
`App.css` and `index.css`; static assets are under `src/assets/` and `public/`.
`App.jsx` currently contains the Vite starter content and an in-memory
counter—not project, task, calendar, or team functionality. It has no API
client or backend integration in this checkout.

The frontend README describes a dashboard, but that description does not match
the checked-out `App.jsx`. A dashboard implementation exists on
`origin/keerthi-dashboard`; it has not been integrated into this checkout.

### Express backend

`backend/src/server.js` loads dotenv, validates configuration, and starts the
Express app on `PORT` or port `5000`. `backend/src/app.js` configures CORS and
JSON request parsing, mounts authentication routes at `/api/auth`, defines
health and root responses, and returns a generic JSON error for unhandled
request errors.

Authentication routes use Zod validators and controllers. Passwords are
hashed and checked with bcrypt; successful login returns an HS256 JWT. The
reusable bearer-token middleware verifies tokens and attaches the user ID to
the request. Authentication proves identity only; project-, task-, and
team-level authorization is not implemented here.

### Database

PostgreSQL is accessed through `pg`. The checked-out SQL migration creates
`users` only; see [Database schema](database-schema.md). The connection can use
`DATABASE_URL` or separate `DB_*` settings. No project, task, team, membership,
comment, activity, or notification schema is present in this branch.

### Branch-specific implementation discrepancy — team decision required

The repository contains incompatible backend implementations:

| Branch/ref | Observed implementation |
|---|---|
| `vishwajeeth-user-auth-security` (current checkout) | Node.js/Express API with registration, login, current-user routes, and a PostgreSQL users migration. |
| `main` | Spring Boot 4.1.1 / Java 21 backend with JPA `Project` entity and CRUD controller at `/api/projects`; its configuration enables Hibernate schema updates. |
| `origin/keerthi-dashboard` | Dashboard UI work; its backend tree is also Spring Boot. |

These implementations are on different branches and are not one unified
backend. Their endpoints and persistence models must not be treated as
simultaneously available. The team must confirm the target backend framework
and decide how to integrate or replace the branch-specific work before
publishing a single canonical architecture.

## Configuration visible in the current checkout

- `PORT`: optional API port; defaults to `5000`.
- Database: either `DATABASE_URL`, or `DB_HOST`, `DB_PORT`, `DB_NAME`,
  `DB_USER`, and `DB_PASSWORD`. When separate settings are used, `DB_USER` is
  required; host, port, and database name have defaults in `db.js`.
- `JWT_SECRET`: required, nonblank, and at least 32 UTF-8 bytes.
- `JWT_EXPIRES_IN`: optional positive duration (`s`, `m`, `h`, `d`, `w`, or
  `y`); defaults to `1h`.
- `TEST_DATABASE_URL`: required only by the manual database connectivity
  check; that check rejects production and application database targets.

The current server calls dotenv but there is no `.env.example` in this
checkout. Use local, uncommitted configuration for credentials.

## Implemented and planned scope

**Implemented in the current checkout:** starter React page, Express root and
health responses, authentication endpoints and middleware, environment
validation, PostgreSQL user migration, and backend tests in `backend/test/`.
This document does not assert that tests have been run or passed.

**Planned/not present in this checkout:** frontend-to-API integration,
project CRUD in Express, teams and memberships, task management, comments,
activity history, notifications, dashboard data, and resource-level
authorization. The project CRUD code on `main` is a separate Spring Boot
implementation and does not establish those features in the current Express
branch.

Related references: [API contracts](api-contracts.md),
[Database schema](database-schema.md), [Team work distribution](team-work-distribution.md),
and [Git workflow](git-workflow.md).
