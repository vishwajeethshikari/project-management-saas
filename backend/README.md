# Express API Backend

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL

## Setup

From the `backend/` directory, install dependencies and create a local environment file:

```powershell
npm install
Copy-Item .env.example .env
```

Set local values in `.env`. Configure either `DATABASE_URL` or the separate
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` variables.
Set `JWT_SECRET` to a securely generated random value of at least 32 bytes.
`JWT_EXPIRES_IN` defaults to `1h`; `jsonwebtoken` accepts values such as `15m`
and `1d`. Never commit `.env` or use real credentials in documentation.

Create the PostgreSQL database if it does not already exist, then from the
repository root apply the users migration:

```powershell
psql -U your_db_user -d project_management_saas -f database/migrations/001_create_users.sql
```

The migration uses `CREATE TABLE IF NOT EXISTS` and a unique case-insensitive
email index; it does not reset or delete data.

Start the server from `backend/`:

```powershell
npm run dev
```

The API listens on `http://localhost:5000` by default. Use `npm start` for a
non-development start.

## Authentication API

All endpoints accept and return JSON. Successful responses include
`success: true`. Passwords must be at least 8 characters and no more than
72 UTF-8 bytes. Passwords and password hashes are never returned.

### `POST /api/auth/register`

Request:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "replace-with-a-secure-password"
}
```

Returns `201` and a public user object. Invalid fields return `400`; an email
already in use returns `409`.

### `POST /api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "replace-with-a-secure-password"
}
```

Returns `200`, a signed JWT, and the public user object. Invalid credentials
return a generic `401` response. Token expiry is configured with
`JWT_EXPIRES_IN` (default `1h`).

### `GET /api/auth/me`

Requires the login token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

Returns the authenticated user's public profile. Missing, invalid, and expired
tokens return `401`. The profile contains `id`, `name`, `email`, `createdAt`,
and `updatedAt`, never the password hash.

## Tests

From `backend/`, run:

```powershell
npm test
```

The API tests replace the shared PostgreSQL pool query function with an isolated
in-memory stub. They do not connect to PostgreSQL or use production data.

## Database connection check

`node src/config/testDb.js` checks PostgreSQL connectivity using the same pool
and environment settings as the API.
