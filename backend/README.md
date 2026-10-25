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

The authentication module provides registration, login, JWT verification, and
a current-user profile endpoint. It uses the existing PostgreSQL pool and the
`bcrypt`, `jsonwebtoken`, and `zod` dependencies already declared in
`package.json`.

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

Returns `201`:

```json
{
  "success": true,
  "user": {
    "id": "1",
    "name": "Example User",
    "email": "user@example.com",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

Email addresses are trimmed and normalized to lowercase. Invalid or missing
fields return `400`; an email already in use returns `409`.

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

Example response:

```json
{
  "success": true,
  "token": "<JWT_FROM_LOGIN>",
  "user": {
    "id": "1",
    "name": "Example User",
    "email": "user@example.com",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

### `GET /api/auth/me`

Requires the login token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

Returns the authenticated user's public profile. Missing, invalid, and expired
tokens return `401`. The profile contains `id`, `name`, `email`, `createdAt`,
and `updatedAt`, never the password hash.

### Reusing authentication middleware

Other backend routes can import the reusable middleware to require a valid
bearer token. It verifies the JWT signature and expiration, then sets
`req.user.id` from the verified token subject; it does not authorize access to
any particular project or resource.

```js
const authenticateToken = require("../middleware/authenticateToken");

router.get("/protected-route", authenticateToken, handler);
```

Common status codes are `400` for invalid request data, `401` for missing or
invalid credentials/tokens, `404` when the token's user no longer exists on
`/me`, and `409` for a duplicate registration email. Unexpected server errors
return a generic `500` response.

### Manual test

With PostgreSQL configured, the users migration applied, and the server running,
use PowerShell to register, log in, then call `/me` with the returned token:

```powershell
$body = @{ name = "Example User"; email = "user@example.com"; password = "replace-with-a-secure-password" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register -ContentType "application/json" -Body $body

$credentials = @{ email = "user@example.com"; password = "replace-with-a-secure-password" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -ContentType "application/json" -Body $credentials
$token = $login.token
Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/auth/me -Headers @{ Authorization = "Bearer $token" }
```

## Tests

From `backend/`, run:

```powershell
npm test
```

The API tests replace the shared PostgreSQL pool query function with an isolated
in-memory stub. They do not connect to PostgreSQL or use production data.

`src/config/testDb.js` is a manual check that requires a dedicated
`TEST_DATABASE_URL`; it is not used by the automated test suite.

## Database connection check

To manually check PostgreSQL connectivity, run `node src/config/testDb.js`
after configuring `TEST_DATABASE_URL` in `.env` with a dedicated test database
URL whose database name contains `test`. The check refuses missing or
production-identified targets, does not fall back to `DATABASE_URL` or the
application database settings, and runs only a read-only `SELECT`. It never
creates, deletes, truncates, or modifies tables.
