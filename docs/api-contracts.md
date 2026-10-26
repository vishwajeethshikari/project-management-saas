# API contracts

This contract describes the Express API in the checked-out
`vishwajeeth-user-auth-security` branch. The API listens on port `5000` by
default. Requests and responses use JSON except for `GET /`, which returns
plain text. No API version prefix or formal OpenAPI specification is present
in this branch.

## Implemented routes

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/` | None | Returns the plain-text service name. |
| `GET` | `/api/health` | None | Returns API health JSON. |
| `POST` | `/api/auth/register` | None | Validates and creates an account. |
| `POST` | `/api/auth/login` | None | Verifies credentials and returns a JWT. |
| `GET` | `/api/auth/me` | Bearer JWT | Returns the authenticated user's profile. |

There are no project, team, task, comment, or notification routes in the
checked-out Express implementation.

## Route details

### `GET /`

Returns HTTP `200` and the plain-text body:

```text
Project Management SaaS API
```

### `GET /api/health`

Returns HTTP `200`:

```json
{
  "success": true,
  "message": "Project Management API is running"
}
```

### `POST /api/auth/register`

Request:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "secure-pass-123"
}
```

Validation: name is trimmed and must contain 1–100 characters; email is
trimmed, must be valid, and may be at most 254 characters; password must be at
least 8 characters and no more than 72 UTF-8 bytes. The email is normalized to
lowercase before storage. Passwords are bcrypt-hashed.

Success: HTTP `201`:

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

The timestamps above illustrate the response shape, not a promised value.
Password and password hash are not returned.

### `POST /api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "secure-pass-123"
}
```

Email is trimmed and normalized to lowercase. A successful login returns
HTTP `200`:

```json
{
  "success": true,
  "token": "<signed-jwt>",
  "user": {
    "id": "1",
    "name": "Example User",
    "email": "user@example.com",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

The token uses HS256; its expiry is configured by `JWT_EXPIRES_IN` and
defaults to `1h`. Invalid credentials return HTTP `401` with
`{"success":false,"message":"Invalid email or password"}`.

### `GET /api/auth/me`

Requires `Authorization: Bearer <token>`. On success, returns HTTP `200` with
`{"success":true,"user":{...}}`, where `user` has the same safe fields as the
registration response. A missing token returns HTTP `401` with
`{"success":false,"message":"Authentication token is required"}`. An invalid
or expired token returns HTTP `401` with
`{"success":false,"message":"Invalid or expired authentication token"}`. A
valid token for a user no longer in the database returns HTTP `404` with
`{"success":false,"message":"User not found"}`.

## Shared error shapes

Invalid request bodies return HTTP `400`:

```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": [
    {
      "field": "email",
      "message": "validation message"
    }
  ]
}
```

Duplicate registration email returns HTTP `409`:
`{"success":false,"message":"An account with this email already exists"}`.
Unhandled API errors return HTTP `500`:
`{"success":false,"message":"An unexpected error occurred"}`.

## Separate Spring Boot branch

The `main` branch contains a different implementation: Spring Boot project
CRUD routes at `POST /api/projects`, `GET /api/projects`,
`GET /api/projects/{id}`, `PUT /api/projects/{id}`, and
`DELETE /api/projects/{id}`. These routes are **not** part of the current
Express API contract. The final framework and API source of truth require team
confirmation; see [Architecture](architecture.md) and
[Git workflow](git-workflow.md).
